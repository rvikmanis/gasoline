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
        accept?: string[],
        dump?: (state: S | void) => any,
        load?: (dump: any, updateContext: UpdateContext<SchemaLike>) => S | void,
        actionCreators?: AC,
        persistent?: boolean
    }) {
        super()

        const persistent = options.persistent === undefined
            ? true
            : options.persistent

        if (options.dependencies) {
            this.dependencies = options.dependencies
        }

        let stateLess = false
        if (typeof options.update === 'function') {
            this.update = options.update
        } else {
            this.update = <any>(() => undefined)
            stateLess = true
        }

        this.process = typeof options.process === 'function'
            ? options.process
            : () => ActionsObservable.empty()

        if (stateLess || !persistent) {
            this.dump = () => undefined
            this.load = () => undefined
        } else {
            if (options.dump) {
                this.dump = options.dump
            }
            if (options.load) {
                this.load = options.load
            }
        }

        if (options.accept) {
            this.accept = options.accept
        }

        if (options.actionCreators) {
            this.actionCreators = options.actionCreators
        }
    }
}

export default Model