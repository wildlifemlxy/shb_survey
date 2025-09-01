import React, { Component } from 'react';
import GoogleMapComponent from '../../Map/GoogleMapComponent';
import '../../../css/components/Tabs/MapViewTab.css';

class MapViewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mapType: 'Hybrid', // Fixed to hybrid view
      zoomLevel: 11, // Default zoom level matching map configuration
    };
  }

  handleMapTypeChange = (mapType) => {
    // Since we only use hybrid, keep it fixed
    this.setState({ mapType: 'Hybrid' });
  };

  handleZoomLevelChange = (zoomLevel) => {
    console.log('Zoom level changed:', zoomLevel);
    this.setState({ zoomLevel });
  };

  render() {
    const { data } = this.props;
    const { mapType, zoomLevel } = this.state;

    // Compute stats - normalize the seen/heard values for consistent counting
    const total = Array.isArray(data) ? data.length : 0;
    const seen = Array.isArray(data) ? data.filter(obs => {
      const value = (obs["Seen/Heard"] || '').toLowerCase().trim();
      return value === 'seen';
    }).length : 0;
    const heard = Array.isArray(data) ? data.filter(obs => {
      const value = (obs["Seen/Heard"] || '').toLowerCase().trim();
      return value === 'heard';
    }).length : 0;
    const notFound = Array.isArray(data) ? data.filter(obs => {
      const value = (obs["Seen/Heard"] || '').toLowerCase().trim();
      return value === 'not found';
    }).length : 0;
    
    // Debug logging to track legend counts
    console.log('MapViewTab Legend Counts:', { total, seen, heard, notFound });
    if (data && data.length > 0) {
      const sampleValues = data.slice(0, 5).map(obs => obs["Seen/Heard"]);
      console.log('Sample Seen/Heard values:', sampleValues);
    }
    const seenPct = total > 0 ? ((seen / total) * 100).toFixed(1) : '0.0';
    const heardPct = total > 0 ? ((heard / total) * 100).toFixed(1) : '0.0';
    const notFoundPct = total > 0 ? ((notFound / total) * 100).toFixed(1) : '0.0';

    return (
      <div className="map-view-tab">
        <div className="live-map-container">
          <div className="map-header">
            <h2>🗺️ Live Observation Map</h2>
            <div className="live-indicator">
              <span className="live-dot"></span>
              <span>Real-time Updates</span>
            </div>
            </div>
            {/* Map, Data, and Legend Sections */}
            <div className="map-sections" style={{ display: 'flex', flexDirection: 'row', gap: 32, marginTop: 16, width: '100%', marginBottom: 20, marginLeft: 10, marginRight: 10}}>
              <section className="map-overview" style={{ flex: 1, minWidth: 0, padding: '8px 16px', background: '#f7f7fa', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Map Overview</span>
                <span><strong>Map Type:</strong> {mapType || 'Hybrid'}</span>
                <span><strong>Zoom Level:</strong> {zoomLevel !== undefined ? zoomLevel : '-'}</span>
                {/* Add more map overview info as needed */}
              </section>
              <section className="data-overview" style={{ flex: 1, minWidth: 0, padding: '8px 16px', background: '#f7f7fa', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Data Overview</span>
                <span><strong>Total Observations:</strong> {total}</span>
                <span><strong>Total Seen:</strong> {seen} ({seenPct}%)</span>
                <span><strong>Total Heard:</strong> {heard} ({heardPct}%)</span>
                <span><strong>Not Found:</strong> {notFound} ({notFoundPct}%)</span>
                {/* Add more data stats as needed */}
              </section>
              <section className="map-legend" style={{ flex: 1, minWidth: 0, padding: '8px 16px', background: '#f7f7fa', borderRadius: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Legend</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png" alt="Seen" width={18} height={28} />
                  <span>Seen</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png" alt="Heard" width={18} height={28} />
                  <span>Heard</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png" alt="Not Found" width={18} height={28} />
                  <span>Not Found</span>
                </span>
              </section>
            </div>
          <div className="single-layer-map">
            <GoogleMapComponent
              data={data}
              height="100%"
              onMapTypeChange={this.handleMapTypeChange}
              onZoomLevelChange={this.handleZoomLevelChange}
              zoom={zoomLevel}
              openObservationPopup={this.props.openObservationPopup}
              closeObservationPopup={this.props.closeObservationPopup}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default MapViewTab;
