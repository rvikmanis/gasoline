import { relative } from 'path';
import { ModelInterface, ActionLike, StateOf, Schema } from "../interfaces";
import { Store } from "./Store";
import { mapValues } from "../helpers/mapValues";
import { matchActionTarget } from "../helpers/matchActionTarget";

export type WorkingState = {
  digest: Map<ModelInterface, any>;
  updated: Set<string>;
};

export class UpdateContext<Dependencies extends Schema, A extends ActionLike = ActionLike> {
  public readonly action: A;
  public model: ModelInterface;
  public workingState: WorkingState;

  public shouldUpdate: boolean;
  public actionDoesMatch: boolean;
  public dependenciesHaveChanged: boolean;

  private _dependencies: any;
  public get dependencies(): StateOf<Dependencies> {
    if (this._dependencies !== undefined) {
      return this._dependencies
    }

    return this._dependencies = mapValues(
      <Dependencies>this.model.dependencies,
      (model) => model.getStateFromDigest(this.workingState.digest)
    )
  }

  constructor(action: A, initialModel: ModelInterface, initialWorkingState?: WorkingState) {
    this.action = action
    if (initialWorkingState === undefined) {
      initialWorkingState = {
        digest: new Map<ModelInterface, any>(),
        updated: new Set<string>()
      }
    }
    this.workingState = initialWorkingState
    this.setModel(initialModel)
  }

  public compute() {
    this._dependencies = undefined

    const actionTargetMatches = matchActionTarget(this.model.keyPath, this.action.target)

    // Match store lifecycle and model actions
    const actionDoesMatch: boolean = actionTargetMatches && (
      [Store.START, Store.STOP, Store.LOAD].indexOf(this.action.type) > -1
      || this.model.matchActionType(this.action.type)
    )

    let dependenciesHaveChanged: boolean = false
    // TODO: improve performance
    Object.keys(this.model.dependencies).forEach(d => {
      const kp = this.model.dependencies[d].keyPath
      if (this.workingState.updated.has(kp)) {
        dependenciesHaveChanged = true
      }
    })

    this.shouldUpdate = actionDoesMatch || dependenciesHaveChanged
    this.actionDoesMatch = actionDoesMatch
    this.dependenciesHaveChanged = dependenciesHaveChanged
  }

  public setModel<Model extends ModelInterface>(model: Model) {
    this.model = model
    this.compute()
    return this as UpdateContext<Model['dependencies'], A>
  }

  public updateDigest(nextState: any) {
    this.workingState.digest.set(this.model, nextState)
  }

  public markUpdated() {
    this.workingState.updated.add(this.model.keyPath)
  }
}
