import { AbstractModel } from './AbstractModel'
import { ModelInterface } from "../interfaces";
import { Observable } from "./Observable";

class ConcreteModel extends AbstractModel<any> {
  update() {}
  process() { return Observable.empty() }
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
    return model.link(store)
  }

  beforeEach(() => {
    model = new ConcreteModel()
    store = Object.create(null)
  })

  test('throws error if called more than once', () => {
    expect(linking).not.toThrow()
    expect(linking).toThrow(`Model '${model.keyPath}' is already linked`)
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

  test('returns a function that resolves #_whenLinked.promise', () => {
    const promise = (model as any)._whenLinked.promise.then(() => {
      expect(model.isLinked).toBe(true)
    })

    linking()()
    return promise
  })
})

describe('#matchActionType(actionType: string)', () => {
  function call(thisContext: Partial<ModelInterface>, actionType: string) {
    return AbstractModel.prototype.matchActionType.call(thisContext, actionType)
  }

  test('returns true if #accept is undefined', () => {
    expect(call({}, 'ANYTHING')).toBe(true)
  })

  test('returns true if #accept contains exact match', () => {
    expect(call({ accept: ['ANYTHING'] }, 'ANYTHING')).toBe(true)
    expect(call({ accept: ['SOMETHING', 'ANYTHING', 'b*'] }, 'ANYTHING')).toBe(true)
    expect(call({ accept: ['ANY:*'] }, 'ANY:*')).toBe(true)
    expect(call({ accept: ['*THING', 'A'] }, 'A')).toBe(true)
    expect(call({ accept: ['*THING', 'A'] }, '*THING')).toBe(true)
  })

  test('returns false if #accept doesn\'t contain exact match', () => {
    expect(call({ accept: ['ANY*'] }, 'ANYTHING')).toBe(false)
    expect(call({ accept: ['*THING'] }, 'ANYTHING')).toBe(false)
    expect(call({ accept: ['*THING', '*A*'] }, 'BAZ')).toBe(false)
    expect(call({ accept: ['*THING', 'A'] }, 'SOMETHING')).toBe(false)
  })
})