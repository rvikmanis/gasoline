import WebSocket from 'ws'
const g = (global as any)
g.WebSocket = WebSocket

import { Store, ServiceModel, WebSocketServiceAdapter, interfaces, Model, combineModels } from '../src'
import { Observable } from "rxjs";

let sm: ServiceModel
let store: Store

beforeEach(() => {
  sm = new ServiceModel({
    adapter: new WebSocketServiceAdapter('ws://localhost:8989'),
    acceptIncoming: ['TEST', 'TEST_RESPONSE_RECEIVED'],
    acceptOutgoing: ['TEST_RESPONSE']
  })

  const rs = new Model({
    accept: ['TEST'],
    process(action$) {
      return action$
        .ofType('TEST')
        .map(() => ({ type: 'TEST_RESPONSE' }))
    }
  })

  store = new Store(combineModels({ service: sm, responder: rs }))
})

test('Scenario: connection refused ', () => {
  function expectActions(data: interfaces.ActionLike[]) {
    const actionTypes = data.map(action => action.type)
    expect(actionTypes).toEqual([
      Store.START,
      (<any>sm)._actionTypes.open,
      (<any>sm)._actionTypes.readyStateChange,
      (<any>sm)._actionTypes.error,
      (<any>sm)._actionTypes.readyStateChange
    ])

    const { code, address, port } = data[3].payload
    expect([code, address, port])
      .toEqual(['ECONNREFUSED', '127.0.0.1', 8989])
  }

  const promise = store.action$
    .buffer(Observable.interval(1500).take(1))
    .do(expectActions)
    .toPromise()

  store.start()
  store.dispatch(sm.actionCreators.open())

  return promise
})

test('Scenario: connection established', () => {
  const server = new (WebSocket as any).Server({ port: 8989 })
  server.on('connection', (ws) => {
    ws.on('message', (message) => {
      message = JSON.parse(message)
      if (message.type === 'TEST_RESPONSE') {
        ws.send(JSON.stringify({ type: 'TEST_RESPONSE_RECEIVED' }));
        server.close()
      }
    });

    ws.send(JSON.stringify({ type: 'TEST' }));
  });

  function expectActions(data: interfaces.ActionLike[]) {
    const actionTypes = data.map(action => [action.type, action.payload])
    expect(actionTypes).toEqual([
      [Store.START, undefined],
      [sm._actionTypes.open, undefined],
      [sm._actionTypes.readyStateChange, 'connecting'],
      [sm._actionTypes.readyStateChange, 'open'],
      ['TEST', undefined],
      ['TEST_RESPONSE', undefined],
      ['TEST_RESPONSE_RECEIVED', undefined],
      [sm._actionTypes.readyStateChange, 'closed']
    ])
  }

  const promise = store.action$
    .buffer(Observable.interval(1500).take(1))
    .do(expectActions)
    .toPromise()

  store.start()
  store.dispatch(sm.actionCreators.open())

  return promise
})