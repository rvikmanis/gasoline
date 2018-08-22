import * as React from "react";
import { Todo } from '../../models/todos';
import TodoItem from "./TodoItem";

export default class TodoList extends React.PureComponent {
  props: {
    onUpdateTodo: (id: string, changes: Partial<Todo>) => void,
    onRemoveTodo: (id: string) => void,
    todos: Todo[]
  };

  render() {
    const { todos, onUpdateTodo, onRemoveTodo } = this.props

    if (todos.length < 1) {
      return null;
    }

    return <div className="TodoList">
      {todos.map(todo =>
        <TodoItem
          key={todo.id}
          todo={todo}
          onUpdateTodo={onUpdateTodo}
          onRemoveTodo={onRemoveTodo}
        />
      )}
    </div>
  }
}