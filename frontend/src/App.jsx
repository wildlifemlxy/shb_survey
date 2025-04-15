// src/App.jsx
import React, { Component } from 'react';
import Dashboard from './components/Dashboard';
import shbData from './data/shbData';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Dashboard data={shbData} />
      </div>
    );
  }
}

export default App;