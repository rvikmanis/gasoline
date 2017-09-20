import { List } from "immutable"
import { Todo } from "../model"
import TodoItem from "./TodoItem"
import NewTodo from "./NewTodo"
import React from "react";

export type BoundActionCreators = {
    addTodo: (text: string, index?: number) => void;
    editTodo: (id: string, updateProps: { text?: string, done?: boolean }) => void;
    moveTodo: (id: string, index: number) => void;
}

export default class TodoList extends React.PureComponent<{ todos: List<Todo> } & BoundActionCreators> {
    render() {
        const {
            todos,
            children,
            ...actions
        } = this.props

        const lastIndex = todos.count() - 1

        return <ul>
            <NewTodo
                addTodo={actions.addTodo}
                todoCount={lastIndex + 1}
            />
            {todos.map((todo, index) =>
                <TodoItem
                    key={todo.id}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === lastIndex}
                    todo={todo}
                    {...actions}
                />
            )}
        </ul>
    }
}