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
    state?: State,
    dependencies?: Dependencies,
    actions?: { [key: string]: (state: State, payload?: any) => void | State },
    update?: Reducer<State, Dependencies>,
    process?: Epic,
    accept?: string[],
    dump?: (state: State | void) => any,
    load?: (dump: any, updateContext: UpdateContext<Dependencies>) => State | void,
  }) {
    super()

    if (options.dependencies) {
      this._dependencies = options.dependencies
    }

    if (options.actions) {
      this._actionTypes = Object.keys(options.actions)
    }

    this.update = (state: State, context: UpdateContext<Dependencies>) => {
      if (state === undefined) {
        state = options.state as any
      }

      if (options.actions) {
        const actionTypeKey = this.getActionTypeKey(context.action.type)
        const actionHandler = options.actions[actionTypeKey]
        if (actionHandler) {
          const newState = actionHandler(state, context.action.payload)
          if (newState !== undefined) {
            state = newState
          }
        }
      }

      if (options.update) {
        state = options.update(state, context)
      }

      return state
    }

    if (options.process) {
      this.process = options.process as any as this["process"]
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
  }
}
