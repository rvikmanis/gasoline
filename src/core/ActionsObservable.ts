import { Operator } from "rxjs/Operator";
import { ObservableInput, Subscribable } from 'rxjs/Observable'
import { PartialObserver } from 'rxjs/Observer'
import { observable as Symbol_observable } from 'rxjs/symbol/observable'
import { TeardownLogic, Subscription } from "rxjs/Subscription";
import { Subscriber } from "rxjs/Subscriber";
import { Observable } from 'rxjs'

const {
  of,
  from,
  merge,
  empty
} = Observable

const {
  filter,
  map,
  switchMap,
  mergeMap
} = Observable.prototype

import { ActionLike, DispatchedActionLike } from "../interfaces";
import matchActionType from "../helpers/matchActionType";
import { IScheduler } from "rxjs/Scheduler";

export type Source<T> = ActionsObservable<T> | Observable<T>

export class ActionsObservable<T = ActionLike> implements Subscribable<T> {
  protected source: Source<any>
  protected operator: Operator<any, T>
  protected _observable: Observable<T>

  static of<T = ActionLike>(...actions: T[]) {
    return new this<T>(of(...actions))
  }

  static from<T = ActionLike>(input: ObservableInput<T>, scheduler?: IScheduler) {
    return new this<T>(from(input, scheduler))
  }

  static merge<T = ActionLike>(...inputs: ObservableInput<T>[]) {
    return new this<T>(merge(...inputs))
  }

  static empty<T = ActionLike>() {
    return new this<T>(empty())
  }

  constructor(source?: Source<T>) {
    if (source) {
      this.source = source
    }
  }

  subscribe(): Subscription;
  subscribe(observer: PartialObserver<T>): Subscription;
  subscribe(next?: (value: T) => void, error?: (error: any) => void, complete?: () => void): Subscription;
  subscribe(
    observerOrNext?: PartialObserver<T> | ((value: T) => void),
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription {
    return Observable.prototype.subscribe.apply(this, arguments)
  }

  protected _subscribe(subscriber: Subscriber<any>): TeardownLogic {
    return this.source.subscribe(subscriber);
  }

  [Symbol_observable]() {
    return this
  }

  get observable() {
    if (!this._observable) {
      this._observable = Observable.from(this)
    }

    return this._observable
  }

  lift<R>(operator: Operator<T, R>): ActionsObservable<R> {
    const obs = new ActionsObservable<R>()
    obs.source = this as any
    obs.operator = operator
    return obs
  }

  private _matchType(actionTypes: string[], matchValue: boolean) {
    const cache = {}

    return this.filter((action: T & DispatchedActionLike) =>
      matchValue === matchActionType(actionTypes, action.type, cache)
    )
  }

  ofType(...actionTypes: string[]) {
    return this._matchType(actionTypes, true)
  }

  notOfType(...actionTypes: string[]) {
    return this._matchType(actionTypes, false)
  }

  filter(predicate: (value: T, index: number) => boolean): ActionsObservable<T> {
    return filter.call(this, predicate)
  }

  map<T, R>(this: ActionsObservable<T>, project: (value: T, index: number) => R): ActionsObservable<R> {
    return map.call(this, (value: T & DispatchedActionLike, index: number): R => {
      return resultSelector(value, project(value, index) as any)
    })
  }

  mergeMap<T, R>(this: ActionsObservable<T>, project: (value: T, index: number) => ObservableInput<R>, concurrent?: number): ActionsObservable<R> {
    return mergeMap.call(this, project, resultSelector, concurrent)
  }

  switchMap<T, R>(this: ActionsObservable<T>, project: (value: T, index: number) => ObservableInput<R>): ActionsObservable<R> {
    return switchMap.call(this, project, resultSelector)
  }
}

function resultSelector<T, R>(outerValue: T & DispatchedActionLike, innerValue: R & ActionLike): R {
  return Object.assign({}, innerValue, {
    meta: Object.assign({}, innerValue.meta, {
      replyTo: outerValue.meta.dispatch.id
    })
  })
}

export default ActionsObservable