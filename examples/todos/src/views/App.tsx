import * as React from "react";
import { connect } from "gasoline";
import { todos } from "../models";
import NewTodo from "./components/NewTodo";
import TodoList from './components/TodoList';
import "./App.css";

export default connect(todos)(() =>
  <div className="App">
    <NewTodo onSubmitText={todos.actions.addTodo} />
    <TodoList
      todos={todos.state}
      onUpdateTodo={todos.actions.updateTodo}
      onRemoveTodo={todos.actions.removeTodo}
    />
  </div>
)
