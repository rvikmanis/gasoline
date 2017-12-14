import { ActionCreatorMap, ModelInterface, Epic, Reducer, Schema } from '../interfaces';
import { AbstractModel } from './AbstractModel';
import { UpdateContext } from "./UpdateContext";
import { Observable } from "rxjs";

export interface ModelOptions<State, ActionCreators extends ActionCreatorMap = {}, Dependencies extends Schema = {}> {
    dependencies?: Dependencies,
    update?: Reducer<State, Dependencies>,
    process?: Epic<ModelInterface>,
    accept?: string[],
    dump?: (state: State | void) => any,
    load?: (dump: any, updateContext: UpdateContext<Schema>) => State | void,
    actionCreators?: ActionCreators,
}

export class Model<State = void, ActionCreators extends ActionCreatorMap = {}, Dependencies extends Schema = {}> extends AbstractModel<State, ActionCreators, Dependencies> {
    update: Reducer<State, Dependencies>;
    process: Epic<AbstractModel<State, ActionCreators, Dependencies>>;

    constructor(options: ModelOptions<State, ActionCreators, Dependencies>) {
        super()
        const {
            dependencies,
            update = ((s: State) => s),
            process = (() => Observable.empty()),
            accept,
            dump,
            load,
            actionCreators
        } = options

        const stateLess = !options.update

        if (options.dependencies) {
            this.dependencies = options.dependencies
        }

        this.update = update
        this.process = process

        if (options.accept) {
            this.accept = options.accept
        }

        if (options.dump) {
            this.dump = options.dump
        }

        if (options.load) {
            this.load = options.load
        }

        if (options.actionCreators) {
            this._actionCreators = options.actionCreators
        }

        if (!options.update) {
            // Models without state don't need serialization.
            // Keys with undefined values are not included
            // in the dump (see CombinedModel#dump)
            this.dump = () => undefined
            this.load = () => undefined
        }
    }
}
