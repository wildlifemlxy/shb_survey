import React, { Component } from 'react';

class SimpleMap extends Component {
  state = {
    showHeatMap: false,
    showTerrain: true,
    selectedActivity: 'all',
    selectedLocation: null
  };

  getMarkerColor = (activity) => {
    if (!activity || typeof activity !== 'string') return '#DC2626'; // Singapore Red default
    const activityLower = activity.toLowerCase();
    if (activityLower.includes('calling')) return '#059669'; // Green for calling
    if (activityLower.includes('singing')) return '#2563EB'; // Blue for singing
    if (activityLower.includes('perching')) return '#D97706'; // Orange for perching
    if (activityLower.includes('foraging')) return '#7C3AED'; // Purple for foraging
    if (activityLower.includes('preening')) return '#0891B2'; // Cyan for preening
    return '#DC2626'; // Singapore Red default
  };

  formatDate = (dateValue) => {
    if (!dateValue) return 'Unknown date';
    
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1);
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000);
      return date.toLocaleDateString();
    }
    
    return dateValue.toString();
  };

  formatTime = (timeValue) => {
    if (!timeValue) return 'Unknown time';
    
    if (typeof timeValue === 'number' && timeValue < 1) {
      const hours = Math.floor(timeValue * 24);
      const minutes = Math.floor((timeValue * 24 - hours) * 60);
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    return timeValue.toString();
  };

  calculateHeatMap = (data) => {
    const locationMap = {};
    data.forEach(obs => {
      const lat = parseFloat(obs.Lat);
      const lng = parseFloat(obs.Long);
      if (!isNaN(lat) && !isNaN(lng)) {
        const key = `${lat.toFixed(3)}_${lng.toFixed(3)}`;
        locationMap[key] = (locationMap[key] || 0) + 1;
      }
    });
    return locationMap;
  };

  renderMapControls = () => {
    const { showHeatMap, showTerrain, selectedActivity } = this.state;
    
    return (
      <div style={{
        position: 'absolute',
        top: '90px',
        right: '16px',
        zIndex: 10,
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
        border: '1px solid #DC2626'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: '#DC2626' }}>🇸🇬 Map Controls</div>
        
        <div style={{ marginBottom: '8px' }}>
          <button
            onClick={() => this.setState({ showHeatMap: !showHeatMap })}
            style={{
              background: showHeatMap ? '#DC2626' : '#F3F4F6',
              color: showHeatMap ? 'white' : '#374151',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              marginRight: '4px'
            }}
          >
            🔥 Heat Map
          </button>
          
          <button
            onClick={() => this.setState({ showTerrain: !showTerrain })}
            style={{
              background: showTerrain ? '#DC2626' : '#F3F4F6',
              color: showTerrain ? 'white' : '#374151',
              border: 'none',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer'
            }}
          >
            🗻 Terrain
          </button>
        </div>
        
        <div>
          <select
            value={selectedActivity}
            onChange={(e) => this.setState({ selectedActivity: e.target.value })}
            style={{
              fontSize: '11px',
              padding: '4px',
              borderRadius: '4px',
              border: '1px solid #DC2626',
              width: '100%'
            }}
          >
            <option value="all">All Activities</option>
            <option value="calling">Calling</option>
            <option value="singing">Singing</option>
            <option value="perching">Perching</option>
            <option value="foraging">Foraging</option>
            <option value="preening">Preening</option>
          </select>
        </div>
      </div>
    );
  };

  renderLocationCard = (obs, index, isHeatMap = false) => {
    const activity = obs["Activity (foraging, preening, calling, perching, others)"] || 'Unknown';
    const color = this.getMarkerColor(activity);
    const { selectedLocation } = this.state;
    const isSelected = selectedLocation === index;
    
    return (
      <div 
        key={index} 
        style={{
          background: isSelected ? '#FEE2E2' : 'rgba(255, 255, 255, 0.95)',
          borderRadius: '6px',
          padding: '8px',
          fontSize: '11px',
          border: `2px solid ${color}`,
          boxShadow: isSelected ? '0 4px 12px rgba(220, 38, 38, 0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          transform: isSelected ? 'scale(1.02)' : 'scale(1)'
        }}
        onClick={() => this.setState({ selectedLocation: isSelected ? null : index })}
      >
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '4px',
          marginBottom: '4px'
        }}>
          <div style={{
            width: isHeatMap ? '12px' : '8px',
            height: isHeatMap ? '12px' : '8px',
            borderRadius: '50%',
            background: color,
            boxShadow: isHeatMap ? `0 0 8px ${color}` : 'none'
          }}></div>
          <strong style={{ fontSize: '10px', color: '#DC2626' }}>
            {obs.Location || 'Unknown Location'}
          </strong>
        </div>
        <div>📍 {parseFloat(obs.Lat).toFixed(4)}, {parseFloat(obs.Long).toFixed(4)}</div>
        <div>🐦 {activity}</div>
        <div>📅 {this.formatDate(obs.Date)} {this.formatTime(obs.Time)}</div>
        {obs["Observer name"] && (
          <div>👤 {obs["Observer name"]}</div>
        )}
        {isSelected && obs["Number of Birds"] && (
          <div style={{ marginTop: '4px', padding: '4px', background: '#FEE2E2', borderRadius: '4px' }}>
            <strong>Birds:</strong> {obs["Number of Birds"]}
          </div>
        )}
      </div>
    );
  };

  render() {
    const { data = [] } = this.props;
    const { showHeatMap, showTerrain, selectedActivity } = this.state;
    
    // Filter data based on selected activity
    let filteredData = data.filter(obs => {
      const lat = parseFloat(obs.Lat);
      const lng = parseFloat(obs.Long);
      const isValidCoord = !isNaN(lat) && !isNaN(lng);
      
      if (selectedActivity === 'all') return isValidCoord;
      
      const activity = obs["Activity (foraging, preening, calling, perching, others)"] || '';
      return isValidCoord && activity.toLowerCase().includes(selectedActivity);
    });

    const heatMapData = showHeatMap ? this.calculateHeatMap(filteredData) : {};
    
    return (
      <div style={{ 
        width: '100%', 
        height: '500px', 
        background: showTerrain 
          ? 'linear-gradient(135deg, #6B5B95 0%, #88D8B0 20%, #FFEAA7 40%, #81ECEC 60%, #A29BFE 80%, #FD79A8 100%)' 
          : 'linear-gradient(135deg, #FEE2E2 0%, #FECACA 50%, #F3F4F6 100%)',
        position: 'relative',
        borderRadius: '12px',
        overflow: 'hidden',
        border: '3px solid #DC2626'
      }}>
        {/* Singapore Map Header */}
        <div style={{
          position: 'absolute',
          top: '16px',
          left: '16px',
          right: '200px',
          zIndex: 10,
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          borderRadius: '8px',
          padding: '12px 16px',
          boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>🇸🇬</span>
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
              Singapore Conservation Map
            </h4>
          </div>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.9 }}>
            {filteredData.length} observation points • {selectedActivity === 'all' ? 'All activities' : selectedActivity}
            {showHeatMap && ' • Heat map active'}
            {showTerrain && ' • Terrain view'}
          </p>
        </div>

        {this.renderMapControls()}

        {/* Enhanced Legend */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '8px',
          padding: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          fontSize: '11px',
          border: '1px solid #DC2626'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '6px', color: '#DC2626' }}>🇸🇬 Activity Legend:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: '#059669', borderRadius: '50%' }}></div>
              <span>Calling</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: '#2563EB', borderRadius: '50%' }}></div>
              <span>Singing</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: '#D97706', borderRadius: '50%' }}></div>
              <span>Perching</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '8px', height: '8px', background: '#7C3AED', borderRadius: '50%' }}></div>
              <span>Foraging</span>
            </div>
          </div>
        </div>

        {/* Observation Points */}
        <div style={{
          position: 'absolute',
          top: '90px',
          left: '16px',
          right: '16px',
          bottom: '120px',
          background: showHeatMap 
            ? 'radial-gradient(circle, rgba(220, 38, 38, 0.2), rgba(220, 38, 38, 0.05))'
            : 'rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          border: '2px dashed rgba(220, 38, 38, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto'
        }}>
          {filteredData.length > 0 ? (
            <div style={{ width: '100%', padding: '16px' }}>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '8px',
                maxHeight: '280px',
                overflowY: 'auto'
              }}>
                {filteredData.slice(0, 15).map((obs, index) => 
                  this.renderLocationCard(obs, index, showHeatMap)
                )}
              </div>
              {filteredData.length > 15 && (
                <div style={{ 
                  textAlign: 'center', 
                  marginTop: '8px', 
                  fontSize: '10px', 
                  color: '#DC2626',
                  fontWeight: '600',
                  background: 'rgba(255, 255, 255, 0.9)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  border: '1px solid #DC2626'
                }}>
                  🇸🇬 Showing 15 of {filteredData.length} observations
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#DC2626' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#DC2626' }}>Singapore Interactive Map</h3>
              <p style={{ margin: 0, fontSize: '14px', color: '#7B7B7B' }}>
                Ready to display bird observation data
              </p>
              <div style={{ marginTop: '8px', fontSize: '32px' }}>🇸🇬</div>
            </div>
          )}
        </div>

        {/* Singapore Flag Decoration */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          opacity: 0.05,
          fontSize: '300px',
          zIndex: 1,
          pointerEvents: 'none'
        }}>
          🇸🇬
        </div>
      </div>
    );
  }
}

export default SimpleMap;
