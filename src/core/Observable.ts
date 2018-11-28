import BaseObservable from "zen-observable"
import { ActionLike } from "../interfaces";
import { matchActionType } from "../helpers/matchActionType";

function hasSymbol(name: string) {
    return typeof Symbol === "function" && Boolean((Symbol as any)[name]);
}

function getSymbol(name: string): symbol {
    return hasSymbol(name) ? (Symbol as any)[name] : "@@" + name;
}

function getSpecies(obj: object) {
    let ctor: Function | undefined = obj.constructor;
    if (ctor !== undefined) {
        ctor = (ctor as any)[getSymbol("species")];
        if (ctor === null) {
            ctor = undefined;
        }
    }
    return ctor !== undefined ? ctor : Observable;
}

export class Observable<T> extends BaseObservable<T> {
    constructor(subscriber: ZenObservable.Subscriber<T>) {
        super(subscriber)
    }

    subscribe(observer: ZenObservable.Observer<T>): ZenObservable.Subscription;
    subscribe(
        onNext: (value: T) => void,
        onError?: (error: any) => void,
        onComplete?: () => void
    ): ZenObservable.Subscription;
    subscribe(onNext: any, onError?: any, onComplete?: any): any {
        return super.subscribe(onNext, onError, onComplete)
    }

    static from<R>(observable: Observable<R> | ZenObservable.ObservableLike<R> | ArrayLike<R>): Observable<R> {
        return super.from(observable) as Observable<R>
    }

    static of<R>(...items: R[]): Observable<R> {
        return super.of(...items) as Observable<R>
    }

    static empty<T>() {
        return new this<T>(observer => {
            observer.complete();
        })
    }

    static interval(period: number) {
        if (typeof period !== "number") {
            throw new TypeError(period + " is not a number")
        }

        return new this<number>(observer => {
            let n = 0
            const timer = setInterval(() => { observer.next(n++) }, period)
            return () => {
                clearInterval(timer)
            }
        })
    }

    static timer(initialDelay: number, period?: number) {
        if (typeof initialDelay !== "number") {
            throw new TypeError(initialDelay + " is not a number")
        }

        if (period !== undefined && typeof period !== "number") {
            throw new TypeError(period + " is not a number")
        }

        return new this<number>(observer => {
            let n = 0
            let sub: ZenObservable.Subscription;
            const timer = setTimeout(() => {
                observer.next(n++)
                if (period !== undefined) {
                    sub = this.interval(period).subscribe({
                        next() { observer.next(n++) },
                        error(e) { observer.error(e) },
                        complete() { observer.complete() }
                    })
                } else {
                    observer.complete()
                }
            }, initialDelay);
            return () => {
                clearTimeout(timer)
                if (sub) {
                    sub.unsubscribe()
                }
            }
        })
    }

    static merge<R>(...observables: ZenObservable.ObservableLike<R>[]) {
        return this.of(...observables).mergeAll()
    }

    static combineLatest<R>(...observables: ZenObservable.ObservableLike<R>[]) {
        return new this<R[]>(observer => {
            const subscriptions: ZenObservable.Subscription[] = [];
            const values: R[] = [];
            const tally = observables.map(() => false)

            observables.forEach((observableLike, index) => {
                const innerObserver = {
                    _sub: undefined,

                    start(subscription) {
                        subscriptions.push((this as any)._sub = subscription)
                    },

                    next(value) {
                        values[index] = value
                        tally[index] = true
                        if (tally.indexOf(false) === -1) {
                            observer.next(values.concat())
                        }
                    },
                    error(e) {
                        observer.error(e)
                    },

                    complete() {
                        let i = subscriptions.indexOf((this as any)._sub);

                        if (i >= 0) {
                            subscriptions.splice(i, 1);
                        }

                        if (subscriptions.length === 0) {
                            observer.complete();
                        }
                    }
                } as ZenObservable.Observer<R>

                Observable.from(observableLike).subscribe(innerObserver)
            })

            return () => {
                subscriptions.forEach(s => s.unsubscribe());
            }
        })
    }

    [Symbol.observable](): Observable<T> {
        return this
    }

    map<R>(callback: (value: T) => R): Observable<R> {
        return super.map(callback) as Observable<R>
    }

    filter(callback: (value: T) => boolean): Observable<T> {
        return super.filter(callback) as Observable<T>
    }

    reduce(callback: (previousValue: T, currentValue: T) => T, initialValue?: T): Observable<T>;
    reduce<R>(callback: (previousValue: R, currentValue: T) => R, initialValue?: R): Observable<R>;
    reduce(callback: (...args: any[]) => any, initialValue?: any): Observable<any> {
        return super.reduce(callback, initialValue) as Observable<any>
    }

    protected _matchType(actionTypes: string[], matchValue: boolean) {
        const cache = {};

        return this.filter((action: T) => {
            if (typeof action !== "object") {
                return false
            }

            if (action == null) {
                return false
            }

            if (typeof (action as any as ActionLike).type !== "string") {
                return false
            }

            return matchValue === matchActionType(
                actionTypes,
                (action as any as ActionLike).type,
                cache
            )
        })
    }

