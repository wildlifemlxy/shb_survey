import React, { Component } from 'react';

class MapControls extends Component {
  constructor(props) {
    super(props);
    this.state = {
      currentMapType: 'hybrid'
    };
  }

  handleMapTypeChange = (mapType) => {
    this.setState({ currentMapType: mapType });
    if (this.props.onMapTypeChange) {
      this.props.onMapTypeChange(mapType);
    }
  };

  render() {
    const { currentMapType } = this.state;
    
    const mapTypes = [
      { id: 'hybrid', name: 'Hybrid', icon: '🗺️' },
      { id: 'satellite', name: 'Satellite', icon: '🛰️' },
      { id: 'roadmap', name: 'Roadmap', icon: '🛣️' },
      { id: 'terrain', name: 'Terrain', icon: '🏔️' }
    ];

    return (
      <div className="map-controls" style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ 
          fontSize: '12px', 
          fontWeight: 'bold', 
          color: '#374151', 
          marginBottom: '4px',
          textAlign: 'center'
        }}>
          Map Type
        </div>
        {mapTypes.map(type => (
          <button
            key={type.id}
            onClick={() => this.handleMapTypeChange(type.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              border: 'none',
              borderRadius: '6px',
              background: currentMapType === type.id ? '#3b82f6' : 'transparent',
              color: currentMapType === type.id ? 'white' : '#374151',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              minWidth: '100px',
              justifyContent: 'flex-start'
            }}
            onMouseEnter={(e) => {
              if (currentMapType !== type.id) {
                e.target.style.background = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (currentMapType !== type.id) {
                e.target.style.background = 'transparent';
              }
            }}
          >
            <span>{type.icon}</span>
            <span>{type.name}</span>
          </button>
        ))}
      </div>
    );
  }
}

export default MapControls;
