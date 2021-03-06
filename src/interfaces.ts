import { UpdateContext } from './core/UpdateContext'
import { Store } from "./core/Store";
import { Observable } from "./core/Observable";

export interface InputAction<T extends string = string> {
  type: T;
  meta?: { [key: string]: any };
  payload?: any;
}

export interface ActionLike<T extends string = string> extends InputAction<T> {
}

export interface ActionCreator<T extends string = string> {
  (...args: any[]): InputAction<T>
}
export type ActionCreatorMap = { [key: string]: ActionCreator }

export interface ModelInterface {
  readonly accept: string[];
  readonly update: Reducer<any, Schema>;
  readonly process: Epic;

  readonly dependencies: Schema;
  readonly state: any;

  readonly keyPath: string;
  readonly store: Store<any>;
  readonly isLinked: boolean;

  readonly actionCreators: { [key: string]: any };
  readonly actions: { [K in keyof any]: (...args: any[]) => void };
  readonly actionTypes: { [key: string]: string }

  readonly parent?: ModelInterface;

  readonly state$: Observable<any>;

  ready(callback: () => void): void;
  getStateFromDigest(digest: Map<string, any>): any;
  matchActionType(actionType: string): boolean;
  dump(state: any): any;
  load(dump: any, updateContext: UpdateContext<Schema>): any;
  link(store: any, parent?: ModelInterface, key?: string): () => void;
  unlink(): void;
}

export interface Reducer<S, D extends Schema> {
  (state: S | undefined, context: UpdateContext<D>): S
}

export interface Epic {
  (action$: Observable<ActionLike>, model: any): ZenObservable.ObservableLike<InputAction>
}

export type Schema = { [key: string]: ModelInterface }
export type StateOf<S extends Schema> = { [K in keyof S]: S[K]['state'] }
