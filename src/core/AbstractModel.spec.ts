import AbstractModel from './AbstractModel'
import { NodeLike } from "../interfaces";

class ConcreteModel extends AbstractModel<any> {
  update: any = () => undefined
  process: any = () => undefined
}

describe('#constructor()', () => {
  test('throws error for base class', () => {
    expect(() => new (AbstractModel as any)())
      .toThrow('Cannot instantiate abstract class AbstractModel')
  })

  test("doesn't throw error for derived class", () => {
    expect(() => new ConcreteModel()).not.toThrow()
  })
})

describe('#link(keyPath, store)', () => {
  let model: ConcreteModel
  let store: any

  function linking() {
    model.link('/', store)
  }

  beforeEach(() => {
    model = new ConcreteModel()
    store = Object.create(null)
  })

  test('throws error if called more than once', () => {
    expect(linking).not.toThrow()
    expect(linking).toThrow('Model is already linked')
  })

  test('changes #keyPath, #store and #isLinked', () => {
    expect(model.keyPath).toBe(undefined)
    expect(model.isLinked).toBe(false)
    expect(model.store).toBe(undefined)

    linking()
    expect(model.keyPath).toBe('/')
    expect(model.isLinked).toBe(true)
    expect(model.store).toBe(store)
  })

  test('resolves #_whenLinked.promise', () => {
    const promise = (model as any)._whenLinked.promise.then(() => {
      expect(model.isLinked).toBe(true)
    })

    linking()
    return promise
  })
})

describe('#matchActionType(actionType: string)', () => {
  function call(thisContext: Partial<NodeLike>, actionType: string) {
    return AbstractModel.prototype.matchActionType.call(thisContext, actionType)
  }

  test('returns true if #accept is undefined', () => {
    expect(call({}, 'ANYTHING')).toBe(true)
  })

  test('returns true if #accept contains exact match', () => {
    expect(call({ accept: ['ANYTHING'] }, 'ANYTHING')).toBe(true)
    expect(call({ accept: ['SOMETHING', 'ANYTHING', 'b*'] }, 'ANYTHING')).toBe(true)
  })

  test('returns true if #accept contains valid rules (*a, b*) and a partial match', () => {
    expect(call({ accept: ['ANY*'] }, 'ANYTHING')).toBe(true)
    expect(call({ accept: ['*THING'] }, 'ANYTHING')).toBe(true)
    expect(call({ accept: ['*THING', 'A'] }, 'A')).toBe(true)
  })

  test('returns false if #accept contains valid rules (*a, b*) but not a partial match', () => {
    expect(call({ accept: ['*THING'] }, 'THING')).toBe(false)
    expect(call({ accept: ['ANY*'] }, 'ANY')).toBe(false)
    expect(call({ accept: ['ANY*'] }, 'B')).toBe(false)
  })

  test('throws error, if #accept contains invalid rules (*, *foo*, foo*bar, foo** etc.)', () => {
    expect(() => call({ accept: ['*'] }, 'ANYTHING')).toThrow('Invalid rule: *')
    expect(() => call({ accept: ['*a*'] }, 'ANYTHING')).toThrow('Invalid rule: *a*')
    expect(() => call({ accept: ['a*b'] }, 'ANYTHING')).toThrow('Invalid rule: a*b')
    expect(() => call({ accept: ['**a'] }, 'ANYTHING')).toThrow('Invalid rule: **a')
    expect(() => call({ accept: ['b**'] }, 'ANYTHING')).toThrow('Invalid rule: b**')
    expect(() => call({ accept: ['a*b*'] }, 'ANYTHING')).toThrow('Invalid rule: a*b*')
    expect(() => call({ accept: ['*a*b'] }, 'ANYTHING')).toThrow('Invalid rule: *a*b')
    expect(() => call({ accept: ['*a*b*'] }, 'ANYTHING')).toThrow('Invalid rule: *a*b*')
  })


})