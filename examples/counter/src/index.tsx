import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Model, combineModels, Observable, Store, connect, UpdateContext, InputAction } from "gasoline";
import './index.css';

const counter = new Model({

  actionCreators: {
    increment: () => ({ type: "INCREMENT" })
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
    toggle: () => ({ type: "TOGGLE_AUTO_INCREMENT" })
  },

  update(state: boolean = true, context) {
    switch (context.action.type) {
      case "TOGGLE_AUTO_INCREMENT":
        return !state
      default:
        return state
    }
  },

  process: (action$, model) => action$
    .ofType(Store.START, "TOGGLE_AUTO_INCREMENT")
    .switchMap(() => model.state
      ? Observable
        .interval(1000)
        .map(counter.actionCreators.increment)
      : Observable.empty()
    )

});

type SetValueAction = {
  type: "SET_VALUE",
  payload: string
}

type TextFieldDependencies = {
  counter: typeof counter
}

const textField = new Model({

  dependencies: {
    counter: counter
  },

  update(state: string = "", context: UpdateContext<TextFieldDependencies, SetValueAction>) {
    const {
      action,
      dependencies
    } = context

    if (action.type === "SET_VALUE") {
      state = action.payload
    }

    return dependencies.counter % 4 === 0
      ? state.toUpperCase()
      : state.toLowerCase()
  },

  process: action$ => action$
    .ofType("SET_VALUE")
    .mergeMap(() => {
      const inc = counter.actionCreators.increment();
      return Observable.of(inc, inc)
    }),

  actionCreators: {
    setValue: (e: any): SetValueAction & InputAction => ({
      type: "SET_VALUE",
      payload: e.target.value,
      target: textField
    })
  }

})

const rootModel = combineModels({
  counter,
  autoIncrement,
  textField
});
const store = new Store(rootModel);

const CounterApp = connect(rootModel)(() =>
  <div>
    <div>{counter.state} test</div>
    <div>
      <button disabled={autoIncrement.state}
        onClick={counter.actions.increment}>
        Increment
        </button>
      <button onClick={autoIncrement.actions.toggle}>
        {autoIncrement.state ? "Disable" : "Enable"} auto inc.
        </button>
    </div>
    <div>
      <input onChange={textField.actions.setValue} value={textField.state} />
    </div>
  </div>
)

store.ready(() => {
  ReactDOM.render(
    <CounterApp />,
    document.querySelector("#app")
  )
})

store.start()