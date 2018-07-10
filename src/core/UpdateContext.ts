import { relative } from 'path';
import { ModelInterface, ActionLike, StateOf, Schema } from "../interfaces";
import { Store } from "./Store";
import { mapValues } from "../helpers/mapValues";
import { matchActionTarget } from "../helpers/matchActionTarget";

export type WorkingState = {
  digest: Map<string, any>;
  updated: Set<string>;
};

export class UpdateContext<Dependencies extends Schema, A extends ActionLike = ActionLike> {
  public readonly action: A;
  public model: ModelInterface = undefined as any;
  public workingState: WorkingState;
  private _modelData: Map<ModelInterface, {
    shouldUpdate: boolean,
    actionDoesMatch: boolean,
    dependenciesHaveChanged: boolean,
    _dependencies: any
  }>

  public shouldUpdate: boolean = undefined as any;
  public actionDoesMatch: boolean = undefined as any;
  public dependenciesHaveChanged: boolean = undefined as any;

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
        digest: new Map<string, any>(),
        updated: new Set<string>()
      }
    }
    this.workingState = initialWorkingState
    this._modelData = new Map();
    this.setModel(initialModel)
  }

  private _compute() {
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

  public setModel<Model extends ModelInterface>(model: Model): UpdateContext<Model['dependencies'], A> {
    this.model = model
    if (this._modelData.has(model)) {
      Object.assign(this, this._modelData.get(model));
    } else {
      this._compute()
      this._modelData.set(model, {
        shouldUpdate: this.shouldUpdate,
        actionDoesMatch: this.actionDoesMatch,
        dependenciesHaveChanged: this.dependenciesHaveChanged,
        _dependencies: this._dependencies
      })
    }
    return this
  }

  public updateDigest(nextState: any) {
    this.workingState.digest.set(this.model.keyPath, nextState)
  }

  public markUpdated() {
    this.workingState.updated.add(this.model.keyPath)
  }
}
