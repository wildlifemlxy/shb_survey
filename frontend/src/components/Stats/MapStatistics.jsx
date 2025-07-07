import React, { Component } from 'react';
import '../../css/components/Stats/MapStatistics.css';

class MapStatistics extends Component {
  render() {
    const { data, validCoordinates } = this.props;
    
    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <div className="map-statistics-container">
          <div className="section-header">
            <h2>🗺️ Map Statistics</h2>
          </div>
          <div className="no-data-message">
            No data available for map statistics
          </div>
        </div>
      );
    }

    // Calculate map-specific statistics
    const totalObservations = data.length;
    const observationsWithCoordinates = validCoordinates ? validCoordinates.length : 0;
    const coordinatesCoverage = totalObservations > 0 ? (observationsWithCoordinates / totalObservations) * 100 : 0;
    
    // Calculate observation types
    const seenCount = data.filter(obs => obs["Seen/Heard"] === "Seen").length;
    const heardCount = data.filter(obs => obs["Seen/Heard"] === "Heard").length;
    const notFoundCount = data.filter(obs => obs["Seen/Heard"] === "Not found").length;
    
    // Calculate unique locations with valid coordinates
    const locationsWithCoordinates = new Set(
      validCoordinates ? validCoordinates.map(obs => obs.Location) : []
    ).size;
    
    const totalUniqueLocations = new Set(data.map(obs => obs.Location)).size;

    return (
      <div className="map-statistics-container">
        <div className="section-header">
          <h2>🗺️ Map Statistics</h2>
          <p>Geographic distribution and coordinate quality metrics</p>
        </div>
        
        <div className="map-stats-grid">
          {/* Coordinate Coverage Card */}
          <div className="map-stat-card">
            <div className="map-stat-icon coordinate-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,2C15.31,2 18,4.66 18,7.95C18,12.41 12,19 12,19C12,19 6,12.41 6,7.95C6,4.66 8.69,2 12,2M12,6A2,2 0 0,0 10,8A2,2 0 0,0 12,10A2,2 0 0,0 14,8A2,2 0 0,0 12,6M20,19C20,21.21 16.42,23 12,23C7.58,23 4,21.21 4,19C4,17.71 5.22,16.56 7.11,15.94L7.75,16.74C6.67,17.19 6,17.81 6,18.5C6,19.88 8.69,21 12,21C15.31,21 18,19.88 18,18.5C18,17.81 17.33,17.19 16.25,16.74L16.89,15.94C18.78,16.56 20,17.71 20,19Z"/>
              </svg>
            </div>
            <div className="map-stat-content">
              <h3>Coordinate Coverage</h3>
              <div className="map-stat-value">{Math.round(coordinatesCoverage)}%</div>
              <p>Observations with valid GPS coordinates</p>            <div className="map-stat-breakdown">
              <span 
                className="breakdown-item valid-coords"
                title={`Observations with valid GPS coordinates: ${observationsWithCoordinates} out of ${totalObservations}`}
              >
                ✓ Mapped: {observationsWithCoordinates}
              </span>
              <span 
                className="breakdown-item missing-coords"
                title={`Observations missing GPS coordinates: ${totalObservations - observationsWithCoordinates} out of ${totalObservations}`}
              >
                ✗ Missing: {totalObservations - observationsWithCoordinates}
              </span>
            </div>
            </div>
          </div>

          {/* Geographic Spread Card */}
          <div className="map-stat-card">
            <div className="map-stat-icon location-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5M12,2A7,7 0 0,1 19,9C19,14.25 12,22 12,22C12,22 5,14.25 5,9A7,7 0 0,1 12,2M12,4A5,5 0 0,0 7,9C7,10 7,12 12,18.71C17,12 17,10 17,9A5,5 0 0,0 12,4Z"/>
              </svg>
            </div>
            <div className="map-stat-content">
              <h3>Geographic Spread</h3>
              <div className="map-stat-value">{locationsWithCoordinates}</div>
              <p>Locations with mappable data</p>
              <div className="map-stat-breakdown">
                <span className="breakdown-item total-locations">
                  Total Locations: {totalUniqueLocations}
                </span>
                <span className="breakdown-item mapping-rate">
                  Mapping Rate: {totalUniqueLocations > 0 ? Math.round((locationsWithCoordinates / totalUniqueLocations) * 100) : 0}%
                </span>
              </div>
            </div>
          </div>

          {/* Observation Distribution Card */}
          <div className="map-stat-card">
            <div className="map-stat-icon distribution-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17,9H7V7H17M17,13H7V11H17M14,17H7V15H14M12,3A1,1 0 0,1 13,4A1,1 0 0,1 12,5A1,1 0 0,1 11,4A1,1 0 0,1 12,3M19,3H14.82C14.4,1.84 13.3,1 12,1C10.7,1 9.6,1.84 9.18,3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3Z"/>
              </svg>
            </div>
            <div className="map-stat-content">
              <h3>Observation Types</h3>
              <div className="map-stat-value">{totalObservations}</div>
              <p>Total mapped observations</p>
              <div className="map-stat-breakdown">
                <span 
                  className="breakdown-item seen"
                  title={`Seen observations: ${seenCount} out of ${totalObservations} (${totalObservations > 0 ? Math.round((seenCount / totalObservations) * 100) : 0}%)`}
                >
                  👁️ Seen: {seenCount}
                </span>
                <span 
                  className="breakdown-item heard"
                  title={`Heard observations: ${heardCount} out of ${totalObservations} (${totalObservations > 0 ? Math.round((heardCount / totalObservations) * 100) : 0}%)`}
                >
                  👂 Heard: {heardCount}
                </span>
                <span 
                  className="breakdown-item not-found"
                  title={`Not found observations: ${notFoundCount} out of ${totalObservations} (${totalObservations > 0 ? Math.round((notFoundCount / totalObservations) * 100) : 0}%)`}
                >
                  ❌ Not Found: {notFoundCount}
                </span>
              </div>
            </div>
          </div>

          {/* Data Quality Indicator Card */}
          <div className="map-stat-card">
            <div className="map-stat-icon quality-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M9,20.42L2.79,14.21L5.62,11.38L9,14.77L18.88,4.88L21.71,7.71L9,20.42Z"/>
              </svg>
            </div>
            <div className="map-stat-content">
              <h3>Map Data Quality</h3>
              <div className="map-stat-value">
                {coordinatesCoverage >= 80 ? 'Excellent' : 
                 coordinatesCoverage >= 60 ? 'Good' : 
                 coordinatesCoverage >= 40 ? 'Fair' : 'Poor'}
              </div>
              <p>Based on coordinate completeness</p>
              <div className="map-stat-breakdown">
                <span className={`breakdown-item ${coordinatesCoverage >= 80 ? 'excellent' : coordinatesCoverage >= 60 ? 'good' : coordinatesCoverage >= 40 ? 'fair' : 'poor'}`}>
                  Quality Score: {Math.round(coordinatesCoverage)}%
                </span>
                <span className="breakdown-item info">
                  {coordinatesCoverage >= 80 ? '🎯 Ready for analysis' : 
                   coordinatesCoverage >= 60 ? '✅ Mostly complete' : 
                   coordinatesCoverage >= 40 ? '⚠️ Needs improvement' : '🔴 Review required'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default MapStatistics;
