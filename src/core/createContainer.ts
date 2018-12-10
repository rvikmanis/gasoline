import React, { Component } from "react"
import { Observable, StreamSource } from "./Observable";

export type Out = Observable<JSX.Element | null | false>
export type State = { vdom: JSX.Element | null | false }

export function createContainer<P>(propsToVdom: (props$: Observable<P>) => Out) {
  return class extends Component<P, State> {
    state: State = { vdom: null }

    subscription?: ZenObservable.Subscription
    propSource = new StreamSource<P>()
    vdom$ = Observable.from(propsToVdom(this.propSource.observable))

    componentWillMount() {
      this.subscription = this.vdom$.subscribe({
        next: (vdom) => {
          this.setState({ vdom })
        }
      })

      this.propSource.next(this.props)
    }

    componentWillReceiveProps(nextProps: P) {
      this.propSource.next(nextProps)
    }

    shouldComponentUpdate(nextProps: P, nextState: State) {
      return nextState.vdom !== this.state.vdom
    }

    componentWillUnmount() {
      this.propSource.complete()

      if (this.subscription) {
        this.subscription.unsubscribe()
      }
    }

    render() {
      return this.state.vdom
    }
  }
}
