import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './css/App.css';
import { ClipLoader } from 'react-spinners';
import { initializeMapUtils } from './utils/mapUtils.js';
import { initializeTheme } from './utils/themeUtils.js';
import DetailedAnalysisPopup from './components/DetailedAnalysisPopup.jsx';
import ThemeToggle from './components/ThemeToggle/index.js';
import NewSurveyModal from './components/Dashboard/NewSurveyModal.jsx';
import MaintenanceBotButton from './components/MaintenanceBot/MaintenanceBotButton.jsx';
import InteractiveGuide from './components/MaintenanceBot/InteractiveGuide.jsx';
import UploadModal from './components/UploadModal/UploadModal.jsx';
import DeleteModal from './components/DeleteModal/DeleteModal.jsx';
import UploadSuccessModal from './components/Dashboard/UploadSuccessModal.jsx';
import ProtectedRoute from './components/Auth/ProtectedRoute.jsx';
import RoleProtectedRoute from './components/Auth/RoleProtectedRoute.jsx';
import NotFound from './components/NotFound/NotFound.jsx';
import ObservationPopup from './components/Map/ObservationPopup.jsx';
import ImageViewerPopup from './components/Gallery/ImageViewerPopup.jsx';
import FullScreenMediaViewer from './components/Gallery/FullScreenMediaViewer.jsx';
import TermsOfServiceNotice from './components/TermsOfServiceNotice.jsx';
import PrivacyPolicyNotice from './components/PrivacyPolicyNotice.jsx';
import UploadProgressModal from './components/UploadProgressModal/UploadProgressModal.jsx';
import ClearChatPopup from './components/MaintenanceBot/ClearChatPopup.jsx';
import { io } from 'socket.io-client';
import { AuthProvider } from './components/Auth/AuthContext.jsx';
import { getCurrentUser, isLoggedIn, clearSession } from './data/loginData.js';
import OAuthCallback from './components/Auth/OAuthCallback.jsx';

import { fetchSurveyDataForHomePage, fetchSurveyData } from './data/shbData.js';
import { getAllEvents } from './data/surveyData.js';

const API_BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Dynamically import the components with explicit file extensions
const Dashboard = lazy(() => import('./components/Dashboard/Dashboard.jsx'));
const Home = lazy(() => import('./components/Home/Home.jsx'));
const SurveyEvents = lazy(() => import('./Events/SurveyEvents.jsx'));
const Settings = lazy(() => import('./Settings/Settings.jsx'));
const ResetPassword = lazy(() => import('./components/ResetPassword/ResetPassword.jsx'));

