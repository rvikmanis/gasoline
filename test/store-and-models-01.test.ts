import { Model, Store, CombinedModel, Observable } from '../src'
import { Observable as RxObservable } from "rxjs";

let text
let characterList
let combinedTextModel
let numChars
let counter
let aggregate
let manyDeps
let rootModel
let store

function setup() {
  const txt = new Model({
    state: 'Foo+',
    actions: {
      setText(state, text) {
        return text
      }
    }
  })

  const charList = new Model({
    dependencies: {
      text: txt
    },
    update(state: string[] = [], { dependencies }) {
      const newState = dependencies.text.split('')
      if (newState.length === state.length) {
        let changed = false
        newState.forEach((v, i) => {
          if (v !== state[i]) {
            changed = true
          }
        })
        if (!changed) {
          return state
        }
      }
      return newState
    },
    dump: () => { },
    load: () => { }
  })

  const combinedTxtModel = new CombinedModel({
    characterList: charList,
    text: txt
  })

  const nChars = new Model({
    dependencies: { chars: combinedTxtModel.getChildByKey("characterList") },
    update(state: number, { dependencies }) {
      return dependencies.chars.length
    },
    dump: () => { },
    load: () => { }
  })

  const cntr = counter = new Model({
    actionTypes: ["inc", "delayedInc", "stopDelayedInc"],
    update(state: number = 0, { action, model }) {
      if (action.type === model.actionTypes.inc) {
        state = state + 1
      }
      return state
    },
    process(action$, model) {
      return action$
        .ofType(model.actionTypes.delayedInc)
        .switchMap(action => {
          return Observable
            .interval(100)
            .take(4)
            .map(() => model.actionCreators.inc())
            .takeUntil(action$.ofType(model.actionTypes.stopDelayedInc))
        })
    }
  })

  const mDeps = new Model({
    dependencies: {
      text: combinedTxtModel.getChildByKey("text"),
      counter: cntr,
      numChars: nChars
    },
    update(state: string, { dependencies }) {
      const { text, counter, numChars } = dependencies
      return `${counter * numChars}, ${text.toUpperCase()}`
    },
    dump: () => { },
    load: () => { }
  })

  const aggr = new CombinedModel({
    manyDeps: mDeps
  })

  const root = new CombinedModel({
    aggregate: aggr,
    numChars: nChars,
    text: combinedTxtModel,
    counter: cntr
  })

  const s = new Store(root)
  store = s
  rootModel = root
  aggregate = aggr
  manyDeps = mDeps
  counter = cntr
  numChars = nChars
  combinedTextModel = combinedTxtModel
  characterList = charList
  text = txt
}

beforeEach(setup)

function expectState(state) {
  expect(store.model.state.text).toBe(combinedTextModel.state)
  expect(store.model.state.text.text).toBe(text.state)
  expect(store.model.state.text.characterList).toBe(characterList.state)
  expect(store.model.state.numChars).toBe(numChars.state)
  expect(store.model.state.counter).toBe(counter.state)
  expect(store.model.state.aggregate).toBe(aggregate.state)
  expect(store.model.state.aggregate.manyDeps).toBe(manyDeps.state)
  expect(store.model.state).toBe(rootModel.state)

  expect(combinedTextModel.state).toEqual({
    text: text.state,
    characterList: characterList.state
  })

  expect(aggregate.state).toEqual({
    manyDeps: manyDeps.state
  })

  expect(rootModel.state).toEqual({
    text: combinedTextModel.state,
    numChars: numChars.state,
    counter: counter.state,
    aggregate: aggregate.state
  })

  expect(store.model.state).toEqual(state)
}

test('Linking', () => {
  store.start()

  expect(combinedTextModel.isLinked).toBe(true)
  expect(combinedTextModel.keyPath).toBe('/text')

  expect(text.isLinked).toBe(true)
  expect(text.keyPath).toBe('/text/text')

  expect(characterList.isLinked).toBe(true)
  expect(characterList.keyPath).toBe('/text/characterList')

  expect(numChars.isLinked).toBe(true)
  expect(numChars.keyPath).toBe('/numChars')

  expect(counter.isLinked).toBe(true)
  expect(counter.keyPath).toBe('/counter')

  expect(aggregate.isLinked).toBe(true)
  expect(aggregate.keyPath).toBe('/aggregate')

  expect(manyDeps.isLinked).toBe(true)
  expect(manyDeps.keyPath).toBe('/aggregate/manyDeps')

  expect(rootModel.isLinked).toBe(true)
  expect(rootModel.keyPath).toBe('/')
})

