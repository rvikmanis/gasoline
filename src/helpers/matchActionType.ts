import { Dict } from "../interfaces";

const cache: Dict<Dict<boolean>> = {}

function testActionType(rule: string, actionType: string) {
  const rc = cache[rule] = cache[rule] || {}
  if (actionType in rc) {
    return rc[actionType]
  }

  let str: string = rule
  let splitRule = rule.split('*')

  if (splitRule.length === 1) {
    return rc[actionType] = actionType === rule
  } else if (splitRule.length === 2) {
    const [h, t] = splitRule
    if (h === '' && t !== '') {
      return rc[actionType] = actionType.endsWith(t) && t.length < actionType.length
    } else if (h !== '' && t === '') {
      return rc[actionType] = actionType.startsWith(h) && h.length < actionType.length
    }
  }

  throw new Error(`Invalid rule: ${rule}`)
}

export default function matchActionType(
  actionTypeList: string[],
  actionType: string,
  cache?: Dict<boolean>
) {
  if (cache && actionType in cache) {
    return cache[actionType]
  }

  let i = -1
  let result: boolean = false
  while (++i < actionTypeList.length) {
    if (testActionType(actionTypeList[i], actionType)) {
      result = true
      break
    }
  }

  if (cache) {
    cache[actionType] = result
  }

  return result
}