import React from 'react';
import { Link } from 'react-router-dom';
import LoginPopup from '../Auth/LoginPopup';

import { getUniqueLocations } from '../../utils/dataProcessing';
import { standardizeCoordinates } from '../../utils/coordinateStandardization';
import '../../css/components/Home/Home.css';
import axios from 'axios';

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
      galleryPictures: [],
      galleryVideos: [],
      galleryFolderItems: [], // Add this for static gallery items
      isUploadPopupOpen: false,
      fullscreenMedia: null, // Add this for fullscreen viewing
      galleryFilter: 'all', // 'all', 'pictures', 'videos'
      uploadForm: {
        type: 'pictures',
        files: []
      }
    };
    this.timer = null;
  }

  checkAuthenticationStatus = () => {
    // First check isAuthenticated flag
    const isAuthenticatedFlag = localStorage.getItem('isAuthenticated') === 'true';
    
    // Then check for user data in localStorage
    let currentUser = null;
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        currentUser = JSON.parse(userDataString);
      }
    } catch (error) {
      console.error('Error parsing user data in Home component:', error);
    }
    
    // Set state based on authentication status
    const isAuthenticated = isAuthenticatedFlag || !!currentUser;
    this.setState({ 
      isAuthenticated,
      currentUser
    });
    

    return isAuthenticated;
  };

  isAuthenticated = () => {
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
    this.loadGalleryFolderItems();
    this.timer = setInterval(() => {
      this.setState({ currentDateTime: this.getFormattedDateTime() });
    }, 1000);
  }

  loadGalleryFolderItems = () => {
    // Load existing uploaded files from manifest and localStorage
    this.loadUploadedFiles();
  };

  loadUploadedFiles = async () => {
    try {
      // Load from backend API with blob URLs
      const response = await axios.post('http://localhost:3001/gallery', {purpose: 'retrieveWithBlobs'});
      console.log("Retrieved gallery items:", response.data);
      if (response.data.result) {
        const data = response.data.result;
        
        this.setState({
          galleryPictures: data.pictures || [],
          galleryVideos: data.videos || [],
          galleryFolderItems: []
        });
        
      } else {
        console.error('Failed to load gallery items from backend');
        // Fallback to empty arrays
        this.setState({
          galleryPictures: [],
          galleryVideos: [],
          galleryFolderItems: []
        });
      }
      
    } catch (error) {
      console.error('Error loading uploaded files from backend:', error);
      // Fallback to empty arrays
      this.setState({
        galleryPictures: [],
        galleryVideos: [],
        galleryFolderItems: []
      });
    }
  };

  componentWillUnmount() {
    if (this.timer) clearInterval(this.timer);
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
        if (!isNaN(parseInt(dateValue))) {
          const excelDate = parseInt(dateValue);
          const date = new Date((excelDate - 25569) * 86400 * 1000);
          validDates.push(date);
        } else if (typeof dateValue === 'string' && dateValue.includes('/')) {
          const [day, month, year] = dateValue.split('/');
          if (year && month && day) {
            validDates.push(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
          }
        }
      }
    });
    let yearsActive = 1;
    if (validDates.length > 0) {
      const minDate = new Date(Math.min(...validDates));
      const maxDate = new Date(Math.max(...validDates));
      const timeDiff = maxDate.getTime() - minDate.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
      yearsActive = Math.max(1, Math.ceil(daysDiff / 365));
    }
    return {
      totalObservations: totalObservations.toString(),
      uniqueLocations: uniqueLocations.length.toString(),
      totalVolunteers: uniqueObservers.size > 0 ? `${uniqueObservers.size}+` : '30+',
      yearsActive: yearsActive.toString()
    };
  };

  loadStatistics = () => {
    const { shbData } = this.props;
    const dataToUse = Array.isArray(shbData) && shbData.length > 0 ? standardizeCoordinates(shbData) : [];

    if (dataToUse.length > 0) {
      const stats = this.calculateStatistics(dataToUse);
      this.setState({ statistics: stats });
    } else {
      this.setState({
        statistics: {
          totalObservations: '',
          uniqueLocations: '',
          totalVolunteers: '',
          yearsActive: ''
        }
      });
    }
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

    this.props.onLoginSuccess(userData);
    
    // Update component state
    this.setState({
      isAuthenticated: true,
      isLoginPopupOpen: false
    });
  };

  toggleUploadPopup = () => {
    this.setState(prevState => ({
      isUploadPopupOpen: !prevState.isUploadPopupOpen,
      uploadForm: {
        type: 'pictures',
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

  handleFileSelection = (event) => {
    const files = Array.from(event.target.files);
    this.setState(prevState => ({
      uploadForm: {
        ...prevState.uploadForm,
        files: files
      }
    }));
  };

  handleUploadSubmit = () => {
    const { uploadForm } = this.state;
    
    // Validation
    if (uploadForm.files.length === 0) {
      alert('Please select files to upload');
      return;
    }

    // Process the upload
    this.processUpload(uploadForm);
    
    // Close popup
    this.toggleUploadPopup();
  };

  processUpload = async (formData) => {
    const { type, files } = formData;
    
    try {
      // Create FormData for backend upload
      const uploadData = new FormData();
      uploadData.append('purpose', 'upload');
      uploadData.append('type', type);
      
      // Add all files to FormData
      files.forEach(file => {
        uploadData.append('files', file);
      });

      // Upload to backend API
      const response = await axios.post('http://localhost:3001/gallery', uploadData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      console.log('Upload response:', response.data);

      if (response.data.success) {
        // Reload gallery items from backend
        await this.loadUploadedFiles();
        
        // Show success message
        alert(`${response.data.files.length} file(s) uploaded successfully!`);
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
      
    } catch (error) {
      console.error('Error uploading files:', error);
      alert(`Error uploading files: ${error.response?.data?.error || error.message}`);
    }
  };

  // Convert file to base64 for permanent storage
  showUploadSuccessMessage = () => {
    // Create a temporary success message
    const successDiv = document.createElement('div');
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
        ✅ Files uploaded successfully!<br>
        <small style="opacity: 0.9;">Visible in gallery and saved locally</small>
      </div>
    `;
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (document.body.contains(successDiv)) {
        document.body.removeChild(successDiv);
      }
    }, 3000);
  };

  openFullscreen = (media) => {
    console.log('Opening fullscreen for media:', media);
    this.setState({ fullscreenMedia: media });
  };

  closeFullscreen = () => {
    this.setState({ fullscreenMedia: null });
  };

  setGalleryFilter = (filter) => {
    this.setState({ galleryFilter: filter });
  };

  getFilteredGalleryItems = () => {
    const allItems = [...this.state.galleryPictures, ...this.state.galleryVideos, ...this.state.galleryFolderItems];
    
    let filteredItems = allItems;
    
    // Filter by type
    if (this.state.galleryFilter === 'pictures') {
      filteredItems = filteredItems.filter(item => 
        item.type && item.type.startsWith('image/')
      );
    } else if (this.state.galleryFilter === 'videos') {
      filteredItems = filteredItems.filter(item => 
        item.type && item.type.startsWith('video/')
      );
    }
    
    return filteredItems;
  };

  render() {
    const { statistics, currentDateTime, isAuthenticated, isLoginPopupOpen, isUploadPopupOpen } = this.state;
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
                  // Get user role from localStorage
                  try {
                    const userDataString = localStorage.getItem('user');
                    if (userDataString) {
                      const userData = JSON.parse(userDataString);
                      // Only show Settings link if user is not a WWF-Volunteer
                      if (userData && userData.role !== 'WWF-Volunteer') {
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
                    }
                  } catch (error) {
                    console.error('Error parsing user data for settings link:', error);
                  }
                  return null;
                })()}
                <button
                  onClick={() => {
                    localStorage.removeItem('isAuthenticated');
                    localStorage.removeItem('user');
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
          </div>
        </section>

        {/* Features Section - Only show when authenticated */}
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
                  // Get user role from localStorage
                  try {
                    const userDataString = localStorage.getItem('user');
                    if (userDataString) {
                      const userData = JSON.parse(userDataString);
                      // Only show Telegram Settings card if user is not a WWF-Volunteer
                      if (userData && userData.role !== 'WWF-Volunteer') {
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
                    }
                  } catch (error) {
                    console.error('Error checking user role for Telegram card:', error);
                  }
                  return null;
                })()}
              </div>
            </div>
          </section>
        )}

        {/* Studio Gallery Section - Show for all users */}
        <section className="studio-gallery-section" style={{
          padding: '80px 0',
          background: 'linear-gradient(to bottom, #e6e6fa 0%, #f5f5ff 100%)',   
          borderTop: '1px solid #e2e8f0'
        }}>
          <div className="studio-container" style={{
            maxWidth: '1400px',
            margin: '0 auto',
            padding: '0 2rem'
          }}>
            {/* Studio Header */}
            <div className="studio-header" style={{
              textAlign: 'center',
              marginBottom: '60px',
              position: 'relative'
            }}>
              <div style={{
                display: 'inline-block',
                background: 'linear-gradient(135deg, #1e293b 0%, #475569 100%)',
                color: '#ffffff',
                padding: '0.5rem 1.5rem',
                borderRadius: '30px',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '1.5rem',
                letterSpacing: '0.5px'
              }}>
                CONSERVATION GALLERY
              </div>
              <h2 style={{
                fontSize: '3rem',
                fontWeight: '800',
                color: '#1e293b',
                marginBottom: '1rem',
                letterSpacing: '-0.02em'
              }}>Collection</h2>
              <p style={{
                fontSize: '1.2rem',
                color: '#64748b',
                maxWidth: '600px',
                margin: '0 auto 2rem auto',
                lineHeight: '1.6'
              }}>A curated showcase of wildlife photography and videography taken by the volunteers and staffs.   </p>

              {/* Filter Buttons - Always Visible */}
              <div style={{
                display: 'flex',
                gap: '1rem',
                justifyContent: 'center',
                marginBottom: '2rem',
                flexWrap: 'wrap'
              }}>
                <button
                  onClick={() => this.setGalleryFilter('all')}
                  className="filter-button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: this.state.galleryFilter === 'all' ? 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' : '#f8fafc',
                    color: this.state.galleryFilter === 'all' ? '#ffffff' : '#64748b',
                    border: '2px solid',
                    borderColor: this.state.galleryFilter === 'all' ? '#3b82f6' : '#e2e8f0',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (this.state.galleryFilter !== 'all') {
                      e.target.style.background = '#e2e8f0';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (this.state.galleryFilter !== 'all') {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => this.setGalleryFilter('pictures')}
                  className="filter-button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: this.state.galleryFilter === 'pictures' ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#f8fafc',
                    color: this.state.galleryFilter === 'pictures' ? '#ffffff' : '#64748b',
                    border: '2px solid',
                    borderColor: this.state.galleryFilter === 'pictures' ? '#10b981' : '#e2e8f0',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (this.state.galleryFilter !== 'pictures') {
                      e.target.style.background = '#e2e8f0';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (this.state.galleryFilter !== 'pictures') {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  Pictures
                </button>
                <button
                  onClick={() => this.setGalleryFilter('videos')}
                  className="filter-button"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: this.state.galleryFilter === 'videos' ? 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' : '#f8fafc',
                    color: this.state.galleryFilter === 'videos' ? '#ffffff' : '#64748b',
                    border: '2px solid',
                    borderColor: this.state.galleryFilter === 'videos' ? '#8b5cf6' : '#e2e8f0',
                    borderRadius: '25px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    letterSpacing: '0.02em'
                  }}
                  onMouseEnter={(e) => {
                    if (this.state.galleryFilter !== 'videos') {
                      e.target.style.background = '#e2e8f0';
                      e.target.style.borderColor = '#cbd5e1';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (this.state.galleryFilter !== 'videos') {
                      e.target.style.background = '#f8fafc';
                      e.target.style.borderColor = '#e2e8f0';
                    }
                  }}
                >
                  Videos
                </button>
              </div>

              {/* Upload Button - Modern Studio Style */}
              {(() => {
                try {
                  const userDataString = localStorage.getItem('user');
                  if (userDataString) {
                    const userData = JSON.parse(userDataString);
                    if (userData && userData.role !== 'WWF-Volunteer') {
                      return (
                        <button
                          onClick={this.toggleUploadPopup}
                          style={{
                            position: 'absolute',
                            top: '0',
                            right: '0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.75rem',
                            padding: '1rem 2rem',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: '#ffffff',
                            borderRadius: '50px',
                            cursor: 'pointer',
                            border: 'none',
                            transition: 'all 0.3s ease',
                            fontSize: '1rem',
                            fontWeight: '600',
                            boxShadow: '0 8px 25px rgba(59, 130, 246, 0.25)',
                            transform: 'translateY(0)',
                            letterSpacing: '0.02em'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = '0 12px 35px rgba(59, 130, 246, 0.35)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = '0 8px 25px rgba(59, 130, 246, 0.25)';
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C13.1 2 14 2.9 14 4V10H20C21.1 10 22 10.9 22 12S21.1 14 20 14H14V20C14 21.1 13.1 22 12 22S10 21.1 10 20V14H4C2.9 14 2 13.1 2 12S2.9 10 4 10H10V4C10 2.9 10.9 2 12 2Z"/>
                          </svg>
                          Add to Collection
                        </button>
                      );
                    }
                  }
                } catch (error) {
                  console.error('Error checking user role for gallery upload:', error);
                }
                return null;
              })()}
            </div>
            
            {/* Studio Gallery Grid */}
            <div className="studio-gallery-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '1.5rem',
              marginBottom: '3rem'
            }}>
              {/* Use filtered items with live updates */}
              {(() => {
                const filteredItems = this.getFilteredGalleryItems();
                
                if (filteredItems.length > 0) {
                  return filteredItems.map((media, index) => (
                    <div 
                      key={media.id || index} 
                      className="gallery-card" 
                      style={{
                        background: '#ffffff',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
                        position: 'relative',
                        aspectRatio: '4/3'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.08)';
                      }}
                    >
                      {/* Media Container */}
                      <div 
                        style={{
                          position: 'relative',
                          width: '100%',
                          height: '100%',
                          overflow: 'hidden',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
                        }}
                        onClick={() => this.openFullscreen(media)}
                      >
                        {media.type && media.type.startsWith('video/') ? (
                          <>
                            <video 
                              src={media.url}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                            {/* Video overlay indicator */}
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              background: 'rgba(0, 0, 0, 0.7)',
                              borderRadius: '50%',
                              width: '60px',
                              height: '60px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              pointerEvents: 'none'
                            }}>
                              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                                <path d="M8,5.14V19.14L19,12.14L8,5.14Z"/>
                              </svg>
                            </div>
                          </>
                        ) : (
                          <img 
                            src={media.url}
                            alt="Gallery item"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              transition: 'transform 0.3s ease'
                            }}
                            onError={(e) => {
                              console.error('Image failed to load:', media.url);
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = `
                                <div style="
                                  width: 100%;
                                  height: 100%;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  flex-direction: column;
                                  background: #f3f4f6;
                                  color: #6b7280;
                                ">
                                  <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M21,19V5C21,3.89 20.1,3 19,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19M8.5,13.5L11,16.5L14.5,12L19,18H5L8.5,13.5Z"/>
                                  </svg>
                                  <p style="margin: 8px 0 0 0; font-size: 0.875rem;">Image not found</p>
                                </div>
                              `;
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', media.url);
                            }}
                          />
                        )}
                      </div>
                    </div>
                  ));
                } else {
                  return (
                    /* Enhanced Empty State - Studio Style */
                    <div style={{
                      gridColumn: '1 / -1',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '6rem 2rem',
                      background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                      borderRadius: '24px',
                      border: '2px dashed #cbd5e1',
                      minHeight: '500px',
                      position: 'relative'
                    }}>
                      {/* Animated background elements */}
                      <div style={{
                        position: 'absolute',
                        top: '20%',
                        left: '20%',
                        width: '60px',
                        height: '60px',
                        background: 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
                        borderRadius: '50%',
                        opacity: '0.3',
                        animation: 'float 6s ease-in-out infinite'
                      }}></div>
                      <div style={{
                        position: 'absolute',
                        top: '60%',
                        right: '25%',
                        width: '40px',
                        height: '40px',
                        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                        borderRadius: '50%',
                        opacity: '0.4',
                        animation: 'float 8s ease-in-out infinite reverse'
                      }}></div>

                      <div style={{
                        width: '140px',
                        height: '140px',
                        background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '2.5rem',
                        position: 'relative'
                      }}>
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="#64748b">
                          <path d="M4,6H2V20A2,2 0 0,0 4,22H18V20H4V6M20,2H8A2,2 0 0,0 6,4V16A2,2 0 0,0 8,18H20A2,2 0 0,0 22,16V4A2,2 0 0,0 20,2M20,16H8V4H20V16M11,14L13.5,11L16.5,15H9.5L11,14Z"/>
                        </svg>
                      </div>
                      
                      <h3 style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        color: '#1e293b',
                        marginBottom: '1rem',
                        textAlign: 'center'
                      }}>Coming Soon...</h3>
                      
                      <p style={{
                        fontSize: '1.1rem',
                        color: '#64748b',
                        textAlign: 'center',
                        maxWidth: '500px',
                        lineHeight: '1.7',
                        marginBottom: '2rem'
                      }}>
                        Our conservation gallery is being curated. Check back soon for stunning wildlife photography and research documentation.
                      </p>

                    </div>
                  );
                }
              })()}
            </div>
          </div>
        </section>

        {/* Features Section - Only show when authenticated */}
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
                  // Get user role from localStorage
                  try {
                    const userDataString = localStorage.getItem('user');
                    if (userDataString) {
                      const userData = JSON.parse(userDataString);
                      // Only show Telegram Settings card if user is not a WWF-Volunteer
                      if (userData && userData.role !== 'WWF-Volunteer') {
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
                    }
                  } catch (error) {
                    console.error('Error checking user role for Telegram card:', error);
                  }
                  return null;
                })()}
              </div>
            </div>
          </section>
        )}

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

        {/* Upload Popup - Only show if not WWF-Volunteer */}
        {(() => {
          try {
            const userDataString = localStorage.getItem('user');
            if (userDataString) {
              const userData = JSON.parse(userDataString);
              // Only show upload popup if user is not a WWF-Volunteer
              if (userData && userData.role !== 'WWF-Volunteer' && isUploadPopupOpen) {
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
                    }}>Upload Media</h3>
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
                        <label style={{ fontSize: '0.9rem', color: '#374151' }}>Type:</label>
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
                        <input 
                          type="file"
                          multiple
                          accept={this.state.uploadForm.type === 'pictures' ? 'image/*' : 'video/*'}
                          onChange={this.handleFileSelection}
                          style={{
                            padding: '0.75rem',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            fontSize: '1rem',
                            color: '#111827',
                            cursor: 'pointer'
                          }}
                        />
                        {this.state.uploadForm.files.length > 0 && (
                          <p style={{
                            fontSize: '0.8rem',
                            color: '#6b7280',
                            margin: 0
                          }}>
                            {this.state.uploadForm.files.length} file(s) selected
                          </p>
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
                        style={{
                          padding: '0.75rem 1.5rem',
                          borderRadius: '8px',
                          background: '#4ade80',
                          color: '#ffffff',
                          border: 'none',
                          fontSize: '1rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#38b000';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#4ade80';
                        }}
                      >
                        Upload
                      </button>
                    </div>
                    </div>
                  </>
                );
              }
            }
          } catch (error) {
            console.error('Error checking user role for upload popup:', error);
          }
          return null;
        })()}

        {/* Fullscreen Media Viewer */}
        {this.state.fullscreenMedia && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }} onClick={this.closeFullscreen}>
            {/* Close Button */}
            <button
              onClick={this.closeFullscreen}
              style={{
                position: 'absolute',
                top: '2rem',
                right: '2rem',
                background: 'transparent',
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '48px',
                height: '48px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 'bold',
                transition: 'opacity 0.2s ease',
                opacity: '0.8'
              }}
              onMouseEnter={(e) => {
                e.target.style.opacity = '1';
              }}
              onMouseLeave={(e) => {
                e.target.style.opacity = '0.8';
              }}
            >
              ×
            </button>

            {/* Media Content */}
            <div style={{
              width: '100vw',
              height: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }} onClick={(e) => e.stopPropagation()}>
              {this.state.fullscreenMedia.type && this.state.fullscreenMedia.type.startsWith('video/') ? (
                <video 
                  src={this.state.fullscreenMedia.url}
                  controls
                  autoPlay
                  style={{
                    maxWidth: '100vw',
                    maxHeight: '100vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <img 
                  src={this.state.fullscreenMedia.url}
                  alt="Gallery media"
                  style={{
                    maxWidth: '100vw',
                    maxHeight: '100vh',
                    width: 'auto',
                    height: 'auto',
                    objectFit: 'contain'
                  }}
                />
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

export default Home;