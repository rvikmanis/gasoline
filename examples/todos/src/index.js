import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux'
import { createStore } from 'redux';
import { addChange, ModelProvider } from '../../..'
import App from './App';
import './index.css';
import model from './model';

const store = createStore(model.reducer)
window.store = store
window.addChange = addChange
window.model = model

ReactDOM.render(
  <Provider store={store}>
    <ModelProvider model={model}>
      <App />
    </ModelProvider>
  </Provider>,
  document.getElementById('root')
);
