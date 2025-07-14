import React from 'react';
import { Link } from 'react-router-dom';
import LoginPopup from '../Auth/LoginPopup';
import Gallery from '../Gallery';
import tokenService from '../../utils/tokenService';


import { getUniqueLocations } from '../../utils/dataProcessing';
import { standardizeCoordinates } from '../../utils/coordinateStandardization';
import { fetchSurveyDataForHomePage } from '../../data/shbData';
import '../../css/components/Home/Home.css';
import axios from 'axios';

// Ensure BASE_URL is defined before any usage
var BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';


class Home extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      statistics: {
        totalObservations: '',
        uniqueLocations: '',
        totalVolunteers: '',
        yearsActive: ''
      },
      currentDateTime: this.getFormattedDateTime(),
      isAuthenticated: false,
      isLoginPopupOpen: false,
      isUploadPopupOpen: false,
      fullscreenMedia: null, // Keep this for upload preview
      uploadForm: {
        type: 'pictures',
        files: []
      },
      showScreenshotWarning: false, // State to control screenshot warning visibility
      hideMediaTemporarily: false // State to temporarily hide media content
    };
    this.timer = null;
  }

  checkAuthenticationStatus = () => {
    // Use props authentication status from App component
    // This ensures consistency with the app-level authentication state
    const propsAuthenticated = this.props.isAuthenticated;
    
    // Also check localStorage for backup
    const isAuthenticatedFlag = localStorage.getItem('isAuthenticated') === 'true';
    
    // Get user data from localStorage and ensure role is preserved
    let currentUser = null;
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        currentUser = JSON.parse(userDataString);
        
        // Ensure role is set - check multiple sources
        if (!currentUser.role) {
          const storedRole = localStorage.getItem('userRole');
          if (storedRole) {
            currentUser.role = storedRole;
            // Update localStorage with complete user data
            localStorage.setItem('user', JSON.stringify(currentUser));
          }
        }
      }
    } catch (error) {
      console.error('Error parsing user data in Home component:', error);
    }
    
    // Priority: props > localStorage flag > user data exists
    const isAuthenticated = propsAuthenticated !== undefined ? propsAuthenticated : (isAuthenticatedFlag || !!currentUser);
    
    console.log('Home checkAuthenticationStatus:', {
      propsAuthenticated: propsAuthenticated,
      localStorageAuth: isAuthenticatedFlag,
      currentUser: currentUser,
      finalAuth: isAuthenticated
    });
    
    // Set state based on authentication status
    this.setState({ 
      isAuthenticated,
      currentUser
    });
    

    return isAuthenticated;
  };

  isAuthenticated = () => {
    // Primary check: use props from App component
    if (this.props.isAuthenticated !== undefined) {
      return this.props.isAuthenticated;
    }
    // Fallback: check localStorage
    return localStorage.getItem('isAuthenticated') === 'true';
  };

  getFormattedDateTime = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const day = days[now.getDay()];
    // Format: dd/mm/yyyy
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    // 24-hour format
    const time = now.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    return `${day}, ${dd}/${mm}/${yyyy} ${time}`;
  }

  componentDidMount = async () => {

    this.checkAuthenticationStatus();
    this.loadStatistics();
    this.timer = setInterval(() => {
      this.setState({ currentDateTime: this.getFormattedDateTime() });
    }, 1000);
    document.addEventListener('contextmenu', this.handleContextMenuPrevention);
    document.addEventListener('keydown', this.handleKeyDownPrevention);
    // Add document click listener for closing popup
    document.addEventListener('mousedown', this.handleDocumentClickForPopup, true);
  }

  // Format time in MM:SS format
  formatTime = (timeInSeconds) => {
    if (isNaN(timeInSeconds) || timeInSeconds < 0) return '0:00';
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Update video timing display
  updateVideoTiming = (videoElement, index) => {
    if (!videoElement) return;
    
    const currentTimeElement = document.querySelector(`[data-current-time-index="${index}"]`);
    if (currentTimeElement) {
      currentTimeElement.textContent = this.formatTime(videoElement.currentTime);
    }
  }

  // Set video duration display
  setVideoDuration = (videoElement, index) => {
    if (!videoElement) return;
    
    const durationElement = document.querySelector(`[data-duration-index="${index}"]`);
    if (durationElement && videoElement.duration) {
      durationElement.textContent = this.formatTime(videoElement.duration);
    }
  }

  // Prevent context menu on media elements
  handleContextMenuPrevention = (e) => {
    if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
      e.preventDefault();
    }
  };

  // Prevent common shortcuts for saving/copying media
  handleKeyDownPrevention = (e) => {
    // Prevent common save shortcuts
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      const target = document.activeElement;
      if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
        e.preventDefault();
      }
    }
    // Prevent developer tools (optional - can be removed if too restrictive)
    if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
      e.preventDefault();
    }
  };

  // Prevent printing of protected content
  handleBeforePrint = (e) => {
    // Hide the main app or show a warning overlay
    document.body.classList.add('print-protection-active');
    setTimeout(() => {
      document.body.classList.remove('print-protection-active');
    }, 2000);
    // Optionally, show a warning popup
    alert('Printing is disabled for protected content.');
    if (e) e.preventDefault();
    return false;
  };

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
    
    // Clean up event listeners
    document.removeEventListener('contextmenu', this.handleContextMenuPrevention);
    document.removeEventListener('keydown', this.handleKeyDownPrevention);
    document.removeEventListener('mousedown', this.handleDocumentClickForPopup, true);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.shbData !== this.props.shbData) {
      this.loadStatistics();
    }
  }

  calculateStatistics = (data) => {
    if (!data || data.length === 0) {
      return {
        totalObservations: '',
        uniqueLocations: '',
        totalVolunteers: '',
        yearsActive: ''
      };
    }
    const totalObservations = data.length;
    const uniqueLocations = getUniqueLocations(data);
    const uniqueObservers = new Set();
    data.forEach(observation => {
      const observer = observation['Observer name'] || observation.Observer;
      if (observer && typeof observer === 'string') {
        const observers = observer.split(',').map(name => name.trim());
        observers.forEach(name => {
          if (name && name !== 'E.g. MS' && name.length > 1) {
            uniqueObservers.add(name);
          }
        });
      }
    });
    const validDates = [];
    data.forEach(observation => {
      const dateValue = observation.Date;
      if (dateValue) {
        // Excel date
        if (!isNaN(parseInt(dateValue)) && parseInt(dateValue) > 10000) {
          const excelDate = parseInt(dateValue);
          const date = new Date((excelDate - 25569) * 86400 * 1000);
          validDates.push(date);
        } else if (typeof dateValue === 'string') {
          // dd/mm/yyyy
          if (dateValue.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
            const [day, month, year] = dateValue.split('/');
            validDates.push(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
          }
          // dd-Mmm-yy (e.g., 02-Jan-25)
          else if (dateValue.match(/^\d{2}-[A-Za-z]{3}-\d{2}$/)) {
            const [day, monStr, yearStr] = dateValue.split('-');
            const monthMap = {
              Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
              Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
            };
            const month = monthMap[monStr];
            let year = parseInt(yearStr);
            // Assume year 00-49 is 2000+, 50-99 is 1900+
            year += (year < 50 ? 2000 : 1900);
            validDates.push(new Date(year, month, parseInt(day)));
          }
        }
      }
    });
    let yearsActive = 1;
    if (validDates.length > 0) {
      const minDate = new Date(Math.min(...validDates.map(d => d.getTime())));
      const now = new Date();
      const timeDiff = now.getTime() - minDate.getTime();
      const years = timeDiff / (1000 * 3600 * 24 * 365.25);
      yearsActive = Math.max(1, Math.floor(years));
    }
    return {
      totalObservations: totalObservations.toString(),
      uniqueLocations: uniqueLocations.length.toString(),
      totalVolunteers: uniqueObservers.size > 0 ? `${uniqueObservers.size}+` : '30+',
      yearsActive: yearsActive.toString()
    };
  };

  loadStatistics = async () => {
    const { shbData, isAuthenticated, shbDataForPublic } = this.props;
    console.log('Home component received shbData:', shbData);
    console.log('Home component isAuthenticated:', isAuthenticated);
    console.log('Home component shbDataForPublic:', shbDataForPublic);
    console.log('Type of shbDataForPublic:', typeof shbDataForPublic);
    
    // If authenticated, skip shbDataForPublic and always use fresh shbData
    if (isAuthenticated) {
      console.log('🔐 User is authenticated, using fresh shbData...');
      try {
        if (shbData && typeof shbData === 'object') {
          console.log('✅ Using shbData for authenticated user:', shbData);
          
          // Check if shbData has pre-calculated statistics
          if (shbData.surveys && typeof shbData.volunteers === 'number') {
            console.log('📊 Using pre-calculated statistics from shbData');
            
            // Calculate some stats from surveys but use pre-calculated volunteers count
            const calculatedStats = this.calculateStatistics(shbData.surveys);
            
            this.setState({
              statistics: {
                totalObservations: shbData.surveys.length.toString(),
                uniqueLocations: calculatedStats.uniqueLocations,
                totalVolunteers: shbData.volunteers.toString(),
                yearsActive: calculatedStats.yearsActive
              }
            });
            return;
          } else if (shbData.surveys) {
            // Fallback: calculate all statistics from raw survey data
            console.log('📊 Calculating all statistics from survey data');
            const calculatedStats = this.calculateStatistics(shbData.surveys);
            
            this.setState({
              statistics: calculatedStats
            });
            return;
          }
        }
      } catch (error) {
        console.error('Error processing shbData for authenticated user:', error);
      }
    } else {
      // PRIORITY 1: Use shbDataForPublic prop if available (only for unauthenticated users)
      if (shbDataForPublic && typeof shbDataForPublic === 'object' && 
          'observations' in shbDataForPublic && 'locations' in shbDataForPublic && 
          'volunteers' in shbDataForPublic && 'yearsActive' in shbDataForPublic) {
        
        console.log('✅ Using shbDataForPublic prop for unauthenticated user:', shbDataForPublic);
        this.setState({
          statistics: {
            totalObservations: shbDataForPublic.observations.toString(),
            uniqueLocations: shbDataForPublic.locations.toString(),
            totalVolunteers: shbDataForPublic.volunteers.toString(),
            yearsActive: shbDataForPublic.yearsActive.toString()
          }
        });
        return;
      }
      
      // FALLBACK: Fetch if shbDataForPublic prop is not available for unauthenticated users
      console.log('⚠️ shbDataForPublic prop not available for unauthenticated user, falling back to fetch...');
      try {
        const publicStats = await fetchSurveyDataForHomePage();
        console.log('Fetched public statistics for unauthenticated user:', publicStats);
        
        if (publicStats && typeof publicStats === 'object' && 
            'observations' in publicStats && 'locations' in publicStats && 
            'volunteers' in publicStats && 'yearsActive' in publicStats) {
          
          this.setState({
            statistics: {
              totalObservations: publicStats.observations.toString(),
              uniqueLocations: publicStats.locations.toString(),
              totalVolunteers: publicStats.volunteers.toString(),
              yearsActive: publicStats.yearsActive.toString()
            }
          });
          return;
        }
      } catch (error) {
        console.error('Error fetching public statistics for unauthenticated user:', error);
      }
    }
    
    // LAST RESORT: Set default values
    console.log('❌ All statistics fetch methods failed, setting default statistics');
    this.setState({
      statistics: {
        totalObservations: '0',
        uniqueLocations: '0',
        totalVolunteers: '0',
        yearsActive: '0'
      }
    });
  };

  toggleLoginPopup = () => {
    this.setState(prevState => ({
      isLoginPopupOpen: !prevState.isLoginPopupOpen
    }));
  };

  onLoginSuccess = (userData) => {
    // Store authentication status and user data in localStorage
    localStorage.setItem('isAuthenticated', 'true');
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
    }

    if (this.props.onLoginSuccess) {
      this.props.onLoginSuccess(userData);
    }

    // Update component state
    this.setState({
      isAuthenticated: true,
      isLoginPopupOpen: false
    });
  };

  toggleUploadPopup = () => {
    // Clean up object URLs if popup is being closed
     if (this.state.isUploadPopupOpen && this.state.uploadForm.files.length > 0) {
      this.state.uploadForm.files.forEach(file => {
        if (file.objectURL) {
          URL.revokeObjectURL(file.objectURL);
        }
      });
    }
    
    this.setState(prevState => ({
      isUploadPopupOpen: !prevState.isUploadPopupOpen,
      uploadForm: {
        type: 'pictures', // Default to pictures, but backend will handle mixed uploads
        files: []
      }
    }));
  };

  handleUploadFormChange = (field, value) => {
    this.setState(prevState => ({
      uploadForm: {
        ...prevState.uploadForm,
        [field]: value
      }
    }));
  };

  // Drag and drop handlers for multiple file support
  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#22c55e';
    e.currentTarget.style.backgroundColor = '#f0fdf4';
  };

  handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.style.borderColor = '#22c55e';
    e.currentTarget.style.backgroundColor = '#f0fdf4';
  };

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // Only reset styles if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      e.currentTarget.style.borderColor = '#d1d5db';
      e.currentTarget.style.backgroundColor = '#f9fafb';
    }
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Reset visual feedback
    e.currentTarget.style.borderColor = '#d1d5db';
    e.currentTarget.style.backgroundColor = '#f9fafb';
    
    const files = Array.from(e.dataTransfer.files);
    const { type } = this.state.uploadForm;
    
    // Filter files based on selected type
    let filteredFiles;
    if (type === 'pictures') {
      filteredFiles = files.filter(file => file.type.startsWith('image/'));
    } else if (type === 'videos') {
      filteredFiles = files.filter(file => file.type.startsWith('video/'));
    } else {
      filteredFiles = [];
    }
    
    if (filteredFiles.length > 0) {
      this.setState(prevState => ({
        uploadForm: {
          ...prevState.uploadForm,
          files: [...prevState.uploadForm.files, ...filteredFiles]
        }
      }));
    } else {
      const typeMsg = type === 'pictures' ? 'image' : 'video';
      alert(`Please drop ${typeMsg} files only.`);
    }
  };

  // Handle file selection from input
  handleFileSelection = (e) => {
    const files = Array.from(e.target.files);
    const { type } = this.state.uploadForm;
    
    // Filter files based on selected type
    let filteredFiles;
    if (type === 'pictures') {
      filteredFiles = files.filter(file => file.type.startsWith('image/'));
    } else if (type === 'videos') {
      filteredFiles = files.filter(file => file.type.startsWith('video/'));
    } else {
      filteredFiles = [];
    }
    
    if (filteredFiles.length > 0) {
      this.setState(prevState => ({
        uploadForm: {
          ...prevState.uploadForm,
          files: [...prevState.uploadForm.files, ...filteredFiles] // Add to existing files instead of replacing
        }
      }));
    } else {
      const typeMsg = type === 'pictures' ? 'image' : 'video';
      alert(`Please select ${typeMsg} files only.`);
    }
  };

  handleUploadSubmit = () => {
    const { uploadForm } = this.state;
    
    // Validation
    if (uploadForm.files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    // Check total file size for very large batches
    const totalSize = uploadForm.files.reduce((total, file) => total + file.size, 0);
    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(1);
    
    if (totalSize > 1000 * 1024 * 1024) { // 1GB total
      const proceed = confirm(
        `You're uploading ${uploadForm.files.length} files (${totalSizeMB}MB total). ` +
        `Large uploads may take several minutes. Continue?`
      );
      if (!proceed) return;
    }

    console.log(`Starting bulk upload of ${uploadForm.files.length} files (${totalSizeMB}MB total)`);

    // Process the upload
    this.processUpload(uploadForm);
    
    // Close popup
    this.toggleUploadPopup();
  };

  processUpload = async (formData) => {
    const { files } = formData;
    
    try {
      // Show uploading message
      this.showUploadProgressMessage(files.length);
      
      // Get current user information
      const currentUser = this.state.currentUser || 
        (localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null);
      
      // Separate files by type for backend processing
      const imageFiles = files.filter(file => file.type.startsWith('image/'));
      const videoFiles = files.filter(file => file.type.startsWith('video/'));
      
      console.log(`Uploading ${files.length} files: ${imageFiles.length} images, ${videoFiles.length} videos`);

      // Process uploads (can be done in parallel for better performance)
      const uploadPromises = [];

      // Upload images if any
      if (imageFiles.length > 0) {
        const imageFormData = new FormData();
        imageFormData.append('purpose', 'upload');
        imageFormData.append('type', 'pictures');
        
        // Add user information for approval tracking
        if (currentUser) {
          imageFormData.append('uploadedBy', JSON.stringify(currentUser));
        }
        
        imageFiles.forEach((file, index) => {
          imageFormData.append('files', file);
          console.log(`Added image ${index + 1}/${imageFiles.length}: ${file.name}`);
        });
        uploadPromises.push(
          axios.post(`${BASE_URL}/gallery`, imageFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
          })
        );
      }

      // Upload videos if any
      if (videoFiles.length > 0) {
        const videoFormData = new FormData();
        videoFormData.append('purpose', 'upload');
        videoFormData.append('type', 'videos');
        
        // Add user information for approval tracking
        if (currentUser) {
          videoFormData.append('uploadedBy', JSON.stringify(currentUser));
        }
        
        videoFiles.forEach((file, index) => {
          videoFormData.append('files', file);
          console.log(`Added video ${index + 1}/${videoFiles.length}: ${file.name}`);
        });
        uploadPromises.push(
          axios.post(`${BASE_URL}/gallery`, videoFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000
          })
        );
      }

      // Wait for all uploads to complete
      const responses = await Promise.all(uploadPromises);
      console.log('Upload responses:', responses.map(r => r.data));

      // Check if all uploads were successful
      const allSuccessful = responses.every(response => response.data.success);
      if (allSuccessful) {
        // Calculate total uploaded files
        const totalUploaded = responses.reduce((total, response) => 
          total + (response.data.files?.length || 0), 0
        );
        
        // Show success message
        this.showUploadSuccessMessage(totalUploaded);
      } else {
        const errors = responses.filter(r => !r.data.success).map(r => r.data.error);
        throw new Error(`Some uploads failed: ${errors.join(', ')}`);
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      const errorMessage = error.code === 'ECONNABORTED' 
        ? 'Upload timeout - try uploading fewer files at once'
        : error.response?.data?.error || error.message;
      alert(`Error uploading files: ${errorMessage}`);
    }
  };

  // Show upload progress message
  showUploadProgressMessage = (fileCount) => {
    // Remove any existing progress messages
    const existingProgress = document.querySelector('.upload-progress-message');
    if (existingProgress) {
      existingProgress.remove();
    }

    // Create a progress message
    const progressDiv = document.createElement('div');
    progressDiv.className = 'upload-progress-message';
    progressDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 130, 255, 0.3);
        z-index: 10000;
        font-weight: 600;
        max-width: 300px;
        display: flex;
        align-items: center;
        gap: 0.75rem;
      ">
        <div style="
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 1s ease-in-out infinite;
        "></div>
        <div>
          📤 Uploading ${fileCount} file${fileCount > 1 ? 's' : ''}...<br>
          <small style="opacity: 0.9;">Please wait, this may take a moment</small>
        </div>
      </div>
      <style>
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>
    `;
    
    document.body.appendChild(progressDiv);
  };

  // Convert file to base64 for permanent storage
  showUploadSuccessMessage = (fileCount) => {
    // Remove any existing messages
    const existingProgress = document.querySelector('.upload-progress-message');
    if (existingProgress) {
      existingProgress.remove();
    }
    const existingSuccess = document.querySelector('.upload-success-message');
    if (existingSuccess) {
      existingSuccess.remove();
    }

    // Create a temporary success message
    const successDiv = document.createElement('div');
    successDiv.className = 'upload-success-message';
    successDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(16, 185, 129, 0.3);
        z-index: 10000;
        font-weight: 600;
        max-width: 300px;
      ">
        ✅ ${fileCount} file${fileCount > 1 ? 's' : ''} uploaded successfully!<br>
        <small style="opacity: 0.9;">Visible in gallery and saved to server</small>
      </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Remove after 4 seconds
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 4000);
  };

  openFullscreen = (media) => {
    console.log('Opening fullscreen for media:', media);
    this.setState({ fullscreenMedia: media });
  };

  openPreviewFullscreen = (file, index) => {
    // Create a temporary URL for the file to display in fullscreen
    const objectURL = URL.createObjectURL(file);
    const mediaData = {
      url: objectURL,
      type: file.type,
      name: file.name || `File ${index + 1}`,
      isPreview: true // Flag to identify this as a preview file
    };
    
    console.log('Opening preview fullscreen for file:', file.name);
    this.setState({ fullscreenMedia: mediaData });
    
    // Clean up the object URL after a delay to prevent memory leaks
    setTimeout(() => {
      URL.revokeObjectURL(objectURL);
    }, 30000); // 30 seconds should be enough for viewing
  };

  closeFullscreen = () => {
    this.setState({ fullscreenMedia: null });
  };

  removeFile = (indexToRemove) => {
    this.setState(prevState => ({
      uploadForm: {
        ...prevState.uploadForm,
        files: prevState.uploadForm.files.filter((_, index) => index !== indexToRemove)
      }
    }));
  };

  render() {
    const { statistics, currentDateTime, isLoginPopupOpen, isUploadPopupOpen, fullscreenMedia } = this.state;
    
    // Prioritize authentication status from props, fallback to state
    const isAuthenticated = this.props.isAuthenticated !== undefined ? this.props.isAuthenticated : this.state.isAuthenticated;
    
    // Determine if user is WWF-Volunteer with better error handling and role preservation
    let isWWFVolunteer = false;
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      // Ensure role is properly set
      if (user && !user.role) {
        const storedRole = localStorage.getItem('userRole');
        if (storedRole) {
          user.role = storedRole;
          localStorage.setItem('user', JSON.stringify(user));
        }
      }
      
      isWWFVolunteer = user && user.role === 'WWF-Volunteer';
      console.log('WWF Volunteer check:', { user, isWWFVolunteer });
    } catch (e) {
      console.error('Error checking WWF volunteer status:', e);
    }

    return (
      <div className="home-container">
        {/* Add CSS animations */}
        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-20px); }
          }
          
          .gallery-card:hover .location-badge {
            transform: translateY(-2px);
          }
          
          .filter-button {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .filter-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          }
        `}</style>
        
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-background"></div>
          
          {/* Logout Button - Top Right */}

          <div className="hero-content">
            <div className="hero-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L3.09 8.26L4 21L12 17L20 21L20.91 8.26L12 2Z"/>
              </svg>
              Conservation in Action
            </div>
            {/* WWF Logo */}
            <div className="hero-logo-enhanced">
              <img 
                src="/WWF Logo/WWF Logo Large.jpg" 
                alt="WWF Logo"
                onError={(e) => {
                  console.error('WWF logo failed to load:', e.target.src);
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <h1 className="hero-title">
              WWF Straw-headed Bulbul Survey Platform
            </h1>
            <div className="hero-datetime theme-datetime">
              {currentDateTime}
            </div>
           <p className="hero-subtitle">
              Empowering conservation through advanced data visualization and automated survey management. 
              Join us in protecting the critically endangered Straw-headed Bulbul and preserving Singapore's biodiversity.
            </p>
            {/* CTA buttons - Only show when authenticated */}
            {isAuthenticated ? (
              <div className="hero-cta">
                <Link to="/dashboard" className="btn btn-primary" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  width: 'fit-content'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
                  </svg>
                  Explore Dashboard
                </Link>
                <Link to="/surveyEvents" className="btn btn-accent" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  width: 'fit-content'
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
                  </svg>
                  Survey Event Management
                </Link>
                {(() => {
                  // Only show Settings link if user is not a WWF-Volunteer (using same logic as render method)
                  if (!isWWFVolunteer) {
                    return (
                      <Link to="/settings" className="btn btn-secondary" style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        padding: '0.6rem 1rem',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '0.9rem'
                      }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2L3.09 8.26L4 21L12 17L20 21L20.91 8.26L12 2Z"/>
                        </svg>
                        Settings
                      </Link>
                    );
                  }
                  return null;
                })()}
                <button
                  onClick={() => {
                    // Clear all localStorage items
                    localStorage.clear();
                    
                    // Clear tokenService data using the imported service
                    tokenService.clearSession();
                    
                    // Reload the page to reset authentication state
                    window.location.reload();
                  }}
                  className="btn btn-logout"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z"/>
                  </svg>
                  Logout
                </button>
              </div>
            ) : (
              <div className="hero-cta">
                <button onClick={this.toggleLoginPopup} className="btn btn-login" style={{
                  background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)',
                  color: '#fff',
                  padding: '12px 32px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                  transition: 'all 0.3s ease',
                  border: 'none',
                  cursor: 'pointer'
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"/>
                  </svg>
                  Login
                </button>
              </div>
            )}
          {/* Legal Policy Links - Move directly below CTA buttons */}
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', fontSize: '0.98rem' }}>
            <Link to="/privacy-policy" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
              Privacy Policy
            </Link>
            <span style={{ color: '#64748b' }}>|</span>
            <Link to="/terms-of-service" style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
              Terms of Service
            </Link>
          </div>
          </div>
        </section>

        {/* Features section only for authenticated users */}
        {isAuthenticated && (
          <section className="features-section" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh',
            padding: '0 0 60px 0',
            background: '#f8fafc'
          }}>
            <div className="features-container" style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              maxWidth: 1100,
              margin: '0 auto',
              padding: '2rem',
              width: '100%'
            }}>
              <div className="features-header" style={{textAlign: 'center', marginBottom: 40}}>
                <h2 className="features-title" style={{fontSize: '2.5rem', fontWeight: 700, marginBottom: 8}}>Comprehensive Conservation Tools</h2>
                <p className="features-subtitle" style={{color: '#64748b', fontSize: '1.1rem'}}>Everything you need to monitor, analyze, and protect the Straw-headed Bulbul population</p>
              </div>
              <div className="features-grid" style={{display: 'flex', flexDirection: 'row', gap: 40, justifyContent: 'center', alignItems: 'stretch', flexWrap: 'nowrap'}}>
                {/* Dashboard Card */}
                <div className="feature-card" style={{background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)', padding: '36px 32px', width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #e0e7ef', transition: 'box-shadow 0.2s', minHeight: 370}}>
                  <div style={{background: 'linear-gradient(135deg, #4ade80 0%, #22d3ee 100%)', borderRadius: 14, padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                      <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
                    </svg>
                  </div>
                  <h3 style={{fontWeight: 700, fontSize: '1.25rem', marginBottom: 12, textAlign: 'center'}}>Interactive Dashboard</h3>
                  <ul style={{padding: 0, margin: 0, listStyle: 'none', color: '#334155', fontSize: '1rem', marginBottom: 24, textAlign: 'left'}}>
                    <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#22d3ee', fontWeight: 700, marginRight: 8}}>&#8226;</span>Advanced charts & real-time analytics</li>
                    <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#22d3ee', fontWeight: 700, marginRight: 8}}>&#8226;</span>Interactive maps for spatial insights</li>
                    <li style={{display: 'flex', alignItems: 'center'}}><span style={{color: '#22d3ee', fontWeight: 700, marginRight: 8}}>&#8226;</span>Comprehensive conservation reports</li>
                  </ul>
                  <Link to="/dashboard" className="feature-button" style={{background: '#22c55e', color: '#fff', borderRadius: 8, padding: '10px 22px', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', boxShadow: '0 2px 8px 0 rgba(34,197,94,0.08)'}}>
                    View Dashboard
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                    </svg>
                  </Link>
                </div>
                {/* Survey System Card */}
                <div className="feature-card" style={{background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)', padding: '36px 32px', width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #e0e7ef', transition: 'box-shadow 0.2s', minHeight: 370}}>
                  <div style={{background: 'linear-gradient(135deg, #818cf8 0%, #f472b6 100%)', borderRadius: 14, padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                      <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
                  </svg>
                  </div>
                  <h3 style={{fontWeight: 700, fontSize: '1.25rem', marginBottom: 12, textAlign: 'center'}}>Survey System</h3>
                  <ul style={{padding: 0, margin: 0, listStyle: 'none', color: '#334155', fontSize: '1rem', marginBottom: 24, textAlign: 'left'}}>
                    <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#818cf8', fontWeight: 700, marginRight: 8}}>&#8226;</span>Centralized management of all survey events</li>
                    <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#818cf8', fontWeight: 700, marginRight: 8}}>&#8226;</span>View past and upcoming events</li>
                    <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#818cf8', fontWeight: 700, marginRight: 8}}>&#8226;</span>Add upcoming events and participants</li>
                    <li style={{display: 'flex', alignItems: 'center'}}><span style={{color: '#818cf8', fontWeight: 700, marginRight: 8}}>&#8226;</span>Live updates for upcoming events</li>
                  </ul>
                  <Link to="/surveyEvents" className="feature-button" style={{background: '#6366f1', color: '#fff', borderRadius: 8, padding: '10px 22px', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', boxShadow: '0 2px 8px 0 rgba(129,140,248,0.08)'}}>
                    Manage Surveys
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                    </svg>
                  </Link>
                </div>
                {/* Telegram Settings Card - Only show if not WWF-Volunteer */}
                {(() => {
                  // Only show Telegram Settings card if user is not a WWF-Volunteer (using same logic as render method)
                  if (!isWWFVolunteer) {
                    return (
                      <div className="feature-card" style={{background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)', padding: '36px 32px', width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #e0e7ef', transition: 'box-shadow 0.2s', minHeight: 370}}>
                        <div style={{background: 'linear-gradient(135deg, #229ED9 0%, #0A5C8C 100%)', borderRadius: 14, padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                          <svg width="36" height="36" viewBox="0 0 240 240" fill="white">
                            <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                            <path d="M180 72L160 168C158.5 174.5 154.5 176 149 173.5L122.5 154.5L110.5 165.5C109 167 107.5 168.5 105 168.5L107 141.5L157.5 92.5C159.5 90.5 157 89.5 154.5 91.5L93.5 134.5L67.5 126.5C61.5 124.5 61.5 120.5 69.5 117.5L170.5 78.5C176.5 76.5 181.5 80.5 180 72Z" fill="white"/>
                          </svg>
                        </div>
                        <h3 style={{fontWeight: 700, fontSize: '1.25rem', marginBottom: 12, textAlign: 'center'}}>Telegram Settings</h3>
                        <ul style={{padding: 0, margin: 0, listStyle: 'none', color: '#334155', fontSize: '1rem', marginBottom: 24, textAlign: 'left'}}>
                          <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#229ED9', fontWeight: 700, marginRight: 8}}>&#8226;</span>Configure Telegram bot integration</li>
                          <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#229ED9', fontWeight: 700, marginRight: 8}}>&#8226;</span>Set up notifications and alerts</li>
                          <li style={{display: 'flex', alignItems: 'center'}}><span style={{color: '#229ED9', fontWeight: 700, marginRight: 8}}>&#8226;</span>Manage Telegram access and permissions</li>
                        </ul>
                        <Link to="/settings" className="feature-button" style={{background: '#229ED9', color: '#fff', borderRadius: 8, padding: '10px 22px', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', boxShadow: '0 2px 8px 0 rgba(34,197,94,0.08)'}}>
                          Telegram Settings
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                          </svg>
                        </Link>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </section>
        )}
        {/* Gallery Section - Replaced with Gallery Component */}
        <Gallery 
          isAuthenticated={isAuthenticated}
          isWWFVolunteer={isWWFVolunteer}
          onToggleUpload={this.toggleUploadPopup}
        />

        {/* Info Section */}
        <section className="info-section">
          <div className="info-container">
            <div className="info-content">
              <h3>Protecting the Straw-headed Bulbul</h3>
              <p>
                The Straw-headed Bulbul (Pycnonotus zeylanicus) is a critically endangered songbird 
                native to Southeast Asia. Once common across the region, habitat loss and illegal 
                trapping have pushed this species to the brink of extinction.
              </p>
              <p>
                Our conservation platform combines citizen science with advanced technology to monitor 
                populations, track behaviors, and coordinate protection efforts across Singapore's 
                nature reserves and parks.
              </p>
              <div className="info-stats">
                <div className="stat-item">
                  <div className="stat-number">{statistics.totalObservations}</div>
                  <div className="stat-label">Observations</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{statistics.uniqueLocations}</div>
                  <div className="stat-label">Locations</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{statistics.totalVolunteers}</div>
                  <div className="stat-label">Volunteers</div>
                </div>
                <div className="stat-item">
                  <div className="stat-number">{statistics.yearsActive}</div>
                  <div className="stat-label">Years Active</div>
                </div>
              </div>
            </div>
            <div className="info-image">
              <div className="painting-container">
                <img 
                  src="/Feng Yun Painting.jpg" 
                  alt="Feng Yun Traditional Chinese Painting - Artistic representation of nature and wildlife conservation"
                  className="feng-yun-painting"
                  onError={(e) => {
                    e.target.src = '/Feng Yun Painting.jpg';
                  }}
                />
                <div className="painting-overlay">
                  <div className="painting-caption">
                    <h4>Art Inspiring Conservation</h4>
                    <p>Credits: Feng Yun</p>
                    <p>Capturing the delicate beauty of Singapore's endangered birds and inspiring deeper connection with nature through artistic expression</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Login Popup */}
        <LoginPopup 
          isOpen={isLoginPopupOpen} 
          onClose={this.toggleLoginPopup} 
          onLoginSuccess={this.onLoginSuccess} 
        />

        {/* Upload Popup - Show for all authenticated users */}
        {(() => {
          try {
            const userDataString = localStorage.getItem('user');
            if (userDataString && isUploadPopupOpen) {
              const userData = JSON.parse(userDataString);
              return (
                  <>
                    {/* Backdrop */}
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: 'rgba(0, 0, 0, 0.5)',
                      zIndex: 999,
                      backdropFilter: 'blur(4px)'
                    }} onClick={this.toggleUploadPopup}></div>
                    
                    {/* Upload Popup */}
                    <div className="upload-popup" style={{
                      position: 'fixed',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      background: '#ffffff',
                      borderRadius: '12px',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                      zIndex: 1000,
                      width: '90%',
                      maxWidth: '600px',
                      padding: '2rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.5rem'
                    }}>
                    <h3 style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      margin: 0,
                      color: '#111827',
                      textAlign: 'center'
                    }}>
                      {(() => {
                        try {
                          const userData = JSON.parse(userDataString);
                          return userData && userData.role === 'WWF-Volunteer' 
                            ? 'Submit for Approval' 
                            : 'Upload Media';
                        } catch (e) {
                          return 'Upload Media';
                        }
                      })()}
                    </h3>
                    
                    {/* WWF Volunteer Notice */}
                    {(() => {
                      try {
                        const userData = JSON.parse(userDataString);
                        if (userData && userData.role === 'WWF-Volunteer') {
                          return (
                            <div style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '8px',
                              padding: '0.75rem',
                              marginBottom: '0.5rem',
                              textAlign: 'center'
                            }}>
                              <div style={{
                                color: '#d97706',
                                fontSize: '0.85rem',
                                fontWeight: '600',
                                marginBottom: '0.25rem'
                              }}>
                                ⚠️ WWF Volunteer Submission
                              </div>
                              <div style={{
                                color: '#92400e',
                                fontSize: '0.8rem',
                                lineHeight: '1.4'
                              }}>
                                Your submissions will be reviewed and require approval before being published to the gallery.
                              </div>
                            </div>
                          );
                        }
                      } catch (e) {}
                      return null;
                    })()}
                    
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexDirection: 'column'
                      }}>
                        <label style={{ fontSize: '0.9rem', color: '#374151' }}>Upload Type:</label>
                        <select
                          value={this.state.uploadForm.type}
                          onChange={(e) => this.handleUploadFormChange('type', e.target.value)}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '1rem',
                            color: '#111827',
                            backgroundColor: '#fff',
                            cursor: 'pointer'
                          }}
                        >
                          <option value="pictures">Pictures</option>
                          <option value="videos">Videos</option>
                        </select>
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '1rem',
                        flexDirection: 'column'
                      }}>
                        <label style={{ fontSize: '0.9rem', color: '#374151' }}>Select Files:</label>
                        
                        {/* Drag and Drop Zone */}
                        <div
                          onDragOver={this.handleDragOver}
                          onDragEnter={this.handleDragEnter}
                          onDragLeave={this.handleDragLeave}
                          onDrop={this.handleDrop}
                          style={{
                            border: '2px dashed #d1d5db',
                            borderRadius: '12px',
                            padding: '2rem',
                            textAlign: 'center',
                                                       backgroundColor: '#f9fafb',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onClick={() => document.getElementById('file-input').click()}
                        >
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem'
                          }}>
                            <div style={{
                              width: '48px',
                              height: '48px',
                              borderRadius: '50%',
                              backgroundColor: this.state.uploadForm.type === 'pictures' ? '#fef3f2' : '#f0f9ff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px'
                            }}>
                              {this.state.uploadForm.type === 'pictures' ? (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#ef4444">
                                  <path d="M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M19,19H5V5H19M13.96,12.29L11.21,15.83L9.25,13.47L6.5,17H17.5L13.96,12.29Z"/>
                                </svg>
                              ) : (
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="#3b82f6">
                                  <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                                </svg>
                              )}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontWeight: '600', color: '#374151' }}>
                                Drop {this.state.uploadForm.type} here or click to browse
                              </p>
                              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                                Support for multiple {this.state.uploadForm.type === 'pictures' ? 'JPG, PNG, GIF' : 'MP4, MOV, AVI'} files
                              </p>
                            </div>
                          </div>
                          
                          <input 
                            id="file-input"
                            type="file"
                            multiple
                            accept={this.state.uploadForm.type === 'pictures' ? 'image/*' : 'video/*'}
                            onChange={this.handleFileSelection}
                            style={{ display: 'none' }}
                          />
                        </div>
                        
                        {this.state.uploadForm.files.length > 0 && (
                          <>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.75rem 1rem',
                              backgroundColor: '#f0fdf4',
                              border: '1px solid #22c55e',
                              borderRadius: '8px',
                              marginTop: '0.5rem'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e">
                                  <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
                                </svg>
                                <span style={{
                                  fontSize: '0.875rem',
                                  color: '#16a34a',
                                  fontWeight: '600'
                                }}>
                                  {this.state.uploadForm.files.length} file{this.state.uploadForm.files.length !== 1 ? 's' : ''} selected
                                  {this.state.uploadForm.files.length > 0 && (
                                    <span style={{ color: '#6b7280', fontWeight: '400', marginLeft: '0.5rem' }}>
                                      ({(this.state.uploadForm.files.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(1)}MB total)
                                    </span>
                                  )}
                                </span>
                              </div>
                              <button
                                onClick={() => this.setState(prevState => ({
                                  uploadForm: { ...prevState.uploadForm, files: [] }
                                }))}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#16a34a',
                                  cursor: 'pointer',
                                  fontSize: '0.875rem',
                                  textDecoration: 'underline',
                                  padding: 0
                                }}
                              >
                                Clear all
                              </button>
                            </div>
                            
                            {/* Media Preview Section */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.75rem',
                              marginTop: '0.5rem'
                            }}>
                              <label style={{ fontSize: '0.9rem', color: '#374151', fontWeight: '600' }}>
                                Preview: ({this.state.uploadForm.files.length} file{this.state.uploadForm.files.length !== 1 ? 's' : ''}{this.state.uploadForm.files.length > 0 ? `, ${(this.state.uploadForm.files.reduce((total, file) => total + file.size, 0) / (1024 * 1024)).toFixed(1)}MB` : ''})
                              </label>
                              <div className="upload-preview-container" style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                                gridAutoRows: '120px',
                                gap: '0.75rem',
                                maxHeight: '280px',
                                overflowY: 'auto',
                                padding: '0.75rem',
                                backgroundColor: '#f9fafb',
                                borderRadius: '12px',
                                border: '1px solid #e5e7eb',
                                width: '100%'
                              }}>
                                {this.state.uploadForm.files.map((file, index) => {
                                  // Cache object URLs to prevent blinking
                                  if (!this.fileObjectURLs) this.fileObjectURLs = {};
                                  const fileKey = `${file.name}_${file.size}_${file.lastModified}`;
                                  if (!this.fileObjectURLs[fileKey]) {
                                    this.fileObjectURLs[fileKey] = URL.createObjectURL(file);
                                  }
                                  const objectURL = this.fileObjectURLs[fileKey];
                                  // Clean up object URLs when file is removed
                                  const handleRemove = (idx) => {
                                    const removeFile = this.removeFile;
                                    if (this.fileObjectURLs[fileKey]) {
                                      URL.revokeObjectURL(this.fileObjectURLs[fileKey]);
                                      delete this.fileObjectURLs[fileKey];
                                    }
                                    removeFile(idx);
                                  };
                                  return (
                                    <div key={fileKey} className="upload-preview-item" style={{
                                      position: 'relative',
                                      width: '100%',
                                      height: '120px',
                                      borderRadius: '8px',
                                      overflow: 'hidden',
                                      backgroundColor: '#ffffff',
                                      border: '1px solid #d1d5db',
                                      transition: 'all 0.2s ease'
                                    }}>
                                      {/* Remove button */}
                                      <button
                                        onClick={() => handleRemove(index)}
                                        style={{
                                          position: 'absolute',
                                          top: '6px',
                                          right: '6px',
                                          width: '22px',
                                          height: '22px',
                                          borderRadius: '50%',
                                          backgroundColor: 'transparent',
                                          color: '#ef4444',
                                          border: 'none',
                                          cursor: 'pointer',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '16px',
                                          fontWeight: 'bold',
                                          zIndex: 10,
                                          transition: 'all 0.2s ease',
                                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                        }}
                                        onMouseEnter={(e) => {
                                          e.target.style.color = '#dc2626';
                                          e.target.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                          e.target.style.color = '#ef4444';
                                          e.target.style.transform = 'scale(1)';
                                        }}
                                      >
                                        ×
                                      </button>
                                      
                                      {/* Media preview - clickable for fullscreen */}
                                      <div 
                                        style={{
                                          width: '100%',
                                          height: '100%',
                                          cursor: 'pointer',
                                          position: 'relative'
                                        }}
                                        onClick={(e) => {
                                          // Don't trigger fullscreen if clicking remove button
                                          if (e.target.closest('button')) return;
                                          this.openPreviewFullscreen(file, index);
                                        }}
                                      >
                                        {file.type.startsWith('image/') ? (
                                          <>
                                            <img
                                              src={objectURL}
                                              alt={`Preview ${index + 1}`}
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                transition: 'transform 0.2s ease'
                                              }}
                                              onMouseEnter={(e) => {
                                                e.target.style.transform = 'scale(1.05)';
                                              }}
                                              onMouseLeave={(e) => {
                                                e.target.style.transform = 'scale(1)';
                                              }}
                                            />
                                            {/* Fullscreen icon overlay */}
                                            <div style={{
                                              position: 'absolute',
                                              top: '50%',
                                              left: '50%',
                                              transform: 'translate(-50%, -50%)',
                                              background: 'rgba(0, 0, 0, 0.6)',
                                              borderRadius: '50%',
                                              width: '32px',
                                              height: '32px',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              opacity: '0',
                                              transition: 'opacity 0.2s ease',
                                              pointerEvents: 'none',
                                              zIndex: 2
                                            }}
                                            onMouseEnter={(e) => {
                                              e.target.style.opacity = '1';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.opacity = '0';
                                            }}>
                                              <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
                                                <path d="M7,14H5V19H10V17H7V14M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10M7,10H10V7H5V12H7V10M17,7V10H19V12H17V14H19V19H14V17H17V14H19V12H17V10H19V7H17Z"/>
                                              </svg>
                                            </div>
                                          </>
                                        ) : file.type.startsWith('video/') ? (
                                          <div className="upload-preview-video-container" style={{ 
                                            position: 'relative',
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: '#f3f4f6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                          }}>
                                            <video
                                              key={fileKey}
                                              src={objectURL}
                                              muted
                                              playsInline
                                              preload="metadata"
                                              style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                pointerEvents: 'none',
                                                backgroundColor: '#000',
                                                display: 'block'
                                              }}
                                              onLoadedData={e => {
                                                // Pause at first frame
                                                e.target.currentTime = 0;
                                                e.target.pause();
                                              }}
                                              onError={e => {
                                                console.error('Video error:', e, 'for file:', file.name);
                                                e.target.style.display = 'none';
                                                const fallback = e.target.parentElement.querySelector('.video-fallback');
                                                if (fallback) fallback.style.display = 'flex';
                                              }}
                                            />
                                            
                                            {/* Fallback thumbnail for when video fails */}
                                            <div className="video-fallback" style={{
                                              position: 'absolute',
                                              top: 0,
                                              left: 0,
                                              width: '100%',
                                              height: '100%',
                                              backgroundColor: '#1f2937',
                                              display: 'none',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              flexDirection: 'column',
                                              gap: '8px'
                                            }}>
                                              <svg width="32" height="32" viewBox="0 0 24 24" fill="#6b7280">
                                                <path d="M17,10.5V7A1,1 0 0,0 16,6H4A1,1 0 0,0 3,7V17A1,1 0 0,0 4,18H16A1,1 0 0,0 17,17V13.5L21,17.5V6.5L17,10.5Z"/>
                                              </svg>
                                              <span style={{
                                                color: '#9ca3af',
                                                fontSize: '0.75rem',
                                                textAlign: 'center',
                                                padding: '0 8px'
                                              }}>
                                                {file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name}
                                              </span>
                                            </div>
                                            {/* Video play/fullscreen overlay */}
                                            <div style={{
                                              position: 'absolute',
                                              top: '0',
                                              left: '0',
                                              right: '0',
                                              bottom: '0',
                                              background: 'rgba(0, 0, 0, 0.3)',
                                              display: 'flex',
                                              alignItems: 'center',
                                              justifyContent: 'center',
                                              opacity: '0',
                                              transition: 'opacity 0.2s ease',
                                              pointerEvents: 'none',
                                              zIndex: 2
                                            }}
                                            onMouseEnter={(e) => {
                                              e.target.style.opacity = '1';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.target.style.opacity = '0';
                                            }}>
                                              <div style={{
                                                background: 'rgba(255, 255, 255, 0.9)',
                                                borderRadius: '50%',
                                                width: '40px',
                                                height: '40px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
                                              }}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="#22c55e">
                                                  <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                                                </svg>
                                              </div>
                                            </div>
                                          </div>
                                        ) : (
                                          <div style={{
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: '#e5e7eb',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: '#6b7280',
                                            fontSize: '1.5rem'
                                          }}>
                                            📄
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '1rem'
                    }}>
                      <button
                        onClick={this.toggleUploadPopup}
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          background: '#f3f4f6',
                          color: '#111827',
                          border: '1px solid #d1d5db',
                          fontSize: '1rem',
                          fontWeight: '500',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#f3f4f6';
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={this.handleUploadSubmit}
                        disabled={this.state.uploadForm.files.length === 0}
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          background: this.state.uploadForm.files.length === 0 ? '#9ca3af' : '#4ade80',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: this.state.uploadForm.files.length === 0 ? 'not-allowed' : 'pointer',
                          transition: 'background 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                        onMouseEnter={(e) => {
                          if (this.state.uploadForm.files.length > 0) {
                            e.target.style.background = '#38b000';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (this.state.uploadForm.files.length > 0) {
                            e.target.style.background = '#4ade80';
                          }
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                        </svg>
                        {(() => {
                          try {
                            const userData = JSON.parse(userDataString);
                            const isWWF = userData && userData.role === 'WWF-Volunteer';
                            const fileCount = this.state.uploadForm.files.length;
                            const fileText = fileCount > 0 ? `${fileCount} file${fileCount !== 1 ? 's' : ''}` : 'Files';
                            return isWWF 
                              ? `Submit ${fileText} for Approval`
                              : `Upload ${fileText}`;
                          } catch (e) {
                            const fileCount = this.state.uploadForm.files.length;
                            const fileText = fileCount > 0 ? `${fileCount} file${fileCount !== 1 ? 's' : ''}` : 'Files';
                            return `Upload ${fileText}`;
                          }
                        })()}
                      </button>
                    </div>
                    </div>
                  </>
                );
            }
          } catch (error) {
            console.error('Error checking user role for upload popup:', error);
          }
          return null;
        })()}

        {/* Gallery Popup Modal (no background overlay) */}
        {fullscreenMedia && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(30,41,59,0.12)',
            }}
            onClick={this.closeFullscreen}
          >
            <div
              id="gallery-popup-media"
              style={{
                position: 'relative',
                background: '#fff',
                borderRadius: 18,
                boxShadow: '0 8px 32px 0 rgba(30,41,59,0.18)',
                padding: 0, // Remove padding for edge-to-edge
                maxWidth: fullscreenMedia.type && fullscreenMedia.type.startsWith('video/') ? 640 : 520,
                width: '90vw',
                maxHeight: '70vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Close button OUTSIDE media, no background/shadow, just a plain × */}
              <button
                onClick={this.closeFullscreen}
                style={{
                  position: 'absolute',
                  top: -32, // Move above the modal
                  right: 0,
                  background: 'none',
                  border: 'none',
                  fontSize: '2.2rem',
                  color: '#222',
                  cursor: 'pointer',
                  zIndex: 10,
                  width: 40,
                  height: 40,
                  lineHeight: '40px',
                  textAlign: 'center',
                  boxShadow: 'none',
                  borderRadius: 0,
                  padding: 0,
                }}
                aria-label="Close"
              >×</button>
              {/* WWF logo always visible in popup, above media */}
              <div style={{
                width: 80,
                height: 80,
                margin: '0 auto 10px auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <img
                  src="/WWF Logo/WWF Logo Large.jpg"
                  alt="WWF Logo"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain',
                    borderRadius: 0,
                    background: 'none',
                    boxShadow: 'none',
                  }}
                />
              </div>
              {/* Media area, edge-to-edge, no padding */}
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: fullscreenMedia.type && fullscreenMedia.type.startsWith('video/') ? '#000' : '#fff',
                borderRadius: 0,
                boxShadow: 'none',
                padding: 0,
              }}>
                {fullscreenMedia.type && fullscreenMedia.type.startsWith('video/') ? (
                  <video
                    src={fullscreenMedia.url}
                    controls
                    autoPlay
                    style={{
                      width: '100%',
                      height: '56vh',
                      objectFit: 'contain',
                      borderRadius: 0,
                      background: '#000',
                      boxShadow: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'block',
                    }}
                    id="gallery-popup-video"
                  />
                ) : (
                  <img
                    src={fullscreenMedia.url}
                    alt="Gallery media"
                    style={{
                      width: '100%',
                      height: '56vh',
                      objectFit: 'contain',
                      borderRadius: 0,
                      background: '#fff',
                      boxShadow: 'none',
                      margin: 0,
                      padding: 0,
                      display: 'block',
                    }}
                    id="gallery-popup-img"
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Home;