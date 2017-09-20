
import { interfaces } from "gasoline";
import { Todo } from "./model";

export const ADD_TODO = "ADD_TODO"
export const EDIT_TODO = "EDIT_TODO"
export const DELETE_TODO = "DELETE_TODO"
export const MOVE_TODO = "MOVE_TODO"
export const SAVE_TODO = "SAVE_TODO"
export const RETRY_TODO = "RETRY_TODO"
export const TODO_SAVED = "TODO_SAVED"
export const WS_SERVICE_ERROR = "gasoline.ServiceModel.ERROR:/ws"

export interface AddTodoAction extends interfaces.ActionLike {
    type: typeof ADD_TODO;
    payload: { index: number, text: string };
}

export interface EditTodoAction extends interfaces.ActionLike {
    type: typeof EDIT_TODO;
    payload: { updateProps: { text?: string, done?: boolean }, id: string };
}

export interface MoveTodoAction extends interfaces.ActionLike {
    type: typeof MOVE_TODO;
    payload: { id: string, index: number }
}

export interface SaveTodoAction extends interfaces.ActionLike {
    type: typeof SAVE_TODO;
    payload: { id: string, todo: Todo, index: number }
}

export interface RetryTodoAction extends interfaces.ActionLike {
    type: typeof RETRY_TODO;
    payload: { id: string }
}

export interface TodoSavedAction extends interfaces.ActionLike {
    type: typeof TODO_SAVED;
    payload: { id: string, todo: Todo.Saved, index: number }
}

export interface WsServiceErrorAction extends interfaces.ActionLike {
    type: typeof WS_SERVICE_ERROR;
    payload: Error & { action: SaveTodoAction };
}

export type TodoAction =
    | AddTodoAction
    | EditTodoAction
    | MoveTodoAction
    | RetryTodoAction
    | TodoSavedAction;

export function addTodo(text: string, index: number = 0): AddTodoAction {
    return {
        type: ADD_TODO,
        payload: { index, text }
    }
}

export function editTodo(id: string, updateProps: { text?: string, done?: boolean }): EditTodoAction {
    return {
        type: EDIT_TODO,
        payload: { id, updateProps }
    }
}

export function moveTodo(id: string, index: number): MoveTodoAction {
    return {
        type: MOVE_TODO,
        payload: { id, index }
    }
}

export function retryTodo(id: string): RetryTodoAction {
    return {
        type: RETRY_TODO,
        payload: { id }
    }
}