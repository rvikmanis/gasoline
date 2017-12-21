export function matchActionType(
  actionTypeList: string[],
  actionType: string,
  cache?: { [key: string]: boolean }
) {
  if (cache && actionType in cache) {
    return cache[actionType]
  }

  let i = -1
  let result: boolean = false
  while (++i < actionTypeList.length) {
    if (actionTypeList[i] === actionType) {
      result = true
      break
    }
  }

  if (cache) {
    cache[actionType] = result
  }

  return result
}