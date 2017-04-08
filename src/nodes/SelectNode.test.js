import NodeType from './NodeType'
import SelectNode from './SelectNode'
import { addChange as change, commitChanges } from '../actions'
import { NodesReducer } from '../reducers'

const COLORS = [
  { id: 'light-gray', name: 'Light gray', subsets: { "lorem-ipsum": true, "dolor": true, "sit-amet": false } },
  { id: 'medium-gray', name: 'Medium gray', subsets: { "lorem-ipsum": true, "dolor": true, "sit-amet": false } },
  { id: 'dark-gray', name: 'Dark gray', subsets: { "lorem-ipsum": true, "dolor": true, "sit-amet": false } },

  { id: 'red', name: 'Red', subsets: { "lorem-ipsum": true, "dolor": false, "sit-amet": true } },
  { id: 'green', name: 'Green', subsets: { "lorem-ipsum": true, "dolor": false, "sit-amet": true } },
  { id: 'blue', name: 'Blue', subsets: { "lorem-ipsum": true, "dolor": false, "sit-amet": true } },

  { id: 'orange', name: 'Orange', subsets: { "lorem-ipsum": false, "dolor": false, "sit-amet": true } },
  { id: 'teal', name: 'Teal', subsets: { "lorem-ipsum": false, "dolor": false, "sit-amet": true } },
  { id: 'tan', name: 'Tan', subsets: { "lorem-ipsum": false, "dolor": false, "sit-amet": true } },

  { id: 'black', name: 'Black', subsets: { "lorem-ipsum": true, "dolor": true, "sit-amet": true } },
  { id: 'white', name: 'White', subsets: { "lorem-ipsum": true, "dolor": true, "sit-amet": true } },
]

describe('Select node creator (`SelectNode`)', () => {
  it('is an instance of `NodeType`', () => {
    expect(SelectNode instanceof NodeType).toBe(true)
  })
})

describe('A select node', () => {
  const foo = SelectNode({
    options: [
      { id: 'lorem-ipsum', name: 'Lorem Ipsum' },
      { id: 'dolor', name: 'Dolor' },
      { id: 'sit-amet', name: 'Sit Amet' },
    ]
  })({ keyPath: 'foo' })

  const color = SelectNode({
    dependencies: { foo: 'foo' },
    options({ foo }) {
      return COLORS.filter(color => color.subsets[foo.value])
    }
  })({ keyPath: 'color' })

  const updater = NodesReducer([foo, color])
  let state = updater(undefined, {})

  it('is an instance of `SelectNode`', () => {
    expect(foo instanceof SelectNode).toBe(true)
  })

  it('does initialize as expected', () => {
    expect(state).toMatchSnapshot()
    expect(color.select(state).value).toBe('light-gray')
  })

  it('reacts to changes as expected', () => {
    state = updater(state, change('foo', 'sit-amet'))
    expect(state).toMatchSnapshot()
    expect(color.select(state).value).toBe('red')

    state = updater(state, change('foo', undefined))
    expect(state).toMatchSnapshot()
    expect(color.select(state).value).toBe('light-gray')
  })

  it('updates preferred values on commit', () => {
    const eq = require('shallow-equals')
    expect(eq(updater(state, change('abc', 1)).current, state.current)).toBe(true)
    expect(eq(updater(state, change('abc', 1)).auto, state.auto)).toBe(true)
    expect(eq(updater(state, change('abc', 1)).next, state.next)).toBe(true)
    state = updater(state, change('color', 'dark-gray'))
    const colorNodeState = color.select(state)
    expect(state.preferredValues).toBe(undefined)
    state = updater(state, commitChanges())
    expect(state).toMatchSnapshot()
    expect(color.select(state)).toBe(colorNodeState)
    expect(color.select(state).value).toBe('dark-gray')
    expect(state.preferredValues.color).toEqual(['dark-gray'])
    expect(state.preferredValues.foo).toEqual([undefined])

    state = updater(state, change('foo', 'sit-amet'))
    state = updater(state, change('color', 'orange'))
    state = updater(state, commitChanges())
    expect(state).toMatchSnapshot()
    expect(color.select(state).value).toBe('orange')
    expect(state.preferredValues.color).toEqual(['dark-gray', 'orange'])
    expect(state.preferredValues.foo).toEqual([undefined, 'sit-amet'])
  })

  it('considers preferred values when resolving value', () => {
    state = updater(state, change('foo', 'dolor'))
    expect(state).toMatchSnapshot()
    expect(color.select(state).value).toBe('dark-gray')

    state = updater(state, change('foo', undefined))
    expect(state).toMatchSnapshot()
    expect(foo.select(state).value).toBe('lorem-ipsum')
    expect(color.select(state).value).toBe('dark-gray')

    state = updater(state, change('foo', 'sit-amet'))
    expect(state).toMatchSnapshot()
    expect(color.select(state).value).toBe('orange')

    state = updater(state, change('color', undefined))
    expect(state).toMatchSnapshot()
    expect(color.select(state).value).toBe('red')

    state = updater(state, change('foo', undefined))
    expect(state).toMatchSnapshot()
    expect(foo.select(state).value).toBe('lorem-ipsum')
    expect(color.select(state).value).toBe('light-gray')
  })
})
