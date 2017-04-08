// @flow
import * as t from '../types'
import NodeType from './NodeType'

export default NodeType({
  defaultProps: {
    defaultValue: null,
    value(dependencies, props) {
      if (props.userValue === undefined) {
        return props.defaultValue
      }
      return props.userValue
    }
  },
  propOrder: ['defaultValue', 'userValue', 'value'],
  propResolvers: {
    userValue: ctx => {
      let result: any

      if (ctx.previousNodeState) {
        result = ctx.previousNodeState.userValue
      }

      if (ctx.isChange) {
        result = ctx.subject
      }

      return result
    },
  }
})
