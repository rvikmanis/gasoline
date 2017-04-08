// @flow
export type IDictionary<T> = { [key: string]: T }
export type IDependencies = IDictionary<string>
export type IDynamicProperty<T> = (resolvedDependencies: Object, resolvedProps: Object) => T
export type IProperty<T> = T | IDynamicProperty<T>
export type IPropertyValue = void | null | boolean | string | number | Array<IPropertyValue> | IDictionary<IPropertyValue>
export type IControlTreeState = {
  current: IDictionary<IDictionary<IPropertyValue>>,
  next: IDictionary<IDictionary<IPropertyValue>>,
  auto: IDictionary<IDictionary<IPropertyValue>>,
  working: {
    isInitial?: true,
    changedKeyPaths?: IDictionary<boolean>,
    digest?: IDictionary<IDictionary<IPropertyValue>>,
  }
}
export type IAction = { type: 'string', payload?: mixed }

export type INodeResolverContext = {
  node: INode,
  ctState: IControlTreeState,
  nodesDigest: IDictionary<IDictionary<IPropertyValue>>,
  previousNodeState: IDictionary<IPropertyValue>,
  resolvedDependencies: IDictionary<IDictionary<IPropertyValue>>,
  shouldUpdate: boolean,
  isInitial: boolean,
  isChange: boolean,
  isAutoChange: boolean,
  subject: mixed,
}

export type IPropResolverContext = {
  node: INode,
  ctState: IControlTreeState,
  nodesDigest: IDictionary<IDictionary<IPropertyValue>>,
  previousNodeState: IDictionary<IPropertyValue>,
  resolvedDependencies: IDictionary<IDictionary<IPropertyValue>>,
  shouldUpdate: boolean,
  isInitial: boolean,
  isChange: boolean,
  isAutoChange: boolean,
  subject: mixed,
  resolvedProps: IDictionary<IPropertyValue>,
  propName: string,
  resolveProp: () => IPropertyValue,
}

export type IPropResolver = (context: IPropResolverContext) => IPropertyValue

export type INodeReducer = (state: IControlTreeState, action: IAction) => IControlTreeState
export type INodeResolver = (context: INodeResolverContext) => void | IDictionary<IPropertyValue>

export type ITypeOptions = {
  propResolvers?: IDictionary<IPropResolver>,
  propOrder?: string[],
  defaultProps?: IDictionary<IPropertyValue>,
  getResolver?: (node: IPartialNode & { resolver: INodeResolver }) => INodeResolver,
  getReducer?: (node: INode) => INodeReducer,
  getEpic?: (node: INode) => (any, any) => any,
  transformInstanceOptions?: (options: INodeOptions) => INodeOptions
}

export type IPartialNode = {
  kind: 'node',
  keyPath: string,
  variantKeyPath: string,
  dependencies: IDictionary<string>,
  props: IDictionary<IProperty<IPropertyValue>>,
  behavior: IDictionary<mixed>,
  select(ctState: IControlTreeState): void | IDictionary<IPropertyValue>,
  typeOptions: ITypeOptions,
  instanceOptions: INodeOptions,
  propResolvers: Array<[string, IPropResolver]>,
  model: IModel
}

export type INode = {
  kind: 'node',
  keyPath: string,
  variantKeyPath: string,
  dependencies: IDictionary<string>,
  props: IDictionary<IProperty<IPropertyValue>>,
  behavior: IDictionary<mixed>,
  reducer(ctState: IControlTreeState, action: IAction): IControlTreeState,
  resolver(context: INodeResolverContext): void | IDictionary<IPropertyValue>,
  epic?: (any, any) => any,
  select(ctState: IControlTreeState): void | IDictionary<IPropertyValue>,
  typeOptions: ITypeOptions,
  instanceOptions: INodeOptions,
  propResolvers: Array<[string, IPropResolver]>,
  model: IModel,
  getWithState: (ctState: IControlTreeState) => INode & { state: mixed }
}

export type INodeOptions = {
  dependencies?: IDictionary<string>,
  behavior?: IDictionary<mixed>,
  [key: string]: IProperty<IPropertyValue>
}

export type IBindingContext = {
  keyPath: string,
  variantKeyPath: string,
  model: IModel
}

export type INodeBinder = (context: IBindingContext) => INode

export type INodeCreator = (options: INodeOptions) => INodeBinder

export type INodeWriterContext = {
  changeSet: 'auto' | 'next',
  keyPath: string,
  resolvedNodeState: void | IDictionary<IPropertyValue>
}

export type ISchema = {
  [key: string]: INodeBinder | ISchema
}

export type IModel = {
  rootSelector: (state: mixed) => IControlTreeState
}

export type IModelOptions = {
  schema: ISchema,
  rootSelector?: (state: mixed) => IControlTreeState
}

export type IGroup = {
  kind: 'group',
  keyPath: string,
  nodes: IDictionary<INode>,
  subgroups: IDictionary<IGroup>,
  getWithState(ctState: IControlTreeState): {
    kind: 'group',
    keyPath: string,
    nodes: IDictionary<INode & { state: mixed }>,
    subgroups: IDictionary<IGroup>
  }
}
