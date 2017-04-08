// @flow
import * as t from './types'
import { NodesReducer } from './reducers'
import { Selector } from './utils'
import Toposort from 'toposort-class'
import { createStructuredSelector } from 'reselect'

export default function Model(modelOptions: t.IModelOptions) {
  const {
    schema,
    rootSelector = (i => i: any)
  } = modelOptions

  const getKeyPath = (state, keyPath) => keyPath
  const getItem = (keyPath: string) => itemMap[keyPath]
  const getItemWithState = Selector(
    [rootSelector, Selector(getKeyPath, getItem)],
    (ctState, item) => item.getWithState(ctState)
  )

  let model = {
    rootSelector,
    getItem,
    getItemWithState,
    reducer: undefined
  }

  const nodes = bindNodesToModel(schema, model)

  let nodeMap: t.IDictionary<t.INode>
    = {}
  nodes.forEach(node => { nodeMap[node.keyPath] = node })

  let groupMap: t.IDictionary<t.IGroup>
    = getGroups(nodes)

  const itemMap
    = { ...nodeMap, ...groupMap }

  model.reducer = NodesReducer(nodes)

  return model
}

function getGroups(nodes: t.INode[]): t.IDictionary<t.IGroup> {
  let groups: t.IDictionary<t.IGroup> = {}

  nodes.forEach(node => {
    const frags = node.keyPath.split('.')
    const nodeKey = frags[frags.length - 1]

    frags.pop()
    const groupKey = frags[frags.length - 1]
    const groupKeyPath = frags.join('.')

    frags.pop()
    const parentKeyPath = frags.join('.')

    let group: t.IGroup = groups[groupKeyPath] = groups[groupKeyPath]
      || Group(groupKeyPath)

    group.nodes[nodeKey] = node

    if (groupKeyPath !== '') {
      let parent = groups[parentKeyPath] = groups[parentKeyPath]
        || Group(parentKeyPath)

      parent.subgroups[groupKey] = group
    }
  })

  return groups
}

function Group(keyPath): t.IGroup {
  let nodes: t.IDictionary<t.INode> = {}
  let subgroups: t.IDictionary<t.IGroup> = {}

  function createGroupSelector() {
    let nodeSelectors = {}
    Object.keys(nodes).forEach(key => {
      nodeSelectors[key] = nodes[key].getWithState
    })
    const nodesSelector = createStructuredSelector({ ...nodeSelectors })

    let groupSelectors = {}
    Object.keys(subgroups).forEach(key => {
      groupSelectors[key] = subgroups[key].getWithState
    })
    const groupsSelector = createStructuredSelector({ ...groupSelectors })

    return Selector(
      nodesSelector,
      groupsSelector,
      (nodes, subgroups) => ({
        nodes,
        subgroups,
        keyPath,
        kind: 'group',
        mapSubgroups(fn: (subgroup: t.IGroup, key: string) => mixed) {
          return Object.keys(subgroups).map(key => fn(subgroups[key], key))
        },
        mapNodes(fn: (node: t.INode, key: string) => mixed) {
          return Object.keys(nodes).map(key => fn(nodes[key], key))
        }
      })
    )
  }

  let _selector

  return {
    kind: 'group',
    nodes,
    subgroups,
    get getWithState() {
      if (!_selector) {
        _selector = createGroupSelector()
      }
      return _selector
    },
    keyPath
  }
}

function bindNodesToModel(schema: t.ISchema, model: t.IModel): t.INode[] {
  let nodes = handleGroup(schema, {
    model,
    keyPath: '',
    variantKeyPath: ''
  })

  const topo = new Toposort()
  let nodesByKeyPath = {}
  nodes.forEach(node => {
    nodesByKeyPath[node.keyPath] = node
    topo.add(node.keyPath, Object.values(node.dependencies))
  })
  let res = topo.sort()
  res.reverse()
  return res.map(keyPath => nodesByKeyPath[keyPath])
}

function handleGroup(group: t.ISchema, context: t.IBindingContext) {
  const { keyPath } = context

  return Object.keys(group).reduce((nodes: Array<t.INode>, key) => {
    const item = group[key]
    const itemContext = {
      ...context,
      keyPath: keyPath === ''
        ? key :
        `${keyPath}.${key}`
    }

    if (typeof item === 'object') {
      return nodes.concat(handleGroup(item, itemContext))
    }
    if (typeof item === 'function') {
      return nodes.concat(item(itemContext))
    }

    return nodes
  }, [])
}
