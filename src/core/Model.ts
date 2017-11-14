import { ActionCreatorMap, Epic, Reducer, Schema } from '../interfaces';
import { AbstractModel, ModelOptions } from './AbstractModel';

export class Model<State = void, ActionCreators extends ActionCreatorMap = {}, Dependencies extends Schema = {}> extends AbstractModel<State, ActionCreators, Dependencies> {
    update: Reducer<State, Dependencies>;
    process: Epic<AbstractModel<State, ActionCreators, Dependencies>>;

    constructor(options: ModelOptions<State, ActionCreators, Dependencies>) {
        super()
        AbstractModel.initializeOptions(this, options)
    }
}
