import * as React from 'react';
import * as ReactDOM from 'react-dom';
import * as Rx from "rxjs";
import * as gasoline from "gasoline";
import './index.css';

const counter = new gasoline.Model({

    initialState: 0,

    actionHandlers: {
        "INCREMENT": state => ++state
    },

    actionCreators: {
        increment() {
            return { type: "INCREMENT" }
        }
    }

});

const autoIncrement = new gasoline.Model({

    initialState: false,

    actionHandlers: {
        "TOGGLE_AUTO_INCREMENT": state => !state
    },

    actionCreators: {
        toggle() {
            return { type: "TOGGLE_AUTO_INCREMENT" }
        }
    },

    process(action$, model) {
        return action$
            .ofType("TOGGLE_AUTO_INCREMENT", gasoline.Store.START)
            .switchMap(() => {
                if (model.state) {
                    const action = counter.actionCreators.increment()
                    return Rx.Observable.interval(1000).mapTo(action)
                }
                return Rx.Observable.empty()
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
        toggleAutoIncrement: autoIncrement.actions.toggle
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

    return (
        <div>
            <div>{props.counter}</div>
            <div>{incrementBtn} {toggleBtn}</div>
        </div>
    )
})

store.load({ autoIncrement: true, counter: 1000 });

store.ready(() => {
    ReactDOM.render(
        <CounterApp />,
        document.querySelector("#app")
    )

    store.action$.withLatestFrom(store.model.state$).subscribe(([action, state]) => {
        console.log(action, state)
    })
})

store.start()