import AbstractModel, { ActionCreators } from './AbstractModel'
import UpdateContext from './UpdateContext'
import { SchemaLike, UpdateHandler, ProcessHandler, ActionLike } from "../interfaces";
import { ActionsObservable } from "../index";

export class Model<S = void, AC extends ActionCreators = {}, D extends SchemaLike = {}> extends AbstractModel<S, AC, D> {
    update: UpdateHandler<S, D>;
    process: ProcessHandler<this>;

    constructor(options: {
        dependencies?: D,
        update?: UpdateHandler<S, D>,
        process?: ProcessHandler<Model<S, AC, D>>,
        initialState?: S,
        actionHandlers?: { [key: string]: UpdateHandler<S, D> },
        accept?: string[],
        acceptExtra?: string[],
        dump?: (state: S | void) => any,
        load?: (dump: any, updateContext: UpdateContext<SchemaLike>) => S | void,
        actionCreators?: AC,
        persistent?: boolean
    }) {
        super()

        const {
            dependencies,
            accept,
            acceptExtra,
            actionCreators,
            initialState,
            update = ((s: S) => s),
            process = (() => ActionsObservable.empty()),
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
            this.actionCreators = actionCreators
        }

        this.update = (state: S = initialState as S, updateContext) => {
            const { action: { type: actionType } } = updateContext
            if (actionType in actionHandlers) {
                state = actionHandlers[actionType](state, updateContext)
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

export default Model