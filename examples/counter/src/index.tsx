import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Model, combineModels, Observable, Store, connect } from "gasoline";
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

const store = new Store(combineModels({
  counter,
  autoIncrement
}));

const CounterApp = connect(counter, autoIncrement)(() =>
  <div>
    <div>Counter: <strong>{counter.state}</strong></div>
    <div>
      <button
        disabled={autoIncrement.state}
        onClick={counter.actions.increment}
      >
        Increment
      </button>
      <button onClick={autoIncrement.actions.toggle}>
        {autoIncrement.state ? "Disable" : "Enable"} auto inc.
      </button>
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