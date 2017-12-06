import { dirname, resolve } from 'path';

function createSingleActionTarget(keyPath: string, target: string) {
    if (target === "@self") {
        target = keyPath
    }

    return resolve(dirname(keyPath), target)
}

export function createActionTarget(keyPath: string, target?: string | string[] | undefined) {
    if (target === undefined) {
        return target
    }

    if (typeof target === "string") {
        if (target.length === 0) {
            return undefined
        }

        return createSingleActionTarget(keyPath, target)
    }

    if (target.length === 0) {
        return undefined
    }

    return target.map(t => createSingleActionTarget(keyPath, t))
}