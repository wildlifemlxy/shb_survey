import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import shbData from '../../data/shbData.js';
import fallbackData from '../../data/fallbackData.js';
import { getUniqueLocations } from '../../utils/dataProcessing';
import { standardizeCoordinates } from '../../utils/coordinateStandardization';
import '../../css/components/Home/Home.css';


// Function to calculate real statistics from survey data
const calculateStatistics = (data) => {
  if (!data || data.length === 0) {
    return {
      totalObservations: '50+',
      uniqueLocations: '15+',
      totalVolunteers: '30+',
      yearsActive: '3+'
    };
  }

  // Calculate total observations
  const totalObservations = data.length;

  // Calculate unique locations
  const uniqueLocations = getUniqueLocations(data);

  // Calculate unique volunteers/observers
  const uniqueObservers = new Set();
  data.forEach(observation => {
    const observer = observation['Observer name'] || observation.Observer;
    if (observer && typeof observer === 'string') {
      // Split by comma and clean up observer names
      const observers = observer.split(',').map(name => name.trim());
      observers.forEach(name => {
        if (name && name !== 'E.g. MS' && name.length > 1) {
          uniqueObservers.add(name);
        }
      });
    }
  });

  // Calculate years active based on date range
  const validDates = [];
  data.forEach(observation => {
    const dateValue = observation.Date;
    if (dateValue) {
      // Handle Excel date format (numeric)
      if (!isNaN(parseInt(dateValue))) {
        const excelDate = parseInt(dateValue);
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        validDates.push(date);
      } else if (typeof dateValue === 'string' && dateValue.includes('/')) {
        // Handle formatted date string
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
    totalObservations: totalObservations.toString(),      // Dynamic count from real data
    uniqueLocations: uniqueLocations.length.toString(),   // Dynamic unique locations count
    totalVolunteers: uniqueObservers.size > 0 ? `${uniqueObservers.size}+` : '30+',
    yearsActive: yearsActive.toString()                    // Dynamic years active
  };
};

const Home = () => {
  const [statistics, setStatistics] = useState({
    totalObservations: '18',      // Actual count from fallback data
    uniqueLocations: '13',        // Updated to show 13 locations as requested
    totalVolunteers: '31+',       // Keep as requested (don't change)
    yearsActive: '1'              // Updated to show 1 year as requested
  });

  useEffect(() => {
    const loadStatistics = async () => {
      try {
        let dataToUse = null;
        
        // Check if we have valid array data
        if (shbData && Array.isArray(shbData) && shbData.length > 0) {
          dataToUse = standardizeCoordinates(shbData);
        } else {
          dataToUse = standardizeCoordinates(fallbackData);
        }
        
        if (dataToUse && dataToUse.length > 0) {
          const stats = calculateStatistics(dataToUse);
          setStatistics(stats);
        } else {
          // If data is still loading, try again after a short delay
          setTimeout(async () => {
            try {
              const { default: freshData } = await import('../../data/shbData.js');
              if (freshData && Array.isArray(freshData) && freshData.length > 0) {
                const standardizedFreshData = standardizeCoordinates(freshData);
                const stats = calculateStatistics(standardizedFreshData);
                setStatistics(stats);
              } else {
                // Use fallback if fresh data also fails
                const standardizedFallbackData = standardizeCoordinates(fallbackData);
                const stats = calculateStatistics(standardizedFallbackData);
                setStatistics(stats);
              }
            } catch (importError) {
              // Use fallback data as last resort
              const standardizedFallbackData = standardizeCoordinates(fallbackData);
              const stats = calculateStatistics(standardizedFallbackData);
              setStatistics(stats);
            }
          }, 2000);
        }
      } catch (error) {
        // Use fallback data if there's an error
        try {
          const standardizedFallbackData = standardizeCoordinates(fallbackData);
          const stats = calculateStatistics(standardizedFallbackData);
          setStatistics(stats);
        } catch (fallbackError) {
          // Keep default values if everything fails
        }
      }
    };

    loadStatistics();
  }, []);

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
      <section className="features-section">
        <div className="features-container">
          <div className="features-header">
            <h2>Comprehensive Conservation Tools</h2>
            <p>Everything you need to monitor, analyze, and protect the Straw-headed Bulbul population</p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 13H11V3H3V13ZM3 21H11V15H3V21ZM13 21H21V11H13V21ZM13 3V9H21V3H13Z"/>
                </svg>
              </div>
              <h3>Interactive Dashboard</h3>
              <p>
                Visualize population data with advanced charts, interactive maps, and real-time analytics. 
                Track trends, analyze patterns, and generate comprehensive conservation reports.
              </p>
              <Link to="/dashboard" className="feature-button">
                View Dashboard
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 4L10.59 5.41L16.17 11H4V13H16.17L10.59 18.59L12 20L20 12L12 4Z"/>
                </svg>
              </Link>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z"/>
                </svg>
              </div>
              <h3>Automated Survey System</h3>
              <p>
                Streamline field surveys with intelligent Telegram bot integration. Schedule surveys, 
                coordinate volunteers, and collect data efficiently across multiple locations.
              </p>
              <Link to="/automated" className="feature-button">
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
};

export default Home;