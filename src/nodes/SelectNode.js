// @flow
import * as t from "../types";
import NodeType from "./NodeType";
import { findLast, map } from "lodash/fp";
import { concatReducers } from "../utils";
import { COMMIT_CHANGES } from '../constants'

const SelectNode = NodeType({
  getReducer(node) {
    return concatReducers(node.reducer, PreferredValuesReducer(node.keyPath));
  },
  defaultProps: {
    defaultValue(_, { isOptional }) {
      return isOptional ? null : undefined;
    },
    isOptional: false
  },
  propOrder: [
    "isOptional",
    "options",
    "defaultValue",
    "userValue",
    "value",
    "selectedOption"
  ],
  propResolvers: {
    selectedOption: ctx => {
      const { options, value } = ctx.resolvedProps;
      if (!Array.isArray(options)) {
        return
      }
      return options.filter(row =>
        row &&
        typeof row === 'object' &&
        !Array.isArray(row) &&
        row.id === value
      )[0];
    },
    value: ctx => {
      const { userValue, defaultValue, options } = ctx.resolvedProps;

      const preferredValues = ctx.ctState && ctx.ctState.preferredValues != null &&
        typeof ctx.ctState.preferredValues === "object"
        ? ctx.ctState.preferredValues
        : {};

      const keyPath: string = ctx.node.keyPath

      const nodePreferredValues = Array.isArray(
        preferredValues[keyPath]
      )
        ? preferredValues[keyPath]
        : [];

      if (Array.isArray(options)) {
        const validValues: Array<string | number | null> = map("id", options);
        const result = findLast(
          value => value === undefined || validValues.indexOf(value) !== -1,
          [defaultValue].concat(nodePreferredValues.concat(userValue))
        );
        if (result === undefined) {
          return defaultValue
        }
        return result
      }
    },
    defaultValue: ctx => {
      let result = ctx.resolveProp();

      if (result !== undefined) {
        return result;
      }

      const { options } = ctx.resolvedProps;


      if (
        Array.isArray(options) &&
        options[0] != null &&
        typeof options[0] === "object" &&
        !Array.isArray(options[0])
      ) {
        return options[0].id;
      } else {
        throw new Error("Prop `options` contains invalid data");
      }
    },
    userValue: ctx => {
      let result: any;
      const node = ctx.node

      if (!node) {
        throw new Error('Invalid node')
      }

      const { options } = ctx.resolvedProps;

      if (ctx.previousNodeState) {
        result = ctx.previousNodeState.userValue;
      }


      if (ctx.isChange) {
        result = ctx.subject;
      }

      return result
    }
  }
});

export default SelectNode

function PreferredValuesReducer(keyPath) {
  return (state, action) => {
    if (action.type !== COMMIT_CHANGES) {
      return state
    }

    const nodeState = state.next[keyPath]
    if (!nodeState) {
      return state
    }

    const preferredValues = state.preferredValues || {}
    const list = preferredValues[keyPath] || []

    return {
      ...state,
      preferredValues: {
        ...preferredValues,
        [keyPath]: list.concat(nodeState.userValue)
      }
    }
  }
}
