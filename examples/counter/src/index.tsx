import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Model, Observable, Store, createController } from "gasoline";
import './index.css';

const counter = new Model({
  state: {
    counter: 0,
    running: true,
    interval: 1000
  },

  actions: {
    toggle(state) {
      return { ...state, running: !state.running }
    },
    increment(state) {
      return { ...state, counter: state.counter + 1 }
    },
    decrement(state) {
      return { ...state, counter: state.counter - 1 }
    },
    reset(state) {
      return { ...state, counter: 0 }
    },
    changeInterval(state, interval) {
      return { ...state, interval }
    }
  },

  process(action$, counter) {
    return action$.ofType(
      Store.START,
      counter.actionTypes.toggle,
      counter.actionTypes.changeInterval,
      counter.actionTypes.reset
    ).switchMap(() => {
      const state = counter.state

      if (state.running) {
        return Observable
          .interval(state.interval)
          .map(counter.actionCreators.increment)
      }

      return Observable.empty()
    })
  }
})

const CounterApp = createController(() => {
  const { actions: a } = counter

  function onChangeInterval(e) {
    a.changeInterval(Number(e.target.value))
  }

  return counter.state$.map(s =>
    <div>
      <p>Welcome to Gasoline</p>
      <br />

      <div>
        Counter: <strong>{s.counter}</strong>
      </div>
      <br />

      <div>
        <button disabled={s.running} onClick={a.increment}>
          INC
      </button>
        <button disabled={s.running} onClick={a.decrement}>
          DEC
      </button>
        &nbsp;
      <button onClick={a.reset}>
          Reset
      </button>
        &nbsp;
      <button onClick={a.toggle}>
          {s.running ? "Stop" : "Start"}
        </button>
      </div>
      <br />

      <div>
        <label>Interval:</label> &nbsp;
      <select value={s.interval} onChange={onChangeInterval}>
          <option value={10}>10ms</option>
          <option value={100}>100ms</option>
          <option value={250}>250ms</option>
          <option value={1000}>1s</option>
          <option value={2000}>2s</option>
        </select>
      </div>
    </div>
  )
})

const store = new Store(counter);
store.start()

store.ready(() => {
  ReactDOM.render(
    <CounterApp />,
    document.querySelector("#app")
  )
})
