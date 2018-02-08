import { UpdateContext } from './core/UpdateContext'
import { Store } from "./core/Store";
import { Observable } from "./core/Observable";

export interface InputAction<T extends string = string> {
  type: T;
  target?: string | string[] | ModelInterface | ModelInterface[];
  meta?: { [key: string]: any };
  payload?: any;
}

export interface ActionLike<T extends string = string> extends InputAction<T> {
  target?: string | string[];
}

export interface ActionCreator {
  (...args: any[]): InputAction
}
export type ActionCreatorMap = { [key: string]: ActionCreator }

export interface ModelInterface {
  readonly accept?: string[];
  readonly update: Reducer<any, Schema>;
  readonly process: Epic<ModelInterface>;

  readonly dependencies: Schema;
  readonly state: any;

  readonly keyPath: string;
  readonly store: Store<any>;
  readonly isLinked: boolean;
  readonly isDisposed: boolean;

  readonly actionCreators: ActionCreatorMap;
  readonly actions: {[K in keyof any]: (...args: any[]) => void };

  readonly parent?: ModelInterface;

  readonly state$: Observable<any>;

  isDescendantOf(ancestor: ModelInterface): boolean;
  ready(callback: () => void): void;
  getStateFromDigest(digest: Map<ModelInterface, any>): any;
  matchActionType(actionType: string): boolean;
  dump(state: any): any;
  load(dump: any, updateContext: UpdateContext<Schema>): any;
  link(store: any, parent?: ModelInterface, key?: string): () => void;
  unlink(): void;
}

export interface Reducer<S, D extends Schema> {
  (state: S | undefined, context: UpdateContext<D>): S
}

export interface Epic<Model extends ModelInterface> {
  (action$: Observable<ActionLike>, model: Model): ZenObservable.ObservableLike<InputAction>
}

export type Schema = { [key: string]: ModelInterface }
export type StateOf<S extends Schema> = {[K in keyof S]: S[K]['state']}
