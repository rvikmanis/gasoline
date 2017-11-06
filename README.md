# Gasoline

Gasoline is a state management library with a focus on expressiveness, predictability and performance.

#### Table of contents

1. [Overview](#overview)
    1. [Models](#models)
    1. [Store](#store)
1. [Installation](#installation)
1. [Usage examples](#usage-examples)

## Overview

Inspired by [Redux](redux) and [Elm](elm), it works on the same basic principles: global updates, immutable state and unidirectional flow of changes.

Gasoline helps you write business rules in a way that is easy to reason about, and gives you powerful tools for cutting complexity and development time:

* Declarative, object-based API.
* Explicit dependencies between models.
* Side effects isolated in *epics*.
* Your own custom reusable model classes.

You can think of Gasoline as object-based Redux; where the basic building blocks are models.

### Models

A model is a description of some part of the application's state, with instructions on how that state will change. In other words - a localized state machine.

>Note that models don't hold the actual state on their own. They hold references to their state from the store.

There are two ways models can respond to actions:

* In the **update cycle** by returning the next state.

* In the **process cycle** by performing side effects and returning an observable of actions to dispatch in turn.

The main parts of a model are:

* Reducer - update cycle handler
* Epic - process cycle handler
* Action creators - same as in Redux, but you get the convenience of auto-binding them to the store
* Dependencies - references to other models
* Action whitelist - a list of action types the model must respond to


### Store

Same as in Redux, there should be a single store per application.

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

See [USAGE.md](USAGE.md)
