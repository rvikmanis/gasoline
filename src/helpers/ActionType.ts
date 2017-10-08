import { relative } from 'path'
import { NodeLike, ActionLike } from "../interfaces";
import clone from "./clone";

namespace ActionType {
    const _cache: { [key: string]: Descriptor } = {};

    export abstract class AbstractDescriptor {
        readonly actionName: string;
        readonly keyPath?: string;
        readonly actionType: string;

        abstract readonly isBasic: boolean;
        abstract readonly isGeneric: boolean;
        abstract readonly isBound: boolean;

        constructor(actionName: string, keyPath?: string) {
            if (this.constructor === AbstractDescriptor) {
                throw new TypeError("Cannot instantiate abstract class: ActionType.Descriptor")
            }

            this.actionName = actionName;
            this.keyPath = keyPath;

            if (keyPath === undefined) {
                this.actionType = actionName
            } else {
                this.actionType = `${actionName}:${keyPath}`
            }
        }
    }

    export class BasicDescriptor extends AbstractDescriptor {
        readonly keyPath = undefined;
        readonly isBasic = true;
        readonly isGeneric = false;
        readonly isBound = false;

        constructor(actionName: string) {
            super(actionName, undefined)
        }
    }

    export class GenericDescriptor extends AbstractDescriptor {
        readonly keyPath = "*";
        readonly isBasic = false;
        readonly isGeneric = true;
        readonly isBound = false;

        constructor(actionName: string) {
            super(actionName, "*")
        }

        getBound(keyPath: string) {
            return parse(`${this.actionName}:${keyPath}`) as BoundGenericDescriptor
        }
    }

    export class BoundGenericDescriptor extends AbstractDescriptor {
        readonly keyPath: string;
        readonly isBasic = false;
        readonly isGeneric = true;
        readonly isBound = true;

        constructor(actionName: string, keyPath: string) {
            super(actionName, keyPath)
            if (!keyPath.startsWith("/")) {
                throw new Error(`Invalid key path: ${keyPath}`)
            }
        }

        getGeneric() {
            return parse(`${this.actionName}:*`) as GenericDescriptor
        }

        matchExact(keyPath: string) {
            return keyPath === this.keyPath
        }

        matchDescendant(keyPath: string) {
            return !relative(keyPath, this.keyPath).startsWith("../")
        }
    }

    function _create(actionName: string, keyPath: string | void) {
        if (keyPath === undefined) {
            return new BasicDescriptor(actionName);
        }

        if (keyPath === "*") {
            return new GenericDescriptor(actionName);
        }

        return new BoundGenericDescriptor(actionName, keyPath);
    }

    export function parse(actionType: string) {
        if (!_cache[actionType]) {
            const parts = actionType.split(":");
            const [actionName, keyPath] = parts;

            if (parts.length > 2) {
                throw new Error(`Invalid action type: ${actionType}`)
            }

            _cache[actionType] = _create(actionName, keyPath)
        }
        return _cache[actionType]
    }

    export function getGenericOrLiteralForModel(concreteActionType: string, model: NodeLike) {
        const d = parse(concreteActionType)
        let genericActionType = d.actionType

        if (d.isBound) {
            const keyPathDoesMatch = model.hasChildren
                ? d.matchDescendant(model.keyPath)
                : d.matchExact(model.keyPath)

            if (keyPathDoesMatch) {
                genericActionType = d.getGeneric().actionType
            }
        }

        return genericActionType
    }

    export function bindGenericToModel(actionType: string, model: NodeLike) {
        const d = parse(actionType)

        if (!d.isGeneric) {
            throw new Error(`Cannot bind non-generic action type '${d.actionType}' to model`)
        }

        if (d.isBound) {
            throw new Error(`Cannot bind bound action type '${d.actionType}' to model`)
        }

        return d.getBound(model.keyPath).actionType
    }

    export function bindActionCreatorToModel(actionCreator: (...args: any[]) => ActionLike, model: NodeLike) {
        return (...args: any[]) => {
            const action = clone(actionCreator(...args))
            const descriptor = parse(action.type)

            if (descriptor.isBasic) {
                return action
            }

            if (descriptor.isBound) {
                throw new Error(`Unexpected bound generic action '${descriptor.actionType}'. Input action creator must return basic action or unbound generic action`);
            }

            action.type = descriptor.getBound(model.keyPath).actionType
            return action
        }
    }

    export type Descriptor = BasicDescriptor | GenericDescriptor | BoundGenericDescriptor;
}

export default ActionType