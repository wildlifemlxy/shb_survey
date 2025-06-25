import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { ClipLoader } from 'react-spinners';
import axios from 'axios';
import { initializeMapUtils } from './utils/mapUtils';
import { initializeTheme } from './utils/themeUtils';
import DetailedAnalysisPopup from './components/DetailedAnalysisPopup';
import ThemeToggle from './components/ThemeToggle';

import { fetchSurveyData } from './data/shbData';

// Dynamically import the components
const Dashboard = lazy(() => import('./components/Dashboard'));
const TelegramMessaging = lazy(() => import('./components/WWFSurveyBot'));
const Home = lazy(() => import('./components/Home'));

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shbData: [], // Start with empty data
      isLoading: true,
      showDetailedAnalysis: false,
      detailedAnalysisData: null
    };
  }

  componentDidMount() {
    this.loadData();
  }

  loadData = async () => {
    initializeMapUtils();
    initializeTheme();
    const data = await fetchSurveyData();
    console.log('Fetched SHB Data:', data);
    this.setState({ shbData: data, isLoading: false });
  }

  openDetailedAnalysis = (data) => {
    this.setState({ showDetailedAnalysis: true, detailedAnalysisData: data });
  };

  closeDetailedAnalysis = () => {
    this.setState({ showDetailedAnalysis: false, detailedAnalysisData: null });
  };

  render() {
    const { shbData, isLoading, showDetailedAnalysis, detailedAnalysisData } = this.state;
    return (
      <>
        <div className="App">
          <ThemeToggle />
          <Router>
            <Suspense fallback={<div className="spinner-container"><ClipLoader color="#3498db" size={50} /></div>}>
              <Routes>
                <Route path="/" element={<Home shbData={shbData} isLoading={isLoading} />} />
                <Route path="/dashboard" element={
                  <Dashboard 
                    shbData={shbData} 
                    isLoading={isLoading} 
                    openDetailedAnalysis={this.openDetailedAnalysis}
                  />
                } />
                {/*<Route path="/automated" element={<TelegramMessaging />} />*/}
              </Routes>
            </Suspense>
          </Router>
        </div>
        <DetailedAnalysisPopup
          isOpen={showDetailedAnalysis}
          onClose={this.closeDetailedAnalysis}
          data={detailedAnalysisData}
        />
      </>
    );
  }
}

export default App;