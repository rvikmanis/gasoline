import BaseObservable from "zen-observable"

function hasSymbol(name: string) {
    return typeof Symbol === "function" && Boolean((Symbol as any)[name]);
}

function getSymbol(name: string): symbol {
    return hasSymbol(name) ? (Symbol as any)[name] : "@@" + name;
}

function getMethod(obj: { [key: string]: any }, key: string): Function | undefined {
    let value = obj[key];

    if (value == null) {
        return undefined;
    }

    if (typeof value !== "function") {
        throw new TypeError(value + " is not a function");
    }

    return value;
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
        return super.flatMap(callback) as Observable<R>
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
}
