// @flow
import {
  AbsoluteKeyPathGetter, NodeResolverContext,
  PropResolverContext, writeNodeState,
  Selector, digest
} from '../utils'
import {
  mapValues, get, omit, keys, sortBy, map,
  compose, set, isEqual, reduce, some, identity,
  memoize,
} from 'lodash/fp'
import * as t from '../types'

function resolveProp(context: t.IPropResolverContext) {
  return context.resolveProp()
}

const sortPropResolvers = (propOrder: string[], propResolvers: t.IDictionary<t.IPropResolver>):
  Array<[string, t.IPropResolver]> => compose(
    map(propName => [propName, propResolvers[propName]]),
    sortBy(propName => propOrder.indexOf(propName)),
    keys
  )(propResolvers)

export default function NodeType(typeOptions: t.ITypeOptions = {}): t.INodeCreator {
  const nodeCreator = (instanceOptions = {}): t.INodeBinder => {
    return (bindingContext: t.IBindingContext): t.INode => {
      const {
        keyPath,
        variantKeyPath,
        model = { rootSelector(state: any) { return state } }
      } = bindingContext

      let {
        propResolvers = {},
        propOrder = [],
        defaultProps = {},
        getResolver = (node) => node.resolver,
        getReducer = (node) => node.reducer,
        getEpic = undefined,
        transformInstanceOptions = (options: t.INodeOptions) => options
      } = typeOptions

      let {
        dependencies = {},
        behavior = {},
        ...props
      } = transformInstanceOptions(instanceOptions)

      dependencies = mapValues(AbsoluteKeyPathGetter(keyPath), dependencies)
      props = { ...defaultProps, ...props }

      propResolvers = {
        ...mapValues(() => resolveProp, omit(keys(propResolvers), props)),
        ...propResolvers
      }
      propResolvers = sortPropResolvers(propOrder, propResolvers)

      let node: t.INode;

      const select = Selector(
        digest,
        stateDigest => stateDigest[node.keyPath]
      )

      const getWithState = Selector(
        select,
        nodeState => ({ ...node, state: nodeState })
      )

      let partialNode;

      partialNode = {
        kind: 'node',
        keyPath,
        variantKeyPath,
        dependencies,
        props,
        behavior,
        typeOptions,
        instanceOptions,
        select,
        propResolvers,
        model,
        getWithState,
      }

      function resolver(context: t.INodeResolverContext): t.IDictionary<t.IPropertyValue> {
        const propReducer = (resolvedProps, [propName, propResolver]: [string, t.IPropResolver]) => {
          return {
            ...resolvedProps,
            [propName]: propResolver(
              PropResolverContext(context, propName, resolvedProps)
            )
          }
        }
        return reduce(propReducer, {}, context.node.propResolvers)
      }

      partialNode = {
        ...partialNode,
        resolver: getResolver({ ...partialNode, resolver })
      }

      const reducer = (ctState: t.IControlTreeState, action: t.IAction): t.IControlTreeState => {
        const context = NodeResolverContext(node, ctState, action)
        if (!context.shouldUpdate) {
          return ctState
        }

        const resolvedNodeState = node.resolver(context)
        if (isEqual(resolvedNodeState, context.previousNodeState)) {
          return ctState
        }

        ctState = writeNodeState(ctState, {
          changeSet: (context.isInitial || context.isChange) ? 'next' : 'auto',
          keyPath,
          resolvedNodeState
        })

        return ctState
      }

      node = {
        ...partialNode,
        reducer: getReducer({ ...partialNode, reducer })
      }

      if (typeof getEpic === 'function') {
        node = {
          ...node,
          epic: getEpic(node)
        }
      }

      Object.setPrototypeOf(node, nodeCreator.prototype)
      return node
    }
  }

  nodeCreator.prototype = Object.create(Object.prototype)
  Object.setPrototypeOf(nodeCreator, NodeType.prototype)
  return nodeCreator
}

NodeType.prototype = Object.create(Object.prototype)
