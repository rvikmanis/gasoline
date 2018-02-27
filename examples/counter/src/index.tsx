import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Model, combineModels, Observable, Store, connect, UpdateContext, ModelInterface, InputAction, ActionLike } from "gasoline";
import './index.css';

const counter = new Model({

  actionCreators: {
    increment() {
      return { type: "INCREMENT" }
    }
  },

  update(state: number = 0, context) {
    switch (context.action.type) {
      case "INCREMENT":
        return state + 1
      default:
        return state
    }
  }

});

const autoIncrement = new Model({

  actionCreators: {
    toggle() {
      return { type: "TOGGLE_AUTO_INCREMENT" }
    }
  },

  update(state: boolean = true, context) {
    switch (context.action.type) {
      case "TOGGLE_AUTO_INCREMENT":
        return !state
      default:
        return state
    }
  },

  process(action$, model) {
    return action$

      // When the store starts, and
      // each time TOGGLE_AUTO_INCREMENT is dispatched,
      .ofType(Store.START, "TOGGLE_AUTO_INCREMENT")
      .switchMap(() => {

        if (model.state) {
          // if auto increment is enabled, emit INCREMENT every second
          const action = counter.actionCreators.increment()
          return Observable.interval(1000).map(() => action)
        }

        // otherwise emit nothing.
        return Observable.empty()

        // Note: switchMap takes care of subscribing to the latest stream
        // and unsubscribing from previous streams.
      })
  }
});

type SetValueAction = {
  type: "SET_VALUE";
  payload: string;
}

type TextFieldDependencies = {
  counter: typeof counter
}

const textField = new Model({
  dependencies: {
    counter: counter
  },
  update(state: string = "", context: UpdateContext<TextFieldDependencies, SetValueAction & ActionLike>) {
    if (context.action.type === "SET_VALUE") {
      state = context.action.payload
    }

    state = context.dependencies.counter % 100 === 0
      ? state.toUpperCase()
      : state.toLowerCase()

    return state
  },
  process(action$, model) {
    return action$.ofType("SET_VALUE").mergeMap(() => {
      const i = counter.actionCreators.increment();
      return Observable.of(i, i)
    })
  },
  actionCreators: {
    setValue(e: any): SetValueAction & InputAction {
      return { type: "SET_VALUE", payload: e.target.value, target: textField }
    }
  }
})

const rootModel = combineModels({
  counter,
  autoIncrement,
  textField
});

const store = new Store(rootModel);

const CounterApp = connect(rootModel)(() => {

  const incrementBtn = (
    <button disabled={autoIncrement.state}
            onClick={counter.actions.increment}>
      Increment
    </button>
  )

  const toggleBtn = (
    <button onClick={autoIncrement.actions.toggle}>
      {autoIncrement.state ? "Disable" : "Enable"} auto inc.
    </button>
  )

  const textInput = (
    <input onChange={textField.actions.setValue} value={textField.state} />
  )

  return (
    <div>
      <div>{counter.state} test</div>
      <div>{incrementBtn} {toggleBtn}</div>
      <div>{textInput}</div>
    </div>
  )

})

store.ready(() => {
  ReactDOM.render(
    <CounterApp />,
    document.querySelector("#app")
  )
})

store.start()