import React, { Component } from 'react';
import { getValidCoordinates, getUniqueActivity } from '../../../utils/dataProcessing';
import '../../../css/components/Tabs/OverviewTab.css';

class OverviewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expandedCards: {},
      showAllStats: false,
      showDataQualityPercent: false, // Toggle for Data Quality view
      activityTab: 'behavior' // Track which tab is active for Activity Types
    };
  }

  toggleCardExpanded = (cardId) => {
    this.setState(prevState => ({
      expandedCards: {
        ...prevState.expandedCards,
        [cardId]: !prevState.expandedCards[cardId]
      }
    }));
  };

  toggleShowAllStats = () => {
    this.setState(prevState => ({
      showAllStats: !prevState.showAllStats
    }));
  };

  toggleDataQualityPercent = () => {
    this.setState(prevState => ({
      showDataQualityPercent: !prevState.showDataQualityPercent
    }));
  };

  render() {
    const { data, filteredData } = this.props;
    const { expandedCards, showAllStats, showDataQualityPercent } = this.state;

    // If data is not loaded or empty, render blank
    if (!filteredData || !Array.isArray(filteredData) || filteredData.length === 0) {
      return <div className="overview-tab" />;
    }

    // Defensive: filter out any rows where SHB individual ID is missing or invalid
    const safeFilteredData = filteredData.filter(obs => {
      const id = obs["SHB individual ID"];
      return id !== undefined && id !== null && id !== '';
    });

    // Calculate comprehensive statistics
    const totalBirds = safeFilteredData.reduce((sum, obs) => {
      if (
        obs["Seen/Heard"] &&
        (obs["Seen/Heard"] === "Seen" || obs["Seen/Heard"] === "Heard")
      ) {
        let count = obs["Number of Birds"];
        if (typeof count === 'string') count = count.trim();
        const parsed = parseInt(count, 10);
        if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
          return sum + parsed;
        }
      }
      return sum;
    }, 0);

    const totalSeenBirds = safeFilteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Seen") {
        let count = obs["Number of Birds"];
        if (typeof count === 'string') count = count.trim();
        const parsed = parseInt(count, 10);
        if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
          return sum + parsed;
        }
      }
      return sum;
    }, 0);

    const totalHeardBirds = safeFilteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Heard") {
        let count = obs["Number of Birds"];
        if (typeof count === 'string' ) count = count.trim();
        const parsed = parseInt(count, 10);
        if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
          return sum + parsed;
        }
      }
      return sum;
    }, 0);

    const totalNotFoundBirds = safeFilteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Not found") {
        let count = obs["Number of Birds"];
        if (typeof count === 'string') count = count.trim();
        const parsed = parseInt(count, 10);
        if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
          return sum + parsed;
        }
      }
      return sum;
    }, 0);

    // Additional comprehensive statistics
    const uniqueLocations = new Set(filteredData.map(item => item.Location)).size;
    const successfulLocations = new Set(filteredData.filter(item => item["Seen/Heard"] !== "Not found").map(item => item.Location)).size;
    const validCoordinates = getValidCoordinates(filteredData);
    const uniqueActivities = getUniqueActivity(filteredData);
    const successRate = filteredData.length > 0 ? Math.round(((filteredData.filter(item => item["Seen/Heard"] !== "Not found").length) / filteredData.length) * 100) : 0;
    const visualDetectionRate = filteredData.length > 0 ? Math.round(((filteredData.filter(item => item["Seen/Heard"] === "Seen").length) / filteredData.length) * 100) : 0;
    
    // Time-based statistics with proper date handling
    const surveyDates = filteredData.map(item => item.Date).filter(date => date);
    const uniqueDates = new Set(surveyDates).size;
    
    // Helper function to convert Excel serial date to proper date
    const convertExcelSerialDate = (serial) => {
      if (typeof serial === 'number') {
        return new Date((serial - 25569) * 86400 * 1000);
      }
      return new Date(serial);
    };
    
    // Helper function to format date as dd/mm/yyyy
    const formatDateToDDMMYYYY = (date) => {
      if (!date || isNaN(date.getTime())) return 'N/A';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };
    
    let earliestDate = 'N/A';
    let latestDate = 'N/A';
    
    if (surveyDates.length > 0) {
      const validDates = surveyDates.map(date => {
        if (typeof date === 'number') {
          return convertExcelSerialDate(date);
        } else if (typeof date === 'string' && date.includes('/')) {
          // dd/mm/yyyy or d/m/yyyy or dd/mm/yy
          const parts = date.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            let year = parseInt(parts[2], 10);
            // If year is 2 digits, treat as 2000+YY (e.g., 01 -> 2001)
            if (parts[2].length === 2) {
              year = 2000 + year;
            }
            return new Date(year, month - 1, day);
          }
        } else if (typeof date === 'string' && date.match(/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/)) {
          // e.g. 15-Dec-24 or 5-Jan-2025
          const [d, m, y] = date.split('-');
          const months = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
          };
          let year = parseInt(y, 10);
          // If year is 2 digits, treat as 2000+YY (e.g., 24 -> 2024)
          if (y.length === 2) {
            year = 2000 + year;
          }
          return new Date(year, months[m], parseInt(d, 10));
        } else if (typeof date === 'string' && date.match(/^\d{1,2}-[A-Za-z]{3}$/)) {
          // e.g. 31-Mar or 20-Jun (no year)
          const [d, m] = date.split('-');
          const months = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
          };
          const year = new Date().getFullYear();
          return new Date(year, months[m], parseInt(d, 10));
        }
        return new Date(date);
      }).filter(date => !isNaN(date.getTime()));
      
      if (validDates.length > 0) {
        const earliest = new Date(Math.min(...validDates));
        const latest = new Date(Math.max(...validDates));
        earliestDate = formatDateToDDMMYYYY(earliest);
        latestDate = formatDateToDDMMYYYY(latest);
      }
    }
    
    // Location analysis with comprehensive stats
    const locationStats = {};
    filteredData.forEach(item => {
      if (!locationStats[item.Location]) {
        locationStats[item.Location] = { total: 0, seen: 0, heard: 0, notFound: 0 };
      }
      locationStats[item.Location].total++;
      if (item["Seen/Heard"] === "Seen") locationStats[item.Location].seen++;
      else if (item["Seen/Heard"] === "Heard") locationStats[item.Location].heard++;
      else if (item["Seen/Heard"] === "Not found") locationStats[item.Location].notFound++;
    });
    
    const mostActiveLocation = Object.entries(locationStats).reduce((max, [location, stats]) => 
      stats.total > (max.stats?.total || 0) ? { location, stats } : max, {}
    );
    
    const bestPerformingLocation = Object.entries(locationStats).reduce((best, [location, stats]) => {
      const successRate = (stats.seen + stats.heard) / stats.total;
      const bestRate = best.stats ? (best.stats.seen + best.stats.heard) / best.stats.total : 0;
      return successRate > bestRate ? { location, stats } : best;
    }, {});

    // Activity analysis (split comma-separated behaviors and count each individually)
    const behaviorStats = {};
    filteredData.forEach(item => {
      const activity = item["Activity (foraging, preening, calling, perching, others)"];
      if (activity) {
        activity.split(',').forEach(raw => {
          const behavior = raw.trim();
          if (behavior) {
            behaviorStats[behavior] = (behaviorStats[behavior] || 0) + 1;
          }
        });
      }
    });

    // Type analysis (split comma-separated types and count each individually)
    const typeStats = {};
    filteredData.forEach(item => {
      const type = item["Type (adult, juvenile, pair, group, etc.)"];
      if (type) {
        type.split(',').forEach(raw => {
          const t = raw.trim();
          if (t) {
            typeStats[t] = (typeStats[t] || 0) + 1;
          }
        });
      }
    });

    // Data quality: percent of records with a valid 'Number of Birds' value
    const validBirdCountRecords = safeFilteredData.filter(obs => {
      let count = obs["Number of Birds"];
      if (typeof count === 'string') count = count.trim();
      const parsed = parseInt(count, 10);
      return !isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000;
    });
    const dataQualityPercent = safeFilteredData.length > 0 ? Math.round((validBirdCountRecords.length / safeFilteredData.length) * 100) : 0;

    // Location coverage stats
    const avgObservationsPerLocation = uniqueLocations > 0 ? (filteredData.length / uniqueLocations).toFixed(1) : 0;

    // For Most Active Location: count unique survey days for that location
    let mostActiveLocationDays = 0;
    let avgBirdsSeenPerDay = 0;
    if (mostActiveLocation.location) {
      // Map of date -> total birds (all activities) on that date at this location
      const birdsByDay = {};
      filteredData.forEach(item => {
        if (item.Location === mostActiveLocation.location && item.Date) {
          let count = item["Number of Birds"];
          if (typeof count === 'string') count = count.trim();
          const parsed = parseInt(count, 10);
          if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
            if (!birdsByDay[item.Date]) birdsByDay[item.Date] = 0;
            birdsByDay[item.Date] += parsed;
          }
        }
      });
      const dailySums = Object.values(birdsByDay);
      mostActiveLocationDays = Object.keys(birdsByDay).length;
      avgBirdsSeenPerDay = dailySums.length > 0 ? (dailySums.reduce((a, b) => a + b, 0) / dailySums.length).toFixed(1) : 0;
    }

    return (
      <div className="overview-tab">
          <div className="section-header">
            <h2>📊 Key Statistics Overview</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0.5rem 0 0 0' }}>
              Click on any card to see detailed breakdown and insights
            </p>
            <button 
              className="view-all-btn"
              onClick={this.toggleShowAllStats}
            >
              {showAllStats ? (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                  </svg>
                  Show Less
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M7.41,15.41L12,10.83L16.59,15.41L18,14L12,8L6,14L7.41,15.41Z"/>
                  </svg>
                  View All
                </>
              )}
            </button>
          </div>

          <div className="stats-grid compact-stats">
            {/* Survey Overview Card - Always visible */}
            <div 
              className={`stat-card compact ${expandedCards.overview ? 'expanded' : ''}`} 
              onClick={() => this.toggleCardExpanded('overview')} 
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-content">
                <div className="stat-header">
                  <h3>Survey Overview</h3>
                </div>
                <div className="stat-value">{filteredData.length} Observations</div>
                {!expandedCards.overview && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                    {successRate}% success rate • {uniqueLocations} locations • {uniqueDates} survey days
                  </p>
                )}
                {expandedCards.overview && (
                  <>
                    <div className="stat-breakdown">
                      <span className="breakdown-item seen">
                        ✓ Detected: {filteredData.filter(item => item["Seen/Heard"] !== "Not found").length} ({successRate}%)
                      </span>
                      <span className="breakdown-item not-found">
                        ✗ Not Found: {filteredData.filter(item => item["Seen/Heard"] === "Not found").length}
                      </span>
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-primary)' }}>Survey Period</h4>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}><strong>From:</strong> {earliestDate}</p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}><strong>To:</strong> {latestDate}</p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}><strong>Total Days:</strong> {uniqueDates} days</p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}><strong>Avg/Day:</strong> {uniqueDates > 0 ? (filteredData.length / uniqueDates).toFixed(1) : 0} observations</p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bird Count Card - Always visible */}
            <div 
              className={`stat-card compact ${expandedCards.birds ? 'expanded' : ''}`} 
              onClick={() => this.toggleCardExpanded('birds')} 
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-content">
                <div className="stat-header">
                  <h3>Total Birds Counted</h3>
                </div>
                <div className="stat-value">{totalBirds}</div>
                {!expandedCards.birds && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                    Avg: {filteredData.length > 0 ? (totalBirds / filteredData.length).toFixed(1) : 0} per observation
                  </p>
                )}
                {expandedCards.birds && (
                  <>
                    <p>Average per observation: {filteredData.length > 0 ? (totalBirds / filteredData.length).toFixed(1) : 0}</p>
                    <div className="stat-breakdown">
                      <span className="breakdown-item seen">
                        Seen: {totalSeenBirds} ({totalBirds > 0 ? Math.round((totalSeenBirds / totalBirds) * 100) : 0}%)
                      </span>
                      <span className="breakdown-item heard">
                        Heard Only: {totalHeardBirds} ({totalBirds > 0 ? Math.round((totalHeardBirds / totalBirds) * 100) : 0}%)
                      </span>
                      {totalNotFoundBirds > 0 && (
                        <span className="breakdown-item not-found">
                          Not Found: {totalNotFoundBirds}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Detection Analysis</h4>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                        <strong>Visual Detection Rate:</strong> {totalBirds > 0 ? Math.round((totalSeenBirds / totalBirds) * 100) : 0}%
                      </p>
                      <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                        <strong>Audio-Only Detection Rate:</strong> {totalBirds > 0 ? Math.round((totalHeardBirds / totalBirds) * 100) : 0}%
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Location Coverage Card - Always visible */}
            <div 
              className={`stat-card compact ${expandedCards.locations ? 'expanded' : ''}`} 
              onClick={() => this.toggleCardExpanded('locations')} 
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-content">
                <div className="stat-header">
                  <h3>Location Coverage</h3>
                </div>
                <div className="stat-value">{uniqueLocations}</div>
                {!expandedCards.locations && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                    {successfulLocations} with detections
                  </p>
                )}
                {expandedCards.locations && (
                  <>
                    <p>Unique locations surveyed</p>
                    <div className="stat-breakdown">
                      <span className="breakdown-item seen">
                        Successful: {successfulLocations} locations
                      </span>
                    </div>
                    {mostActiveLocation.location && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Most Active Location</h4>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.95rem', fontWeight: 'bold' }}>{mostActiveLocation.location}</p>
                        <ul style={{ margin: 0, padding: '0 0 0 1.2em', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          <li><strong>Unique survey days:</strong> {mostActiveLocationDays}</li>
                          <li><strong>Total observations (records):</strong> {mostActiveLocation.stats.total}</li>
                          <li><strong>Total birds counted:</strong> {
                            (() => {
                              let sum = 0;
                              filteredData.forEach(item => {
                                if (item.Location === mostActiveLocation.location) {
                                  let count = item["Number of Birds"];
                                  if (typeof count === 'string') count = count.trim();
                                  const parsed = parseInt(count, 10);
                                  if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
                                    sum += parsed;
                                  }
                                }
                              });
                              return sum;
                            })()
                          }</li>
                          <li><strong>Average birds per day:</strong> {avgBirdsSeenPerDay}</li>
                        </ul>
                        <div style={{ marginTop: '0.7rem', fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                          <strong>Birds by activity:</strong>
                          <ul style={{ margin: 0, padding: '0 0 0 1.2em' }}>
                            <li>Seen: {
                              (() => {
                                let sum = 0;
                                filteredData.forEach(item => {
                                  if (item.Location === mostActiveLocation.location && item["Seen/Heard"] === "Seen") {
                                    let count = item["Number of Birds"];
                                    if (typeof count === 'string') count = count.trim();
                                    const parsed = parseInt(count, 10);
                                    if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
                                      sum += parsed;
                                    }
                                  }
                                });
                                return sum;
                              })()
                            }</li>
                            <li>Heard: {
                              (() => {
                                let sum = 0;
                                filteredData.forEach(item => {
                                  if (item.Location === mostActiveLocation.location && item["Seen/Heard"] === "Heard") {
                                    let count = item["Number of Birds"];
                                    if (typeof count === 'string') count = count.trim();
                                    const parsed = parseInt(count, 10);
                                    if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
                                      sum += parsed;
                                    }
                                  }
                                });
                                return sum;
                              })()
                            }</li>
                            <li>Not found: {
                              (() => {
                                let sum = 0;
                                filteredData.forEach(item => {
                                  if (item.Location === mostActiveLocation.location && item["Seen/Heard"] === "Not found") {
                                    let count = item["Number of Birds"];
                                    if (typeof count === 'string') count = count.trim();
                                    const parsed = parseInt(count, 10);
                                    if (!isNaN(parsed) && isFinite(parsed) && parsed > 0 && parsed < 1000) {
                                      sum += parsed;
                                    }
                                  }
                                });
                                return sum;
                              })()
                            }</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Additional Cards - Only show when expanded */}
            {showAllStats && (
              <>
                {/* Data Quality Card */}
                <div 
                  className={`stat-card compact ${expandedCards.quality ? 'expanded' : ''}`} 
                  onClick={() => this.toggleCardExpanded('quality')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-content">
                    <div className="stat-header">
                      <h3>Data Quality</h3>
                      <button
                        className="toggle-percent-btn"
                        style={{ marginLeft: 8, fontSize: '0.8rem', padding: '2px 8px', borderRadius: 4, border: '1px solid #ccc', background: '#f7f7f7', cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); this.toggleDataQualityPercent(); }}
                      >
                        {showDataQualityPercent ? 'Show Number' : 'Show %'}
                      </button>
                    </div>
                    <div className="stat-value">
                      {showDataQualityPercent
                        ? `${dataQualityPercent}%`
                        : `${validBirdCountRecords.length}`}
                    </div>
                    {!expandedCards.quality && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Records with valid bird count {showDataQualityPercent ? `(${dataQualityPercent}%)` : `(${validBirdCountRecords.length})`}
                      </p>
                    )}
                    {expandedCards.quality && (
                      <>
                        <p>Records with valid bird count</p>
                        <div className="stat-breakdown">
                          <span className="breakdown-item seen">
                            Valid bird count: {showDataQualityPercent ? `${dataQualityPercent}%` : validBirdCountRecords.length}
                          </span>
                          <span className="breakdown-item not-found">
                            Invalid bird count: {showDataQualityPercent ? `${safeFilteredData.length > 0 ? 100 - dataQualityPercent : 0}%` : safeFilteredData.length - validBirdCountRecords.length}
                          </span>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Data Completeness</h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Valid Bird Count:</strong> {showDataQualityPercent ? `${dataQualityPercent}%` : validBirdCountRecords.length}
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Invalid Bird Count:</strong> {showDataQualityPercent ? `${safeFilteredData.length > 0 ? 100 - dataQualityPercent : 0}%` : safeFilteredData.length - validBirdCountRecords.length}
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Total Records:</strong> {safeFilteredData.length}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Activity Distribution Card with tabs for Behavior and Type */}
                <div 
                  className={`stat-card compact ${expandedCards.activities ? 'expanded' : ''}`} 
                  onClick={() => this.toggleCardExpanded('activities')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-content">
                    <div className="stat-header">
                      <h3>Activity Types</h3>
                    </div>
                    {/* Tab state */}
                    <div style={{ display: 'flex', gap: '1rem', margin: '0.5rem 0' }}>
                      <button
                        className={`activity-tab-btn${this.state.activityTab === 'behavior' ? ' active' : ''}`}
                        style={{ padding: '0.3rem 1rem', border: 'none', background: this.state.activityTab === 'behavior' ? '#e0e0e0' : '#f7f7f7', borderRadius: 4, cursor: 'pointer', fontWeight: this.state.activityTab === 'behavior' ? 'bold' : 'normal' }}
                        onClick={e => { e.stopPropagation(); this.setState({ activityTab: 'behavior' }); }}
                      >Behavior</button>
                      <button
                        className={`activity-tab-btn${this.state.activityTab === 'type' ? ' active' : ''}`}
                        style={{ padding: '0.3rem 1rem', border: 'none', background: this.state.activityTab === 'type' ? '#e0e0e0' : '#f7f7f7', borderRadius: 4, cursor: 'pointer', fontWeight: this.state.activityTab === 'type' ? 'bold' : 'normal' }}
                        onClick={e => { e.stopPropagation(); this.setState({ activityTab: 'type' }); }}
                      >Type</button>
                    </div>
                    <div className="stat-value">
                      {this.state.activityTab === 'behavior'
                        ? Object.values(behaviorStats).reduce((a, b) => a + b, 0)
                        : Object.keys(behaviorStats).length}
                    </div>
                    {!expandedCards.activities && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        {this.state.activityTab === 'behavior' ? 'Different behaviors recorded' : 'Different types recorded'}
                      </p>
                    )}
                    {expandedCards.activities && (
                      <>
                        <p>{this.state.activityTab === 'behavior' ? 'Different behaviors recorded' : 'Different types recorded'}</p>
                        <div className="stat-breakdown">
                          {this.state.activityTab === 'behavior'
                            ? (() => {
                                const colorClasses = ['primary', 'secondary', 'tertiary', 'info', 'warning', 'danger', 'success', 'neutral'];
                                const entries = Object.entries(behaviorStats);
                                if (entries.length === 0) {
                                  return <span className="breakdown-item neutral">No behaviors recorded</span>;
                                }
                                return entries.map(([label, count], index) => {
                                  const colorClass = colorClasses[index % colorClasses.length];
                                  return (
                                    <span key={index} className={`breakdown-item ${colorClass}`}>
                                      {label}: {count} observations
                                    </span>
                                  );
                                });
                              })()
                            : (() => {
                                // Filter out empty string keys and normalize display
                                const entries = Object.entries(behaviorStats).filter(([label]) => label.trim() !== '');
                                const colorClasses = ['primary', 'secondary', 'tertiary', 'info', 'warning', 'danger', 'success', 'neutral'];
                                if (entries.length === 0) {
                                  return <span className="breakdown-item neutral">No types recorded</span>;
                                }
                                return entries.map(([label], index) => {
                                  const colorClass = colorClasses[index % colorClasses.length];
                                  return (
                                    <span key={index} className={`breakdown-item ${colorClass}`}>
                                      {label.trim()}
                                    </span>
                                  );
                                });
                              })()}
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Activity Breakdown</h4>
                          {this.state.activityTab === 'behavior'
                            ? (() => {
                                const totalBehaviors = Object.values(behaviorStats).reduce((a, b) => a + b, 0);
                                return Object.entries(behaviorStats).map(([label, count], index) => (
                                  <p key={index} style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                                    <strong>{label}:</strong> {count} ({totalBehaviors > 0 ? Math.round((count / totalBehaviors) * 100) : 0}%)
                                  </p>
                                ));
                              })()
                            : (() => {
                                const totalBehaviors = Object.values(behaviorStats).reduce((a, b) => a + b, 0);
                                return Object.entries(behaviorStats).map(([label, count], index) => (
                                  <p key={index} style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                                    <strong>{index+1}:{label}</strong>
                                  </p>
                                ));
                              })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Survey Efficiency Card - Hidden as requested */}
                {/*
                <div 
                  className={`stat-card compact ${expandedCards.efficiency ? 'expanded' : ''}`} 
                  onClick={() => this.toggleCardExpanded('efficiency')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-content">
                    <div className="stat-header">
                      <h3>Survey Efficiency</h3>
                    </div>
                    <div className="stat-value">
                      {filteredData.length > 0 ? 
                        Math.round(((filteredData.filter(item => item["Seen/Heard"] === "Seen").length) / filteredData.length) * 100) : 0}%
                    </div>
                    {!expandedCards.efficiency && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Visual detection rate
                      </p>
                    )}
                    {expandedCards.efficiency && (
                      <>
                        <p>Visual detection rate</p>
                        <div className="stat-breakdown">
                          <span className="breakdown-item seen">
                            Direct sighting: {Math.round(((filteredData.filter(item => item["Seen/Heard"] === "Seen").length) / filteredData.length) * 100)}%
                          </span>
                          <span className="breakdown-item heard">
                            Audio only: {Math.round(((filteredData.filter(item => item["Seen/Heard"] === "Heard").length) / filteredData.length) * 100)}%
                          </span>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Detection Methods</h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Visual:</strong> {filteredData.filter(item => item["Seen/Heard"] === "Seen").length} observations ({visualDetectionRate}%)
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Audio:</strong> {filteredData.filter(item => item["Seen/Heard"] === "Heard").length} observations
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Success Rate:</strong> {successRate}% overall detection
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                */}

                {/* Best Location Performance Card - Hidden as requested */}
                {/*
                <div 
                  className={`stat-card compact ${expandedCards.performance ? 'expanded' : ''}`} 
                  onClick={() => this.toggleCardExpanded('performance')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-content">
                    <div className="stat-header">
                      <h3>Best Performance</h3>
                    </div>
                    <div className="stat-value">
                      {bestPerformingLocation.location ? 
                        Math.round(((bestPerformingLocation.stats.seen + bestPerformingLocation.stats.heard) / bestPerformingLocation.stats.total) * 100) : 0}%
                    </div>
                    {!expandedCards.performance && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        {bestPerformingLocation.location ? `${bestPerformingLocation.location} success rate` : 'No data available'}
                      </p>
                    )}
                    {expandedCards.performance && bestPerformingLocation.location && (
                      <>
                        <p>Best performing location success rate</p>
                        <div className="stat-breakdown">
                          <span className="breakdown-item info">
                            Location: {bestPerformingLocation.location}
                          </span>
                          <span className="breakdown-item secondary">
                            Total visits: {bestPerformingLocation.stats.total}
                          </span>
                          <span className="breakdown-item primary">
                            Successful: {bestPerformingLocation.stats.seen + bestPerformingLocation.stats.heard}
                          </span>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Performance Details</h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Seen:</strong> {bestPerformingLocation.stats.seen} times
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Heard:</strong> {bestPerformingLocation.stats.heard} times
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Not Found:</strong> {bestPerformingLocation.stats.notFound} times
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                */}

                {/* Time Analysis Card */}
                <div 
                  className={`stat-card compact ${expandedCards.timeAnalysis ? 'expanded' : ''}`} 
                  onClick={() => this.toggleCardExpanded('timeAnalysis')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-content">
                    <div className="stat-header">
                      <h3>Date Analysis</h3>
                    </div>
                    <div className="stat-value">{uniqueDates}</div>
                    {!expandedCards.timeAnalysis && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Survey days
                      </p>
                    )}
                    {expandedCards.timeAnalysis && (
                      <>
                        <p>Total survey days</p>
                        <div className="stat-breakdown">
                          <span className="breakdown-item primary">
                            Start: {earliestDate}
                          </span>
                          <span className="breakdown-item secondary">
                            End: {latestDate}
                          </span>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Survey Intensity</h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Most active day:</strong> {(() => {
                              const dateCounts = {};
                              filteredData.forEach(item => {
                                if (item.Date) {
                                  dateCounts[item.Date] = (dateCounts[item.Date] || 0) + 1;
                                }
                              });
                              const maxDate = Object.entries(dateCounts).reduce((max, [date, count]) => 
                                count > (max[1] || 0) ? [date, count] : max, ['', 0]
                              );
                              return maxDate[0] ? `${formatDateToDDMMYYYY(new Date(maxDate[0]))} (${maxDate[1]} observations)` : 'N/A';
                            })()}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
      </div>
    );
  }
}

export default OverviewTab;
