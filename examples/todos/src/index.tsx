import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { store } from "./store";
import App from "./views/App";
import './index.css';

store.ready(() => {
  console.log("READY")
  ReactDOM.render(
    <App />,
    document.querySelector("#app")
  )
})

import { setStatefulModules } from 'fuse-box/modules/fuse-hmr';

setStatefulModules(name => {
  // Add the things you think are stateful:
  return /models/.test(name) || /store/.test(name);
});