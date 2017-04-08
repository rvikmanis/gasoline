// @flow
import React from 'react'
import PropTypes from 'prop-types'
import { getContext, onlyUpdateForKeys } from 'recompose'
import { compose } from 'lodash/fp'
import { connect } from 'react-redux'
import { Selector } from '../utils'

function Control(props) {
  const { component: Component, node, group, collection, dispatch } = props
  return <Component
    node={node}
    group={group}
    collection={collection}
    dispatch={dispatch}
  />
}

const modelContextTypes = {
  model: PropTypes.object
}

const getTreeItem = (state, props) => {
  if (props.keyPath) {
    return props.model.getItemWithState(state, props.keyPath)
  }
  if (props.node && props.node.kind === 'node') {
    return props.node
  }
  if (props.group && props.group.kind === 'group') {
    return props.group
  }
  if (props.collection && props.collection.kind === 'collection') {
    return props.collection
  }

  throw new Error('Missing or invalid either of: keyPath, node, group, collection')
}

const getComponent = (state, props) =>
  props.component

const mapStateToProps = Selector(
  [getTreeItem, getComponent],
  (treeItem, component) => {
    let childProps = {}
    childProps.component = component
    childProps[treeItem.kind] = treeItem
    childProps.keyPath = treeItem.keyPath

    if (treeItem.behavior && treeItem.behavior.component) {
      childProps.component = treeItem.behavior.component
    }

    return childProps
  }
)

const enhance = compose(
  getContext(modelContextTypes),
  connect(mapStateToProps),
  onlyUpdateForKeys(['node', 'group', 'collection', 'keyPath', 'component'])
)

export default enhance(Control)