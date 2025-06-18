import React, { Component } from 'react';
import GoogleMap from './GoogleMap';
import SimpleMap from './SimpleMap';
import { USE_GOOGLE_MAPS } from '../config/mapConfig';

class SmartMap extends Component {
  render() {
    const { data = [] } = this.props;
    
    // Use Google Maps if configured and API key is available, otherwise use SimpleMap
    const MapComponent = USE_GOOGLE_MAPS ? GoogleMap : SimpleMap;
    
    return (
      <div className="smart-map-container" style={{ 
        width: '100%', 
        height: '100%',
        border: '2px solid #DC2626',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#F9FAFB'
      }}>
        {/* Singapore Map Header */}
        <div style={{
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          color: 'white',
          padding: '8px 12px',
          fontSize: '0.9rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>🇸🇬 Singapore Conservation Map</span>
          <span style={{ fontSize: '0.8rem', opacity: 0.9 }}>
            {data.length} observations
          </span>
        </div>
        
        {/* Map Component */}
        <div style={{ height: 'calc(100% - 40px)' }}>
          <MapComponent {...this.props} />
        </div>
      </div>
    );
  }
}

export default SmartMap;