// Import bot data service
import botDataService from './data/botData';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      shbData: [], // No longer used - keeping for compatibility
      shbDataForPublic: null, // Public statistics data
      eventData: [], // Events data
      botData: [], // Bot data
      isLoading: true,
      isBotDataLoading: false,
      showDetailedAnalysis: false,
      detailedAnalysisData: null,
      showNewSurveyModal: false,
      shouldOpenNewEventModal: false,
      isAuthenticated: false,
      currentUser: null,
      socket: null,
      showObservationPopup: false,
      observationPopupData: null,
      observationPopupPosition: { x: 0, y: 0 },
      currentOpenMarkerId: null,
      isUploading: false,
      uploadFileName: '',
      showImageViewer: false,
      viewerImageData: null,
      showUploadModal: false,
      uploadModalFiles: null,
      showDeleteModal: false,
      deleteModalFileIds: [],
      showUploadSuccessModal: false,
      uploadedFileCount: 0,
      shouldReopenImageViewerOnCancel: false, // Track if we should reopen ImageViewer when DeleteModal is cancelled
      pendingImageViewerData: null, // Store image data to reopen when delete is cancelled
      showFullScreenModal: false, // Show full screen media modal
      fullScreenMediaContent: null, // Content for full screen modal
      fullScreenMediaGallery: [], // Array of gallery files for navigation
      fullScreenInitialIndex: 0, // Initial index for fullscreen gallery
      galleryItems: [], // Store gallery items to pass to viewer
      showFullScreenMediaViewer: false, // Show fullscreen media viewer modal
      fullScreenMediaViewerData: null, // Data for fullscreen media viewer modal
      showClearChatPopup: false, // Clear chat confirmation popup
      // Interactive guide state
      showGuide: false,
      guideCurrentPage: 'home',
      guideActiveDashboardTab: 'dataTable',
      guideActiveEventsTab: 'upcoming',
      guideActiveSettingsTab: 'createBot'
    };
  }

  componentDidMount() {
    console.log('=== App ComponentDidMount ===');
    
    // Check and restore authentication state from localStorage
    this.checkAuthenticationStatus();
    
    // Load data based on authentication
    this.loadData();
    
    // Load bot data for Settings page
    this.loadBotData();
    
    // Setup socket connection
    this.socket = io(API_BASE_URL);
    
    // Listen for survey insertion events
    this.socket.on('surveyInserted', (data) => {
      console.log("Socket event - Survey inserted:", data);
      this.loadData(); // Reload data when new survey is added
    });
    
    // Listen for survey update events
    this.socket.on('surveyUpdated', (data) => {
      console.log("Socket event - Survey updated:", data);
      this.loadData(); // Reload data when survey is updated
    });
    
    // Listen for survey deletion events
    this.socket.on('surveyDeleted', (data) => {
      console.log("Socket event - Survey deleted:", data);
      this.loadData(); // Reload data when survey is deleted
    });

    // Listen for event-specific real-time updates
    this.socket.on('eventsAdded', (data) => {
      console.log("Socket event - Events added:", data);
      this.loadData(); // Reload all data when events are added
    });

    this.socket.on('eventUpdated', (data) => {
      console.log("Socket event - Event updated:", data);
      this.loadData(); // Reload all data when event is updated
    });

    this.socket.on('eventParticipantsUpdated', (data) => {
      console.log("Socket event - Event participants updated:", data);
      this.loadData(); // Reload all data when participants are updated
    });

    this.socket.on('eventsDeleted', (data) => {
      console.log("Socket event - Events deleted:", data);
      this.loadData(); // Reload all data when events are deleted
    });
    
    // Keep the legacy event for backwards compatibility
    this.socket.on('survey-updated', (data) => {
      console.log("Socket event - Legacy survey updated:", data);
      this.loadData(); // Reload data when updates occur
    });

    // Add resize event listener
    window.addEventListener('resize', this.handleWindowResize);
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
    window.removeEventListener('resize', this.handleWindowResize);
  }

  handleWindowResize = () => {
    // Don't close popup on resize when using Google Maps InfoWindow
    // Only close if using custom popup system
    if (this.state.showObservationPopup) {
      this.closeObservationPopup();
    }
  };

  checkAuthenticationStatus = () => {
    const authenticated = isLoggedIn();
    const user = getCurrentUser();
    
    this.setState({ 
      isAuthenticated: authenticated,
      currentUser: user
    });
    
    console.log('Authentication status:', { 
      isAuthenticated: authenticated, 
      currentUser: user
    });
    
    return authenticated;
  };

  onLoginSuccess = (loginResponse) => {
    console.log('Login successful:', loginResponse);
    
    const userData = loginResponse.user || loginResponse.data || loginResponse;
    
    // Ensure authentication data is stored consistently in localStorage
    localStorage.setItem('currentUser', JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData)); // Fallback compatibility
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', userData.role || 'user');
    localStorage.setItem('loginTimestamp', Date.now().toString());
    
    this.setState({ 
      isAuthenticated: true, 
      currentUser: userData 
    });
    
    console.log('Authentication state updated and persisted');
    // No need to reload data since we only use public data
  };

  handleLogout = () => {
    console.log('Logging out user...');
    
    // Clear user data
    clearSession();
    
    // Update state
    this.setState({ 
      isAuthenticated: false,
      currentUser: null,
      shbData: []
    });
    
    console.log('User logged out successfully');
  };

  // Load public data only
  loadData = async () => {
    
    initializeMapUtils();
    initializeTheme();

    const publicStats = await fetchSurveyDataForHomePage();
    console.log('Public statistics:', publicStats);

    const shbData = await fetchSurveyData();
    
    // Load events data
    const eventsResponse = await getAllEvents();
    console.log("Events response:", eventsResponse);
    let events = eventsResponse;

    this.setState({ 
      shbDataForPublic: publicStats,
      shbData,
      eventData: events,
      isLoading: false
    });
  };

  // Load bot data
  loadBotData = async () => {
    try {
      this.setState({ isBotDataLoading: true });
      
      const result = await botDataService.loadBots();
      console.log('Bot data loaded:', result);
      
      if (result.success) {
        this.setState({ 
          botData: result.data || [],
          isBotDataLoading: false
        });
      } else {
        console.error('Failed to load bot data:', result.error);
        this.setState({ 
          botData: [],
          isBotDataLoading: false
        });
      }
    } catch (error) {
      console.error('Error loading bot data:', error);
      this.setState({ 
        botData: [],
        isBotDataLoading: false
      });
    }
  };

  handleAddSurvey = async (newSurvey) => {
    try {
      console.log('Submitting new survey:', newSurvey);
      
      if (!isLoggedIn()) {
        console.error('User not authenticated for survey submission');
        this.handleLogout();
        return;
      }

      // Survey submission disabled - authentication removed
      console.log('Survey submission disabled in public mode');
      alert('Survey submission is not available in public mode');
      
      // Close modal
      this.setState({
        showNewSurveyModal: false
      });
      
      // Reload data to get latest from server
      this.loadData();
    } catch (error) {
      console.error('Error submitting survey:', error);
      
      // If authentication error, logout user
      if (error.message.includes('not authenticated')) {
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

  handleOpenNewEventModal = () => {
    console.log('App.jsx: handleOpenNewEventModal called - setting shouldOpenNewEventModal to true');
    // We need to pass this to the SurveyEvents component when it's active
    // For now, store it in state and let the SurveyEvents component handle it
    this.setState({ shouldOpenNewEventModal: true }, () => {
      console.log('App.jsx: State updated, shouldOpenNewEventModal is now:', this.state.shouldOpenNewEventModal);
    });
  };

  handleNewEventModalHandled = () => {
    this.setState({ shouldOpenNewEventModal: false });
  };

  openDetailedAnalysis = (data) => {
    this.setState({ showDetailedAnalysis: true, detailedAnalysisData: data });
  };

  closeDetailedAnalysis = () => {
    this.setState({ showDetailedAnalysis: false, detailedAnalysisData: null });
  };

  // Observation Popup handlers
  openObservationPopup = (observationData, position = { x: 0, y: 0 }) => {
    console.log('Opening observation popup:', observationData, position);
    
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
    // Temporarily disable custom popup closing when using Google Maps InfoWindows
    // The InfoWindows are managed directly by GoogleMapComponent
    console.log('closeObservationPopup called - but ignored (using InfoWindows)');
    return;
    
    this.setState({ 
      showObservationPopup: false, 
      observationPopupData: null,
      observationPopupPosition: { x: 0, y: 0 },
      currentOpenMarkerId: null
    });
  };

  // Upload progress handlers
  setUploading = (isUploading, uploadFileName = '') => {
    this.setState({ isUploading, uploadFileName });
  };

  // Image viewer handlers
  openImageViewer = (imageData, galleryArray = []) => {
    console.log('Opening image viewer:', imageData);
    this.setState({ 
      showImageViewer: true, 
      viewerImageData: imageData,
      galleryItems: galleryArray
    });
  };

  closeImageViewer = () => {
    this.setState({ 
      showImageViewer: false, 
      viewerImageData: null 
    });
  };

  openFullScreenMediaViewer = (imageData) => {
    this.setState({
      showFullScreenMediaViewer: true,
      fullScreenMediaViewerData: imageData
    });
  };

  closeFullScreenMediaViewer = () => {
    this.setState({
      showFullScreenMediaViewer: false,
      fullScreenMediaViewerData: null
    });
  };

  // Clear Chat Popup handlers
  handleConfirmClearChat = () => {
    // Dispatch event to clear chat and close
    window.dispatchEvent(new CustomEvent('clearChatConfirmed'));
    this.setState({ showClearChatPopup: false });
  };

  handleCancelClearChat = () => {
    // Dispatch event to close chat without clearing
    window.dispatchEvent(new CustomEvent('clearChatCancelled'));
    this.setState({ showClearChatPopup: false });
  };

  // Interactive Guide handlers
  handleOpenGuide = (currentPage, activeDashboardTab, activeEventsTab, activeSettingsTab) => {
    this.setState({ 
      showGuide: true,
      guideCurrentPage: currentPage || 'home',
      guideActiveDashboardTab: activeDashboardTab || 'dataTable',
      guideActiveEventsTab: activeEventsTab || 'upcoming',
      guideActiveSettingsTab: activeSettingsTab || 'createBot'
    });
  };

  handleCloseGuide = () => {
    this.setState({ showGuide: false });
  };

  // Full Screen Media Modal handlers - now opens as a route
  openFullScreenModal = async (imageData, galleryArray = []) => {
    try {
      // Use the galleryArray passed from Gallery (which has blob URLs)
      const allGalleryItems = galleryArray && galleryArray.length > 0 
        ? galleryArray 
        : (this.state.galleryItems && this.state.galleryItems.length > 0 
          ? this.state.galleryItems 
          : []);
      
      // Find the index FIRST in the original items
      const searchId = imageData.id || imageData.fileId;
      let initialIndex = 0;
      
      if (searchId && allGalleryItems.length > 0) {
        initialIndex = allGalleryItems.findIndex(item => item.id === searchId);
        
        if (initialIndex < 0 && imageData.title) {
          initialIndex = allGalleryItems.findIndex(item => item.title === imageData.title);
        }
      }
      
      if (initialIndex < 0) {
        initialIndex = 0;
      }
      
      // Pass file info to new tab (will fetch blobs there)
      const mediaFilesInfo = allGalleryItems && allGalleryItems.length > 0 
        ? allGalleryItems.map(item => ({
            id: item.id || item.fileId,
            fileId: item.fileId,
            title: item.title,
            mimeType: item.mimeType,
            isVideo: item.isVideo || item.mimeType?.startsWith('video/')
          }))
        : [];
      
      // Store gallery metadata in sessionStorage to pass to new tab
      sessionStorage.setItem('galleryFullScreenData', JSON.stringify({
        galleryFiles: mediaFilesInfo,
        initialIndex: initialIndex
      }));
      
      // Open in new tab
      window.open('/gallery-fullscreen', '_blank');
    } catch (error) {
      console.error('Failed to open full screen gallery:', error);
      alert('Failed to open gallery: ' + error.message);
    }
  };

  closeFullScreenModal = () => {
    // Cleanup blob URLs
    if (this.state.fullScreenMediaContent?.blobUrl) {
      URL.revokeObjectURL(this.state.fullScreenMediaContent.blobUrl);
    }
    
    if (this.state.fullScreenMediaGallery && this.state.fullScreenMediaGallery.length > 0) {
      this.state.fullScreenMediaGallery.forEach(media => {
        if (media.blobUrl) {
          URL.revokeObjectURL(media.blobUrl);
        }
      });
    }
    
    this.setState({
      showFullScreenModal: false,
      fullScreenMediaContent: null,
      fullScreenMediaGallery: []
    });
  };

  handleImageDeleted = (fileId) => {
    console.log('Image deleted:', fileId);
    this.closeImageViewer();
    // Reload gallery - pass callback to Gallery component
  };

  handleOpenUploadModal = (files = null) => {
    this.setState({ 
      showUploadModal: true,
      uploadModalFiles: files
    });
  };

  handleCloseUploadModal = () => {
    this.setState({ 
      showUploadModal: false,
      uploadModalFiles: null
    });
  };

  handleUploadComplete = () => {
    console.log('Upload completed, reloading gallery...');
    this.loadData(); // Reload data to refresh gallery
    this.handleCloseUploadModal();
  };

  handleOpenDeleteModal = (fileIds = []) => {
    // Default: only reopen ImageViewer if it's currently open and single file
    const shouldReopen = this.state.showImageViewer && fileIds.length === 1;
    this.setState({ 
      showDeleteModal: true,
      deleteModalFileIds: fileIds,
      shouldReopenImageViewerOnCancel: shouldReopen
    });
  };

  handleOpenDeleteModalFromViewer = (fileIds = []) => {
    // When delete is initiated from ImageViewer, close the viewer and mark to reopen on cancel
    // Only for single file deletion
    if (fileIds.length === 1) {
      this.setState({ 
        showDeleteModal: true,
        deleteModalFileIds: fileIds,
        showImageViewer: false,
        shouldReopenImageViewerOnCancel: true, // Always reopen on cancel when coming from viewer
        pendingImageViewerData: this.state.viewerImageData // Store the image data to reopen
      });
    } else {
      // For multiple files, just open delete modal without reopening viewer
      this.setState({ 
        showDeleteModal: true,
        deleteModalFileIds: fileIds,
        showImageViewer: false,
        shouldReopenImageViewerOnCancel: false,
        pendingImageViewerData: null
      });
    }
  };

  handleCloseDeleteModal = () => {
    this.setState({ 
      showDeleteModal: false,
      deleteModalFileIds: [],
      shouldReopenImageViewerOnCancel: false,
      pendingImageViewerData: null
    });
  };

  handleDeleteModalCancel = () => {
    console.log('Delete modal cancelled');
    this.handleCloseDeleteModal();
    if (this.state.shouldReopenImageViewerOnCancel && this.state.pendingImageViewerData) {
      this.openImageViewer(this.state.pendingImageViewerData);
    }
  };

  handleDeleteComplete = () => {
    console.log('Delete completed, reloading gallery...');
    this.loadData(); // Reload data to refresh gallery
    this.handleCloseDeleteModal();
  };

  handleOpenUploadSuccessModal = (fileCount = 0) => {
    this.setState({ 
      showUploadSuccessModal: true,
      uploadedFileCount: fileCount
    });
  };

  handleCloseUploadSuccessModal = () => {
    this.setState({ 
      showUploadSuccessModal: false,
      uploadedFileCount: 0
    });
  };

  handleNavigateToGallery = () => {
    // Navigate to home page gallery
    window.location.href = '/';
  };

  render() {
    const { 
      shbData, 
      isLoading, 
      showDetailedAnalysis, 
      detailedAnalysisData, 
      showNewSurveyModal, 
      isAuthenticated, 
      currentUser, 
      showObservationPopup, 
      observationPopupData, 
      observationPopupPosition, 
      shbDataForPublic,
      isUploading,
      uploadFileName,
      showImageViewer,
      viewerImageData,
      showUploadModal
    } = this.state;

    return (
      <AuthProvider>
        <div className="App">
          <ThemeToggle />
          
          
          <Router>
            <Suspense fallback={<div className="spinner-container"><ClipLoader color="#3498db" size={50} /></div>}>
              <Routes>
                
                {/* Public Routes */}
                <Route 
                  path="/" 
                  element={
                    <Home 
                      shbDataForPublic={shbDataForPublic}
                      isLoading={isLoading} 
                      isAuthenticated={isAuthenticated}
                      onLoginSuccess={this.onLoginSuccess}
                      openObservationPopup={this.openObservationPopup}
                      closeObservationPopup={this.closeObservationPopup}
                      onImageClick={this.openImageViewer}
                      onOpenDeleteModal={this.handleOpenDeleteModal}
                    />
                  } 
                />
                
                <Route 
                  path="/callback" 
                  element={<OAuthCallback />} 
                />
                
                <Route 
                  path="/reset-password" 
                  element={<ResetPassword />} 
                />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route 
                    path="/dashboard" 
                    element={
                      <Dashboard 
                        shbDataForPublic={shbDataForPublic}
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
                      <SurveyEvents 
                        eventData={this.state.eventData}
                        isLoading={this.state.isLoading}
                        onRefreshEvents={this.loadData}
                        shouldOpenNewEventModal={this.state.shouldOpenNewEventModal}
                        onNewEventModalHandled={this.handleNewEventModalHandled}
                      />
                    } 
                  />
                  <Route 
                    path="/settings" 
                    element={
                      <Settings 
                        currentUser={this.state.currentUser}
                        botData={this.state.botData}
                        isBotDataLoading={this.state.isBotDataLoading}
                        onRefreshBotData={this.loadBotData}
                      />
                    } 
                  />
                </Route>

                <Route path="/terms-of-service" element={<TermsOfServiceNotice />} />
                <Route path="/privacy-policy" element={<PrivacyPolicyNotice />} />

                {/* 404 Route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </Router>
        </div>
        
        {currentUser && (
          <>
            <NewSurveyModal 
              show={showNewSurveyModal} 
              onClose={this.handleCloseNewSurveyModal} 
              onSubmit={this.handleAddSurvey}
              onUploadSuccess={this.handleOpenUploadSuccessModal}
            />
            <DetailedAnalysisPopup
              isOpen={showDetailedAnalysis}
              onClose={this.closeDetailedAnalysis}
              data={detailedAnalysisData}
            />
            
            <MaintenanceBotButton 
              currentUser={currentUser} 
              onOpenNewSurveyModal={this.handleOpenNewSurveyModal}
              onOpenNewEventModal={this.handleOpenNewEventModal}
              onSetUploading={this.setUploading}
              onOpenUploadModal={this.handleOpenUploadModal}
              onShowClearChatPopup={() => this.setState({ showClearChatPopup: true })}
              onOpenGuide={this.handleOpenGuide}
            />
          </>
        )}
        
        {/* Upload Modal */}
        <UploadModal 
          isOpen={showUploadModal}
          onClose={this.handleCloseUploadModal}
          onUploadComplete={this.handleUploadComplete}
        />
        <DeleteModal 
          isOpen={this.state.showDeleteModal}
          fileIds={this.state.deleteModalFileIds}
          onClose={this.handleCloseDeleteModal}
          onCancel={this.handleDeleteModalCancel}
          onDeleteComplete={this.handleDeleteComplete}
        />
        <UploadSuccessModal
          isOpen={this.state.showUploadSuccessModal}
          fileCount={this.state.uploadedFileCount}
          onClose={this.handleCloseUploadSuccessModal}
          onViewGallery={this.handleNavigateToGallery}
        />
        <UploadProgressModal 
          isUploading={isUploading}
          uploadFileName={uploadFileName}
        />
        
        {/* Global Observation Popup */}
        {showObservationPopup && observationPopupData && (
          <ObservationPopup 
            position={observationPopupPosition}
            data={observationPopupData}
            onClose={this.closeObservationPopup}
          />
        )}

        {/* Image Viewer Popup */}
        <ImageViewerPopup 
          isOpen={showImageViewer}
          imageData={viewerImageData}
          onClose={this.closeImageViewer}
          onDelete={this.handleImageDeleted}
          onOpenDeleteModal={this.handleOpenDeleteModalFromViewer}
          onDeleteModalOpen={() => {}} // Callback when delete modal opens (not needed in App level)
          onOpenFullScreenModal={this.openFullScreenModal}
          onOpenFullScreenMediaViewer={this.openFullScreenMediaViewer}
          galleryFiles={this.state.galleryItems}
          isAuthenticated={isAuthenticated}
        />

        {/* Fullscreen Media Viewer Modal */}
        <FullScreenMediaViewer 
          isOpen={this.state.showFullScreenMediaViewer}
          imageData={this.state.fullScreenMediaViewerData}
          onClose={this.closeFullScreenMediaViewer}
          galleryFiles={this.state.galleryItems}
        />

        {/* Clear Chat Confirmation Popup */}
        <ClearChatPopup 
          isOpen={this.state.showClearChatPopup}
          onConfirm={this.handleConfirmClearChat}
          onCancel={this.handleCancelClearChat}
        />

        {/* Interactive Guide Overlay */}
        <InteractiveGuide
          isOpen={this.state.showGuide}
          onClose={this.handleCloseGuide}
          currentPage={this.state.guideCurrentPage}
          activeDashboardTab={this.state.guideActiveDashboardTab}
          activeEventsTab={this.state.guideActiveEventsTab}
          activeSettingsTab={this.state.guideActiveSettingsTab}
        />
      </AuthProvider>
    );
  }
}

export default App;
