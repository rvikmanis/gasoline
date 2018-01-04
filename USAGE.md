# Usage

#### Table of contents

1. [Basic usage](#basic-usage)
    1. [Simple model](#creating-a-simple-model)
    1. [Model with side effects](#creating-a-model-with-side-effects)
    1. [Combining models](#combining-models)
    1. [Creating a store](#creating-a-store)
    1. [Rendering with React](#rendering-with-react)

## Basic usage

### Creating a simple model

```ts
const counter = new gasoline.Model({

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
```

### Creating a model with side effects

```ts
const autoIncrement = new gasoline.Model({

    actionCreators: {
        toggle() {
            return { type: "TOGGLE_AUTO_INCREMENT" }
        }
    },
    
    update(state: boolean = false, context) {
        switch (context.action.type) {
            case "TOGGLE_AUTO_INCREMENT":
                return !state
            default:
                return state
        }
    },

    process(action$, model) {
        return action$

            // After the store has started, and 
            // each time TOGGLE_AUTO_INCREMENT is dispatched,
            .ofType(gasoline.Store.START, "TOGGLE_AUTO_INCREMENT")
            .switchMap(() => {

                // check if auto increment is enabled:
                if (model.state) {
                    // if it's enabled, start emitting INCREMENT every second
                    const action = counter.actionCreators.increment()
                    return Rx.Observable.interval(1000).mapTo(action)
                }

                // otherwise emit nothing.
                return Rx.Observable.empty()
                
                // Note: switchMap takes care of subscribing to the latest stream
                // and disposing of all the previous streams. 
            })
    }

});
```

### Combining models

```ts
const rootModel = gasoline.combineModels({
    counter,
    autoIncrement
})
```

### Creating a store

```ts
const store = new gasoline.Store(rootModel)
```

### Rendering with React

```tsx
const createContainer = gasoline.connect(
    rootModel.state$,
    {
        increment: counter.actions.increment,
        toggleAutoIncrement: autoIncrement.actions.toggle
    }
)

type Props = {
    counter: number,
    autoIncrement: boolean,
    increment: () => void,
    toggleAutoIncrement: () => void,
}

const CounterApp = createContainer((props: Props) => {
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

store.ready(() => {
    ReactDOM.render(
        <CounterApp />,
        document.querySelector("#app")
    )
})

store.start()
```
