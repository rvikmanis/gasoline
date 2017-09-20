import todos from "./todos/model"
import { SAVE_TODO, DELETE_TODO, TODO_SAVED } from "./todos/actions"
import { ServiceModel, WebSocketServiceAdapter, combineModels, Store } from "gasoline";

const ws = new ServiceModel({
    adapter: new WebSocketServiceAdapter("ws://localhost:8000", true),
    acceptOutgoing: [SAVE_TODO, DELETE_TODO],
    acceptIncoming: [TODO_SAVED]
})

export default combineModels({ todos, ws })