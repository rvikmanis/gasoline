import { matchActionTarget } from '../helpers/matchActionTarget';
import { ActionLike, ModelInterface, StateOf, Schema } from "../interfaces";
import { relative, join } from 'path'
import { UpdateContext } from "./UpdateContext";
import { AbstractModel } from "./AbstractModel";
import { Observable } from './Observable';
import { Store } from "./Store";
import Toposort from 'toposort-class'

export class CombinedModel<Children extends Schema> extends AbstractModel<StateOf<Children>> {
  public children: Map<keyof Children, Children[keyof Children]>;
  private _childKeysByModel: Map<Children[keyof Children], keyof Children>

  constructor(children: Children) {
    super()
    this.children = new Map(Object.keys(children).map(k => [k, children[k]] as [string, ModelInterface]))
    this._childKeysByModel = new Map([...this.children].map(entry => [entry[1], entry[0]] as [typeof entry[1], typeof entry[0]]))
    this._accept = this._combineActionTypeMatchLists(children)
  }

  public get resultNode() {
    const children: { [N in keyof Children]: Children[N]["resultNode"] } = {} as any;

    for (const [key, model] of this.children) {
      children[key] = model.resultNode
    }

    return {
      ...super.resultNode,
      children
    }
  }

  link(store: Store<any>, parent?: ModelInterface, key?: string) {
    const onLink = super.link(store, parent, key)
    const childrenOnLink = this._linkChildren()

    return () => {
      childrenOnLink.forEach(cb => cb())

      this._sortChildren()
      this._createExternalDependencies()

      onLink()
    }
  }

  unlink() {
    super.unlink()
    this._unlinkChildren()
  }

  getChildByKey<K extends keyof Children>(key: K) {
    return this.children.get(key) as Children[K]
  }

  isAncestorOf(descendant: ModelInterface) {
    return descendant.isDescendantOf(this)
  }

  dump<R>(state: this['state']) {
    const dump: {[K in keyof this['state']]?: R} = <any>{}

    for (const [key, node] of this.children) {
      const childDump = node.dump(state[key]) as R
      if (childDump !== undefined) {
        dump[key] = childDump
      }
    }

    if (Object.keys(dump).length) {
      return dump
    }
  }

  load<R>(dump: {[K in keyof this['state']]?: R} = {}, updateContext: UpdateContext<Schema>): this['state'] {
    const state: this['state'] = <any>{}

    for (const [key, node] of this.children) {
      const childState = node.load(
        dump[key],
        (updateContext as UpdateContext<Schema>).setModel(node)
      )
      if (childState !== undefined) {
        state[key] = childState
      }
    }

    return this.update(state, updateContext.setModel(this))
  }

  process(action$: Observable<ActionLike>) {
    return (
      new Observable<ZenObservable.ObservableLike<ActionLike>>((observer) => {
        for (const model of this.children.values()) {
          let a$ = action$.filter(action => {
            return matchActionTarget(model.keyPath, action.target)
          })

          if (model.accept) {
            a$ = a$.ofType(Store.START, Store.STOP, ...model.accept)
          }

          observer.next(model.process(a$, model))
        }
      })
    ).mergeAll()
  }

  update(state: this['state'], context: UpdateContext<Schema>): this['state'] {
    const nextState = <this['state']>{}
    let changed = false

    if (state === undefined) {
      state = <this['state']>{}
    }

    for (const [key, model] of this.children) {
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
    }

    context.setModel(this)
    if (changed) {
      state = nextState
      context.updateDigest(nextState)
      context.markUpdated()
    }

    return state
  }

  private _linkChildren() {
    let callbacks: Array<() => void> = []

    for (const [key, node] of this.children) {
      callbacks.push(node.link(this.store, this, key))
    }

    return callbacks
  }

  private _unlinkChildren() {
    for (const [_, node] of this.children) {
      node.unlink()
    }
  }

  private _sortChildren() {
    let sortedChildren = [] as [keyof Children, Children[keyof Children]][]
    const topo = new Toposort()

    for (const [key, node] of this.children) {
      let deps: string[] = []

      Object.keys(node.dependencies).forEach(k => {
        const dep = node.dependencies[k]

        if (!dep.isLinked) {
          throw new Error(`Node (${node.keyPath}) has unlinked dependencies`)
        }

        const siblingKey = relative(this.keyPath, dep.keyPath).split('/')[0]
        if (siblingKey !== "..") {
          deps.push(siblingKey)
        }
      })

      topo.add(key, deps)
    }

    topo.sort().reverse().forEach((key: string) => {
      const node = this.children.get(key)
      if (node !== undefined) {
        sortedChildren.push([key, node])
      }
    })

    this.children = new Map(sortedChildren)
  }

  private _createExternalDependencies() {
    const children = this.children

    type Row = [keyof Children, Children[keyof Children]]

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

    this._dependencies = [...this.children].reduce(dependencyReducer, {} as Schema)
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
}

export function combineModels<Children extends Schema>(children: Children) {
  return new CombinedModel(children)
}
