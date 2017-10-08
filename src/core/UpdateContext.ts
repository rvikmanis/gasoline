import { NodeLike, ActionLike, Dict, StateLike, SchemaLike } from "../interfaces";
import mapValues from "../helpers/mapValues";
import ActionType from "../helpers/ActionType";
import Store from "./Store";

export type WorkingState = {
  digest: Dict<any>;
  updated: Dict<boolean>;
};

const createEmptyWorkingState = () => (
  { digest: {}, updated: {} }
)

export default class UpdateContext<Dependencies extends SchemaLike, A extends ActionLike = ActionLike> {
  public readonly action: A;
  public model: NodeLike;
  public workingState: WorkingState;

  public shouldUpdate: boolean;
  public actionDoesMatch: boolean;
  public dependenciesHaveChanged: boolean;
  public genericActionType: string;

  private _dependencies: any;
  public get dependencies(): StateLike<Dependencies> {
    if (this._dependencies !== undefined) {
      return this._dependencies
    }

    return this._dependencies = mapValues(
      <Dependencies>this.model.dependencies,
      (model) => model.getStateFromDigest(this.workingState.digest)
    )
  }

  constructor(action: A, initialModel: NodeLike, initialWorkingState?: WorkingState) {
    this.action = action
    const descriptor = ActionType.parse(action.type)
    if (descriptor.isGeneric && !descriptor.isBound) {
      throw new Error(`Cannot create update context with unbound generic action type: ${descriptor.actionType}`)
    }
    if (initialWorkingState === undefined) {
      initialWorkingState = createEmptyWorkingState()
    }
    this.workingState = initialWorkingState
    this.setModel(initialModel)
  }

  public compute() {
    this._dependencies = undefined
    this.genericActionType = ActionType.getGenericOrLiteralForModel(this.action.type, this.model)

    // Match store lifecycle and model actions
    const actionDoesMatch: boolean = (
      [Store.START, Store.STOP, Store.LOAD].indexOf(this.genericActionType) > -1
      || this.model.matchActionType(this.genericActionType)
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

  public setModel<Model extends NodeLike>(model: Model) {
    this.model = model
    this.compute()
    return this as UpdateContext<Model['dependencies']>
  }

  public updateDigest(nextState: any) {
    this.workingState.digest[this.model.keyPath] = nextState
  }

  public markUpdated() {
    this.workingState.updated[this.model.keyPath] = true
  }
}