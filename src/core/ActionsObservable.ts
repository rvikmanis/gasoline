import { ActionLike, ModelInterface } from "../interfaces";
import { Operator } from "rxjs/Operator";
import { ObservableInput } from 'rxjs/Observable'
import { IScheduler } from "rxjs/Scheduler";
import { Observable } from 'rxjs'
import { ActionType } from "../helpers/ActionType"
import { matchActionType } from "../helpers/matchActionType";

export class ActionsObservable<T = ActionLike> extends Observable<T> {
  protected model: ModelInterface

  static of<T = ActionLike>(...actions: T[]) {
    return new this<T>(Observable.of(...actions))
  }

  static from<T = ActionLike>(input: ObservableInput<T>, scheduler?: IScheduler) {
    return new this<T>(Observable.from(input, scheduler))
  }

  constructor(source?: Observable<any>, model?: ModelInterface) {
    super()

    if (source) {
      this.source = source
    }

    if (model) {
      this.model = model
    }
  }

  lift<R>(operator: Operator<T, R>): ActionsObservable<R> {
    const obs = new ActionsObservable<R>(this, this.model)
    obs.operator = operator
    return obs
  }

  withModel(model: ModelInterface): ActionsObservable<T> {
    return new ActionsObservable(this, model)
  }

  private _matchType(actionTypes: string[], matchValue: boolean) {
    const cache = {};

    if (!this.model) {
      throw new Error(`action$.model is undefined`);
    }

    return this.filter((action: T & ActionLike) => {
      const genericActionType = ActionType.getGenericOrLiteralForModel(action.type, this.model)
      return matchValue === matchActionType(actionTypes, genericActionType, cache)
    }) as ActionsObservable<T>
  }

  ofType(...actionTypes: string[]) {
    return this._matchType(actionTypes, true)
  }

  notOfType(...actionTypes: string[]) {
    return this._matchType(actionTypes, false)
  }
}
