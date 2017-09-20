import { ServiceAdapter, ServiceBridge, ActionLike, ServiceControlMessage, ServiceReadyState } from "../interfaces";

export default class WebSocketServiceAdapter implements ServiceAdapter {
    url: string;
    autoConnect: boolean;

    private _bridge: ServiceBridge;
    private _websocket: WebSocket;

    constructor(url: string, autoConnect = false) {
        this.url = url;
        this.autoConnect = autoConnect
    }

    install(bridge: ServiceBridge) {
        this._bridge = bridge
    }

    onInitial() {
        if (this.autoConnect) {
            this._bridge.nextReadyState("connecting")
        }
    }

    onReadyState(status: ServiceReadyState) {
        if (status === "connecting") {
            this._setUpWS()
        }

        else if (status === "closing") {
            if (this._websocket) {
                this._websocket.close()
            }
        }

        else if (status === "closed") {
            delete this._websocket
        }
    }

    onControlMessage(msg: ServiceControlMessage) {
        const status = this._bridge.getStatus()
        const isInitialOrClosed = ["initial", "closed"].indexOf(status) > -1
        const isOpen = status === "open"

        if (msg === "open" && isInitialOrClosed) {
            this._bridge.nextReadyState("connecting")
        }

        else if (msg === "close" && isOpen) {
            this._bridge.nextReadyState("closing")
        }

        else {
            this._bridge.throw(new Error(`adapter.onControlMessage(msg): Invalid control message '${msg}'`))
        }
    }

    onAction(action: ActionLike) {
        if (this._bridge.getStatus() === "open") {
            this._sendAction(action)
        } else {
            const error = Object.assign(new Error(`Action delivery failed: ${action.type}`), { action })
            this._bridge.throw(error)
        }
    }

    private _sendAction(action: ActionLike) {
        this._websocket.send(JSON.stringify(action))
    }

    private _setUpWS() {
        this._websocket = new WebSocket(this.url)
        this._websocket.onopen = () => {
            this._bridge.nextReadyState("open")
        }
        this._websocket.onclose = () => {
            this._bridge.nextReadyState("closed")
        }
        this._websocket.onerror = (e) => {
            this._bridge.throw(<Error><any>e)
        }
        this._websocket.onmessage = (msg) => {
            this._bridge.dispatch(JSON.parse(msg.data))
        }
    }
}