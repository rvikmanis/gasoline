import * as React from "react";
import classNames from "classnames";
import { Todo } from '../../models/todos';
import "./TodoItem.css";

export default class TodoItem extends React.PureComponent {
  state = {
    editing: false,
    text: null
  };

  props: {
    onUpdateTodo: (id: string, changes: Partial<Todo>) => void,
    onRemoveTodo: (id: string) => void,
    todo: Todo
  };

  onChangeCheckbox = (e) => {
    this.props.onUpdateTodo(this.props.todo.id, { done: e.target.checked })
  }

  renderCheckbox() {
    if (this.state.editing) {
      return null;
    }

    return <input
      className="TodoItem__checkbox"
      type="checkbox"
      checked={this.props.todo.done}
      onChange={this.onChangeCheckbox}
    />
  }

  onDoubleClickText = () => {
    this.setState({
      editing: true,
      text: this.props.todo.text
    })
  }

  onChangeInput = (e) => {
    this.setState({ text: e.target.value })
  }

  onKeyDownInput = (e) => {
    if (e.key === "Escape") {
      this.setState({
        editing: false,
        text: null
      });
      return;
    }

    if (e.key === "Enter") {
      this.onBlurInput();
    }
  }

  onBlurInput = () => {
    const text = this.state.text.trim()
    if (text === "") {
      this.props.onRemoveTodo(this.props.todo.id)
    } else if (text !== this.props.todo.text.trim()) {
      this.props.onUpdateTodo(this.props.todo.id, { text })
    }

    this.setState({
      editing: false,
      text: null
    })
  }

  autoFocusAndSelect = (input) => {
    if (input) {
      input.focus();
      input.select();
    }
  }

  renderTextOrInput() {
    if (this.state.editing) {
      return <input
        className="TodoItem__input"
        type="text"
        value={this.state.text}
        onChange={this.onChangeInput}
        onKeyDown={this.onKeyDownInput}
        onBlur={this.onBlurInput}
        ref={this.autoFocusAndSelect}
      />
    }

    return <span
      className="TodoItem__text"
      onDoubleClick={this.onDoubleClickText}
    >
      {this.props.todo.text}
    </span>
  }

  onClickDelete = () => {
    this.props.onRemoveTodo(this.props.todo.id);
  }

  renderDeleteButton() {
    if (this.state.editing) {
      return null;
    }

    return <button
      className="TodoItem__delete"
      onClick={this.onClickDelete}
    >
      &times;
    </button>
  }

  render() {
    return <div
      className={classNames({
        "TodoItem": true,
        "TodoItem--editing": this.state.editing
      })}
    >
      {this.renderCheckbox()}
      {this.renderTextOrInput()}
      {this.renderDeleteButton()}
    </div>
  }
}