import { ActionCreatorMap, ActionLike, Schema, InputAction, StateOf } from '../interfaces';
import { AbstractModel } from './AbstractModel';
import { UpdateContext } from "./UpdateContext";
import { Observable } from "./Observable";

export class SelectorModel<
  State = void,
  ActionCreators extends ActionCreatorMap = {},
  Dependencies extends Schema = {}
  > extends AbstractModel<State, ActionCreators, Dependencies> {

  protected _getState: (dependencies: StateOf<Dependencies>) => State;

  update(state: State, context: UpdateContext<Dependencies>) {
    return this._getState(context.dependencies)
  }

  process(action$: Observable<ActionLike>, model: this) {
    return Observable.empty<InputAction>() as ZenObservable.ObservableLike<InputAction>
  }

  constructor(options: {
    dependencies: Dependencies,
    getState: (dependencies: StateOf<Dependencies>) => State,
    accept?: string[],
    dump?: (state: State | void) => any,
    load?: (dump: any, updateContext: UpdateContext<Dependencies>) => State | void,
    actionCreators?: ActionCreators,
  }) {
    super()

    this._dependencies = options.dependencies
    this._getState = options.getState

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
  }
}
