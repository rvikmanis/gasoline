import { join } from 'path';
import { Observable } from "./Observable";
import { matchActionType } from '../helpers/matchActionType';
import {
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
 * Abstract base for models.
 *
 * Extend this to create custom model classes.
 */
export abstract class AbstractModel<
    State,
    ActionTypeKeys extends string,
    Dependencies extends Schema = {}
    > implements ModelInterface {

    // ====
    // Core
    // ====

    /** A deferred that must be resolved when the model is linked */
    private _whenLinked: Deferred<void>;

    /** Cache used in `matchActionType` */
    private _actionTypeMatchCache: { [key: string]: boolean };

    /** Full primary key identifying the model instance within the store */
    public get keyPath() {
        return this._keyPath;
    }
    private _keyPath: string = undefined as any;

    /** The linked store */
    public get store() {
        return this._store;
    }
    private _store: Store = undefined as any;

    /** A flag indicating if the model is linked to a store */
    public get isLinked() {
        return this._isLinked;
    }
    private _isLinked: boolean;

    /** Bound action creators */
    public get actions() {
        return this._actions
    }
    private _actions: { [K in ActionTypeKeys]: (...args: any[]) => void };

    /** Unbound action creators */
    public get actionCreators() {
        return this._actionCreators;
    }
    private _actionCreators: { [K in ActionTypeKeys]: (...args: any[]) => ActionLike };

    /** Parent model in the state tree */
    public get parent() {
        return this._parent
    }
    private _parent?: ModelInterface;

    /** Observable of the model's state in the store */
    public readonly state$: Observable<State>;

    /** Model's current state in the store */
    public get state(): State {
        return this.getStateFromDigest(this.store.digest)
    }

    // =======
    // Options
    // =======

    /** State reducer */
    abstract update(state: State | undefined, updateContext: UpdateContext<Schema>): State;

    /** Side-effect and async action handler */
    abstract process(action$: Observable<ActionLike>, model: this): ZenObservable.ObservableLike<InputAction>;

    /**
     * Other models this model depends on.
     *
     * Every time the dependencies' state changes,
     * the model's `update` function is triggered within the same Dispatch Cycle.
     */
    public get dependencies() {
        return this._dependencies;
    }
    protected _dependencies: Dependencies;

    public getActionTypeKey(realActionType: string) {
        return this._actionTypesReverseMap[realActionType]
    }

    public get actionTypes() {
        return this._actionTypesMap
    }
    private _actionTypesMap: { [K in ActionTypeKeys]: string }
    private _actionTypesReverseMap: { [key: string]: string }
    protected _actionTypes: ActionTypeKeys[];

    /** List of action types the model accepts */
    public get accept(): string[] {
        if (!this._accept) {
            this._accept = this._calculateAcceptedActionTypes()
        }
        return this._accept;
    }
    private _accept?: string[];

    protected _calculateAcceptedActionTypes() {
        let accept = Object.keys(this._actionTypesReverseMap)
        for (const k in this.dependencies) {
            const dep = this.dependencies[k]
            accept = accept.concat(dep.accept)
        }
        return accept
    }

    // =======
    // Methods
    // =======

    constructor() {
        if (this.constructor === AbstractModel) {
            throw new TypeError('Cannot instantiate abstract class AbstractModel')
        }

        this._whenLinked = createDeferred()
        this._actionTypeMatchCache = {}
        this._isLinked = false
        this._actionTypesMap = {} as { [K in ActionTypeKeys]: string }
        this._actionTypesReverseMap = {}
        this._actionCreators = {} as { [K in ActionTypeKeys]: (...args: any[]) => ActionLike }
        this._actions = {} as { [K in ActionTypeKeys]: (...args: any[]) => void }

        this._actionTypes = []
        this._dependencies = {} as Dependencies

        this.state$ = new Observable((observer) => {
            return this._listenState(state => {
                observer.next(state)
            });
        })
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

        this._actionTypes.forEach(actionType => {
            const realActionType = `${this._keyPath}:${actionType}`
            this._actionTypesMap[actionType] = realActionType
            this._actionTypesReverseMap[realActionType] = actionType

            const unboundActionCreator = (payload: any) => ({
                type: realActionType,
                payload
            })
            this._actionCreators[actionType] = unboundActionCreator
            this._actions[actionType] = (payload: any) => {
                this.store.dispatch(unboundActionCreator(payload))
            }
        })

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

    getStateFromDigest(digest: Map<string, any>): State {
        return digest.get(this.keyPath)
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
