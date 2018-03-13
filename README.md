# Gasoline

Pragmatic state management for reactive web applications.

#### Table of contents

1. [Overview](#overview)
    1. [Models](#models)
    1. [Store](#store)
1. [Installation](#installation)
1. [Usage examples](#usage-examples)

## Overview

Inspired by Redux and Elm, it works on the same principles: global updates, immutable state and unidirectional flow of changes.

Gasoline helps you write business rules in a way that is easy to reason about, and gives you powerful tools for cutting complexity and development time:

* Declarative, object-based API.
* Explicit dependencies between models.
* Side effects isolated in *epics*.
* Your own custom reusable model classes.

You can think of Gasoline as object-based Redux; where the basic building blocks are models.

### Models

In Gasoline, a model is a description of some part of the application's state, with instructions on how that state will change.

>Note that models don't hold the actual state in them, but keep a reference to the store.

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

#### Node.js

```
yarn add gasoline
```

or

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