    ofType(...actionTypes: string[]) {
        return this._matchType(actionTypes, true)
    }

    notOfType(...actionTypes: string[]) {
        return this._matchType(actionTypes, false)
    }

    flatMap<R>(callback: (value: T) => ZenObservable.ObservableLike<R>): Observable<R> {
        if (typeof callback !== "function") {
            throw new TypeError(callback + " is not a function")
        }

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<R>) => Observable<R>;

        return new C(observer => {
            let completed = false;
            let subscriptions: ZenObservable.Subscription[] = [];

            const closeIfDone = () => {
                if (completed && subscriptions.length === 0) {
                    observer.complete();
                }
            }

            const outerSubscription = this.subscribe({
                next(value) {
                    let inner: ZenObservable.ObservableLike<R>

                    try {
                        inner = callback(value)
                    } catch (error) {
                        observer.error(error)
                        return
                    }

                    const innerObserver = {
                        _sub: undefined,

                        start(subsciption) {
                            subscriptions.push((this as any)._sub = subsciption)
                        },

                        next(value) {
                            observer.next(value)
                        },
                        error(e) {
                            observer.error(e)
                        },

                        complete() {
                            let i = subscriptions.indexOf((this as any)._sub);

                            if (i >= 0) {
                                subscriptions.splice(i, 1);
                            }

                            closeIfDone();
                        }
                    } as ZenObservable.Observer<R>

                    Observable.from(inner).subscribe(innerObserver)
                },

                error(e) {
                    return observer.error(e);
                },

                complete() {
                    completed = true;
                    closeIfDone();
                }
            })

            return () => {
                subscriptions.forEach(s => s.unsubscribe());
                outerSubscription.unsubscribe();
            };
        })
    }

    mergeMap<R>(callback: (value: T) => ZenObservable.ObservableLike<R>): Observable<R> {
        return this.flatMap(callback) as Observable<R>
    }

    mergeAll<R>(this: Observable<ZenObservable.ObservableLike<R>>): Observable<R> {
        return this.mergeMap(v => v)
    }

    merge<R>(other: ZenObservable.ObservableLike<R>): Observable<T | R> {
        return Observable.merge<T | R>(this, other)
    }

    switchMap<R>(callback: (value: T) => ZenObservable.ObservableLike<R>): Observable<R> {
        if (typeof callback !== "function") {
            throw new TypeError(callback + " is not a function")
        }

        type a = this
        type b = new () => a

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<R>) => Observable<R>;

        return new C(observer => {
            let completed = false;
            let innerSubscription: undefined | ZenObservable.Subscription

            const closeIfDone = () => {
                if (completed && !innerSubscription) {
                    observer.complete();
                }
            }

            const outerSubscription = this.subscribe({
                next(value) {
                    let inner: ZenObservable.ObservableLike<R>

                    if (innerSubscription && !innerSubscription.closed) {
                        innerSubscription.unsubscribe()
                    }

                    try {
                        inner = callback(value)
                    } catch (error) {
                        observer.error(error)
                        return
                    }

                    const innerObserver = {
                        _sub: undefined,

                        start(subsciption) {
                            innerSubscription = subsciption
                        },

                        next(value) {
                            observer.next(value)
                        },
                        error(e) {
                            observer.error(e)
                        },

                        complete() {
                            innerSubscription = undefined
                            closeIfDone();
                        }
                    } as ZenObservable.Observer<R>

                    Observable.from(inner).subscribe(innerObserver)
                },

                error(e) {
                    return observer.error(e);
                },

                complete() {
                    completed = true;
                    closeIfDone();
                }
            })

            return () => {
                if (innerSubscription) {
                    innerSubscription.unsubscribe();
                }
                outerSubscription.unsubscribe();
            };
        })
    }

    switch<R>(this: Observable<ZenObservable.ObservableLike<R>>) {
        return this.switchMap(v => v)
    }

    throttleTime(period: number) {
        if (typeof period !== "number") {
            throw new TypeError(period + " is not a number")
        }

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<T>) => Observable<T>;

        return new C(observer => {
            let isOpen = true
            let timer: any

            const s = this.subscribe({
                next(value) {
                    if (isOpen) {
                        observer.next(value)
                        isOpen = false
                        timer = setTimeout(() => { isOpen = true }, period)
                    }
                },
                error(e) { return observer.error(e) },
                complete() { observer.complete() }
            })

            return () => {
                s.unsubscribe()
                clearTimeout(timer)
            }
        })
    }

    auditTime(period: number) {
        if (typeof period !== "number") {
            throw new TypeError(period + " is not a number")
        }

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<T>) => Observable<T>;

        return new C(observer => {
            let isOpen = true
            let timer: any
            let value: T

            const s = this.subscribe({
                next(v) {
                    value = v
                    if (isOpen) {
                        isOpen = false
                        timer = setTimeout(() => {
                            observer.next(value)
                            isOpen = true
                        }, period)
                    }
                },
                error(e) { return observer.error(e) },
                complete() { observer.complete() }
            })

            return () => {
                s.unsubscribe()
                clearTimeout(timer)
            }
        })
    }

    take(count: number) {
        if (typeof count !== "number") {
            throw new TypeError(count + " is not a number")
        }

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<T>) => Observable<T>;

        return new C(observer => {
            let i = 0
            return this.subscribe({
                next(value) {
                    if (i++ < count) {
                        observer.next(value)
                    }

                    if (i >= count) {
                        observer.complete()
                    }
                },
                error(e) { return observer.error(e) },
                complete() { observer.complete() }
            })
        })
    }

    skip(count: number) {
        if (typeof count !== "number") {
            throw new TypeError(count + " is not a number")
        }

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<T>) => Observable<T>;

        return new C(observer => {
            let i = 0
            return this.subscribe({
                next(value) {
                    if (i++ >= count) {
                        observer.next(value)
                    }
                },
                error(e) { return observer.error(e) },
                complete() { observer.complete() }
            })
        })
    }

    takeUntil(notifier: ZenObservable.ObservableLike<any>) {
        const observableNotifier = Observable.from(notifier)

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<T>) => Observable<T>;

        return new C(observer => {
            const notifierSubscription = observableNotifier.take(1).subscribe({
                next() {
                    observer.complete()
                },
                complete() {
                    observer.complete()
                }
            })

            const subscription = this.subscribe({
                next(value) { observer.next(value) },
                error(e) { return observer.error(e) },
                complete() { observer.complete() }
            })

            return () => {
                notifierSubscription.unsubscribe()
                subscription.unsubscribe()
            }
        })
    }

    share() {
        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<T>) => Observable<T>;
        let refCount = 0;

        const subject = new StreamSource<T>()
        let outerSubscription: ZenObservable.Subscription | undefined;

        return new C(observer => {
            const innerSubscription = subject.observable.subscribe(observer)

            if (++refCount >= 1) {
                if (!outerSubscription) {
                    outerSubscription = this.subscribe(subject)
                }
            }

            return () => {
                if (--refCount < 1) {
                    if (outerSubscription) {
                        outerSubscription.unsubscribe()
                        outerSubscription = undefined
                    }
                }

                innerSubscription.unsubscribe()
            }
        })
    }
}

