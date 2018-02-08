import { ComponentType, ComponentClass, Component, createElement } from "react"
import shallowEquals from "shallow-equals";
import { ModelInterface } from "../interfaces";

function connect<M extends ModelInterface, S = M["state"], A = M["actions"]>(
    model: M
): (component: ComponentType<{ state: S, actions: A }>) => ComponentClass<{}> {
    return (component: ComponentType<{ state: S, actions: A }>) => {
        return class extends Component {
            static displayName = component.displayName;

            subscription: ZenObservable.Subscription;
            sourceState: S;

            componentWillMount() {
                this.sourceState = model.state
            }

            componentDidMount() {
                this.subscription = model.state$.subscribe(sourceState => {
                    if (!shallowEquals(sourceState, this.sourceState)) {
                        this.sourceState = sourceState
                        this.forceUpdate()
                    }
                })
            }

            componentWillUnmount() {
                this.subscription.unsubscribe()
            }

            shouldComponentUpdate(nextProps: any) {
                return !shallowEquals(nextProps, this.props)
            }

            render() {
                return createElement(
                    component as any,
                    { state: this.sourceState, actions: model.actions }
                )
            }
        }
    }
}

export { connect };