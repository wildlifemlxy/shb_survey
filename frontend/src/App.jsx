import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { ClipLoader } from 'react-spinners'; // Import the spinner

// Dynamically import the components
const Dashboard = lazy(() => import('./components/Dashboard'));
const TelegramMessaging = lazy(() => import('./components/WWFSurveyBot'));
const Home = lazy(() => import('./components/Home')); // Import the new Home component

import shbData from './data/shbData';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Router>
          {/* Wrap your Routes with Suspense */}
          <Suspense fallback={<div className="spinner-container"><ClipLoader color="#3498db" size={50} /></div>}>
            <Routes>
              {/* Define your routes - note the element prop instead of component or children */}
              <Route path="/" element={<Home />} /> {/* Add the home route as index route */}
              <Route path="/dashboard" element={<Dashboard data={shbData} />} />
              <Route path="/automated" element={<TelegramMessaging />} />
            </Routes>
          </Suspense>
        </Router>
      </div>
    );
  }
}

export default App;