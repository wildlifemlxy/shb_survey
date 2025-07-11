import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Login from './components/Auth/Login';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import NotFound from './components/NotFound/NotFound';
import ObservationPopup from './components/Map/ObservationPopup';
import { io } from 'socket.io-client';
import { AuthProvider } from './components/Auth/AuthContext.jsx';

import { fetchSurveyData } from './data/shbData';
import { fetchEventsData } from './data/surveyData';
import { fetchBotData } from './data/botData';

const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Dynamically import the components with explicit file extensions
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard.jsx'));
const Home = lazy(() => import('./components/Home/Home.jsx'));
const SurveyEvents = lazy(() => import('./components/Events/SurveyEvents.jsx'));
const ResetPassword = lazy(() => import('./components/ResetPassword/ResetPassword.jsx'));

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
      showNewSurveyModal: false,
      isAuthenticated: false,
      socket: null,
      showObservationPopup: false,
      observationPopupData: null,
      observationPopupPosition: { x: 0, y: 0 },
      currentOpenMarkerId: null
    };
  }

  componentDidMount() {
    this.checkAuthenticationStatus();
    this.loadData();
    this.socket = io(API_BASE_URL);
    this.socket.on('survey-updated', (data) => {
      this.loadData();
      console.log("Socket event received", data);
    });

    // Add resize event listener to close popup on window resize
    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
    // Remove resize event listener
    window.removeEventListener('resize', this.handleWindowResize);
  }

  handleWindowResize = () => {
    // Close popup when window is resized
    if (this.state.showObservationPopup) {
      this.closeObservationPopup();
    }
  };

  checkAuthenticationStatus = () => {
    // First check isAuthenticated flag
    const isAuthenticatedFlag = localStorage.getItem('isAuthenticated') === 'true';
    
    // Then check for user data in localStorage
    let currentUser = null;
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        currentUser = JSON.parse(userDataString);
        
        // If user data doesn't have a role but there's a role in localStorage, add it
        if (!currentUser.role) {
          const storedRole = localStorage.getItem('userRole');
          if (storedRole) {
            currentUser.role = storedRole;
          }
        }
      } else if (isAuthenticatedFlag) {
        // If authenticated but no user object, create minimal user object with role
        currentUser = {
          role: localStorage.getItem('userRole') || 'User'
        };
      }
    } catch (error) {
      console.error('Error parsing user data in App component:', error);
    }
    
    // Set state based on authentication status
    const isAuthenticated = isAuthenticatedFlag || !!currentUser;
    this.setState({ 
      isAuthenticated,
      currentUser
    });
    
    console.log('Authentication status in App component:', { 
      isAuthenticated, 
      currentUser,
      storedRole: localStorage.getItem('userRole')
    });
    return isAuthenticated;
  };

  onLoginSuccess = (userData) => {
    console.log('Login successful in App component, userData:', userData);
    // Update local state
    this.setState({ isAuthenticated: true, currentUser: userData });
    
    // Store in localStorage for persistence
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    
    // Explicitly store the role for easier access
    if (userData && userData.role) {
      localStorage.setItem('userRole', userData.role);
    }
  };

  handleLogout = () => {
    // Clear all authentication data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    
    // Update state
    this.setState({ 
      isAuthenticated: false,
      currentUser: null
    });
  };

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

  // Observation Popup handlers
  openObservationPopup = (observationData, position = { x: 0, y: 0 }) => {
    console.log('Opening observation popup with data:', observationData, 'position:', position);
    
    // Generate a unique ID for the marker
    const markerId = observationData._id || 
                    observationData.id || 
                    `${observationData.Location}-${observationData.Lat}-${observationData.Long}`;
    
    // Toggle functionality: if same marker is clicked, close the popup
    if (this.state.showObservationPopup && this.state.currentOpenMarkerId === markerId) {
      this.closeObservationPopup();
      return;
    }
    
    this.setState({
      showObservationPopup: true, 
      observationPopupData: observationData,
      observationPopupPosition: position,
      currentOpenMarkerId: markerId
    });
  };

  closeObservationPopup = () => {
    this.setState({ 
      showObservationPopup: false, 
      observationPopupData: null,
      observationPopupPosition: { x: 0, y: 0 },
      currentOpenMarkerId: null
    });
  };

  render() {
    const { shbData, isLoading, showDetailedAnalysis, detailedAnalysisData, showNewSurveyModal, eventData, botData, isAuthenticated, currentUser, showObservationPopup, observationPopupData, observationPopupPosition } = this.state;
    
    return (
      <AuthProvider>
        <div className="App">
          <ThemeToggle />
          <Router>
            <Suspense fallback={<div className="spinner-container"><ClipLoader color="#3498db" size={50} /></div>}>
              <Routes>
                {/* Login Route */}
                <Route 
                  path="/login" 
                  element={
                    isAuthenticated ? 
                    <Navigate to="/dashboard" replace /> : 
                    <Login onLoginSuccess={this.onLoginSuccess} />
                  } 
                />
                
                {/* Public Routes - Accessible without login */}
                <Route 
                  path="/" 
                  element={
                    <Home 
                      shbData={shbData} 
                      isLoading={isLoading} 
                      onLoginSuccess={this.onLoginSuccess}
                      openObservationPopup={this.openObservationPopup}
                      closeObservationPopup={this.closeObservationPopup}
                    />
                  } 
                />
                
                <Route 
                  path="/reset-password" 
                  element={
                    <ResetPassword />
                  } 
                />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route 
                    path="/dashboard" 
                    element={
                      <Dashboard 
                        shbData={shbData} 
                        isLoading={isLoading} 
                        openDetailedAnalysis={this.openDetailedAnalysis}
                        onAddSurvey={this.handleAddSurvey}
                        onOpenNewSurveyModal={this.handleOpenNewSurveyModal}
                        onCloseNewSurveyModal={this.handleCloseNewSurveyModal}
                        openObservationPopup={this.openObservationPopup}
                        closeObservationPopup={this.closeObservationPopup}
                      />
                    } 
                  />
                  <Route 
                    path="/surveyEvents" 
                    element={
                      <SurveyEvents eventData={eventData} isLoading={isLoading} />
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <Settings botData={botData} isLoading={isLoading} />
                    } 
                  />
                </Route>

                {/* 404 Route - Must be last */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </div>
        {currentUser && (
          <>
            {/* Render modal only once, outside router, using correct state reference */}
            <NewSurveyModal show={showNewSurveyModal} onClose={this.handleCloseNewSurveyModal} onSubmit={this.handleAddSurvey} />
            <DetailedAnalysisPopup
              isOpen={showDetailedAnalysis}
              onClose={this.closeDetailedAnalysis}
              data={detailedAnalysisData}
            />
            
            {/* Maintenance Bot Button - Fixed bottom right on all pages, positioned to avoid overlap */}
            {console.log('Rendering MaintenanceBotButton with currentUser:', currentUser)}
            <MaintenanceBotButton 
              shbData={shbData} 
              currentUser={currentUser} 
            />
          </>
        )}
        
        {/* Global Observation Popup - Available throughout the app */}
        {showObservationPopup && observationPopupData && (
          <ObservationPopup 
            position={observationPopupPosition}
            data={observationPopupData}
            onClose={this.closeObservationPopup}
          />
        )}
      </AuthProvider>
    );
  }
}

export default App;