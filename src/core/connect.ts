import { ComponentType, ComponentClass, Component, createElement } from "react"
import shallowEquals from "shallow-equals";
import { ModelInterface } from "../interfaces";

function connect<M extends ModelInterface>(
    model: M
) {
    return <P = {}>(component: ComponentType<P>) => {
        return class extends Component<P> {
            static displayName = component.displayName;

            subscription: ZenObservable.Subscription;
            sourceState: any;

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

            shouldComponentUpdate(nextProps: P) {
                return !shallowEquals(nextProps, this.props)
            }

            render() {
                return createElement(
                    component as any,
                    this.props
                )
            }
        }
    }
}

export { connect };