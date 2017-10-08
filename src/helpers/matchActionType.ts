import { Dict } from "../interfaces";


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