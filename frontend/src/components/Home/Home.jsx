import React from 'react';
import { Link } from 'react-router-dom';

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
      }
    };
  }

  componentDidMount = async () => {
    console.log("Props in Home component:", this.props);
    this.loadStatistics();
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

  render() {
    const { statistics } = this.state;
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
            <p className="hero-subtitle">
              Empowering conservation through advanced data visualization and automated survey management. 
              Join us in protecting the critically endangered Straw-headed Bulbul and preserving Singapore's biodiversity.
            </p>
            <div className="hero-cta">
              <Link to="/dashboard" className="btn btn-primary">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
                </svg>
                Explore Dashboard
              </Link>
              <Link to="/automated" className="btn btn-accent">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
                </svg>
                Survey Management
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
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
            <div className="features-grid" style={{display: 'flex', gap: 40, justifyContent: 'center', flexWrap: 'wrap'}}>
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
              <div className="feature-card" style={{background: '#fff', borderRadius: 18, boxShadow: '0 4px 24px 0 rgba(0,0,0,0.06)', padding: '36px 32px', width: 340, display: 'flex', flexDirection: 'column', alignItems: 'center', border: '1.5px solid #e0e7ef', transition: 'box-shadow 0.2s', minHeight: 370}}>
                <div style={{background: 'linear-gradient(135deg, #818cf8 0%, #f472b6 100%)', borderRadius: 14, padding: 14, marginBottom: 18, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="white">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
                  </svg>
                </div>
                <h3 style={{fontWeight: 700, fontSize: '1.25rem', marginBottom: 12, textAlign: 'center'}}>Automated Survey System</h3>
                <ul style={{padding: 0, margin: 0, listStyle: 'none', color: '#334155', fontSize: '1rem', marginBottom: 24, textAlign: 'left'}}>
                  <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#818cf8', fontWeight: 700, marginRight: 8}}>&#8226;</span>Telegram bot for field survey automation</li>
                  <li style={{marginBottom: 8, display: 'flex', alignItems: 'center'}}><span style={{color: '#818cf8', fontWeight: 700, marginRight: 8}}>&#8226;</span>Easy volunteer coordination & scheduling</li>
                  <li style={{display: 'flex', alignItems: 'center'}}><span style={{color: '#818cf8', fontWeight: 700, marginRight: 8}}>&#8226;</span>Efficient data collection across locations</li>
                </ul>
                <Link to="/automated" className="feature-button" style={{background: '#6366f1', color: '#fff', borderRadius: 8, padding: '10px 22px', fontWeight: 600, fontSize: '1rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', boxShadow: '0 2px 8px 0 rgba(129,140,248,0.08)'}}>
                  Manage Surveys
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </section>

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
      </div>
    );
  }
}

export default Home;