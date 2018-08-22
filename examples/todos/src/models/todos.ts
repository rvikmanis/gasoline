import { Model, UpdateContext } from "gasoline";
import { uuid } from "../utils";

export type Todo = {
  id: string,
  text: string,
  done: boolean
}

export type AddTodoAction = {
  type: "ADD_TODO",
  payload: {
    text: string
  }
}

export type InsertTodoAction = {
  type: "INSERT_TODO",
  payload: Todo
}

export type UpdateTodoAction = {
  type: "UPDATE_TODO",
  payload: {
    id: string,
    changes: Partial<Todo>
  }
}

export type RemoveTodoAction = {
  type: "REMOVE_TODO",
  payload: {
    id: string
  }
}

export type TodoActions =
  | InsertTodoAction
  | UpdateTodoAction
  | RemoveTodoAction

function findTodo(state: Todo[], id: string) {
  for (let t of state) {
    if (t.id === id) {
      return t;
    }
  }
}

export const todos = new Model({
  actionCreators: {
    addTodo(text: string): AddTodoAction {
      return { type: "ADD_TODO", payload: { text } }
    },
    updateTodo(id: string, changes: Partial<Todo>): UpdateTodoAction {
      return { type: "UPDATE_TODO", payload: { id, changes } }
    },
    removeTodo(id: string): RemoveTodoAction {
      return { type: "REMOVE_TODO", payload: { id } }
    }
  },

  update(state: Todo[] = [], context: UpdateContext<{}, TodoActions>) {
    if (context.action.type === "INSERT_TODO") {
      state = state.slice()
      state.unshift(context.action.payload)
      return state;
    }

    if (
      context.action.type === "UPDATE_TODO" ||
      context.action.type === "REMOVE_TODO"
    ) {
      const todo = findTodo(state, context.action.payload.id);
      const index = state.indexOf(todo);
      if (!todo) {
        return state;
      }

      state = state.slice()
      if (context.action.type === "UPDATE_TODO") {
        state.splice(index, 1, { ...todo, ...context.action.payload.changes })
      } else {
        state.splice(index, 1);
      }
      return state;
    }

    return state
  },

  process(action$) {
    return action$
      .ofType("ADD_TODO")
      .map((action: AddTodoAction): InsertTodoAction => {
        const todo = {
          id: uuid(),
          text: action.payload.text,
          done: false
        }
        return { type: "INSERT_TODO", payload: todo }
      })
  }
})
