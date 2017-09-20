import React from "react";
import { BoundActionCreators } from "./TodoList"
import TextInput from "./TextInput"
import { focusByIndex } from "../helpers";

type Props = {
    addTodo: BoundActionCreators["addTodo"];
    todoCount: number;
}

export default class NewTodo extends React.Component<Props> {

    onTextKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Down") {
            event.preventDefault()

            if (this.props.todoCount < 1) {
                return
            }

            focusByIndex(0)
        }

        if (event.key === "Enter") {
            event.preventDefault()

            const value = event.currentTarget.value.trim()
            if (value === "") {
                return
            }

            event.currentTarget.value = ""
            this.props.addTodo(value, 0)
        }
    }

    render() {
        return <li className="new-todo">
            <TextInput
                index="add-top"
                onKeyDown={this.onTextKeyDown}
            />
        </li>
    }
}