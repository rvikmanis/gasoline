import { AbstractModel, ModelOptions } from './AbstractModel'
import { UpdateContext } from './UpdateContext'
import { Schema, Reducer, Epic, ActionCreatorMap, ActionLike } from "../interfaces";
import { Observable } from "rxjs";

export class Model<State = void, ActionCreators extends ActionCreatorMap = {}, Dependencies extends Schema = {}> extends AbstractModel<State, ActionCreators, Dependencies> {
    update: Reducer<State, Dependencies>;
    process: Epic<this>;

    constructor(options: ModelOptions<State, ActionCreators, Dependencies>) {
        super()
        AbstractModel.initializeOptions(this, options)
    }
}
