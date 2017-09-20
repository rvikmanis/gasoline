import React from "react";
import { BoundActionCreators } from "./TodoList"
import { Todo } from "../model"
import DoneButton from "./DoneButton"
import TextInput from "./TextInput"
import { focusByIndex } from "../helpers";
import shallowEquals from "shallow-equals"

type Props =
    & { index: number, isFirst: boolean, isLast: boolean, todo: Todo }
    & BoundActionCreators

export default class TodoItem extends React.Component<Props> {
    computed: Todo.Props

    componentWillMount() {
        this.computed = Todo.getProps(this.props.todo)
    }

    componentWillReceiveProps(nextProps: Props) {
        if (!shallowEquals(nextProps, this.props) && !shallowEquals(nextProps.todo, this.props.todo)) {
            this.computed = Todo.getProps(nextProps.todo)
        }
    }

    shouldComponentUpdate(nextProps: Props) {
        return !shallowEquals(nextProps, this.props)
    }

    onDoneClick = () => {
        this.props.editTodo(this.props.todo.id, { done: !this.computed.done })
    }

    onTextChange = (event: React.FormEvent<HTMLInputElement>) => {
        this.props.editTodo(this.props.todo.id, { text: event.currentTarget.value })
    }

    onTextKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Up" || event.key === "Down") {
            event.preventDefault()

            const delta = (event.key === "Up") ? -1 : 1

            if (delta < 0 && this.props.isFirst) {
                return focusByIndex("add-top")
            }

            if (delta > 0 && this.props.isLast) {
                return
            }

            focusByIndex(this.props.index + delta)
        }

        if (event.key === "Enter" && event.currentTarget.value !== "") {
            event.preventDefault()

            focusByIndex.onMount(this.props.index + 1)
            this.props.addTodo("", this.props.index + 1)
        }
    }

    render() {
        return <li className="todo">
            <DoneButton
                value={this.computed.done}
                onClick={this.onDoneClick}
            />
            <TextInput
                index={`${this.props.index}`}
                value={this.computed.text}
                onChange={this.onTextChange}
                onKeyDown={this.onTextKeyDown}
            />
        </li>
    }
}