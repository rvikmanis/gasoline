import BaseObservable from "zen-observable"

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
    return ctor !== undefined ? ctor : BaseObservable;
}

export class Observable<T> extends BaseObservable<T> {
    static from<R>(observable: Observable<R> | ZenObservable.ObservableLike<R> | ArrayLike<R>): Observable<R> {
        return super.from(observable) as Observable<R>
    }

    static of<R>(...items: R[]): Observable<R> {
        return super.of(...items) as Observable<R>
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
    reduce<R>(callback: (previousValue: R, currentValue: T) => R, initialValue?: R): Observable<R> {
        return super.reduce(callback, initialValue) as Observable<R>
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

    switchMap<R>(callback: (value: T) => ZenObservable.ObservableLike<R>): Observable<R> {
        if (typeof callback !== "function") {
            throw new TypeError(callback + " is not a function")
        }

        const C = getSpecies(this) as new (subscriber: ZenObservable.Subscriber<R>) => Observable<R>;

        return new C(observer => {
            let completed = false;
            let subscriptions: ZenObservable.Subscription[] = [];
            let innerSubscription: undefined | ZenObservable.Subscription

            const closeIfDone = () => {
                if (completed && subscriptions.length === 0) {
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

                    innerSubscription = Observable.from(inner).subscribe(innerObserver)
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
                if (innerSubscription) {
                    innerSubscription.unsubscribe();
                }
                outerSubscription.unsubscribe();
            };
        })
    }

    share() {
        const subject = new Subject<T>()
        this.subscribe(subject)
        return subject.observable
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

export class Subject<T> {
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
            sendMessage(this._observer as ZenObservable.SubscriptionObserver<T>, message, value);
        } else if (this._observers) {
            this._observers.forEach(to => { sendMessage(to as ZenObservable.SubscriptionObserver<T>, message, value) });
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

export class BehaviorSubject<T> extends Subject<T> {
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