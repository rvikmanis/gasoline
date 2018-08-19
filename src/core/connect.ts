import { ComponentType, ComponentClass, Component, createElement } from "react"
import shallowEquals from "shallow-equals";
import { ModelInterface } from "../interfaces";

function connect(
    ...models: ModelInterface[]
) {

    return <P = {}>(component: ComponentType<P>) => {
        return class extends Component<P> {
            static displayName = component.displayName;

            subscriptions: ZenObservable.Subscription[] = [];
            sourceState: any;

            componentWillMount() {
                this.sourceState = models.map(model => model.state)
            }

            componentDidMount() {
                this.subscriptions = models.map((model, index) =>
                    model.state$.subscribe(sourceState => {
                        if (!shallowEquals(sourceState, this.sourceState[index])) {
                            this.sourceState[index] = sourceState
                            this.forceUpdate()
                        }
                    })
                )
            }

            componentWillUnmount() {
                this.subscriptions.forEach(subscription => {
                    subscription.unsubscribe()
                })
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