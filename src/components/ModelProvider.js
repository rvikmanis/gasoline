// @flow
import React from 'react'
import PropTypes from 'prop-types'
import { withContext } from 'recompose'

function ModelProvider(props) {
  return props.children
}

const enhance = withContext(
  { model: PropTypes.object },
  ({ model }) => ({ model })
)

export default enhance(ModelProvider)
