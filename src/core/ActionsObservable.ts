import { ActionLike, ModelInterface } from "../interfaces";
import { Operator } from "rxjs/Operator";
import { ObservableInput } from 'rxjs/Observable'
import { IScheduler } from "rxjs/Scheduler";
import { Observable } from 'rxjs'
import { matchActionType } from "../helpers/matchActionType";

export class ActionsObservable<T = ActionLike> extends Observable<T> {
  protected model: ModelInterface

  static of<T = ActionLike>(...actions: T[]) {
    return new this<T>(Observable.of(...actions))
  }

  static from<T = ActionLike>(input: ObservableInput<T>, scheduler?: IScheduler) {
    return new this<T>(Observable.from(input, scheduler))
  }

  constructor(source?: Observable<any>) {
    super()

    if (source) {
      this.source = source
    }
  }

  lift<R>(operator: Operator<T, R>): ActionsObservable<R> {
    const obs = new ActionsObservable<R>(this)
    obs.operator = operator
    return obs
  }

  private _matchType(actionTypes: string[], matchValue: boolean) {
    const cache = {};

    return this.filter((action: T & ActionLike) => {
      return matchValue === matchActionType(actionTypes, action.type, cache)
    }) as ActionsObservable<T>
  }

  ofType(...actionTypes: string[]) {
    return this._matchType(actionTypes, true)
  }

  notOfType(...actionTypes: string[]) {
    return this._matchType(actionTypes, false)
  }
}
