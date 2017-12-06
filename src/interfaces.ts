import { UpdateContext } from './core/UpdateContext'
import { Subscribable } from 'rxjs/Observable'
import { Store } from "./core/Store";
import { ActionsObservable } from "./core/ActionsObservable";

export interface Dict<T> {
  [key: string]: T
}

export interface Listener {
  (): void
}

export interface ActionMeta {
  dispatch?: {
    id: string,
    time: number,
    parent?: string
  },
  replyTo?: string,
  origin?: string
}

export interface DispatchedActionMeta {
  dispatch: {
    id: string,
    time: number,
    parent?: string
  }
}

export interface ActionLike {
  type: string;
  target?: string | undefined;
  meta?: ActionMeta;
  payload?: any;
}

export interface ActionCreator {
  (...args: any[]): ActionLike
}
export type ActionCreatorMap = Dict<ActionCreator>
export type DispatcherBoundActionCreatorMap<AC extends ActionCreatorMap> = {[K in keyof AC]: (...args: any[]) => void }

export interface ModelInterface {
  accept?: string[];
  update: Reducer<any, Schema>;
  process: Epic<ModelInterface>;
  dependencies: Schema;
  state: any;

  keyPath: string;
  store: Store<any>;
  isLinked: boolean;
  isDisposed: boolean;
  hasChildren: boolean;

  actionCreators: ActionCreatorMap;
  actions: DispatcherBoundActionCreatorMap<any>;

  getStateFromDigest(digest: Dict<any>): any;
  matchActionType(actionType: string): boolean;
  dump(state: any): any;
  load(dump: any, updateContext: UpdateContext<Schema>): any;
  link(keyPath: string, store: any): () => void;
  unlink(): void;
}

export interface Reducer<S, D extends Schema> {
  (state: S, context: UpdateContext<D>): S
}

export interface Epic<Model extends ModelInterface> {
  (action$: ActionsObservable, model: Model): Subscribable<ActionLike>
}

export type Schema = Dict<ModelInterface>
export type StateOf<S extends Schema> = {[K in keyof S]: S[K]['state']}
