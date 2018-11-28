import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Model, combineModels, Observable, Store, connect } from "gasoline";
import './index.css';

const counter = new Model({

  state: 0,

  actions: {
    increment(state) {
      return state + 1
    }
  }

});

const autoIncrement = new Model({

  state: true,

  actions: {
    toggle(state) {
      return !state
    }
  },

  process: (action$, model) => action$
    .ofType(Store.START, model.actionTypes.toggle)
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