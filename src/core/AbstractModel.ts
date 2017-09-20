import { Dict, NodeLike, UpdateHandler, ProcessHandler, SchemaLike, ActionLike } from "../interfaces";
import UpdateContext from "./UpdateContext";
import matchActionType from '../helpers/matchActionType'
import Store from "./Store";
import { Observable } from "rxjs";
import mapValues from "../helpers/mapValues";

export type ActionCreators = { [key: string]: Function }

export abstract class AbstractModel<State, AC extends ActionCreators = {}, Dependencies extends SchemaLike = {}> implements NodeLike {
    public dependencies = {} as Dependencies;
    public abstract update: UpdateHandler<State, Dependencies>;
    public abstract process: ProcessHandler<this>;
    public accept?: string[]
    public actionCreators = {} as AC
    private _actions: {[K in keyof this["actionCreators"]]: (...args: any[]) => void };

    public keyPath: string
    public store: Store
    public isLinked = false
    public isDisposed = false

    private _whenLinked: {
        promise: Promise<void>,
        resolve: () => void
    }

    public state$ = new Observable<State>(observer => {
        return this._listenState(state => {
            observer.next(state)
        })
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

    public get actions() {
        if (!this._actions) {
            this._actions = mapValues(this.actionCreators, actionCreator => {
                return (...args: any[]) => {
                    this._whenLinked.promise.then(() => {
                        this.store.dispatch(actionCreator(...args))
                    })
                }
            })
        }
        return this._actions
    }

    private _actionTypeMatchCache: Dict<boolean> = {}

    matchActionType(actionType: string) {
        if (!this.accept) {
            return true
        }

        return matchActionType(this.accept, actionType, this._actionTypeMatchCache)
    }

    link(keyPath: string, store: Store<any>) {
        if (this.isDisposed) {
            throw new Error("Cannot link disposed model")
        }

        if (this.isLinked) {
            throw new Error('Model is already linked')
        }

        this.keyPath = keyPath
        this.store = store
        this.isLinked = true

        this._whenLinked.resolve()
    }

    unlink() {
        delete this.store
        delete this.keyPath
        this.isLinked = false
        this.isDisposed = true
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

        this._whenLinked.promise.then(() => {
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