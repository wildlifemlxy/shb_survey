import React, { Component } from 'react';
import { getValidCoordinates, getUniqueActivity } from '../../../utils/dataProcessing';
import '../../../css/components/Tabs/OverviewTab.css';

class OverviewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      expandedCards: {},
      showAllStats: false
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

  render() {
    const { data, filteredData } = this.props;
    const { expandedCards, showAllStats } = this.state;

    // Calculate comprehensive statistics
    const totalBirds = filteredData.reduce((sum, obs) => {
      const count = parseInt(obs["Number of Birds"], 10);
      return sum + (isNaN(count) ? 0 : count);
    }, 0);

    const totalSeenBirds = filteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Seen") {
        const count = parseInt(obs["Number of Birds"], 10);
        return sum + (isNaN(count) ? 0 : count);
      }
      return sum;
    }, 0);

    const totalHeardBirds = filteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Heard") {
        const count = parseInt(obs["Number of Birds"], 10);
        return sum + (isNaN(count) ? 0 : count);
      }
      return sum;
    }, 0);

    const totalNotFoundBirds = filteredData.reduce((sum, obs) => {
      if (obs["Seen/Heard"] === "Not found") {
        const count = parseInt(obs["Number of Birds"], 10);
        return sum + (isNaN(count) ? 0 : count);
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
          const [day, month, year] = date.split('/');
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
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

    // Activity analysis
    const activityStats = {};
    filteredData.forEach(item => {
      const activity = item["Activity (foraging, preening, calling, perching, others)"];
      if (activity) {
        activityStats[activity] = (activityStats[activity] || 0) + 1;
      }
    });
    const topActivities = Object.entries(activityStats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);

    return (
      <div className="overview-tab">
        <section className="stats-section light-background">
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
                        Heard: {totalHeardBirds} ({totalBirds > 0 ? Math.round((totalHeardBirds / totalBirds) * 100) : 0}%)
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
                        <strong>Audio Detection Rate:</strong> {totalBirds > 0 ? Math.round((totalHeardBirds / totalBirds) * 100) : 0}%
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
                    {successfulLocations} with detections • {validCoordinates.length} with GPS
                  </p>
                )}
                {expandedCards.locations && (
                  <>
                    <p>Unique locations surveyed</p>
                    <div className="stat-breakdown">
                      <span className="breakdown-item seen">
                        Successful: {successfulLocations} locations
                      </span>
                      <span className="breakdown-item not-found">
                        No Detection: {uniqueLocations - successfulLocations} locations
                      </span>
                      <span className="breakdown-item heard">
                        Valid GPS: {validCoordinates.length} records
                      </span>
                    </div>
                    {mostActiveLocation.location && (
                      <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                        <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Most Active Location</h4>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.8rem', fontWeight: 'bold' }}>{mostActiveLocation.location}</p>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                          {mostActiveLocation.stats.total} observations
                          ({mostActiveLocation.stats.seen} seen, {mostActiveLocation.stats.heard} heard)
                        </p>
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
                    </div>
                    <div className="stat-value">
                      {Math.round(((getValidCoordinates(filteredData).length) / filteredData.length) * 100)}%
                    </div>
                    {!expandedCards.quality && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Records with valid GPS coordinates
                      </p>
                    )}
                    {expandedCards.quality && (
                      <>
                        <p>Records with valid coordinates</p>
                        <div className="stat-breakdown">
                          <span className="breakdown-item seen">
                            Valid GPS: {getValidCoordinates(filteredData).length}
                          </span>
                          <span className="breakdown-item not-found">
                            Missing GPS: {filteredData.length - getValidCoordinates(filteredData).length}
                          </span>
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Data Completeness</h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>GPS Coverage:</strong> {Math.round(((getValidCoordinates(filteredData).length) / filteredData.length) * 100)}%
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                            <strong>Total Records:</strong> {filteredData.length}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Activity Distribution Card */}
                <div 
                  className={`stat-card compact ${expandedCards.activities ? 'expanded' : ''}`} 
                  onClick={() => this.toggleCardExpanded('activities')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-content">
                    <div className="stat-header">
                      <h3>Activity Types</h3>
                    </div>
                    <div className="stat-value">{getUniqueActivity(filteredData).length}</div>
                    {!expandedCards.activities && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 0 0' }}>
                        Different behaviors recorded
                      </p>
                    )}
                    {expandedCards.activities && (
                      <>
                        <p>Different behaviors recorded</p>
                        <div className="stat-breakdown">
                          {topActivities.slice(0, 3).map(([activity, count], index) => {
                            const colorClasses = ['primary', 'secondary', 'tertiary'];
                            return (
                              <span key={index} className={`breakdown-item ${colorClasses[index] || 'primary'}`}>
                                {activity}: {count} observations
                              </span>
                            );
                          })}
                        </div>
                        <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,0,0,0.02)', borderRadius: '8px' }}>
                          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Activity Breakdown</h4>
                          {topActivities.map(([activity, count], index) => (
                            <p key={index} style={{ margin: '0.25rem 0', fontSize: '0.8rem' }}>
                              <strong>{activity}:</strong> {count} ({Math.round((count / filteredData.length) * 100)}%)
                            </p>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Survey Efficiency Card */}
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
                          <span className="breakdown-item not-found">
                            No detection: {Math.round(((filteredData.filter(item => item["Seen/Heard"] === "Not found").length) / filteredData.length) * 100)}%
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

                {/* Best Location Performance Card */}
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

                {/* Time Analysis Card */}
                <div 
                  className={`stat-card compact ${expandedCards.timeAnalysis ? 'expanded' : ''}`} 
                  onClick={() => this.toggleCardExpanded('timeAnalysis')} 
                  style={{ cursor: 'pointer' }}
                >
                  <div className="stat-content">
                    <div className="stat-header">
                      <h3>Time Analysis</h3>
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
                              return maxDate[0] ? `${maxDate[0]} (${maxDate[1]} observations)` : 'N/A';
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
        </section>
      </div>
    );
  }
}

export default OverviewTab;
