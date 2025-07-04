import React from 'react';
import { Link } from 'react-router-dom';
import LoginPopup from '../Auth/LoginPopup';

import { getUniqueLocations } from '../../utils/dataProcessing';
import { standardizeCoordinates } from '../../utils/coordinateStandardization';
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
      isLoginPopupOpen: false
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
    
    console.log('Authentication status in Home component:', isAuthenticated);
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
    console.log("Props in Home component:", this.props);
    this.checkAuthenticationStatus();
    this.loadStatistics();
    this.timer = setInterval(() => {
      this.setState({ currentDateTime: this.getFormattedDateTime() });
    }, 1000);
  }

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

  handleLoginSuccess = () => {
    // Store authentication status and user details in localStorage
    localStorage.setItem('isAuthenticated', 'true');
    
    // Properly retrieve and parse user data
    try {
      const userDataString = localStorage.getItem('user');
      console.log('User data string from localStorage:', userDataString);
      const userData = userDataString ? JSON.parse(userDataString) : null;
      console.log('Login successful in Home component, user details:', userData);
      
      this.setState({
        isAuthenticated: true,
        isLoginPopupOpen: false,
        currentUser: userData
      });
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      this.setState({
        isAuthenticated: true,
        isLoginPopupOpen: false
      });
    }
  };

  render() {
    const { statistics, currentDateTime, isAuthenticated, isLoginPopupOpen } = this.state;
    return (
      <div className="home-container">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-background"></div>
          <div className="hero-content">
            <div className="hero-badge">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L3.09 8.26L4 21L12 17L20 21L20.91 8.26L12 2Z"/>
              </svg>
              Conservation in Action
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
                {console.log('User:', localStorage.getItem('user'))}
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
                              <path d="M19.14,12.94a1.43,1.43,0,0,0,0-1.88l2-1.55a.5.5,0,0,0,.12-.66l-1.9-3.3a.5.5,0,0,0-.61-.23l-2.35,1a5.37,5.37,0,0,0-1.6-.93l-.36-2.49A.5.5,0,0,0,13,2h-3a.5.5,0,0,0-.5.42l-.36,2.49a5.37,5.37,0,0,0-1.6.93l-2.35-1a.5.5,0,0,0-.61.23l-1.9,3.3a.5.5,0,0,0,.12.66l2,1.55a1.43,1.43,0,0,0,0,1.88l-2,1.55a.5.5,0,0,0-.12.66l1.9,3.3a.5.5,0,0,0,.61.23l2.35-1a5.37,5.37,0,0,0,1.6.93l.36,2.49A.5.5,0,0,0,10,22h3a.5.5,0,0,0,.5-.42l.36-2.49a5.37,5.37,0,0,0,1.6-.93l2.35,1a.5.5,0,0,0,.61-.23l1.9-3.3a.5.5,0,0,0-.12-.66ZM12,15.5A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z"/>
                            </svg>
                            Settings
                          </Link>
                        );
                      }
                    }
                  } catch (error) {
                    console.error('Error checking user role:', error);
                  }
                  return null;
                })()}
                <Link
                  to="/"
                  onClick={(e) => {
                    // Prevent default navigation behavior
                    e.preventDefault();
                    // Clear authentication data from localStorage
                    localStorage.clear();
                    // Update the component state
                    this.setState({ isAuthenticated: false });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.4rem',
                    padding: '0.6rem 1rem',
                    background: '#FF0000', // bright red
                    color: '#FFFFFF',
                    borderRadius: '6px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    transition: 'background 0.2s ease',
                    textDecoration: 'none',
                    border: 'none',
                    boxSizing: 'border-box'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = '#CC0000'} // darker red on hover
                  onMouseOut={(e) => e.currentTarget.style.background = '#FF0000'}  // restore original color
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16,17V14H9V10H16V7L21,12L16,17M14,2A2,2 0 0,1 16,4V6H14V4H5V20H14V18H16V20A2,2 0 0,1 14,22H5A2,2 0 0,1 3,20V4A2,2 0 0,1 5,2H14Z" />
                  </svg>
                  Logout
                </Link>
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
          onLoginSuccess={this.handleLoginSuccess} 
        />
      </div>
    );
  }
}

export default Home;