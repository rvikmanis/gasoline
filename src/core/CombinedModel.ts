import { Dict, ActionLike, NodeLike, StateLike, SchemaLike } from "../interfaces";
import { relative } from 'path'
import UpdateContext from "./UpdateContext";
import Toposort from 'toposort-class'
import AbstractModel from "./AbstractModel";
import { Observable } from 'rxjs';
import ActionsObservable from "./ActionsObservable";
import Store from "./Store";

export default class CombinedModel<Schema extends SchemaLike> extends AbstractModel<StateLike<Schema>> {
  public children: Schema;

  constructor(schema: Schema) {
    super()
    this.children = schema
  }

  link(keyPath: string, store: Store<any>) {
    super.link(keyPath, store)

    this._linkChildren(this.children)

    const sortedChildren = this._getSortedChildren(this.children)
    this.dependencies = this._createExternalDependencies(sortedChildren)
    this.children = sortedChildren

    this.accept = this._combineActionTypeMatchLists(sortedChildren)
  }

  unlink() {
    super.unlink()
    this._unlinkChildren(this.children)
  }

  getChild<K extends keyof Schema>(key: K) {
    const child = this.children[key]
    if (child !== undefined) {
      return child
    }
    throw new Error(`Cannot find child at: ${key}`)

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

  load<R>(dump: {[K in keyof this['state']]?: R} = {}, updateContext: UpdateContext<SchemaLike>): this['state'] {
    const state: this['state'] = <any>{}

    Object.keys(this.children).forEach(key => {
      const childState = this.children[key].load(
        dump[key],
        (updateContext as UpdateContext<SchemaLike>).setModel(this.children[key])
      )
      if (childState !== undefined) {
        state[key] = childState
      }
    })

    return this.update(state, updateContext.setModel(this))
  }

  process = (action$: ActionsObservable) => {
    const mapper = (key: keyof Schema) => {
      const model = this.children[key]
      let a$ = action$

      if (model.accept) {
        a$ = action$.ofType(Store.START, Store.STOP, ...model.accept)
      }

      return model.process(a$, model)
    }

    return ActionsObservable.merge(
      ...Object.keys(this.children)
        .map(mapper)
    )
  }

  update = (state: this['state'], context: UpdateContext<SchemaLike>): this['state'] => {
    const nextState = <this['state']>{}
    let changed = false

    if (state === undefined) {
      state = <this['state']>{}
    }

    Object.keys(this.children).forEach((key: keyof Schema) => {
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

  private _linkChildren(children: Schema) {
    Object
      .keys(children)
      .forEach(<K extends keyof Schema>(k: K) => {
        const childKeyPath = (this.keyPath === '/')
          ? `/${k}`
          : `${this.keyPath}/${k}`
        children[k].link(childKeyPath, this.store)
      })
  }

  private _unlinkChildren(children: Schema) {
    Object
      .keys(children)
      .forEach(<K extends keyof Schema>(k: K) => {
        children[k].unlink()
      })
  }

  private _getSortedChildren(children: Schema) {
    const topo = new Toposort()

    Object
      .keys(children)
      .map(key => [key, children[key]] as [keyof Schema, NodeLike])
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

    const sortedChildren: Schema = <Schema>{}
    topo.sort().reverse().forEach((key: string) => {
      const node = children[key]
      if (node !== undefined) {
        sortedChildren[key] = children[key]
      }
    })

    return sortedChildren
  }

  private _combineActionTypeMatchLists(children: Schema) {
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

  private _createExternalDependencies(children: Schema) {
    type Row = [keyof Schema, NodeLike]

    const dependencyReducer = (a: SchemaLike, [key, node]: Row) => {
      const ds = node.dependencies
      Object.keys(ds).forEach(k => {
        const d = ds[k]
        if (relative(this.keyPath, d.keyPath).startsWith('../')) {
          a[d.keyPath] = d
        }
      })
      return a
    }

    return Object
      .keys(children)
      .map(key => [key, children[key]])
      .reduce(dependencyReducer, {})
  }
}
