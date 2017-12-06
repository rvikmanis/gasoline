import { Observable, Subscription, Subject, BehaviorSubject, Observer } from 'rxjs';
import { ISubscription } from 'rxjs/Subscription';

import { clone } from '../helpers/clone';
import { ActionLike, Dict, DispatchedActionMeta, Listener } from '../interfaces';
import uuid from '../vendor/uuid';
import { AbstractModel } from './AbstractModel';
import { ActionsObservable } from './ActionsObservable';
import { UpdateContext } from './UpdateContext';

export class Store<M extends AbstractModel<any> = AbstractModel<any>> {
    static START = 'gasoline.Store.START'
    static STOP = 'gasoline.Store.STOP'
    static LOAD = 'gasoline.Store.LOAD'

    private _lastUpdateContext?: UpdateContext<any>;
    private _subscription?: Subscription;
    private _listeners: Dict<Listener[]>;
    private _input$: Subject<ActionLike>;
    private _action$: BehaviorSubject<ActionLike | undefined>;

    public isStarted: boolean;
    public digest: Dict<any>;
    public action$: Observable<ActionLike>;
    public model: M;

    constructor(model: M) {
        this._listeners = {}
        this._input$ = new Subject<ActionLike>()
        this._action$ = new BehaviorSubject<ActionLike | undefined>(undefined)

        this.isStarted = false
        this.digest = {}
        this.action$ = Observable.create((observer: Observer<ActionLike>) => {
            return this._action$
                .filter(action => action !== undefined)
                .subscribe(observer)
        })
        this.model = model

        const onLinked = model.link('/', this)
        onLinked()
    }

    start() {
        if (this.isStarted) {
            throw new Error('Store is already started')
        }
        this.isStarted = true

        let action$ = ActionsObservable.from(this._input$)
        if (this.model.accept) {
            action$ = action$.ofType(Store.START, Store.STOP, ...this.model.accept)
        }
        action$ = action$.share() as ActionsObservable

        this._subscription = action$.subscribe(action => {
            this._action$.next(action)
        })

        this._subscription.add(
            Observable
                .from(this.model.process(action$, this.model))
                .subscribe(action => { this.dispatch(action) })
        )
        this._dispatch({ type: Store.START })
        this._invokeListeners("started")
    }

    stop() {
        if (!this.isStarted) {
            throw new Error('Store is not started')
        }

        this._dispatch({ type: Store.STOP })
        if (this._subscription) {
            this._subscription.unsubscribe()
        }

        this.isStarted = false
    }

    ready(callback: () => void) {
        if (this.isStarted) {
            callback()
            return
        }
        const stopListening = this.listen("started", () => {
            callback()
            stopListening()
        })
    }

    dispatch = (input: ActionLike) => {
        if ([Store.START, Store.STOP, Store.LOAD].indexOf(input.type) > -1) {
            throw new Error(`Cannot dispatch lifecycle action '${input.type}'`);
        }

        return this._dispatch(input)
    }

    load(dump?: any) {
        if (this.isStarted) {
            throw new Error('Cannot load after store is started.')
        }
        const updateContext = new UpdateContext({ type: Store.LOAD }, this.model)
        const state = this.model.load(dump, updateContext)
        this._flush(state as this['model']['state'], updateContext)
    }

    dump() {
        return this.model.dump(this.model.state)
    }

    listen(eventName: string, listener: Listener) {
        const wrapper = () => { listener() }
        this._listeners[eventName] = (this._listeners[eventName] || []).concat(wrapper)
        return () => {
            if (this._listeners[eventName].indexOf(wrapper) > -1) {
                this._listeners[eventName] = this._listeners[eventName].filter(l => l !== wrapper)
            }
        }
    }

    replaceModel(model: M) {
        if (this.isStarted) {
            throw new Error(`Cannot replace model on a running store. Call store.stop() before calling store.replaceModel(newModel)`);
        }

        const dump = this.dump()
        const oldModel = this.model
        this.model = model

        oldModel.unlink()
        const onLinked = this.model.link('/', this)

        this.load(dump)
        onLinked();
    }

    private _dispatch(input: ActionLike) {
        if (!this.isStarted) {
            throw new Error('Cannot dispatch before store is started. Call the start() method on your store')
        }

        const meta: DispatchedActionMeta = {
            dispatch: {
                id: uuid(),
                time: Date.now()
            }
        }

        if (input.meta) {
            if (input.meta.replyTo) {
                meta.dispatch.parent = input.meta.replyTo
            }
        }

        const action = { ...input, meta }
        const ctx = this._createUpdateContext(action)
        const state = this.model.update(this.model.state, ctx)
        this._flush(state, ctx)
        this._input$.next(ctx.action)
    }

    private _invokeListeners(eventName: string) {
        const listeners = this._listeners[eventName]
        if (listeners) {
            listeners.forEach(listener => {
                listener()
            })
        }
    }

    private _flush(state: this['model']['state'], ctx: UpdateContext<any>) {
        ctx.setModel(this.model)
        ctx.updateDigest(state)
        if (state !== this.model.state) {
            ctx.markUpdated()
            this.digest = ctx.workingState.digest
        }

        this._lastUpdateContext = ctx

        const updated = ctx.workingState.updated
        Object.keys(updated).forEach(keyPath => {
            if (updated[keyPath]) {
                this._invokeListeners(`update ${keyPath}`)
            }
        })
    }

    private _createUpdateContext(action: ActionLike): UpdateContext<any> {
        const workingState = { updated: {}, digest: clone(this.digest) }
        return new UpdateContext(action, this.model, workingState)
    }
}
