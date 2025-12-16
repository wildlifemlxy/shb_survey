import React from 'react';
import { Link } from 'react-router-dom';
import LoginPopup from '../Auth/LoginPopup';
import { getCurrentUser, isLoggedIn, clearSession } from '../../data/loginData';
import { getUniqueLocations } from '../../utils/dataProcessing';
import { standardizeCoordinates } from '../../utils/coordinateStandardization';
import { fetchSurveyDataForHomePage } from '../../data/shbData';
import Gallery from '../Gallery/Gallery';
import '../../css/components/Home/Home.css';



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
      fullscreenMedia: null,
      showScreenshotWarning: false, // State to control screenshot warning visibility
      hideMediaTemporarily: false // State to temporarily hide media content
    };
    this.timer = null;
    // Backend connection removed
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
    if (prevProps.shbDataForPublic !== this.props.shbDataForPublic) {
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
    const { shbDataForPublic } = this.props;

    // Use public statistics for all users (authenticated and unauthenticated)
    // PRIORITY 1: Use shbDataForPublic prop if available
    if (shbDataForPublic && typeof shbDataForPublic === 'object' && 
        'observations' in shbDataForPublic && 'locations' in shbDataForPublic && 
        'volunteers' in shbDataForPublic && 'yearsActive' in shbDataForPublic) {
      
      console.log('✅ Using shbDataForPublic prop for all users:', shbDataForPublic);
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
    
    // FALLBACK: Fetch if shbDataForPublic prop is not available
    console.log('⚠️ shbDataForPublic prop not available, falling back to fetch...');
    try {
      const publicStats = await fetchSurveyDataForHomePage();
      console.log('Fetched public statistics for all users:', publicStats);
      
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
      console.error('Error fetching public statistics for all users:', error);
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

  openFullscreen = (media) => {
    console.log('Opening fullscreen for media:', media);
    this.setState({ fullscreenMedia: media });
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
    const { statistics, currentDateTime, isLoginPopupOpen, fullscreenMedia } = this.state;
    
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
                <Link to="/dashboard" className="btn btn-primary btn-primary-cta">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
                  </svg>
                  Explore Dashboard
                </Link>
                <Link to="/surveyEvents" className="btn btn-accent btn-accent-cta">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
                  </svg>
                  Survey Event Management
                </Link>
                {(() => {
                  // Only show Settings link if user is not a WWF-Volunteer (using same logic as render method)
                  if (!isWWFVolunteer) {
                    return (
                      <Link to="/settings" className="btn btn-secondary btn-secondary-cta">
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
                    console.log('Logging out user:', localStorage);
                    localStorage.removeItem('shb-survey-theme-preference');
                    localStorage.removeItem('rsaKeyTimestamp');
                    localStorage.removeItem('rsaKeySessionId')
                    localStorage.clear();
                    
                    // Clear session data
                    clearSession();
                    
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

        {/* Features section - visible to all users */}
        <section className="features-section auth-features">
          <div className="features-container">
            <div className="features-header">
              <h2 className="features-title">Comprehensive Conservation Tools</h2>
              <p className="features-subtitle">Everything you need to monitor, analyze, and protect the Straw-headed Bulbul population</p>
            </div>
              <div className="features-grid auth-features-grid">
                {/* Dashboard Card */}
                <div className="feature-card dashboard-card">
                  <div className="feature-icon dashboard-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                      <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
                    </svg>
                  </div>
                  <h3>Interactive Dashboard</h3>
                  <ul className="feature-list">
                    <li><span className="feature-bullet dashboard-bullet">&#8226;</span>Advanced charts & real-time analytics</li>
                    <li><span className="feature-bullet dashboard-bullet">&#8226;</span>Interactive maps for spatial insights</li>
                    <li><span className="feature-bullet dashboard-bullet">&#8226;</span>Comprehensive conservation reports</li>
                  </ul>
                  {isAuthenticated ? (
                    <Link to="/dashboard" className="feature-button dashboard-button">
                      View Dashboard
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                      </svg>
                    </Link>
                  ) : (
                    <button onClick={this.toggleLoginPopup} className="feature-button dashboard-button">
                      Login to Access
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {/* Survey System Card */}
                <div className="feature-card survey-card">
                  <div className="feature-icon survey-icon">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                      <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
                  </svg>
                  </div>
                  <h3>Survey System</h3>
                  <ul className="feature-list">
                    <li><span className="feature-bullet survey-bullet">&#8226;</span>Centralized management of all survey events</li>
                    <li><span className="feature-bullet survey-bullet">&#8226;</span>View past and upcoming events</li>
                    <li><span className="feature-bullet survey-bullet">&#8226;</span>Add upcoming events and participants</li>
                    <li><span className="feature-bullet survey-bullet">&#8226;</span>Live updates for upcoming events</li>
                  </ul>
                  {isAuthenticated ? (
                    <Link to="/surveyEvents" className="feature-button survey-button">
                      Manage Surveys
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                      </svg>
                    </Link>
                  ) : (
                    <button onClick={this.toggleLoginPopup} className="feature-button survey-button">
                      Login to Access
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                      </svg>
                    </button>
                  )}
                </div>
                {/* Telegram Settings Card - Only show if not WWF-Volunteer */}
                {(() => {
                  // Only show Telegram Settings card if user is not a WWF-Volunteer (using same logic as render method)
                  if (!isWWFVolunteer) {
                    return (
                      <div className="feature-card telegram-card">
                        <div className="feature-icon telegram-icon">
                          <svg width="36" height="36" viewBox="0 0 240 240" fill="white">
                            <circle cx="120" cy="120" r="120" fill="#229ED9"/>
                            <path d="M180 72L160 168C158.5 174.5 154.5 176 149 173.5L122.5 154.5L110.5 165.5C109 167 107.5 168.5 105 168.5L107 141.5L157.5 92.5C159.5 90.5 157 89.5 154.5 91.5L93.5 134.5L67.5 126.5C61.5 124.5 61.5 120.5 69.5 117.5L170.5 78.5C176.5 76.5 181.5 80.5 180 72Z" fill="white"/>
                          </svg>
                        </div>
                        <h3>Telegram Settings</h3>
                        <ul className="feature-list">
                          <li><span className="feature-bullet telegram-bullet">&#8226;</span>Configure Telegram bot integration</li>
                          <li><span className="feature-bullet telegram-bullet">&#8226;</span>Set up notifications and alerts</li>
                          <li><span className="feature-bullet telegram-bullet">&#8226;</span>Manage Telegram access and permissions</li>
                        </ul>
                        {isAuthenticated ? (
                          <Link to="/settings" className="feature-button telegram-button">
                            Telegram Settings
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                            </svg>
                          </Link>
                        ) : (
                          <button onClick={this.toggleLoginPopup} className="feature-button telegram-button">
                            Login to Access
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                            </svg>
                          </button>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </section>

        {/* Gallery Component */}
        <Gallery onImageClick={this.props.onImageClick} />

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
      </div>
    );
  }
}

export default Home;