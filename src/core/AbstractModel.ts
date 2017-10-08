import { Dict, NodeLike, UpdateHandler, ProcessHandler, SchemaLike, ActionLike } from "../interfaces";
import UpdateContext from "./UpdateContext";
import matchActionType from '../helpers/matchActionType'
import Store from "./Store";
import { Observable, Subscription, Observer } from "rxjs";
import mapValues from "../helpers/mapValues";
import clone from "../helpers/clone";
import ActionType from "../helpers/ActionType";

export type ActionCreators = { [key: string]: (...args: any[]) => ActionLike }

export abstract class AbstractModel<State, AC extends ActionCreators = {}, Dependencies extends SchemaLike = {}> implements NodeLike {
    public dependencies = {} as Dependencies;
    public abstract update: UpdateHandler<State, Dependencies>;
    public abstract process: ProcessHandler<this>;
    public accept?: string[]
    protected _actionCreators: AC = {} as AC;
    private _linkedActionCreators: AC;
    private _actions: {[K in keyof this["actionCreators"]]: (...args: any[]) => void };

    public keyPath: string
    public store: Store
    public isLinked = false
    public isDisposed = false

    public hasChildren: boolean = false;

    private _allSubscriptions = new Subscription;

    private _whenLinked: {
        promise: Promise<void>,
        resolve: () => void
    }

    public state$: Observable<State> = Observable.create((observer: Observer<State>) => {
        const cancel = this._listenState(state => {
            observer.next(state)
        })

        this._allSubscriptions.add(() => {
            cancel();
            observer.complete();
        })

        return cancel;
    })

    constructor() {
        if (this.constructor === AbstractModel) {
            throw new TypeError('Cannot instantiate abstract class AbstractModel')
        }

        const deferred = {} as any;
        deferred.promise = new Promise(resolve => {
            deferred.resolve = resolve
        })
        this._whenLinked = deferred
    }

    public whenLinked(callback: () => void) {
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

    public get actionCreators() {
        if (!this._linkedActionCreators) {
            this._linkedActionCreators = mapValues(this._actionCreators || {}, (actionCreator) => {
                return ActionType.bindActionCreatorToModel(actionCreator, this)
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

    private _actionTypeMatchCache: Dict<boolean> = {}

    matchActionType(actionType: string) {
        // Match all actions unless accepted action types are initialized
        if (!this.accept) {
            return true
        }

        return matchActionType(this.accept, actionType, this._actionTypeMatchCache)
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

    dump(state: State | void): any {
        return state
    }

    load(dump: any, updateContext: UpdateContext<SchemaLike>): State | void {
        return dump
    }

    getStateFromDigest(digest: Dict<any>): State {
        return digest[this.keyPath]
    }

    get state(): State {
        return this.getStateFromDigest(this.store.digest)
    }

    private _listenState(listener: (state: State) => void) {
        const _listener = () => { listener(this.state) }

        if (this.isLinked) {
            _listener()
            return this.store.listen(`update ${this.keyPath}`, _listener)
        }

        let cancel: () => void;
        let cancelled = false;

        this.whenLinked(() => {
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

export default AbstractModel