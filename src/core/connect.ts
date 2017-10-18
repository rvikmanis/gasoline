import { ComponentType, ComponentClass, Component, createElement } from "react"
import { Scheduler, Subscription, Observable } from "rxjs";
import shallowEquals from "shallow-equals";

function connect<T extends object>(
    obs$: Observable<T>
): (component: ComponentType<T>) => ComponentClass<{}>;

function connect<R extends object, T, P extends object>(
    obs$: Observable<T>,
    mapper: ((state: T, ownProps: P) => R)
): (component: ComponentType<R>) => ComponentClass<P>;

function connect<T extends object, S extends object>(
    obs$: Observable<T>,
    staticProps: S
): (component: ComponentType<T & S>) => ComponentClass<{}>;

function connect<R extends object, T, P extends object, S extends object>(
    obs$: Observable<T>,
    mapper: ((state: T, ownProps: P) => R),
    staticProps: S
): (component: ComponentType<R & S>) => ComponentClass<P>;

function connect(
    obs$: Observable<any>,
    mapper?: any,
    staticProps?: any
): any {
    if (typeof mapper === "object" && mapper !== null) {
        staticProps = mapper
        mapper = undefined
    }

    if (staticProps == null) {
        staticProps = {}
    }

    if (mapper == null) {
        mapper = (t: any, p: any) => t
    }

    return (component: any) => {
        return class extends Component {
            static displayName = component.displayName;

            subscription: Subscription;
            initialStateSubscription: Subscription;
            sourceState: any;

            componentWillMount() {
                const initialState$ = obs$.takeUntil(Observable.of(null, Scheduler.async))
                this.initialStateSubscription = initialState$.subscribe(sourceState => {
                    this.sourceState = sourceState
                })
            }

            componentDidMount() {
                this.initialStateSubscription.unsubscribe()
                this.subscription = obs$.subscribe(sourceState => {
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
                    { ...staticProps, ...mapper(this.sourceState, this.props) }
                )
            }
        }
    }
}

export { connect };