import AbstractModel, { ActionCreators } from './AbstractModel'
import UpdateContext from './UpdateContext'
import { Dict, NodeLike, UpdateHandler, ProcessHandler, SchemaLike, ActionLike, DispatchedActionLike, ServiceAdapter, ServiceBridge } from "../interfaces";
import { Observable, Subscribable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { TeardownLogic, Subscription } from 'rxjs/Subscription';
import ActionsObservable from "./ActionsObservable";
import Store from "./Store";
import { ServiceModelState, ServiceControlMessage, ServiceReadyState } from "../interfaces"
import { ReplaySubject, Observer } from "rxjs";

export class ServiceModel extends AbstractModel<ServiceModelState> {
    static OPEN = 'gasoline.ServiceModel.OPEN:*'
    static CLOSE = 'gasoline.ServiceModel.CLOSE:*'
    static READY_STATE_CHANGE = 'gasoline.ServiceModel.READY_STATE_CHANGE:*'
    static ERROR = 'gasoline.ServiceModel.ERROR:*'

    readonly adapter: ServiceAdapter;

    acceptIncoming?: string[];
    acceptOutgoing?: string[];

    private _actionTypes: {
        open: string,
        close: string,
        readyStateChange: string,
        error: string
    }

    link(keyPath: string, store: Store<any>) {
        super.link(keyPath, store)

        this._actionTypes = {
            open: ServiceModel.OPEN.replace('*', this.keyPath),
            close: ServiceModel.CLOSE.replace('*', this.keyPath),
            readyStateChange: ServiceModel.READY_STATE_CHANGE.replace('*', this.keyPath),
            error: ServiceModel.ERROR.replace('*', this.keyPath),
        }

        const { open, close, readyStateChange, error } = this._actionTypes

        let accept: undefined | string[] = []
        if (!this.acceptIncoming || !this.acceptOutgoing) {
            accept = undefined
        } else {
            accept = [open, close, readyStateChange, error].concat(this.acceptIncoming, this.acceptOutgoing)
        }

        this.accept = accept
    }

    actionCreators = {
        open: () => {
            return { type: this._actionTypes.open }
        },
        close: () => {
            return { type: this._actionTypes.close }
        }
    }

    private _readyStateChange(status: ServiceReadyState) {
        return { type: this._actionTypes.readyStateChange, payload: status }
    }

    private _error(event: Error) {
        return { type: this._actionTypes.error, payload: event }
    }

    process = (action$: ActionsObservable) => {
        const dispatch$ = new ReplaySubject<Subscribable<ActionLike>>()

        const { OPEN, CLOSE, READY_STATE_CHANGE, ERROR } = ServiceModel
        const localActionTypes = [
            Store.START, Store.STOP,
            OPEN, CLOSE, READY_STATE_CHANGE, ERROR
        ]

        const status$ = new Subject<ActionLike>()
        const incoming$ = new Subject<ActionLike>()

        const origin = `gasoline.ServiceModel:${this.keyPath}`

        let filteredIncoming$ = ActionsObservable.from(incoming$.map(action => {
            // Mark action with `meta.origin` to prevent circular dispatch
            return Object.assign({}, action, {
                meta: Object.assign({}, action.meta, { origin })
            })
        })).notOfType(...localActionTypes)

        if (this.acceptIncoming) {
            filteredIncoming$ = filteredIncoming$.ofType(...this.acceptIncoming)
        }

        dispatch$.next(status$)
        dispatch$.next(filteredIncoming$)

        let outgoing$ = action$
            // Prevent infinite dispatch cycles by excluding actions that originated here
            .filter((action: DispatchedActionLike) => action.meta.origin !== origin)
            // Exclude store and service lifecycle actions
            .notOfType(...localActionTypes)

        if (this.acceptOutgoing) {
            outgoing$ = outgoing$.ofType(...this.acceptOutgoing)
        }

        const actionTypeControlMessageMap = {
            [this._actionTypes.close]: "close",
            [this._actionTypes.open]: "open"
        }

        const controlMessage$ = action$
            .ofType(this._actionTypes.close, this._actionTypes.open)
            // Skip `meta.replyTo` by accessing the normal observable for mapping
            .observable.map(action => actionTypeControlMessageMap[action.type] as ServiceControlMessage)

        const readyStateChange$ = action$
            .ofType(this._actionTypes.readyStateChange)
            // Skip `meta.replyTo` by accessing the normal observable for mapping
            .observable.map(action => action.payload)

        const bridge = {
            nextReadyState: (status: ServiceReadyState) => {
                if (this.state.status === status) {
                    throw new Error("bridge.nextReadyState(status): next status must be different from current status")
                }
                status$.next(this._readyStateChange(status))
            },
            getStatus: () => {
                return this.state.status
            },
            dispatch: (action: ActionLike) => {
                incoming$.next(action)
            },
            throw: (error: Error) => {
                status$.next(this._error(error))
            }
        }

        this.adapter.install(bridge)

        dispatch$.next(Observable.create((observer: Observer<ActionLike>) => {
            const subscription = new Subscription(() => {
                // Tear down connection
                if (["connecting", "open"].indexOf(this.state.status) > -1) {
                    // Short circuit straight to onReadyState "closing" where all cleanup tasks should be done
                    this.adapter.onReadyState("closing")
                }
            })

            const startSubscription = action$.ofType(Store.START).subscribe(() => {
                this.adapter.onInitial()
            })
            subscription.add(startSubscription)

            const controlMessageSubscription = controlMessage$.subscribe(msg => {
                this.adapter.onControlMessage(msg)
            })
            subscription.add(controlMessageSubscription)

            const readyStateChangeSubscription = readyStateChange$.subscribe(status => {
                this.adapter.onReadyState(status)
            })
            subscription.add(readyStateChangeSubscription)

            const outgoingActionSubscription = outgoing$.subscribe(action => {
                this.adapter.onAction(action)
            })
            subscription.add(outgoingActionSubscription)

            action$.ofType(Store.STOP).subscribe(() => {
                subscription.unsubscribe()
            })

            return subscription
        }))

        return dispatch$.mergeAll()
    }

    update = (state: ServiceModelState | void, updateContext: UpdateContext<SchemaLike>): ServiceModelState => {
        if (state === undefined) {
            state = { status: "initial" }
        }

        switch (updateContext.action.type) {
            case this._actionTypes.readyStateChange:
                return { status: updateContext.action.payload }
            default:
                return state
        }
    }

    constructor(options: {
        adapter: ServiceAdapter,
        acceptIncoming?: string[],
        acceptOutgoing?: string[],
    }) {
        super()

        this.dump = () => undefined
        this.load = () => undefined

        if (typeof options.adapter === 'object' && options.adapter.install) {
            this.adapter = options.adapter
        } else {
            throw new Error('ServiceModel options.adapter: property must implement ServiceAdapter interface')
        }

        this.acceptIncoming = options.acceptIncoming
        this.acceptOutgoing = options.acceptOutgoing
    }
}

export default ServiceModel