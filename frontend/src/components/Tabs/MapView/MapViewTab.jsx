import React, { Component } from 'react';
import Map from '../../Map/Map';
import '../../../css/components/Tabs/MapViewTab.css';

class MapViewTab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      mapType: 'Hybrid',
      zoomLevel: 11,
    };
  }

  handleMapTypeChange = (mapType) => {
    this.setState({ mapType });
  };

  handleZoomLevelChange = (zoomLevel) => {
    console.log('Zoom level changed:', zoomLevel);
    this.setState({ zoomLevel });
  };

  render() {
    const { data } = this.props;
    const { mapType, zoomLevel } = this.state;

    // Compute stats
    const total = Array.isArray(data) ? data.length : 0;
    const seen = Array.isArray(data) ? data.filter(obs => (obs["Seen/Heard"] || '').toLowerCase() === 'seen').length : 0;
    const heard = Array.isArray(data) ? data.filter(obs => (obs["Seen/Heard"] || '').toLowerCase() === 'heard').length : 0;
    const notFound = Array.isArray(data) ? data.filter(obs => (obs["Seen/Heard"] || '').toLowerCase() === 'not found').length : 0;
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
                  <img src="https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png" alt="Not Found" width={18} height={28} />
                  <span>Not Found</span>
                </span>
              </section>
            </div>
          <div className="single-layer-map">
            <Map
              data={data}
              height="100%"
              onMapTypeChange={this.handleMapTypeChange}
              onZoomLevelChange={this.handleZoomLevelChange}
              zoom={zoomLevel}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default MapViewTab;
