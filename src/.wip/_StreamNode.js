import * as t from "./types";
import NodeType from "./NodeType";
import { findLast, map } from "lodash/fp";
import { PreferredValuesReducer } from "./reducers";
import { concatReducers, NodeResolverContext, setWorkingDigest } from "./utils";
import { Observable } from 'rxjs'

export default NodeType({
  getEpic(node) {
    return AsyncDataEpic(node)
  },
  getReducer(node) {
    return concatReducers(AsyncDataReducer(node), node.reducer)
  },
  getResolver(node) {
    return (context: t.INodeResolverContext) => {
      const aData = context.ctState.asyncData.nodes[node.keyPath]
      return aData ? aData : context.previousNodeState
    }
  }
})

function AsyncDataReducer(node) {
  return function (ctState, action) {
    const context = NodeResolverContext(node, ctState, action)

    if (ctState.asyncData === undefined) {
      ctState = { ...ctState, asyncData: { nodes: {}, requestedKeyPaths: {} } }
    }

    if (context.shouldUpdate) {
      let nodes = ctState.asyncData.nodes

      if (context.isAsyncDataLoaded) {
        nodes = { ...nodes, [node.keyPath]: context.subject }
      }

      ctState = {
        ...ctState,
        asyncData: {
          nodes,
          requestedKeyPaths: {
            ...ctState.asyncData.requestedKeyPaths,
            [node.keyPath]: !context.isAsyncDataLoaded
          }
        }
      }
    }

    return ctState
  }
}

function AsyncDataEpic(node) {
  return function (action$, store) {
    const input$ = action$
      .filter(action => action.type === 'CHANGE' || action.type === 'ASYNC_DATA_LOADED')
      .map(action => {
        let ctState = node.model.rootSelector(store.getState())
        const isRequested = ctState.asyncData.requestedKeyPaths[node.keyPath]

        if (!isRequested) {
          return
        }

        ctState = setWorkingDigest(ctState)
        const context = NodeResolverContext(node, ctState, action)

        const currentNodeState = context.previousNodeState
        const dependencies = context.resolvedDependencies
        const isChange = context.isChange
        const subject = isChange ? context.subject : undefined

        const input = {
          currentNodeState,
          dependencies,
          isChange,
          subject
        }
        return input
      })
      .filter(input => input !== undefined)

    const getStream = node.behavior.getStream

    if (typeof getStream !== 'function') {
      console.error('getStream is not a function')
      return Observable.empty()
    }

    const output$ = getStream(input$)
      .map(data => ({
        type: 'ASYNC_DATA_LOADED',
        payload: {
          keyPath: node.keyPath,
          subject: data
        }
      }))

    return output$
  }
}