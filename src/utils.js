// @flow
import { createSelectorCreator, defaultMemoize } from 'reselect'
import equals from 'shallow-equals'
import { set, get, some, identity, mapValues } from 'lodash/fp'
import * as t from './types'
import { CHANGE } from './constants'

export function getAbsoluteKeyPath(keyPath: string, relativeKeyPath: string) {
  if (relativeKeyPath.slice(0, 1) !== '.') {
    return relativeKeyPath
  }

  let basePath = keyPath.split('.')
  let relPath = relativeKeyPath.split('.')

  let didPush
  relPath.forEach((k, i) => {
    const isLast = i === relPath.length - 1
    if (k === '') {
      if (!isLast || didPush) {
        basePath.pop()
      }
    } else {
      didPush = true
      basePath.push(k)
    }
  })

  return basePath.join('.')
}

export function AbsoluteKeyPathGetter(keyPath: string) {
  return (relativeKeyPath: string) => getAbsoluteKeyPath(keyPath, relativeKeyPath)
}

export function concatReducers(...reducers: *) {
  return (state: *, action: *) => reducers.reduce(
    (s, r) => r(s, action),
    state
  )
}

export function NodeResolverContext(node: t.INode, ctState: t.IControlTreeState, action: t.IAction): t.INodeResolverContext {
  const isInitial: boolean = !!get(['working', 'isInitial'], ctState)
  const isChange = !!(
    action.type === CHANGE &&
    action.payload != null &&
    typeof action.payload === 'object' &&
    action.payload.subjectsByKeyPath != null &&
    typeof action.payload.subjectsByKeyPath === 'object' &&
    Object.keys(action.payload.subjectsByKeyPath).indexOf(node.keyPath) !== -1
  )
  const isAutoChange: boolean = some(
    identity,
    mapValues(d => get(['working', 'changedKeyPaths', d], ctState), node.dependencies)
  )

  const shouldUpdate = isInitial || isChange || isAutoChange

  let subject

  if (
    isChange &&
    action.payload &&
    action.payload.subjectsByKeyPath &&
    typeof action.payload.subjectsByKeyPath === 'object'
  ) {
    subject = action.payload.subjectsByKeyPath[node.keyPath]
  }

  const nodesDigest = ctState.working.digest ? ctState.working.digest : digest(ctState)
  const previousNodeState = nodesDigest[node.keyPath]
  let resolvedDependencies = {}
  Object.keys(node.dependencies).forEach(key => {
    resolvedDependencies[key] = nodesDigest[node.dependencies[key]]
  })

  return {
    node,
    ctState,
    nodesDigest,
    previousNodeState,
    resolvedDependencies,
    shouldUpdate,
    isInitial,
    isChange,
    isAutoChange,
    subject,
  }
}

export function PropResolverContext(
  nodeResolverContext: t.INodeResolverContext,
  propName: string,
  resolvedProps: t.IDictionary<t.IPropertyValue>
): t.IPropResolverContext {
  const { node, resolvedDependencies } = nodeResolverContext

  return {
    ...nodeResolverContext,
    propName,
    resolvedProps,
    resolveProp() {
      const p = node.props[propName]
      if (typeof p === 'function') {
        return p(resolvedDependencies, resolvedProps)
      }
      return p
    }
  }
}

export function digest(state: t.IControlTreeState) {
  const { current, next, auto } = state
  return {
    ...current,
    ...next,
    ...auto
  }
}

export function setWorkingDigest(state: t.IControlTreeState): t.IControlTreeState {
  return {
    ...state,
    working: {
      ...state.working,
      digest: digest(state)
    }
  }
}

export function writeNodeState(ctState: t.IControlTreeState, nodeWriterContext: t.INodeWriterContext) {
  const { changeSet, keyPath, resolvedNodeState } = nodeWriterContext

  ctState = set(
    [changeSet, keyPath],
    resolvedNodeState,
    ctState
  )

  ctState = set(['working', 'digest', keyPath], resolvedNodeState, ctState)
  ctState = set(['working', 'changedKeyPaths', keyPath], true, ctState)

  return ctState
}

export const Selector = createSelectorCreator(defaultMemoize, equals)
