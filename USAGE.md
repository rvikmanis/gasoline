# Usage

#### Table of contents

1. [Basic usage](#basic-usage)
    1. [Simple model](#creating-a-simple-model)
    1. [Model with side effects](#creating-a-model-with-side-effects)
    1. [Combining models](#combining-models)
    1. [Creating a store](#creating-a-store)
    1. [Dispatching actions](#dispatching-actions)

## Basic usage

### Creating a simple model

```ts
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
```

### Creating a model with side effects

```ts
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

            // Every time a "TOGGLE_AUTO_INCREMENT" action is dispatched,
            // and also when the store starts,
            .ofType("TOGGLE_AUTO_INCREMENT", gasoline.Store.START)
            .map(() => {

                // check if auto increment is enabled: if it is,
                // return a stream that emits "INCREMENT" actions every second,
                if (model.state) {
                    const action = counter.actionCreators.increment()
                    return Rx.Observable.interval(1000).mapTo(action)
                }

                // otherwise return an empty stream.
                return Rx.Observable.empty()
            })

            // Emit only from the latest inner stream.
            .switch()
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

### Dispatching actions

```ts
function onReady() {
    assert.strictEqual(counter.state, 0)
    assert.strictEqual(autoIncrement.state, false)

    // Let's dispatch our first action
    counter.actions.increment()

    // and verify that it executed.
    assert.strictEqual(counter.state, 1)

    // Now let's enable auto incrementation
    autoIncrement.actions.toggle()
    assert.strictEqual(autoIncrement.state, true)
    counter.state$.subscribe(count => {
        if (count > 9) {
            // and disable it after 10 times.
            autoIncrement.actions.toggle()
            assert.strictEqual(autoIncrement.state, false)
        }
    })
}

store.start()
store.ready(onReady)
```
