import { ActionCreatorMap, ModelInterface, ActionLike, Epic, Reducer, Schema, InputAction } from '../interfaces';
import { AbstractModel } from './AbstractModel';
import { UpdateContext } from "./UpdateContext";
import { Observable } from "./Observable";

export class Model<
  State = void,
  ActionCreators extends ActionCreatorMap = {},
  Dependencies extends Schema = {}
> extends AbstractModel<State, ActionCreators, Dependencies> {
  update(state: State, context: UpdateContext<Dependencies>) {
    return state
  }

  process(action$: Observable<ActionLike>, model: this) {
    return Observable.empty<InputAction>() as ZenObservable.ObservableLike<InputAction>
  }

  constructor(options: {
    dependencies?: Dependencies,
    update?: Reducer<State, Dependencies>,
    process?: Epic<ModelInterface>,
    accept?: string[],
    dump?: (state: State | void) => any,
    load?: (dump: any, updateContext: UpdateContext<Dependencies>) => State | void,
    actionCreators?: ActionCreators,
  }) {
    super()

    if (options.dependencies) {
      this._dependencies = options.dependencies
    }

    if (options.update) {
      this.update = options.update
    }

    if (options.process) {
      this.process = options.process
    }

    if (options.accept) {
      this._accept = options.accept
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
