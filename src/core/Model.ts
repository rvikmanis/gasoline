import { ActionLike, Epic, Reducer, Schema, InputAction } from '../interfaces';
import { AbstractModel } from './AbstractModel';
import { UpdateContext } from "./UpdateContext";
import { Observable } from "./Observable";

export class Model<
  State,
  ActionTypeKeys extends string,
  Dependencies extends Schema = {}
  > extends AbstractModel<State, ActionTypeKeys, Dependencies> {

  update(state: State, context: UpdateContext<Dependencies>) {
    return state
  }

  process(action$: Observable<ActionLike>, model: this) {
    return Observable.empty<InputAction>() as ZenObservable.ObservableLike<InputAction>
  }

  constructor(options: {
    state?: State,
    dependencies?: Dependencies,
    update?: Reducer<State, Dependencies>,
    process?: Epic,
    dump?: (state: State | void) => any,
    load?: (dump: any, updateContext: UpdateContext<Dependencies>) => State | void,
  } & ({
    actions?: { [K in ActionTypeKeys]: (state: State, payload?: any) => State },
    actionTypes?: undefined
  } | {
    actionTypes?: ActionTypeKeys[],
    actions?: undefined
  })) {
    super()

    if (options.dependencies) {
      this._dependencies = options.dependencies
    }

    const actionHandlers: { [key: string]: (state: State, payload?: any) => State } = {}

    if (options.actions) {
      this._actionTypes = Object.keys(options.actions) as ActionTypeKeys[]
      for (const actionTypeKey in options.actions) {
        actionHandlers[actionTypeKey] = options.actions[actionTypeKey]
      }
    } else if (options.actionTypes) {
      this._actionTypes = options.actionTypes
    }

    this.update = (state: State, context: UpdateContext<Dependencies>) => {
      if (state === undefined) {
        state = options.state as any
      }

      if (options.actions) {
        const actionHandler = actionHandlers[this.getActionTypeKey(context.action.type)]
        if (actionHandler) {
          state = actionHandler(state, context.action.payload)
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

    if (options.dump) {
      this.dump = options.dump
    }

    if (options.load) {
      this.load = options.load
    }
  }
}
