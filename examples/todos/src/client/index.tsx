import store from "./store"
import ReactDOM from "react-dom"
import TodoListContainer from "./todos/components/TodoListContainer";

document.addEventListener("DOMContentLoaded", () => {
    const mount = document.getElementById("mount")

    store.ready(() => {
        ReactDOM.render(<TodoListContainer />, mount, undefined)
    })

    store.start()
})