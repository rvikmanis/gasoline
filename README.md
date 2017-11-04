# Gasoline

Gasoline is a reactive programming library that makes it very simple to create predictable state machines, i.e. programs that are easy to reason about.

It's specifically designed to support highly interactive user interfaces with complex workflows and many user controls.

Inspired by [Redux](redux) and [Elm](elm), Gasoline is built on the same basic concept, with one-way data-flow, immutable state and a deterministic model for updates in the form of reducers.

It has the following built-in features:

* Declarative API with support for dependencies between models - the primary motivation for this project.

* Observable action streams to abstract time-variant sequences, remote resource access and other side effects, heavily inspired by [redux-observable](redux-observable).

* Selective dispatch based on action whitelisting - the ability to execute only the code paths where an action can be handled. Essential for performance in large nested state trees with many nodes.

If you're building web apps with complex UIs, give it a try! Gasoline's high-level API and the ability to define dependencies between nodes helps avoid convoluted control structures and code duplication. It can even make the implementation read like a straight-forward definition of your application's business rules.

#### Table of contents

1. [Overview](#overview)
    1. [Models](#models)
    1. [Store and actions](#store-and-actions)
1. [Installation](#installation)
1. [Usage examples](#usage-examples)
1. [Reference](#reference)
    1. [Model API](#model-api)
    1. [Store API](#store-api)

## Overview

### Models

A model represents some part of the application's state along with actions and side effects. Models can optionally depend on other models' state.

>Note that models don't really hold state, instead each model keeps a reference to its state from the store.

Models are created by instantiating the `Model` class.

### Store and actions

Since models don't hold state on their own, a store is required to actually do anything. There should be only one store per application.

Store is created by instantiating the `Store` class.

## Installation

We haven't yet released, but once we do, Gasoline will be available on *npm*.

#### Node.js

We recommend installing with [Yarn](https://yarnpkg.com/), because it's faster.
```
yarn add gasoline
```

But *npm* works too.
```
npm install --save gasoline
```

#### Browser

```html
<!-- Dependencies -->
<script src="https://unpkg.com/rxjs@5/bundles/Rx.min.js"></script>
<script src="https://unpkg.com/react@15/dist/react.min.js"></script>

<!-- Gasoline -->
<script src="https://unpkg.com/gasoline/dist/gasoline.min.js"></script>
```

Makes the API available as `window.gasoline`.

## Usage examples


#### Basic usage

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

#### Handling side effects

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

#### Creating the store

```ts
const rootModel = gasoline.combineModels({
    counter,
    autoIncrement
})

const store = new gasoline.Store(rootModel)
store.start()
```

#### Dispatching actions

```ts
/**
 * Invoked after the store has initialized its
 * state and subscribed to models' side effects streams.
 */
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

store.ready(onReady)
```

## Reference

### Model API

```ts
import { Model } from "gasoline"
```

Constructor has the following signature:

```ts
new Model<S, C, D>(options: {
    update?,
    process?,
    actionCreators?,
    dependencies?
})
```

#### Options

##### `update(state, context)`

###### Signature

```ts
(state: S, context: UpdateContext) => S
```

###### Parameters

1. `state` - the current state.
1. `context` - an object containing information about the current update cycle.

    Has the following props:
    * `action` - the dispatched action.
    * `dependencies` - combined state of the model's dependencies, or an empty object.
    * `model` - the model itself.

###### Returns

The next state.

###### Description

Invoked when the model receives an action.

A special lifecycle action is dispatched at the beginning to every model; In this case `update` is called with undefined state, and its return value becomes the initial state.

>Note that you must not mutate the state. Always return a new instance if the state should change.

-----

##### `process(action$, model)`

###### Signature

```ts
<I, O>(
    action$: Rx.Observable<ActionLike & I>,
    model: Model<S, C, D>
) => Rx.Observable<ActionLike & O>
```

###### Parameters

1. `action$` - an observable stream of dispatched actions.
1. `model` - the model itself.

###### Returns

An output stream of actions to be dispatched in response.

###### Description

Invoked when the store is started. Handles side effects and asynchronous behaviors for the model.

-----

##### `actionCreators`

###### Signature

```ts
C & { [K in keyof C]: C[K] & ((...args: any[]) => ActionLike) }
```

###### Description

Intended for the model's public action creators, i.e. for actions that are usually dispatched from components or other models. Conveniently binds action creators to the dispatch function as `actions`:

```ts
// e.g.
counter.actions.increment()

// is equivalent to
store.dispatch(counter.actionCreators.increment())
```

-----

##### `dependencies`

###### Signature

```ts
D & { [K in keyof D]: Model<D[K]> }
```

###### Description

An object declaring which models are dependencies of this model. A mapping of keys to the respective models' state is injected into the *update context* under `dependencies`, and the `update` function triggered each time a dependency state change happens.

-----

### Store API

```ts
import { Store } from "gasoline"
```

Constructor has the following signature:

```ts
new Store<S>(model: Model<S>)
```

#### Methods

##### `start()`

###### Signature

```ts
() => void
```

###### Description

Dispatches the `gasoline.Store.START` lifecycle action. Subscribes to side effects. Invokes current *ready* callbacks.

-----

##### `stop()`

###### Signature

```ts
() => void
```

###### Description
Dispatches the `gasoline.Store.STOP` lifecycle action. Unsubscribes from side effects.

-----

##### `ready(callback)`
###### Signature

```ts
(callback: () => void) => void
```

###### Description
If store is started, invokes `callback` immediately.
If store is not started, schedules `callback` to be invoked when the store starts.

-----

##### `dispatch(action)`
###### Signature

```ts
(action: ActionLike) => void
```

###### Description
Invokes the root model's update cycle, then emits the action to side effect stream.
