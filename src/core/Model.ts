import { AbstractModel } from './AbstractModel'
import { UpdateContext } from './UpdateContext'
import { Schema, Reducer, Epic, ActionCreatorMap, ActionLike } from "../interfaces";
import { Observable } from "rxjs";

export class Model<State = void, ActionCreators extends ActionCreatorMap = {}, Dependencies extends Schema = {}> extends AbstractModel<State, ActionCreators, Dependencies> {
    update: Reducer<State, Dependencies>;
    process: Epic<this>;

    constructor(options: {
        dependencies?: Dependencies,
        update?: Reducer<State, Dependencies>,
        process?: Epic<Model<State, ActionCreators, Dependencies>>,
        initialState?: State,
        actionHandlers?: { [key: string]: Reducer<State, Dependencies> },
        accept?: string[],
        acceptExtra?: string[],
        dump?: (state: State | void) => any,
        load?: (dump: any, updateContext: UpdateContext<Schema>) => State | void,
        actionCreators?: ActionCreators,
        persistent?: boolean
    }) {
        super()

        const {
            dependencies,
            accept,
            acceptExtra,
            actionCreators,
            initialState,
            update = ((s: State) => s),
            process = (() => Observable.empty()),
            actionHandlers = {},
            dump,
            load,
            persistent = true
        } = options

        const stateLess = !options.update && !options.actionHandlers

        if (dependencies) {
            this.dependencies = dependencies
        }

        if (accept) {
            this.accept = accept
        } else {
            if (options.actionHandlers) {
                const acceptHandlers = Object.keys(actionHandlers)
                if (!options.process && !options.update) {
                    this.accept = acceptHandlers
                } else if (acceptExtra) {
                    this.accept = acceptHandlers.concat(acceptExtra)
                }
            }
        }

        if (actionCreators) {
            this._actionCreators = actionCreators
        }

        this.update = (state: State = initialState as State, updateContext) => {
            const { genericActionType } = updateContext
            if (genericActionType in actionHandlers) {
                state = actionHandlers[genericActionType](state, updateContext)
            }
            return update(state, updateContext)
        }

        this.process = process

        if (dump) {
            this.dump = dump
        }

        if (load) {
            this.load = load
        }

        if (stateLess || !persistent) {
            this.dump = () => undefined
            this.load = () => undefined
        }
    }
}
