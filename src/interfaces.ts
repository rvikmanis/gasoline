import { UpdateContext } from './core/UpdateContext'
import { Subscribable } from 'rxjs/Observable'
import { Store } from "./core/Store";
import { ActionsObservable } from "./core/ActionsObservable";

export interface ActionLike<T extends string = string> {
  type: T;
  target?: string | string[];
  meta?: { [key: string]: any };
  payload?: any;
}

export interface ActionCreator {
  (...args: any[]): ActionLike
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

  getStateFromDigest(digest: { [key: string]: any }): any;
  matchActionType(actionType: string): boolean;
  dump(state: any): any;
  load(dump: any, updateContext: UpdateContext<Schema>): any;
  link(keyPath: string, store: any): () => void;
  unlink(): void;
}

export interface Reducer<S, D extends Schema> {
  (state: S | undefined, context: UpdateContext<D>): S
}

export interface Epic<Model extends ModelInterface> {
  (action$: ActionsObservable, model: Model): Subscribable<ActionLike>
}

export type Schema = { [key: string]: ModelInterface }
export type StateOf<S extends Schema> = {[K in keyof S]: S[K]['state']}
