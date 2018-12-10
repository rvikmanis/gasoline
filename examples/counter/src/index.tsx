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
      return { ...state, interval, counter: 0 }
    }
  },

  process(action$, counter) {
    const autoIncrement$ = action$.ofType(
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

    return autoIncrement$
  }
})

const store = new Store(counter);

type CounterProps = {
  running: boolean,
  counter: number,
  interval: number,
  onIntervalChange: React.ChangeEventHandler<HTMLSelectElement>,
  onResetClick: React.MouseEventHandler<HTMLButtonElement>,
  onToggleClick: React.MouseEventHandler<HTMLButtonElement>,
  onIncrementClick: React.MouseEventHandler<HTMLButtonElement>,
  onDecrementClick: React.MouseEventHandler<HTMLButtonElement>
}

function Counter(props: CounterProps) {
  return (
    <div>
      <div>
        Counter: <strong>{props.counter}</strong>
      </div>
      <br />

      <div>
        <button disabled={props.running} onClick={props.onIncrementClick}>
          INC
      </button>
        <button disabled={props.running} onClick={props.onDecrementClick}>
          DEC
      </button>
        &nbsp;
      <button onClick={props.onResetClick}>
          Reset
      </button>
        &nbsp;
      <button onClick={props.onToggleClick}>
          {props.running ? "Stop" : "Start"}
        </button>
      </div>
      <br />

      <div>
        <label>Interval:</label> &nbsp;
      <select value={props.interval} onChange={props.onIntervalChange}>
          <option value={10}>10ms</option>
          <option value={100}>100ms</option>
          <option value={250}>250ms</option>
          <option value={1000}>1s</option>
          <option value={2000}>2s</option>
        </select>
      </div>
    </div>
  )
}

const CounterController = createController(() => {
  const { actions, state$ } = counter

  function onIntervalChange(e: React.ChangeEvent<HTMLSelectElement>) {
    actions.changeInterval(Number(e.target.value))
  }

  return state$.map(state =>
    <Counter
      running={state.running}
      interval={state.interval}
      counter={state.counter}
      onDecrementClick={actions.decrement}
      onIncrementClick={actions.increment}
      onToggleClick={actions.toggle}
      onResetClick={actions.reset}
      onIntervalChange={onIntervalChange}
    />
  )
})

store.ready(() => {
  ReactDOM.render(
    <CounterController />,
    document.querySelector("#app")
  )
})

store.start()
