import { combineEpics } from 'redux-observable'

export function NodesEpic(nodes) {
  return combineEpics(...nodes.map(node => node.epic).filter(epic => epic !== undefined))
} 