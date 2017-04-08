// @flow
import * as t from '../types'
import { concatReducers, digest, setWorkingDigest } from '../utils'
import { CHANGE, COMMIT_CHANGES, CANCEL_CHANGES } from '../constants'

function resetAuto(state) {
  let working = { changedKeyPaths: {} }
  Object.keys(state.next).forEach(keyPath => {
    // Triggers dependent nodes to recompute
    working.changedKeyPaths[keyPath] = true
  })
  return { ...state, auto: {}, working }
}

function commit(state) {
  return {
    ...state,
    current: digest(state),
    next: {},
    auto: {},
  }
}

function cancel(state) {
  return {
    ...state,
    current: state.current,
    next: {},
    auto: {}
  }
}

export default function NodesReducer(nodes: t.INode[]) {

  function preNodesReducer(state, action) {
    if (state === undefined) {
      state = {
        next: {},
        current: {},
        auto: {},
        working: {
          isInitial: true
        },
      }
    }

    if (action.type === CHANGE) {
      state = resetAuto(state)
    }

    if (action.type === CHANGE || state.working.isInitial) {
      state = setWorkingDigest(state)
    }

    return state
  }

  function postNodesReducer(state, action) {
    if (action.type === COMMIT_CHANGES || state.working.isInitial) {
      state = commit(state)
    }

    if (action.type === CANCEL_CHANGES) {
      state = cancel(state)
    }

    return { ...state, working: {} }
  }

  return concatReducers(
    preNodesReducer,
    concatReducers(...nodes.map(n => n.reducer)),
    postNodesReducer
  )
}
