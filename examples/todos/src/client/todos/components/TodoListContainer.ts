import { connect } from "gasoline"
import todos from "../model"
import TodoList, { BoundActionCreators } from "./TodoList"

type Props = { todos: typeof todos["state"] }
type StaticProps = BoundActionCreators

export default connect<Props, StaticProps>(
    todos.state$.map(todos => ({ todos })),
    todos.actions
)(TodoList)
