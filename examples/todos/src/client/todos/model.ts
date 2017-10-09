import { Model, ServiceModel, WebSocketServiceAdapter, combineModels, Store, UpdateContext, interfaces, ActionsObservable } from "gasoline"
import { List } from "immutable"
import { Observable } from "rxjs"
import {
    TodoAction, SaveTodoAction,
    ADD_TODO, EDIT_TODO, MOVE_TODO, SAVE_TODO, TODO_SAVED,
    addTodo, editTodo, moveTodo, WS_SERVICE_ERROR, WsServiceErrorAction, RETRY_TODO
} from './actions'
import { focusByIndex } from "./helpers";

namespace Todo {
    export interface Props {
        rev: string;
        done: boolean;
        text: string;
    }

    export interface PendingProps {
        rev: string;
        done?: boolean;
        text?: string;
    }

    export interface Saved {
        id: string;
        props: Props;
        status: "saved"
    }

    export interface Create {
        id: string;
        pendingProps: PendingProps;
        status: "create"
    }

    export interface Update {
        id: string;
        pendingProps: PendingProps;
        props: Props;
        status: "update";
    }

    export interface CreateFailed {
        id: string;
        pendingProps: PendingProps;
        status: "create-failed";
    }

    export interface UpdateFailed {
        id: string;
        pendingProps: PendingProps;
        props: Props;
        status: "update-failed";
    }

    export type Failed = Todo.CreateFailed | Todo.UpdateFailed;
    export type Pending = Todo.Create | Todo.Update;

    export function create(id: string, text = ""): Todo.Create {
        return {
            id,
            pendingProps: {
                rev: id,
                done: false,
                text
            },
            status: "create"
        }
    }

    export function update(todo: Todo, pendingProps: PendingProps): Todo.Create | Todo.Update {
        if (todo.status === "saved") {
            return { ...todo, status: "update", pendingProps }
        }

        const status = todo.status.startsWith("update")
            ? "update"
            : "create"

        return {
            ...todo,
            status,
            pendingProps: { ...todo.pendingProps, ...pendingProps }
        } as Todo.Create | Todo.Update
    }

    export function mergeSaved(todo: Todo, savedTodo: Todo.Saved) {
        if (todo.status === "saved") {
            if (todo.props.rev === savedTodo.props.rev) {
                return todo
            }
            return savedTodo
        }

        if (todo.pendingProps.rev === savedTodo.props.rev) {
            return savedTodo
        }

        return { ...todo, status: "update", props: savedTodo.props } as Todo.Update
    }

    export function getProps(todo: Todo): Todo.Props {
        if (todo.status === "saved") {
            return todo.props
        }
        const props: Partial<Todo.Props> = (todo.status === "create" || todo.status === "create-failed")
            ? {}
            : todo.props

        return Object.assign({}, props, todo.pendingProps) as Todo.Props
    }
}

type Todo = Todo.Saved | Todo.Pending | Todo.Failed;

export { Todo }

function update(state: List<Todo> = List(), context: UpdateContext<{}, TodoAction | WsServiceErrorAction>) {
    const action = context.action

    if (action.type === WS_SERVICE_ERROR) {
        if (!(action.payload.action.type === SAVE_TODO)) {
            return state
        }

        const index = state.findIndex(t => t.id === action.payload.action.payload.id)
        if (index < 0) {
            return state
        }

        return state.update(index, todo => {
            if (todo.status === "create" || todo.status === "update") {
                return { ...todo, status: todo.status + "-failed" } as Todo
            }
            return todo
        })
    }

    const rev = action.meta.dispatch.id
    const index = state.findIndex(t => t.id === (<any>action.payload).id)

    switch (action.type) {
        case ADD_TODO:
            return state.insert(action.payload.index, Todo.create(rev, action.payload.text))

        case EDIT_TODO:
            return state.update(index, t => Todo.update(t, { rev, ...action.payload.updateProps }))

        case TODO_SAVED:
            if (index > -1) {
                state = state.update(index, t => Todo.mergeSaved(t, action.payload.todo))
                if (index !== action.payload.index) {
                    return state
                        .remove(index)
                        .insert(action.payload.index, state.get(index))
                }
                return state
            }
            return state.insert(
                action.payload.index,
                action.payload.todo
            )

        case MOVE_TODO:
            if (index === action.payload.index) {
                return state
            }
            return state
                .remove(index)
                .insert(action.payload.index, state.get(index))

        case RETRY_TODO:
            if (index > -1) {
                return state.update(index, todo => {
                    const status = todo.status.endsWith("-failed")
                        ? todo.status.slice(0, -7)
                        : todo.status
                    return { ...todo, status } as Todo.Pending
                })
            }
            return state

        default:
            return state
    }
}

function process(action$: ActionsObservable, model: Model<List<Todo>>) {
    const save$ = action$.ofType(ADD_TODO, EDIT_TODO, MOVE_TODO, RETRY_TODO).mergeMap((action: TodoAction) => {
        const id = action.type === ADD_TODO
            ? action.meta.dispatch.id
            : action.payload.id

        const index = model.state.findIndex(t => t.id === id)

        if (index < 0) {
            return Observable.empty()
        }

        const todo = model.state.get(index)

        if (action.type === RETRY_TODO && todo.status === "saved") {
            return Observable.empty()
        }

        const saveTodo$ = Observable.of({
            type: SAVE_TODO,
            payload: { todo, index, id }
        })

        const update$ = action$
            .ofType(EDIT_TODO, MOVE_TODO)
            .filter(action => action.payload.id === id)

        return saveTodo$.delay(500).takeUntil(<any>update$ as Observable<interfaces.ActionLike>)
    })

    return Observable.merge(save$)
}

function dump(state: List<Todo>) {
    return state.toJS()
}

function load(dumpedState: Todo[]) {
    return List(dumpedState)
}

const actionCreators = { addTodo, editTodo, moveTodo }
const accept = [ADD_TODO, EDIT_TODO, MOVE_TODO, TODO_SAVED, WS_SERVICE_ERROR]

const todoModel = new Model({ update, process, load, dump, actionCreators, accept })
export default todoModel
