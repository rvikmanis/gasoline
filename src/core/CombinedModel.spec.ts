import CombinedModel from './CombinedModel'
import AbstractModel from './AbstractModel'
import { NodeLike } from "../interfaces";

class FakeModel extends AbstractModel<any> {
  process: any
  update: any
  constructor(props: any = {}) {
    super()
    Object.assign(this, props)
  }
}

describe('#dump(state)', () => {
  const c = new CombinedModel({
    a: new FakeModel({ dump() { } }),
    b: new FakeModel({ dump(state: any) { return state } }),
    d: new FakeModel({ dump() { return "foo" } })
  })

  test("combines non-undefined output of #dump from each child", () => {
    expect(c.dump({ a: 0, b: 1, d: undefined })).toEqual({ b: 1, d: "foo" })
  })

  test("returns undefined if all children return undefined", () => {
    delete c.children.d
    expect(c.dump({} as any)).toBe(undefined)
  })
})

describe('#link(keyPath, store)', () => {
  let a: NodeLike
  let b: NodeLike
  let c: CombinedModel<any>

  beforeEach(() => {
    a = new FakeModel()
    b = new FakeModel()
    c = new CombinedModel({ a, b })
  })

  test('links all children to the store', () => {
    expect(a.keyPath).toBe(undefined)
    expect(b.keyPath).toBe(undefined)
    expect(a.store).toBe(undefined)
    expect(b.store).toBe(undefined)

    c.link('/', Object.create(null))
    expect(a.keyPath).toBe('/a')
    expect(b.keyPath).toBe('/b')
    expect(a.store).toBe(c.store)
    expect(b.store).toBe(c.store)
  })
})

describe('#constructor(children: object)', () => {
  let a: NodeLike
  let b: NodeLike
  let c: CombinedModel<any>

  beforeEach(() => {
    a = new FakeModel()
    b = new FakeModel()
  })

  test('sets #accept to combined match-list from all children', () => {
    a.accept = ['A']
    b.accept = ['B']
    c = new CombinedModel({ a, b })
    expect(c.accept).toEqual(['B', 'A'])
  })

  test('sets #accept to undefined if at least one child has undefined match-list', () => {
    a.accept = ['A']
    c = new CombinedModel({ a, b })
    expect(c.accept).toBe(undefined)
  })
})