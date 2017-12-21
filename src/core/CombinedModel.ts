import { matchActionTarget } from '../helpers/matchActionTarget';
import { ActionLike, ModelInterface, StateOf, Schema } from "../interfaces";
import { relative } from 'path'
import { UpdateContext } from "./UpdateContext";
import { AbstractModel } from "./AbstractModel";
import { Observable } from 'rxjs';
import { ActionsObservable } from "./ActionsObservable";
import { Store } from "./Store";
import Toposort from 'toposort-class'

export class CombinedModel<Children extends Schema> extends AbstractModel<StateOf<Children>> {
  public children: Children;

  constructor(children: Children) {
    super()
    this.children = children
    this._accept = this._combineActionTypeMatchLists(children)
  }

  link(keyPath: string, store: Store<any>) {
    const onLink = super.link(keyPath, store)
    const childrenOnLink = this._linkChildren()

    this._sortChildren()
    this._createExternalDependencies()

    return () => {
      childrenOnLink.forEach(cb => cb())
      onLink()
    }
  }

  unlink() {
    super.unlink()
    this._unlinkChildren(this.children)
  }

  dump<R>(state: this['state']) {
    const dump: {[K in keyof this['state']]?: R} = <any>{}

    Object.keys(this.children).forEach(key => {
      const childDump = this.children[key].dump(state[key]) as R
      if (childDump !== undefined) {
        dump[key] = childDump
      }
    })

    if (Object.keys(dump).length) {
      return dump
    }
  }

  load<R>(dump: {[K in keyof this['state']]?: R} = {}, updateContext: UpdateContext<Schema>): this['state'] {
    const state: this['state'] = <any>{}

    Object.keys(this.children).forEach(key => {
      const childState = this.children[key].load(
        dump[key],
        (updateContext as UpdateContext<Schema>).setModel(this.children[key])
      )
      if (childState !== undefined) {
        state[key] = childState
      }
    })

    return this.update(state, updateContext.setModel(this))
  }

  process(action$: ActionsObservable) {
    const mapper = (key: keyof Children) => {
      const model = this.children[key]
      let a$ = action$.filter(action => {
          return matchActionTarget(model.keyPath, action.target)
      }) as ActionsObservable

      if (model.accept) {
        a$ = a$.ofType(Store.START, Store.STOP, ...model.accept)
      }

      return model.process(a$, model)
    }

    return Observable.merge(
      ...Object.keys(this.children)
        .map(mapper)
    )
  }

  update(state: this['state'], context: UpdateContext<Schema>): this['state'] {
    const nextState = <this['state']>{}
    let changed = false

    if (state === undefined) {
      state = <this['state']>{}
    }

    Object.keys(this.children).forEach((key: keyof Children) => {
      state = <this['state']>state
      const model = this.children[key]

      const cur = state[key]

      let next = cur
      context.setModel(model)
      if (context.shouldUpdate) {
        next = model.update(cur, context as UpdateContext<typeof model['dependencies']>)
      }

      nextState[key] = next
      context.setModel(model)
      context.updateDigest(next)

      if (cur !== next) {
        changed = true
        context.markUpdated()
      }

    })

    context.setModel(this)
    if (changed) {
      state = nextState
      context.updateDigest(nextState)
      context.markUpdated()
    }

    return state
  }

  private _linkChildren() {
    const children = this.children
    return Object
      .keys(children)
      .map(<K extends keyof Children>(k: K) => {
        const childKeyPath = (this.keyPath === '/')
          ? `/${k}`
          : `${this.keyPath}/${k}`
        return children[k].link(childKeyPath, this.store)
      })
  }

  private _unlinkChildren(children: Children) {
    Object
      .keys(children)
      .forEach(<K extends keyof Children>(k: K) => {
        children[k].unlink()
      })
  }

  private _sortChildren() {
    const children = this.children

    const topo = new Toposort()

    Object
      .keys(children)
      .map(key => [key, children[key]] as [keyof Children, ModelInterface])
      .forEach(([key, node]) => {
        const hasUnlinkedDependencies = Object.keys(node.dependencies)
          .filter(d => !node.dependencies[d].isLinked)
          .length

        if (hasUnlinkedDependencies) {
          throw new Error(`Node (${node.keyPath}) has unlinked dependencies`)
        }

        const deps = Object
          .keys(node.dependencies)
          .map((key: string) => relative(this.keyPath, node.dependencies[key].keyPath).split('/')[0])
          .filter(dependency => dependency !== '..')

        topo.add(key, deps)
      })

    const sortedChildren: Children = <Children>{}
    topo.sort().reverse().forEach((key: string) => {
      const node = children[key]
      if (node !== undefined) {
        sortedChildren[key] = children[key]
      }
    })

    this.children = sortedChildren
  }

  private _combineActionTypeMatchLists(children: Children) {
    let accept: string[] | undefined = []
    Object.keys(children).forEach(key => {
      const child = children[key]
      if (accept) {
        if (!child.accept) {
          accept = undefined
        } else {
          accept.splice(0, 0, ...child.accept)
        }
      }
    })
    return accept as string[] | undefined
  }

  private _createExternalDependencies() {
    const children = this.children

    type Row = [keyof Children, ModelInterface]

    const dependencyReducer = (a: Schema, [key, node]: Row) => {
      const ds = node.dependencies
      Object.keys(ds).forEach(k => {
        const d = ds[k]
        if (relative(this.keyPath, d.keyPath).startsWith('../')) {
          a[d.keyPath] = d
        }
      })
      return a
    }

    this._dependencies = Object
      .keys(children)
      .map(key => [key, children[key]])
      .reduce(dependencyReducer, {})
  }
}

export function combineModels<Children extends Schema>(children: Children) {
  return new CombinedModel(children)
}
