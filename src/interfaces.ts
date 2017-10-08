import UpdateContext from './core/UpdateContext'
import { Subscribable } from 'rxjs/Observable'
import Store from "./core/Store";
import ActionsObservable from "./core/ActionsObservable";
import { Observable } from "rxjs/Observable";
import { ISubscription, TeardownLogic } from "rxjs/Subscription";
import { ActionCreators, DispatcherBoundActionCreators } from "./core/AbstractModel";

export interface Dict<T> {
  [key: string]: T
}

export type Listener = () => void

export interface ActionMeta {
  dispatch?: {
    id: string,
    time: number,
    parent?: string
  },
  replyTo?: string,
  origin?: string
}

export interface ActionLike {
  type: string;
  meta?: ActionMeta;
  payload?: any;
}

export interface DispatchedActionMeta extends ActionMeta {
  dispatch: {
    id: string,
    time: number,
    parent?: string
  }
}

export interface DispatchedActionLike extends ActionLike {
  meta: DispatchedActionMeta
}

export interface ModelInterface {
  accept?: string[];
  update: UpdateHandler<any, SchemaLike>;
  process: ProcessHandler<ModelInterface>;
  dependencies: SchemaLike;
  state: any;

  keyPath: string;
  store: Store<any>;
  isLinked: boolean;
  isDisposed: boolean;
  hasChildren: boolean;

  actionCreators: ActionCreators;
  actions: DispatcherBoundActionCreators<any>;

  getStateFromDigest(digest: Dict<any>): any;
  matchActionType(actionType: string): boolean;
  dump(state: any): any;
  load(dump: any, updateContext: UpdateContext<SchemaLike>): any;
  link(keyPath: string, store: any): () => void;
  unlink(): void;
}

export type UpdateHandler<S, D extends SchemaLike> = (
  (state: S, context: UpdateContext<D>) => S
)

export type ProcessHandler<Model extends ModelInterface> = (
  (action$: ActionsObservable, model: Model) => Subscribable<ActionLike>
)

export type SchemaLike = Dict<ModelInterface>
export type StateLike<S extends SchemaLike> = {[K in keyof S]: S[K]['state']}

export type ServiceReadyState = "connecting" | "open" | "closing" | "closed"

export type ServiceModelState = {
  status: "initial" | ServiceReadyState
}

export type ServiceControlMessage = "open" | "close"

export interface ServiceBridge {
  nextReadyState(status: ServiceReadyState): void;
  throw(error: Error): void;
  dispatch(action: ActionLike): void;
  // discrepancy between ServiceReadyState and ServiceModelState["status"] exists because `initial`
  // is a valid status to have, as it is the initial status of any service, but it is not a
  // valid status to set at any later point in service lifecycle.
  getStatus(): ServiceModelState["status"]
}

export interface ServiceAdapter {
  install(bridge: ServiceBridge): void;
  onAction(action: ActionLike): void;
  onInitial(): void;
  onReadyState(status: ServiceReadyState): void;
  onControlMessage(msg: ServiceControlMessage): void;
}

export type Merge<V> = {
  [K in keyof Record<keyof V, any>]: V[K]
}