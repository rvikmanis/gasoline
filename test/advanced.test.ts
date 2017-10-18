import { Scheduler } from 'rxjs';
import { Observable } from 'rxjs';
import * as gasoline from '../src';

type ProxySetValue = (action: gasoline.ActionLike) => gasoline.ActionLike | void
type GetValue<Dependencies, State> = (dependencies: gasoline.UpdateContext<Dependencies>["dependencies"]) => State
type ActionCreators = {
    setValue(payload: string): gasoline.ActionLike
}

class TextModel<Dependencies extends gasoline.SchemaLike = {}> extends gasoline.AbstractModel<string, ActionCreators, Dependencies> {
    proxySetValue?: ProxySetValue
    getValue?: GetValue<Dependencies, string>
    update: gasoline.Reducer<string, Dependencies>;
    process: gasoline.Epic<this>;

    constructor(options: {
        dependencies?: Dependencies,
        proxySetValue?: ProxySetValue,
        getValue?: GetValue<Dependencies, string>,
        initialValue?: string
    } = {}) {
        super()

        const {
            dependencies = {} as Dependencies,
            proxySetValue,
            getValue,
            initialValue = ""
        } = options

        this.dependencies = dependencies

        if (proxySetValue) {
            this.proxySetValue = proxySetValue
        }

        if (getValue) {
            this.getValue = getValue
        }

        this._actionCreators = {
            setValue: (payload: string) => {
                return { type: "SET_VALUE:*", payload }
            }
        }

        this.accept = ["SET_VALUE:*"]

        this.update = (state: string = initialValue, updateContext) => {
            if (this.getValue) {
                return this.getValue(updateContext.dependencies)
            }

            switch (updateContext.genericActionType) {
                case "SET_VALUE:*":
                    return updateContext.action.payload
                default:
                    return state
            }
        }

        this.process = (action$, model) => {
            if (this.proxySetValue) {
                return action$.ofType("SET_VALUE:*").switchMap(action => {
                    const out = this.proxySetValue(action)
                    if (out === undefined) {
                        return Observable.empty()
                    }
                    return Observable.of(out) as Observable<gasoline.ActionLike>
                })
            }
            return Observable.empty()
        }
    }
}

beforeEach(() => {
    const realNow = Date.now
    const startTime = realNow()
    global.Date.now = jest.fn(() => {
        const t = realNow() - startTime
        return t - t % 250
    });
})

test("Generic models", () => {
    const firstName = new TextModel()
    const lastName = new TextModel()
    const store = new gasoline.Store(gasoline.combineModels({ firstName, lastName }))

    const promise = store.action$.map(action => {
        const { meta, ...dup } = action
        return { ...dup, ts: meta.dispatch.time }
    }).bufferCount(3).take(1).do(actions => {
        expect(actions).toEqual([
            {type: gasoline.Store.START, ts: 0},
            {type: "SET_VALUE:/firstName", payload: "Foo", ts: 0},
            {type: "SET_VALUE:/lastName", payload: "Bar", ts: 0}
        ])
    }).toPromise()

    store.start()
    expect(store.model.state).toEqual({
        firstName: "",
        lastName: ""
    })
    firstName.actions.setValue("Foo")
    lastName.actions.setValue("Bar")
    expect(store.model.state).toEqual({
        firstName: "Foo",
        lastName: "Bar"
    })

    return promise
})

test("Side effect scheduling", () => {
    const sourceText = new TextModel({ initialValue: "hello" })
    const derivedText = new TextModel({
        dependencies: { source: sourceText },
        getValue: ({ source }) => source.toUpperCase(),
        proxySetValue: (action) => sourceText.actionCreators.setValue(action.payload.toLowerCase())
    })
    const periodical = new gasoline.Model({
        process(action$) {
            return action$.ofType(gasoline.Store.START).mergeMapTo(Observable.timer(250, 250).map((n) => {
                if (n === 2) {
                    return derivedText.actionCreators.setValue(derivedText.state + " haZARD," + String(n))
                }
                return sourceText.actionCreators.setValue(sourceText.state.split(",")[0] + "," + String(n))
            })).observeOn(Scheduler.async)
        }
    })

    const store = new gasoline.Store(gasoline.combineModels({ sourceText, derivedText, periodical }))

    let derivedTextStates: any[] = []

    store.ready(() => {
        derivedText.state$.subscribe(state => {
            derivedTextStates.push(state)
        })
    })

    const promise = store.action$.map(action => {
        const { meta, ...dup } = action
        return { ...dup, ts: meta.dispatch.time }
    }).buffer(Observable.timer(2000)).take(1).do(buf => {
        expect(buf).toEqual([
            { ts:0, type: gasoline.Store.START },
            { ts:0, type: "SET_VALUE:/derivedText", payload: "HELLO World" },
            { ts:0, type: "SET_VALUE:/sourceText", payload: "hello world" },
            { ts: 250, type: "SET_VALUE:/sourceText", payload: "hello world,0" },
            {ts: 500, "payload": "hello world,1", "type": "SET_VALUE:/sourceText"},
            {ts: 750,"payload": "HELLO WORLD,1 haZARD,2", "type": "SET_VALUE:/derivedText"},
            {ts:750,"payload": "hello world,1 hazard,2", "type": "SET_VALUE:/sourceText"},
            {ts: 1000,"payload": "hello world,3", "type": "SET_VALUE:/sourceText"},
            {ts: 1250,"payload": "hello world,4", "type": "SET_VALUE:/sourceText"},
            {ts: 1500,"payload": "hello world,5", "type": "SET_VALUE:/sourceText"},
            {ts: 1750,"payload": "hello world,6", "type": "SET_VALUE:/sourceText"}
        ])

        expect(derivedTextStates).toEqual([
            "HELLO",
            "HELLO WORLD",
            "HELLO WORLD,0",
            "HELLO WORLD,1",
            "HELLO WORLD,1 HAZARD,2",
            "HELLO WORLD,3",
            "HELLO WORLD,4",
            "HELLO WORLD,5",
            "HELLO WORLD,6"
        ])
    }).toPromise()

    store.start()
    expect(store.model.state).toEqual({
        sourceText: "hello",
        derivedText: "HELLO"
    })

    derivedText.actions.setValue("HELLO World")
    expect(store.model.state).toEqual({
        sourceText: "hello world",
        derivedText: "HELLO WORLD"
    })

    return promise
})
