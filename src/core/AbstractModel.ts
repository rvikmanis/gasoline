import { createActionTarget } from '../helpers/createActionTarget';
import { dirname, resolve } from 'path';
import { Observable, Observer, Subscription } from 'rxjs';

import { mapValues } from '../helpers/mapValues';
import { matchActionType } from '../helpers/matchActionType';
import {
    ActionCreatorMap,
    ActionLike,
    Dict,
    DispatcherBoundActionCreatorMap,
    Epic,
    ModelInterface,
    Reducer,
    Schema,
} from '../interfaces';
import { Store } from './Store';
import { UpdateContext } from './UpdateContext';
import { clone } from "../helpers/clone";

type Deferred<T> = {
    promise: Promise<T>,
    resolve: (value?: T | PromiseLike<T>) => void
}

function createDeferred<T>() {
    const deferred = {} as Deferred<T>
    deferred.promise = new Promise<T>(resolve => {
        deferred.resolve = resolve
    })
    return deferred
}

export interface ModelOptions<State, ActionCreators extends ActionCreatorMap = {}, Dependencies extends Schema = {}> {
    dependencies?: Dependencies,
    update?: Reducer<State, Dependencies>,
    process?: Epic<ModelInterface>,
    initialState?: State,
    actionHandlers?: { [key: string]: Reducer<State, Dependencies> },
    accept?: string[],
    acceptExtra?: string[],
    dump?: (state: State | void) => any,
    load?: (dump: any, updateContext: UpdateContext<Schema>) => State | void,
    actionCreators?: ActionCreators,
    persistent?: boolean
}

export abstract class AbstractModel<State, ActionCreators extends ActionCreatorMap = {}, Dependencies extends Schema = {}> implements ModelInterface {
    protected _actionCreators: ActionCreators;
    private _linkedActionCreators: ActionCreators;
    private _actions: DispatcherBoundActionCreatorMap<ActionCreators>;
    private _allSubscriptions: Subscription;
    private _whenLinked: Deferred<void>
    private _actionTypeMatchCache: Dict<boolean>

    public abstract update: Reducer<State, Dependencies>;
    public abstract process: Epic<AbstractModel<State, ActionCreators, Dependencies>>;
    public dependencies: Dependencies;
    public isLinked: boolean
    public isDisposed: boolean
    public hasChildren: boolean
    public state$: Observable<State>
    public accept?: string[]
    public keyPath: string
    public store: Store

    static initializeOptions<S, A extends ActionCreatorMap = {}, D extends Schema = {}>(model: AbstractModel<S, A, D>, options: ModelOptions<S, A, D>) {
        const {
            dependencies,
            accept,
            acceptExtra,
            actionCreators,
            initialState,
            update = ((s: S) => s),
            process = (() => Observable.empty()),
            actionHandlers = {},
            dump,
            load,
            persistent = true
        } = options

        const stateLess = !options.update && !options.actionHandlers

        if (dependencies) {
            model.dependencies = dependencies
        }

        if (accept) {
            model.accept = accept
        } else {
            if (options.actionHandlers) {
                const acceptHandlers = Object.keys(actionHandlers)
                if (!options.process && !options.update) {
                    model.accept = acceptHandlers
                } else if (acceptExtra) {
                    model.accept = acceptHandlers.concat(acceptExtra)
                }
            }
        }

        if (actionCreators) {
            model._actionCreators = actionCreators
        }

        model.update = (state: S = initialState as S, updateContext) => {
            if (updateContext.action.type in actionHandlers) {
                state = actionHandlers[updateContext.action.type](state, updateContext)
            }
            return update(state, updateContext)
        }

        model.process = process as any

        if (dump) {
            model.dump = dump
        }

        if (load) {
            model.load = load
        }

        if (stateLess || !persistent) {
            model.dump = () => undefined
            model.load = () => undefined
        }
    }

    public constructor() {
        if (this.constructor === AbstractModel) {
            throw new TypeError('Cannot instantiate abstract class AbstractModel')
        }

        this._actionCreators = {} as ActionCreators
        this._allSubscriptions = new Subscription
        this._whenLinked = createDeferred()
        this._actionTypeMatchCache = {}

        this.dependencies = {} as Dependencies
        this.isLinked = false
        this.isDisposed = false
        this.hasChildren = false

        this.state$ = Observable.create((observer: Observer<State>) => {
            if (this.isDisposed) {
                observer.error(`Cannot subscribe to disposed model: ${this.keyPath}`)
                return
            }

            const cancel = this._listenState(state => {
                observer.next(state)
            })

            this._allSubscriptions.add(cancel)

            return cancel;
        })
    }

    public get state(): State {
        return this.getStateFromDigest(this.store.digest)
    }

    public get actionCreators() {
        if (!this._linkedActionCreators) {
            this._linkedActionCreators = mapValues(this._actionCreators, (actionCreator) => {
                return (...args: any[]) => {
                    const action = clone(actionCreator(...args))
                    action.target = createActionTarget(this.keyPath, action.target)
                    return action
                }
            })
        }
        return this._linkedActionCreators
    }

    public get actions() {
        if (!this._actions) {
            this._actions = mapValues(this.actionCreators, actionCreator => {
                return (...args: any[]) => {
                    this.store.dispatch(actionCreator(...args))
                }
            })
        }
        return this._actions
    }

    link(keyPath: string, store: Store<any>): () => void {
        if (this.isDisposed) {
            throw new Error(`Cannot link disposed model '${this.keyPath}'`)
        }

        if (this.isLinked) {
            throw new Error(`Model '${this.keyPath}' is already linked`)
        }

        this.keyPath = keyPath
        this.store = store
        this.isLinked = true

        return () => {
            this._whenLinked.resolve()
        }
    }

    unlink() {
        delete this.store
        this.isLinked = false
        this.isDisposed = true

        this._allSubscriptions.unsubscribe();
    }

    private _callNowOrWhenDoneLinked(callback: () => void) {
        if (this.isLinked) {
            callback();
            return
        }

        this._whenLinked.promise.then(() => {
            if (this.isDisposed) {
                console.warn(`whenLinked callback failed to run: Model '${this.keyPath}' is disposed`)
                return;
            }
            callback();
        })
    }

    matchActionType(actionType: string) {
        // Match all actions unless accepted action types are initialized
        if (!this.accept) {
            return true
        }

        return matchActionType(this.accept, actionType, this._actionTypeMatchCache)
    }

    dump(state: State | void): any {
        return state
    }

    load(dump: any, updateContext: UpdateContext<Schema>): State | void {
        return dump
    }

    getStateFromDigest(digest: Dict<any>): State {
        return digest[this.keyPath]
    }

    private _listenState(listener: (state: State) => void) {
        const _listener = () => { listener(this.state) }

        if (this.isLinked) {
            _listener()
            return this.store.listen(`update ${this.keyPath}`, _listener)
        }

        let cancel: () => void;
        let cancelled = false;

        this._callNowOrWhenDoneLinked(() => {
            if (!cancelled) {
                _listener()
                cancel = this.store.listen(`update ${this.keyPath}`, _listener)
            }
        })

        return () => {
            if (!cancelled) {
                cancelled = true
                if (cancel) {
                    cancel();
                }
            }
        }
    }
}
