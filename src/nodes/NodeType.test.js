import NodeType from './NodeType'
import { addChange as change } from '../actions'
import { NodesReducer } from '../reducers'

let TestNode
let binder

describe('Node meta creator (`NodeType`)', () => {
  test('returns a node creator', () => {
    TestNode = NodeType()
  })
})

describe('A node creator', () => {
  test('is an instance of `NodeType`', () => {
    expect(TestNode instanceof NodeType).toBe(true)
  })
  test('returns a binder', () => {
    binder = TestNode()
  })
})

describe('A binder', () => {
  test('is a function', () => {
    expect(typeof binder).toBe('function')
  })
  test('returns a node bound to some context', () => {
    const node = binder({ keyPath: 'foo' })
    expect(node).toMatchObject({ keyPath: 'foo' })
  })
})

describe('A node', () => {
  test('is an instance of its creator', () => {
    expect(TestNode()({ keyPath: 'a' }) instanceof TestNode).toBe(true)
  })

  test('resolves props as expected', () => {
    const TestNode = NodeType({
      propResolvers: {
        foo: ({ resolvedProps }) => (resolvedProps.bar || 'lambda').toUpperCase()
      }
    })
    const node = TestNode({ bar: 'baz' })({ keyPath: 'foo.bar' })
    const state = NodesReducer([node])(undefined, {})

    expect(node.select(state)).toEqual({
      foo: 'BAZ',
      bar: 'baz'
    })

    const TestOrderNode = NodeType({
      ...node.typeOptions,
      propOrder: ['foo', 'bar'],
    })
    const orderNode = TestOrderNode({ ...node.instanceOptions })({ keyPath: 'foo.bar' })
    const state2 = NodesReducer([orderNode])(undefined, {})

    expect(orderNode.select(state2)).toEqual({
      foo: 'LAMBDA',
      bar: 'baz'
    })
  })

  test('resolves dependencies and reacts to changes as expected', () => {
    const IncrementNode = NodeType({
      propResolvers: {
        count(ctx) {
          if (ctx.isChange) {
            return ctx.previousNodeState.count + 1
          }

          if (ctx.isInitial) {
            return ctx.resolvedProps.initialCount
          }

          return ctx.previousNodeState.count
        }
      },
      propOrder: ['initialCount', 'count'],
      defaultProps: {
        initialCount: 0
      }
    })
    const foo = IncrementNode({ initialCount: 10 })({ keyPath: 'namespace.foo' })
    const bar = TestNode({
      dependencies: {
        foo: '.foo'
      },
      times2({ foo }) {
        return foo.count * 2
      }
    })({ keyPath: 'namespace.bar' })

    const updater = NodesReducer([foo, bar])

    let state = updater(undefined, {})
    expect(foo.select(state)).toEqual({
      initialCount: 10,
      count: 10
    })

    expect(bar.select(state)).toEqual({
      times2: 10 * 2
    })

    state = updater(state, {})
    expect(foo.select(state)).toEqual({
      initialCount: 10,
      count: 10
    })

    expect(bar.select(state)).toEqual({
      times2: 10 * 2
    })

    state = updater(state, change('namespace.foo'))
    expect(foo.select(state)).toEqual({
      initialCount: 10,
      count: 11
    })

    expect(bar.select(state)).toEqual({
      times2: 11 * 2
    })
  })
})
