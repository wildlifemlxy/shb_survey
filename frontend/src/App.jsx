import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ClipLoader } from 'react-spinners';
import { initializeMapUtils } from './utils/mapUtils';
import { initializeTheme } from './utils/themeUtils';
import DetailedAnalysisPopup from './components/DetailedAnalysisPopup';
import ThemeToggle from './components/ThemeToggle';
import NewSurveyModal from './components/Dashboard/NewSurveyModal';
import Settings from './components/Settings/Settings';
import MaintenanceBotButton from './components/MaintenanceBot/MaintenanceBotButton';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import RoleProtectedRoute from './components/Auth/RoleProtectedRoute';
import NotFound from './components/NotFound/NotFound';
import ObservationPopup from './components/Map/ObservationPopup';
import TermsOfServiceNotice from './components/TermsOfServiceNotice';
import PrivacyPolicyNotice from './components/PrivacyPolicyNotice';
import { io } from 'socket.io-client';
import { AuthProvider } from './components/Auth/AuthContext.jsx';
import tokenService from './utils/tokenService';

import { fetchSurveyDataForHomePage, fetchSurveyData } from './data/shbData';
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
      shbData: [], // Start with empty data for authenticated users
      shbDataForPublic: null, // Public statistics data
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
      currentOpenMarkerId: null,
      idleCountdown: null, // For debugging purposes
      showWarningModal: false,
      warningCountdown: 0,
      tokenExpiryWarning: false,
      tokenTimeLeft: null
    };
    
    // Auto logout configuration - Extended timeout values
    this.idleTimeout = 30 * 60 * 1000; // 30 minutes in milliseconds (1800000 ms)
    this.warningTimeout = 1 * 60 * 1000; // 1 minute warning before logout
    this.idleTimer = null;
    this.warningTimer = null;
    this.lastActivity = Date.now();
    
    // Events to track for user activity
    this.activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click'
    ];
  }

  componentDidMount() {
    //localStorage.clear();
    //sessionStorage.clear()
    //console.log("LocalStorage:", localStorage);
    // CRITICAL: Ensure authentication is properly checked before loading data
    console.log('=== ComponentDidMount - checking authentication ===');
    
    // First, restore authentication state from token or localStorage
    const isAuthenticated = this.checkAuthenticationStatus();
    console.log('Initial authentication check result:', isAuthenticated);
    
    // Wait a moment for state to update, then load data
    setTimeout(() => {
      console.log('Loading data after authentication check...');
      console.log('Current state isAuthenticated:', this.state.isAuthenticated);
      console.log('Token validity:', tokenService.isTokenValid());
      console.log('LocalStorage auth:', localStorage.getItem('isAuthenticated'));
      
      // Pass the authentication status directly to loadData to ensure correct purpose usage
      this.loadData(this.state.isAuthenticated);
    }, 100);
    
    this.socket = io(API_BASE_URL);
    this.socket.on('survey-updated', (data) => {
      this.loadData(this.state.isAuthenticated); // Use current state for socket events
      console.log("Socket event received", data);
    });

    // Add resize event listener to close popup on window resize
    window.addEventListener('resize', this.handleWindowResize);
    
    // Initialize idle detection if user is authenticated
    if (this.state.isAuthenticated) {
      this.startIdleDetection();
    }

    // Set up token refresh interval (check every second for real-time countdown)
    this.tokenRefreshInterval = setInterval(() => {
      if (this.state.isAuthenticated) {
        // Always recalculate time left from tokenService and lastActivity
        const serverTimeLeft = tokenService.getTimeUntilExpiry();
        const clientSessionAge = Date.now() - this.lastActivity;
        const clientTimeLeft = Math.max(0, Math.floor((this.idleTimeout - clientSessionAge) / 1000));
        const timeLeft = Math.min(serverTimeLeft, clientTimeLeft);

        // Only update state if value actually changed, to avoid unnecessary rerenders
        if (this.state.tokenTimeLeft !== timeLeft) {
          this.setState({ tokenTimeLeft: timeLeft });
        }

        // Show warning if session expires in 5 minutes (300 seconds) or less
        if (timeLeft <= 300 && timeLeft > 0) {
          if (!this.state.tokenExpiryWarning) {
            this.setState({ tokenExpiryWarning: true });
          }
        } else {
          if (this.state.tokenExpiryWarning) {
            this.setState({ tokenExpiryWarning: false });
          }
        }

        // Try to refresh token if server token is expiring soon but client session is still valid
        if (serverTimeLeft <= 60 && clientTimeLeft > 300) {
          tokenService.refreshTokenIfNeeded().catch(error => {
            console.error('Token refresh failed:', error);
          });
        }

        // Only logout if both server token is invalid AND client session is expired
        if (!tokenService.isTokenValid() && clientTimeLeft <= 0) {
          this.handleLogout();
        }
      }
    }, 1000); // Check every second for real-time countdown
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
    // Remove resize event listener
    window.removeEventListener('resize', this.handleWindowResize);
    
    // Clean up idle detection
    this.stopIdleDetection();

    // Clean up token refresh interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
  }

  handleWindowResize = () => {
    // Close popup when window is resized
    if (this.state.showObservationPopup) {
      this.closeObservationPopup();
    }
  };

  checkAuthenticationStatus = () => {
    // Check if we have a valid token first
    if (tokenService.isTokenValid()) {
      const userInfo = tokenService.getUserInfo();
      if (userInfo) {
        // Set state based on token info
        const currentUser = {
          id: userInfo.userId,
          email: userInfo.email,
          role: userInfo.role
        };
        
        this.setState({ 
          isAuthenticated: true,
          currentUser
        }, () => {
          if (this.state.isAuthenticated) {
            this.startIdleDetection();
          }
          console.log('Authentication restored from token:', { userInfo });
          return true;
        });
        
      // If token is invalid, clear all auth data
      localStorage.removeItem('user');
      localStorage.removeItem('isAuthenticated');
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      localStorage.clear();
      this.setState({ isAuthenticated: false, currentUser: null });
      return false;
      }
    }

    // Fallback to localStorage check (for backwards compatibility)
    const isAuthenticatedFlag = localStorage.getItem('isAuthenticated') === 'true';
    
    let currentUser = null;
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        currentUser = JSON.parse(userDataString);
        
        if (!currentUser.role) {
          const storedRole = localStorage.getItem('userRole');
          if (storedRole) {
            currentUser.role = storedRole;
          }
        }
      } else if (isAuthenticatedFlag) {
        currentUser = {
          role: localStorage.getItem('userRole') || 'User'
        };
      }
    } catch (error) {
      console.error('Error parsing user data in App component:', error);
    }
    
    const isAuthenticated = isAuthenticatedFlag || !!currentUser;
    this.setState({ 
      isAuthenticated,
      currentUser
    }, () => {
      if (isAuthenticated) {
        this.startIdleDetection();
      }
    });
    
    console.log('Authentication status in App component:', { 
      isAuthenticated, 
      currentUser,
      hasValidToken: tokenService.isTokenValid()
    });
    return isAuthenticated;
  };

  onLoginSuccess = (loginResponse) => {
    console.log('Login successful in App component, loginResponse:', loginResponse);
    console.log('Login response type:', typeof loginResponse);
    console.log('Login response keys:', Object.keys(loginResponse || {}));
    
    // Check what's actually in the login response
    console.log('Token in response:', loginResponse.token);
    console.log('PublicKey in response:', loginResponse.publicKey);
    console.log('SessionId in response:', loginResponse.sessionId);
    console.log('User in response:', loginResponse.user);
    
    // Try to initialize token service if we have the required data
    if (loginResponse.token && loginResponse.publicKey && loginResponse.sessionId) {
      console.log('Initializing token service...');
      const tokenInitialized = tokenService.initializeSession(loginResponse);
      console.log('Token service initialized:', tokenInitialized);
      console.log('Token validity after initialization:', tokenService.isTokenValid());
    } else {
      console.warn('Missing required token data in login response:', {
        hasToken: !!loginResponse.token,
        hasPublicKey: !!loginResponse.publicKey,
        hasSessionId: !!loginResponse.sessionId
      });
      console.log('Proceeding with basic authentication (no token service)');
    }
    
    // Extract user data
    const userData = loginResponse.user || loginResponse;
    
    // Update local state
    this.setState({ isAuthenticated: true, currentUser: userData }, () => {
      console.log('State updated, starting idle detection...');
      this.startIdleDetection();
      
      // Reload data after login to fetch authenticated content with correct purpose
      console.log('Reloading data after successful login with authenticated purpose...');
      this.loadData(this.state.isAuthenticated); // Explicitly pass true to ensure 'retrieve' purpose is used
    });
    
    // Store in localStorage for persistence (backwards compatibility)
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    
    if (userData && userData.role) {
      localStorage.setItem('userRole', userData.role);
    }
  };

  handleLogout = () => {
    // Clear token service first
    console.log('Logging out user and clearing session...', localStorage);
    tokenService.clearSession();
    
    // Clear all authentication data from localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    
    // Stop idle detection
    this.stopIdleDetection();
    
    // Update state
    this.setState({ 
      isAuthenticated: false,
      currentUser: null
    });
    
    console.log('User logged out and session cleared');
  };

  // Auto logout functionality
  startIdleDetection = () => {
    console.log('Starting idle detection...');
    this.lastActivity = Date.now();
    
    // Stop any existing detection first
    this.stopIdleDetection();
    
    // Add event listeners for user activity
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.resetIdleTimer, true);
    });
    
    // Start the idle timer
    this.resetIdleTimer();
    console.log('Idle detection started successfully');
  };

  stopIdleDetection = () => {
    console.log('Stopping idle detection...');
    // Remove event listeners
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.resetIdleTimer, true);
    });
    
    // Clear timers
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
      this.warningTimer = null;
    }
    
    // Clear countdown interval
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    
    // Clear warning countdown interval
    if (this.warningCountdownInterval) {
      clearInterval(this.warningCountdownInterval);
      this.warningCountdownInterval = null;
    }
    
    this.setState({ 
      idleCountdown: null, 
      showWarningModal: false, 
      warningCountdown: 0,
      tokenExpiryWarning: false,
      tokenTimeLeft: null
    });
  };

  resetIdleTimer = () => {
    this.lastActivity = Date.now();
    console.log('Resetting idle timer, last activity:', new Date(this.lastActivity));
    console.log('Activity reset - new session time available:', (this.idleTimeout / 1000), 'seconds');
    
    // Clear existing timers
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
    }
    if (this.warningTimer) {
      clearTimeout(this.warningTimer);
    }
    
    // Clear countdown interval if exists
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.setState({ idleCountdown: null });
    }
    
    // Only set timers if user is authenticated
    if (this.state.isAuthenticated) {
      console.log('Setting up timers - Warning in:', (this.idleTimeout - this.warningTimeout)/1000, 'seconds, Logout in:', this.idleTimeout/1000, 'seconds');
      
      // Start countdown for debugging
      let timeLeft = this.idleTimeout / 1000;
      this.setState({ idleCountdown: timeLeft });
      this.countdownInterval = setInterval(() => {
        timeLeft--;
        this.setState({ idleCountdown: timeLeft });
        if (timeLeft <= 0) {
          clearInterval(this.countdownInterval);
          this.setState({ idleCountdown: null });
        }
      }, 1000);
      
      // Set warning timer (1 minute before logout)
      this.warningTimer = setTimeout(() => {
        console.log('Warning timer triggered');
        this.showIdleWarning();
      }, this.idleTimeout - this.warningTimeout);
      
      // Set logout timer (30 minutes of inactivity)
      this.idleTimer = setTimeout(() => {
        console.log('Logout timer triggered');
        this.performAutoLogout();
      }, this.idleTimeout);
    } else {
      console.log('User not authenticated, skipping timer setup');
    }
  };

  showIdleWarning = () => {
    console.log('Showing idle warning...');
    
    // Show custom warning modal
    this.setState({ 
      showWarningModal: true, 
      warningCountdown: Math.ceil(this.warningTimeout / 1000) 
    });
    
    // Start countdown for warning modal
    this.warningCountdownInterval = setInterval(() => {
      this.setState(prevState => {
        const newCountdown = prevState.warningCountdown - 1;
        if (newCountdown <= 0) {
          clearInterval(this.warningCountdownInterval);
          // Auto logout when countdown reaches 0
          this.performAutoLogout();
          return { showWarningModal: false, warningCountdown: 0 };
        }
        return { warningCountdown: newCountdown };
      });
    }, 1000);
  };

  closeWarningModal = (stayLoggedIn = false) => {
    this.setState({ showWarningModal: false, warningCountdown: 0 });
    
    if (this.warningCountdownInterval) {
      clearInterval(this.warningCountdownInterval);
      this.warningCountdownInterval = null;
    }
    
    if (stayLoggedIn) {
      console.log('User chose to stay logged in');
      this.resetIdleTimer();
    } else {
      console.log('User chose to logout or modal timed out');
      this.performAutoLogout();
    }
  };

  performAutoLogout = () => {
    console.log('Auto logout triggered due to inactivity');
    this.handleLogout();
    
    // Redirect to home page
    window.location.href = '/';
  };

  loadData = async (authenticationOverride) => {
    console.log('=== loadData called ===');
    
    initializeMapUtils();
    initializeTheme();
    
    // CRITICAL: Re-check authentication status properly, especially after refresh
    let isAuthenticated;
    if (authenticationOverride !== null) {
      isAuthenticated = authenticationOverride;
      console.log('Using authentication override:', isAuthenticated);
    } else {
      // Double-check authentication by calling checkAuthenticationStatus again
      // This ensures we get the most current authentication state
      isAuthenticated = this.checkAuthenticationStatus();
      console.log('Re-checked authentication status:', isAuthenticated);
    }
    
    console.log('=== FINAL Authentication status for loadData:', isAuthenticated);
    console.log('Token service validity:', tokenService.isTokenValid());
    console.log('LocalStorage isAuthenticated:', localStorage.getItem('isAuthenticated'));
    console.log('LocalStorage user:', localStorage.getItem('user'));
    
    // Always fetch public statistics first (for Home page)
    console.log('Fetching public statistics for Home page...');
    const publicStats = await fetchSurveyDataForHomePage();
    console.log('Fetched public statistics:', publicStats);
    
    // FORCE AUTHENTICATED PATH if we have valid token OR localStorage indicates authentication
    const hasValidToken = tokenService.isTokenValid();
    const hasLocalStorageAuth = localStorage.getItem('isAuthenticated') === 'true';
    const hasUserData = !!localStorage.getItem('user');
    
    const shouldUseAuthenticatedPath = isAuthenticated || hasValidToken || hasLocalStorageAuth || hasUserData;
    
    console.log('=== AUTHENTICATION DECISION ===');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('hasValidToken:', hasValidToken);
    console.log('hasLocalStorageAuth:', hasLocalStorageAuth);
    console.log('hasUserData:', hasUserData);
    console.log('shouldUseAuthenticatedPath:', shouldUseAuthenticatedPath);
    
    // Only fetch authenticated data if user is logged in
    if (shouldUseAuthenticatedPath) {
      console.log('🔒 USING AUTHENTICATED PATH - fetching encrypted data...');
      console.log("OKOKOK:", !tokenService.isTokenValid() || !await tokenService.getPublicKey());

      // Ensure encryption session is initialized even after refresh
      if (!tokenService.isTokenValid() || !await tokenService.getPublicKey()) {
        console.log('Reinitializing encryption session after refresh...');
        try {
          await tokenService.initializeEncryptionSession();
          console.log('Encryption session reinitialized successfully');
        } catch (error) {
          console.error('Failed to reinitialize encryption session:', error);
          // If we can't initialize encryption, fall back to logout
          this.handleLogout();
          return;
        }
      }
      
      console.log('🔒 Attempting to fetch protected data with purpose: retrieve...');
      
      try {
        const data = await fetchSurveyData();
        console.log('🔒 Fetched SHB Data (encrypted with purpose: retrieve):', data);
        const data2 = await fetchEventsData();
        console.log('🔒 Fetched Survey Data:', data2);
        const data3 = await fetchBotData();
        console.log('🔒 Fetched Bot Data:', data3);

        // For authenticated users, provide both encrypted data and public statistics
        this.setState({ 
          shbData: data, // Keep encrypted data for Dashboard use
          shbDataForPublic: publicStats, // Provide public statistics for Home page
          eventData: data2, 
          botData: data3, 
          isLoading: false,
          isAuthenticated: true // Ensure state is updated
        }, () => {
          console.log('🔒 State updated with authenticated data and public stats:', {
            shbDataForPublic: this.state.shbDataForPublic,
            shbData: this.state.shbData.length,
            isAuthenticated: this.state.isAuthenticated,
            purposeUsed: 'retrieve + retrievePublic'
          });
        });
      } catch (error) {
        console.error('Error fetching authenticated data:', error);
        // If encryption fails, logout to maintain security
        console.log('Encrypted data fetch failed, logging out for security...');
        this.handleLogout();
      }
    } else {
      console.log('🌐 USING PUBLIC PATH - using public data only...');
      
      this.setState({ 
        shbDataForPublic: publicStats,
        shbData: [], // Empty for unauthenticated users
        eventData: [],
        botData: [],
        isLoading: false,
        isAuthenticated: false
      }, () => {
        console.log('🌐 State updated with public data only:', {
          shbDataForPublic: this.state.shbDataForPublic,
          isAuthenticated: this.state.isAuthenticated,
          purposeUsed: 'retrievePublic'
        });
      });
    }
  }

  // Helper function to calculate statistics from survey data
  calculateStatisticsFromSurveyData = (surveys) => {
    if (!surveys || !Array.isArray(surveys)) {
      return {
        observations: 0,
        locations: 0,
        volunteers: 0,
        yearsActive: 0
      };
    }

    const numberOfObservations = surveys.length;
    
    // Get unique locations
    const uniqueLocations = new Set();
    surveys.forEach(survey => {
      if (survey.Location) {
        uniqueLocations.add(survey.Location);
      } else if (survey.location) {
        uniqueLocations.add(survey.location);
      }
    });
    
    // Calculate years active (simplified)
    let yearsActive = 1;
    if (surveys.length > 0) {
      // Find earliest date
      let earliestDate = null;
      surveys.forEach(survey => {
        let surveyDate = null;
        if (survey.Date) {
          surveyDate = new Date(survey.Date);
        } else if (survey.createdAt) {
          surveyDate = new Date(survey.createdAt);
        }
        
        if (surveyDate && !isNaN(surveyDate.getTime())) {
          if (!earliestDate || surveyDate < earliestDate) {
            earliestDate = surveyDate;
          }
        }
      });
      
      if (earliestDate) {
        const yearsDiff = (new Date() - earliestDate) / (1000 * 60 * 60 * 24 * 365.25);
        yearsActive = Math.max(1, Math.ceil(yearsDiff));
      }
    }
    
    return {
      observations: numberOfObservations,
      locations: uniqueLocations.size,
      volunteers: 0, // Would need user data to calculate this
      yearsActive: yearsActive
    };
  };

  handleAddSurvey = async (newSurvey) => {
    try {
      // Check if token is valid before proceeding
      if (!tokenService.isTokenValid()) {
        console.error('No valid token for survey submission');
        this.handleLogout();
        return;
      }

      // Encrypt survey data before sending
      const encryptedSurvey = await tokenService.encryptData(newSurvey);
      
      // Make authenticated request to submit survey
      const response = await tokenService.makeAuthenticatedRequest(`${API_BASE_URL}/api/surveys`, {
        method: 'POST',
        body: JSON.stringify(encryptedSurvey)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Survey submitted successfully:', result);
        
        // Update local state with new survey
        this.setState((prevState) => ({
          shbData: [...prevState.shbData, newSurvey],
          showNewSurveyModal: false
        }));
        
        // Reload data to get latest from server (user is authenticated if they can submit surveys)
        this.loadData(true);
      } else {
        console.error('Survey submission failed:', response.status);
      }
    } catch (error) {
      console.error('Error submitting survey:', error);
      
      // If authentication error, logout user
      if (error.message === 'Authentication failed') {
        this.handleLogout();
      }
    }
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
    const { shbData, isLoading, showDetailedAnalysis, detailedAnalysisData, showNewSurveyModal, eventData, botData, isAuthenticated, currentUser, showObservationPopup, observationPopupData, observationPopupPosition, idleCountdown, showWarningModal, warningCountdown, tokenExpiryWarning, tokenTimeLeft, shbDataForPublic, authLoading } = this.state;
    
    if (authLoading) {
      return (
        <div className="spinner-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <ClipLoader color="#3498db" size={60} />
        </div>
      );
    }

    return (
      <AuthProvider>
        <div className="App">
          <ThemeToggle />
          
          {/* Enhanced Token Expiry Warning with Real-time Countdown */}
          {isAuthenticated && tokenExpiryWarning && tokenTimeLeft && (
            <div style={{
              position: 'fixed',
              top: '20px',
              right: '20px',
              backgroundColor: tokenTimeLeft <= 60 ? '#dc2626' : tokenTimeLeft <= 180 ? '#f59e0b' : '#22c55e',
              color: '#fff',
              padding: '12px 16px',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: '280px',
              animation: tokenTimeLeft <= 30 ? 'sessionPulse 1s infinite' : 'none',
              border: tokenTimeLeft <= 30 ? '2px solid #fca5a5' : 'none'
            }}>
              <style>
                {`
                  @keyframes sessionPulse {
                    0% { transform: scale(1); }
                    50% { transform: scale(1.05); }
                    100% { transform: scale(1); }
                  }
                `}
              </style>
              
              {/* Warning icon */}
              <div style={{ fontSize: '18px' }}>
                {tokenTimeLeft <= 60 ? '⚠️' : tokenTimeLeft <= 180 ? '⏰' : '🔄'}
              </div>
              
              {/* Message and countdown */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
                  {tokenTimeLeft <= 60 ? 'Session Expiring Soon' : 'Session Expiring'}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>
                  {tokenTimeLeft >= 60
                    ? `Your session will expire in ${Math.floor(tokenTimeLeft / 60)} minute${Math.floor(tokenTimeLeft / 60) !== 1 ? 's' : ''} ${tokenTimeLeft % 60 > 0 ? `${tokenTimeLeft % 60}s` : ''}`
                    : `Your session will expire in ${tokenTimeLeft} second${tokenTimeLeft !== 1 ? 's' : ''}`
                  }
                </div>
              </div>
              
              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={async () => {
                    // Extend session by refreshing token AND resetting client activity
                    this.resetIdleTimer(); // Reset client-side activity timer
                    try {
                      await tokenService.refreshTokenIfNeeded();
                      console.log('Session extended successfully');
                      // Immediately recalculate time left and warning
                      const serverTimeLeft = tokenService.getTimeUntilExpiry();
                      const clientSessionAge = Date.now() - this.lastActivity;
                      const clientTimeLeft = Math.max(0, Math.floor((this.idleTimeout - clientSessionAge) / 1000));
                      const timeLeft = Math.min(serverTimeLeft, clientTimeLeft);
                      this.setState({
                        tokenTimeLeft: timeLeft,
                        tokenExpiryWarning: timeLeft <= 300 && timeLeft > 0
                      });
                    } catch (error) {
                      console.error('Token refresh failed:', error);
                      // Don't logout immediately, client session might still be valid
                      console.log('Token refresh failed but continuing with client session');
                    }
                  }}
                  style={{
                    backgroundColor: '#fff',
                    color: tokenTimeLeft <= 60 ? '#dc2626' : tokenTimeLeft <= 180 ? '#f59e0b' : '#22c55e',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = '#fff';
                  }}
                >
                  {tokenTimeLeft <= 60 ? 'Extend Session' : 'Renew Session'}
                </button>
                
                <button
                  onClick={() => this.setState({ tokenExpiryWarning: false })}
                  style={{
                    backgroundColor: 'transparent',
                    color: '#fff',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
          )}
          
          {/* Idle Countdown Debug Display */}
          {isAuthenticated && idleCountdown !== null && (
            <></>
          )}
          
          {/* Warning Modal */}
          {showWarningModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 10000
            }}>
              <div style={{
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '10px',
                textAlign: 'center',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                maxWidth: '400px'
              }}>
                <h3 style={{ color: 'red', marginBottom: '20px' }}>Session Timeout Warning</h3>
                <p style={{ marginBottom: '20px' }}>
                  You will be automatically logged out in <strong>{warningCountdown} seconds</strong> due to inactivity.
                </p>
                <div>
                  <button 
                    onClick={() => this.closeWarningModal(true)}
                    style={{
                      backgroundColor: '#007bff',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      marginRight: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Stay Logged In
                  </button>
                  <button 
                    onClick={() => this.closeWarningModal(false)}
                    style={{
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      padding: '10px 20px',
                      borderRadius: '5px',
                      cursor: 'pointer'
                    }}
                  >
                    Logout Now
                  </button>
                </div>
              </div>
            </div>
          )}
          
          <Router>
            <Suspense fallback={<div className="spinner-container"><ClipLoader color="#3498db" size={50} /></div>}>
              <Routes>
                
                {/* Public Routes - Accessible without login */}
                <Route 
                  path="/" 
                  element={
                    <Home 
                      shbData={shbData}
                      shbDataForPublic={shbDataForPublic}
                      isLoading={isLoading} 
                      isAuthenticated={isAuthenticated}
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
                        shbData={shbData.surveys} 
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
                      <SurveyEvents 
                        eventData={eventData} 
                        isLoading={isLoading}
                        onRefreshEvents={this.refreshEvents}
                      />
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={ 
                      <RoleProtectedRoute excludedRoles={['WWF-Volunteer']} redirectTo="*">
                        <Settings botData={botData} isLoading={isLoading} />
                      </RoleProtectedRoute>
                    } 
                  />
                </Route>

                <Route path="/terms-of-service" element={<TermsOfServiceNotice />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyNotice />} />

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