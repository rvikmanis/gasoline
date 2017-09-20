/**
 * Interfaces
 */
import * as interfaces from './interfaces'
export { interfaces }

/**
 * Core
 */
export { default as Store } from './core/Store'
export { default as UpdateContext } from './core/UpdateContext'
export { default as ActionsObservable } from './core/ActionsObservable'

export { default as AbstractModel } from './core/AbstractModel'
export { default as Model } from './core/Model'

import CombinedModel from './core/CombinedModel'
export { CombinedModel }

export function combineModels<Schema extends interfaces.SchemaLike>(schema: Schema) {
    return new CombinedModel(schema)
}

export { default as ServiceModel } from './core/ServiceModel'
export { default as WebSocketServiceAdapter } from './core/WebSocketServiceAdapter'

export { default as connect } from './core/connect'