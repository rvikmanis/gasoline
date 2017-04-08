// @flow
function ActionType(name) {
  return `gasoline/action:${name}`
}

export const CHANGE = ActionType('change')
export const COMMIT_CHANGES = ActionType('commitChanges')
export const CANCEL_CHANGES = ActionType('cancelChanges')
