import { join } from 'path';
import { Observable } from "./Observable";
import { mapValues } from '../helpers/mapValues';
import { matchActionType } from '../helpers/matchActionType';
import {
    ActionCreatorMap,
    ActionLike,
    ModelInterface,
    Schema,
    InputAction,
} from '../interfaces';
import { Store } from './Store';
import { UpdateContext } from './UpdateContext';

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

/**
 * The abstract model.
 */
export abstract class AbstractModel<
    State,
    ActionCreators extends ActionCreatorMap = {},
    Dependencies extends Schema = {}
> implements ModelInterface {
    // Core internals
    /** A deferred that must be resolved when the model is linked */
    private _whenLinked: Deferred<void>;
    private _actionTypeMatchCache: { [key: string]: boolean };
    private _keyPath: string;
    private _store: Store;
    private _isLinked: boolean;
    private _linkedActionCreators: ActionCreators;
    private _actions: {[K in keyof ActionCreators]: (...args: any[]) => void };
    private _parent?: ModelInterface;

    // Options internals
    abstract update(state: State | undefined, updateContext: UpdateContext<Dependencies>): State;
    abstract process(action$: Observable<ActionLike>, model: this): ZenObservable.ObservableLike<InputAction>;
    protected _dependencies: Dependencies;
    protected _actionCreators: ActionCreators;
    protected _accept?: string[];

    // Core API
    public readonly state$: Observable<State>;

    public get keyPath() {
        return this._keyPath;
    }

    public get parent() {
        return this._parent
    }

    public get store() {
        return this._store;
    }

    public get isLinked() {
        return this._isLinked;
    }

    public get state(): State {
        return this.getStateFromDigest(this.store.digest)
    }

    // Options API
    public get dependencies() {
        return this._dependencies;
    }

    public get accept() {
        return this._accept;
    }

    public get actionCreators() {
        return this._actionCreators;
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

    // Methods
    constructor() {
        if (this.constructor === AbstractModel) {
            throw new TypeError('Cannot instantiate abstract class AbstractModel')
        }

        this._whenLinked = createDeferred()
        this._actionTypeMatchCache = {}
        this._isLinked = false

        this._actionCreators = {} as ActionCreators
        this._dependencies = {} as Dependencies

        this.state$ = new Observable((observer) => {
            return this._listenState(state => {
                observer.next(state)
            });
        })
    }

    isDescendantOf(ancestor: ModelInterface) {
        let model: ModelInterface = this
        while(model.parent !== undefined) {
            if (model.parent === ancestor) {
                return true
            }
            model = model.parent
        }
        return false
    }

    ready(callback: () => void) {
        this._callNowOrWhenDoneLinked(() => {
            this.store.ready(callback)
        })
    }

    link(store: Store<any>, parent?: ModelInterface, key?: string): () => void {
        if (this.isLinked) {
            throw new Error(`Model '${this.keyPath}' is already linked`)
        }

        if (parent && key) {
            this._parent = parent
            this._keyPath = join(parent.keyPath, `/${key}`)
        } else {
            this._keyPath = "/"
        }

        this._store = store
        this._isLinked = true

        return () => {
            this._whenLinked.resolve()
        }
    }

    unlink() {
        if (!this.isLinked) {
            throw new Error(`Model '${this.keyPath}' is not linked`)
        }

        delete this._store
        delete this._keyPath
        delete this._parent
        this._isLinked = false
        this._whenLinked = createDeferred()
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

    load(dump: any, updateContext: UpdateContext<Dependencies>): State | void {
        return dump
    }

    getStateFromDigest(digest: Map<ModelInterface, any>): State {
        return digest.get(this)
    }

    private _callNowOrWhenDoneLinked(callback: () => void) {
        if (this.isLinked) {
            callback();
            return
        }

        this._whenLinked.promise.then(() => {
            callback();
        })
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
