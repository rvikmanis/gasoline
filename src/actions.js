// @flow
import { CHANGE, COMMIT_CHANGES, CANCEL_CHANGES } from './constants'
import * as t from './types'

export function addChange(keyPath: string, subject: mixed) {
  return addChanges({ [keyPath]: subject })
}

export function addChanges(subjectsByKeyPath: t.IDictionary<mixed>) {
  return {
    type: CHANGE,
    payload: {
      subjectsByKeyPath
    }
  }
}

export function commitChanges() {
  return { type: COMMIT_CHANGES }
}

export function cancelChanges() {
  return { type: CANCEL_CHANGES }
}