function sendMessage<T>(observer: ZenObservable.SubscriptionObserver<T>, message: 'next', value: T): void;
function sendMessage<T>(observer: ZenObservable.SubscriptionObserver<T>, message: 'error', value?: any): void;
function sendMessage<T>(observer: ZenObservable.SubscriptionObserver<T>, message: 'complete', value?: void): void;
function sendMessage<T>(observer: any, message: any, value?: any) {
    if (observer.closed) {
        return;
    }
    switch (message) {
        case 'next': return observer.next(value);
        case 'error': return observer.error(value);
        case 'complete': return observer.complete();
    }
}

export class StreamSource<T> {
    protected _observable: Observable<T>;
    protected _observer?: ZenObservable.SubscriptionObserver<T>;
    protected _observers?: Set<ZenObservable.SubscriptionObserver<T>>;

    get observable() {
        return this._observable
    }

    [Symbol.observable](): Observable<T> {
        return this.observable
    }

    protected _addObserver(observer: ZenObservable.SubscriptionObserver<T>) {
        if (this._observers) {
            this._observers.add(observer);
        } else if (!this._observer) {
            this._observer = observer;
        } else {
            this._observers = new Set();
            this._observers.add(this._observer);
            this._observers.add(observer);
            this._observer = undefined;
        }
    }

    protected _removeObserver(observer: ZenObservable.SubscriptionObserver<T>) {
        if (this._observers) {
            this._observers.delete(observer);
        } else if (this._observer === observer) {
            this._observer = undefined;
        }
    }

    protected _send(message: 'next', value: T): void;
    protected _send(message: 'error', value?: any): void;
    protected _send(message: 'complete', value?: void): void;
    protected _send(message: any, value?: any) {
        if (this._observer) {
            sendMessage(this._observer, message, value);
        } else if (this._observers) {
            this._observers.forEach(to => { sendMessage(to, message, value) });
        }
    }

    protected _onSubscribe(observer: ZenObservable.SubscriptionObserver<T>) {
        this._addObserver(observer)
        return () => { this._removeObserver(observer) }
    }

    constructor() {
        this._observable = new Observable(observer => this._onSubscribe(observer))
    }

    next(value: T) {
        this._send("next", value)
    }

    error(value: any) {
        this._send("error", value)
    }

    complete() {
        this._send("complete")
    }
}

export class ValueSource<T> extends StreamSource<T> {
    protected _value: T;

    protected _onSubscribe(observer: ZenObservable.SubscriptionObserver<T>) {
        this._addObserver(observer)
        observer.next(this._value)
        return () => { this._removeObserver(observer) }
    }

    constructor(initialValue: T) {
        super()
        this._value = initialValue
    }

    next(value: T) {
        this._send("next", this._value = value)
    }
}
