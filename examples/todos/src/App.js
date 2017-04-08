import React, { Component } from 'react';
import { Control } from '../../..'
import logo from './logo.svg';
import './App.css';

function Product({ group }) {
  const nodes = group.mapNodes((node, key) => {
    return <li key={key}>
      <Control node={node} />
    </li>
  })

  const groups = group.mapSubgroups((subgroup, key) => {
    return <li key={key}>
      {subgroup.keyPath}
      <div><Product group={subgroup} /></div>
    </li>
  })

  return <div>
    <ul>{nodes}</ul>
    <ul>{groups}</ul>
  </div>
}

class App extends Component {
  render() {
    return (
      <div className="App">
        <div className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h2>Welcome to React</h2>
        </div>
        <Control keyPath='product' component={Product} />
      </div>
    );
  }
}

export default App;
