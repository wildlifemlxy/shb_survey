import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';
import { ClipLoader } from 'react-spinners';
import axios from 'axios';
import { initializeMapUtils } from './utils/mapUtils';
import { initializeTheme } from './utils/themeUtils';
import DetailedAnalysisPopup from './components/DetailedAnalysisPopup';
import ThemeToggle from './components/ThemeToggle';
import NewSurveyModal from './components/Dashboard/NewSurveyModal';
import Settings from './components/Settings/Settings';
import MaintenanceBotButton from './components/MaintenanceBot/MaintenanceBotButton';
import { io } from 'socket.io-client';

import { fetchSurveyData } from './data/shbData';
import { fetchEventsData } from './data/surveyData';
import { fetchBotData } from './data/botData';

const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Dynamically import the components
const Dashboard = lazy(() => import('./components/Dashboard'));
const Home = lazy(() => import('./components/Home'));
const SurveyEvents = lazy(() => import('./components/Events/SurveyEvents'));

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shbData: [], // Start with empty data
      eventData: [],
      botData: [],
      chatData: [],
      isLoading: true,
      showDetailedAnalysis: false,
      detailedAnalysisData: null,
      showNewSurveyModal: false
    };
  }

  componentDidMount() {
    this.loadData();
    this.socket = io(API_BASE_URL);
    this.socket.on('survey-updated', (data) => {
      this.loadData();
      console.log("Socket event received", data);
    });
  }

  loadData = async () => {
    initializeMapUtils();
    initializeTheme();
    const data = await fetchSurveyData();
    console.log('Fetched SHB Data:', data);
    const data1 = await fetchEventsData();
    console.log('Fetched Survey Data:', data1);
    const data2 = await fetchBotData();
    console.log('Fetched Bot Data:', data2);

    this.setState({ shbData: data, eventData: data1, botData: data2, isLoading: false });
  }

  handleAddSurvey = (newSurvey) => {
    this.setState((prevState) => ({
      shbData: [...prevState.shbData, newSurvey],
      showNewSurveyModal: false
    }));
  };

  handleOpenNewSurveyModal = () => {
    console.log('Opening new survey modal');
    this.setState({ showNewSurveyModal: true });
  };

  handleCloseNewSurveyModal = () => {
    this.setState({ showNewSurveyModal: false });
  };

  openDetailedAnalysis = (data) => {
    this.setState({ showDetailedAnalysis: true, detailedAnalysisData: data });
  };

  closeDetailedAnalysis = () => {
    this.setState({ showDetailedAnalysis: false, detailedAnalysisData: null });
  };

  render() {
    const { shbData, isLoading, showDetailedAnalysis, detailedAnalysisData, showNewSurveyModal, eventData, botData} = this.state;
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
                    onAddSurvey={this.handleAddSurvey}
                    onOpenNewSurveyModal={this.handleOpenNewSurveyModal}
                    onCloseNewSurveyModal={this.handleCloseNewSurveyModal}
                  />
                } />
              <Route path="/surveyEvents" element={<SurveyEvents eventData={eventData} isLoading={isLoading} />} />
              <Route path="/settings" element={<Settings botData={botData} isLoading={isLoading} />} />
              </Routes>
            </Suspense>
          </Router>
        </div>
        {/* Render modal only once, outside router, using correct state reference */}
        <NewSurveyModal show={showNewSurveyModal} onClose={this.handleCloseNewSurveyModal} onSubmit={this.handleAddSurvey} />
        <DetailedAnalysisPopup
          isOpen={showDetailedAnalysis}
          onClose={this.closeDetailedAnalysis}
          data={detailedAnalysisData}
        />
        
        {/* Maintenance Bot Button - Fixed bottom right on all pages, positioned to avoid overlap */}
        <MaintenanceBotButton shbData={shbData} />
      </>
    );
  }
}

export default App;