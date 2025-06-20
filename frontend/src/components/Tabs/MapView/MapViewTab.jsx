import React, { Component } from 'react';
import Map from '../../Map/Map';
import '../../../css/components/Tabs/MapViewTab.css';

class MapViewTab extends Component {
  render() {
    const { data } = this.props;

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
          <div className="single-layer-map">
            <Map data={data} height="100%" />
          </div>
        </div>
      </div>
    );
  }
}

export default MapViewTab;
