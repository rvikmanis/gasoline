import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Rx from "rxjs";
import * as gasoline from "gasoline";
import './index.css';

const counter = new gasoline.Model({

  actionCreators: {
    increment() {
      return { type: "INCREMENT" }
    },
    inc10() {
      return { type: "INC_10" }
    }
  },

  process(action$) {
    const action = counter.actionCreators.increment()
    return action$.ofType("INC_10").concatMapTo([
      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,

      action, action, action, action, action, action,
      action, action, action, action,
    ]).observeOn(Rx.Scheduler.async)
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

const autoIncrement = new gasoline.Model({

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
      .ofType(gasoline.Store.START, "TOGGLE_AUTO_INCREMENT")
      .switchMap(() => {

        if (model.state) {
          // if auto increment is enabled, emit INCREMENT every second
          const action = counter.actionCreators.increment()
          return Rx.Observable.interval(1000).mapTo(action)
        }

        // otherwise emit nothing.
        return Rx.Observable.empty()

        // Note: switchMap takes care of subscribing to the latest stream
        // and unsubscribing from previous streams.
      })
  }
});

const rootModel = gasoline.combineModels({
  counter,
  autoIncrement
});

const store = new gasoline.Store(rootModel);

const createContainer = gasoline.connect(
  rootModel.state$,
  {
    increment: counter.actions.increment,
    toggleAutoIncrement: autoIncrement.actions.toggle,
    inc10: counter.actions.inc10
  }
)

const CounterApp = createContainer(props => {
  const incrementBtn = (
    <button disabled={props.autoIncrement}
      onClick={props.increment}>
      Increment
        </button>
  )

  const toggleBtn = (
    <button onClick={props.toggleAutoIncrement}>
      {props.autoIncrement ? "Disable" : "Enable"} auto inc.
        </button>
  )

  const inc10Btn = (
    <button onClick={props.inc10}>inc. 10</button>
  )

  return (
    <div>
      <div>{props.counter}</div>
      <div>{incrementBtn} {toggleBtn} {inc10Btn}</div>
    </div>
  )
})

store.ready(() => {
  ReactDOM.render(
    <CounterApp />,
    document.querySelector("#app")
  )

  // store.action$.withLatestFrom(store.model.state$).subscribe(([action, state]) => {
  //   console.log(action, state)
  // })
})

store.start()