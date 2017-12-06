import { relative } from 'path';
import { ModelInterface, ActionLike, Dict, StateOf, Schema } from "../interfaces";
import { Store } from "./Store";
import { mapValues } from "../helpers/mapValues";

export type WorkingState = {
  digest: Dict<any>;
  updated: Dict<boolean>;
};

const createEmptyWorkingState = () => (
  { digest: {}, updated: {} }
)

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
      initialWorkingState = createEmptyWorkingState()
    }
    this.workingState = initialWorkingState
    this.setModel(initialModel)
  }

  public compute() {
    this._dependencies = undefined

    const actionTargetMatches = (
      this.action.target === undefined
      || !relative(this.model.keyPath, this.action.target).startsWith('../')
    )

    // Match store lifecycle and model actions
    const actionDoesMatch: boolean = actionTargetMatches && (
      [Store.START, Store.STOP, Store.LOAD].indexOf(this.action.type) > -1
      || this.model.matchActionType(this.action.type)
    )

    let dependenciesHaveChanged: boolean = false
    const updatedKeys = Object.keys(this.workingState.updated)
    // TODO: improve performance
    Object.keys(this.model.dependencies).map(d => this.model.dependencies[d].keyPath).forEach(kp => {
      if (updatedKeys.indexOf(kp) > -1) {
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
    this.workingState.digest[this.model.keyPath] = nextState
  }

  public markUpdated() {
    this.workingState.updated[this.model.keyPath] = true
  }
}
