// src/App.jsx
import React, { Suspense, lazy } from 'react';
import './App.css';
import { ClipLoader } from 'react-spinners'; // Import the spinner

// Dynamically import the Dashboard component
const Dashboard = lazy(() => import('./components/Dashboard'));
import shbData from './data/shbData';

function App() {
  return (
    <div className="App">
      {/* Use a ClipLoader from react-spinners as a fallback */}
      <Suspense fallback={<div className="spinner-container"><ClipLoader color="#3498db" size={50} /></div>}>
        <Dashboard data={shbData} />
      </Suspense>
    </div>
  );
}

export default App;
