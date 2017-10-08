# Gasoline

Gasoline is a reactive state graph for rich user interfaces. It lets you create predictable state machines that are easy to reason about and simple to create.

Inspired by [Redux](redux) and [Elm](elm), Gasoline has a similar architecture, with one-way data-flow, immutable state and a deterministic model for updates in the form of reducers, but includes significant improvements:

* A declarative API with support for dependencies between models - the primary motivation for this project.

* Asynchronous action streams - a way to abstract time-variant sequences, remote resource access and other side effects, heavily inspired by [redux-observable](redux-observable).

If you're building web apps with complex UIs, give it a try! Gasoline's high-level API and the ability to define dependencies on state objects helps avoid duplicated code and convoluted control structures. It can even make the implementation read like a straight-forward definition of your application's business rules.

#### Table of contents

1. [Overview](#overview)
    1. [Models](#models)
    1. [Store and actions](#store-and-actions)
1. [Installation](#installation)
1. [Reference](#reference)
    1. [Model API](#model-api)
    1. [Store API](#store-api)

## Overview

### Models

A model represents some part of the application's state along with actions and side effects. Models can optionally depend on other models' state.

>Note that models don't really hold state, instead each model keeps a reference to its state from the store.

Models are created by instantiating the `Model` class:

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
            .ofType("TOGGLE_AUTO_INCREMENT", Store.START)
            .switchMap(() => {
                if (model.state) {
                    const action = counter.actionCreators.increment()
                    return Observable.timer(1000).mapTo(action)
                }

                return Observable.empty()
            })
    },

    acceptExtra: []

});
```

### Store and actions

Since models don't hold state on their own, a store is required to actually do anything. There should be only one store per application and it can be created by instantiating the `Store` class:

```ts
const rootModel = gasoline.combineModels({
    counter,
    autoIncrement
})
const store = new gasoline.Store(rootModel)
```

Actions are dispatched on the store. But before we can do that, the store needs to be started:

```ts
store.start()
```

## Installation

Via Yarn:

```
yarn add gasoline
```

Via NPM:

```
npm install --save gasoline
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
If store is started, invokes `callback` on next tick.
If store is not started, schedules `callback` to be invoked once when the store starts next time.

-----

##### `dispatch(action)`
###### Signature

```ts
(action: ActionLike) => void
```

###### Description
Invokes model's update cycle, then emits the action on the async action stream.