test('Dependencies', () => {
  store.start()

  expect(rootModel.dependencies).toEqual({})
  expect(numChars.dependencies).toEqual({ chars: characterList })
  expect(characterList.dependencies).toEqual({ text: text })
  expect(text.dependencies).toEqual({})
  expect(combinedTextModel.dependencies).toEqual({})
  expect(counter.dependencies).toEqual({})
  expect(manyDeps.dependencies).toEqual({ text, counter, numChars })
  expect(aggregate.dependencies).toEqual({
    '/text/text': text,
    '/counter': counter,
    '/numChars': numChars
  })
})

test('Initial state', () => {
  store.start()

  expectState({
    text: {
      text: 'Foo+',
      characterList: ['F', 'o', 'o', '+']
    },
    numChars: 4,
    counter: 0,
    aggregate: {
      manyDeps: '0, FOO+'
    }
  })
})

test('Dispatching', () => {
  store.start()

  store.dispatch(counter.actionCreators.inc())
  expectState({
    text: {
      text: 'Foo+',
      characterList: ['F', 'o', 'o', '+']
    },
    numChars: 4,
    counter: 1,
    aggregate: {
      manyDeps: '4, FOO+'
    }
  })
  expect(store._lastUpdateContext.workingState.updated).toEqual(new Set([
    '/counter',
    '/aggregate/manyDeps',
    '/aggregate',
    '/'
  ]))

  const setTextBar = text.actionCreators.setText('Bar')
  expect(setTextBar).toEqual({
    type: "/text/text:setText",
    payload: "Bar"
  })

  store.dispatch(setTextBar)
  expectState({
    text: {
      text: 'Bar',
      characterList: ['B', 'a', 'r']
    },
    numChars: 3,
    counter: 1,
    aggregate: {
      manyDeps: '3, BAR'
    }
  })
  expect(store._lastUpdateContext.workingState.updated).toEqual(new Set([
    '/text/text',
    '/text/characterList',
    '/text',
    '/numChars',
    '/aggregate/manyDeps',
    '/aggregate',
    '/'
  ]))

  store.dispatch(counter.actionCreators.inc())
  expectState({
    text: {
      text: 'Bar',
      characterList: ['B', 'a', 'r']
    },
    numChars: 3,
    counter: 2,
    aggregate: {
      manyDeps: '6, BAR'
    }
  })
  expect(store._lastUpdateContext.workingState.updated).toEqual(new Set([
    '/counter',
    '/aggregate/manyDeps',
    '/aggregate',
    '/'
  ]))
})

test('Dumping', () => {
  store.start()

  expect(store.dump()).toEqual({
    text: { text: 'Foo+' },
    counter: 0
  })
})

test('Loading', () => {
  store.load({ text: { text: 'FooBar' }, counter: 9 })
  expect(store.model.state).toEqual({
    text: {
      text: 'FooBar',
      characterList: ['F', 'o', 'o', 'B', 'a', 'r']
    },
    numChars: 6,
    counter: 9,
    aggregate: {
      manyDeps: '54, FOOBAR'
    }
  })
})

test('Side effects', () => {
  store.start()

  store.dispatch(counter.actionCreators.delayedInc())
  expect(counter.state).toBe(0)

  return RxObservable
    .interval(100)
    .map(i => i + 1)
    .do(i => expect(counter.state).toBe(Math.min(i, 4)))
    .take(6)
    .toPromise()
})

test('Side effect cancellation', () => {
  store.start()

  counter.actions.delayedInc()
  expect(counter.state).toBe(0)

  const stop$ = RxObservable
    .of(counter.actionCreators.stopDelayedInc())
    .delay(250)
    .do(action => store.dispatch(action))

  const assertion$ = RxObservable
    .interval(100)
    .map(i => i + 1)
    .do(i => expect(counter.state).toBe(Math.min(i, 2)))
    .take(6)

  return RxObservable
    .merge(stop$, assertion$)
    .toPromise()
})