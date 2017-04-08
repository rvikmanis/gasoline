import NodeType from './NodeType'
import ValueNode from './ValueNode'
import { addChange as change } from '../actions'
import { NodesReducer } from '../reducers'

describe('Value node creator (`ValueNode`)', () => {
  it('is an instance of `NodeType`', () => {
    expect(ValueNode instanceof NodeType).toBe(true)
  })
})

describe('A value node', () => {
  const foo = ValueNode()({ keyPath: 'foo' })

  const bar = ValueNode({
    dependencies: { foo: 'foo' },
    value({ foo }, props) {
      if (!props.userValue) {
        return [foo.value]
      }
      return [props.userValue]
    }
  })({ keyPath: 'bar' })

  const baz = ValueNode({ defaultValue: 'Hello World!' })({ keyPath: 'baz' })

  const updater = NodesReducer([foo, bar, baz])
  let state = updater(undefined, {})

  it('is an instance of `ValueNode`', () => {
    expect(foo instanceof ValueNode).toBe(true)
  })

  it('does initialize as expected', () => {
    expect(state).toMatchSnapshot()
  })

  it('reacts to changes as expected', () => {
    state = updater(state, change('baz', 'BazBazBaz'))
    expect(state).toMatchSnapshot()

    state = updater(state, change('foo', 'Magnificent'))
    expect(state).toMatchSnapshot()

    state = updater(state, change('bar', 'Yohoho'))
    expect(state).toMatchSnapshot()

    state = updater(state, change('bar', undefined))
    expect(state).toMatchSnapshot()

    state = updater(state, change('foo', undefined))
    expect(state).toMatchSnapshot()

    state = updater(state, change('foo', 'Cool'))
    expect(state).toMatchSnapshot()

    expect({
      foo: foo.select(state),
      bar: bar.select(state),
      baz: baz.select(state)
    }).toMatchSnapshot()
  })
})
