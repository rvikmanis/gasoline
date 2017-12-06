import { relative } from 'path';

function matchSingleActionTarget(keyPath: string, target: string) {
    return !relative(keyPath, target).startsWith('../')
}

export function matchActionTarget(keyPath: string, target?: string | string[] | undefined) {
    if (target === undefined) {
        return true
    }

    if (typeof target === "string") {
        return matchSingleActionTarget(keyPath, target)
    }

    for(let t of target) {
        if (matchSingleActionTarget(keyPath, t)) {
            return true
        }
    }

    return false
}