/**
 * Interfaces
 */
import * as interfaces from './interfaces'
export { interfaces }

/**
 * Helpers
 */
import { ActionType } from "./helpers/ActionType"
import { clone } from "./helpers/clone"
import { mapValues } from "./helpers/mapValues"
import { matchActionType } from "./helpers/matchActionType"
export const helpers = {
    ActionType,
    clone,
    mapValues,
    matchActionType
}

/**
 * Core
 */
export { Store } from './core/Store'
export { UpdateContext } from './core/UpdateContext'
export { ActionsObservable } from './core/ActionsObservable'

export { AbstractModel } from './core/AbstractModel'
export { Model } from './core/Model'

import { CombinedModel } from './core/CombinedModel'
export { CombinedModel }

export function combineModels<Schema extends interfaces.SchemaLike>(schema: Schema) {
    return new CombinedModel(schema)
}

export { connect } from './core/connect'