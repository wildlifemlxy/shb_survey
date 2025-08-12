import React, { Component, createRef } from 'react';
import ObservationMarkerCluster from './ObservationMarkerCluster';
import ObservationSingleMarker from './ObservationSingleMarker';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../../../css/components/Map/MapNoBlue.css';

class ObservationMarker extends Component {
  constructor(props) {
    super(props);
    this.seenIcon = null;
    this.heardIcon = null;
    this.notFoundIcon = null;
  }

  // Create icons only once to prevent re-creation causing blinking
  getIcons = () => {
    if (!this.seenIcon) {
      this.seenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    }
    
    if (!this.heardIcon) {
      this.heardIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    }
    
    if (!this.notFoundIcon) {
      this.notFoundIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    }
    
    return {
      seenIcon: this.seenIcon,
      heardIcon: this.heardIcon,
      notFoundIcon: this.notFoundIcon
    };
  }

  // Prevent unnecessary re-renders that cause blinking - optimized version
  shouldComponentUpdate(nextProps) {
    // Only update if data actually changed (deep comparison of relevant fields)
    if (!this.props.data && !nextProps.data) return false;
    if (!this.props.data || !nextProps.data) return true;
    if (this.props.data.length !== nextProps.data.length) return true;
    
    // Create a stable hash of the data to detect real changes
    const currentHash = this.props.data.map(obs => 
      obs ? `${obs.Lat},${obs.Long},${obs["Seen/Heard"]},${obs._id || obs.Location}` : 'null'
    ).join('|');
    
    const nextHash = nextProps.data.map(obs => 
      obs ? `${obs.Lat},${obs.Long},${obs["Seen/Heard"]},${obs._id || obs.Location}` : 'null'
    ).join('|');
    
    const shouldUpdate = currentHash !== nextHash;
    if (shouldUpdate) {
      console.log('ObservationMarker: Data changed, allowing re-render');
    }
    return shouldUpdate;
  }

  render() {
    const { seenIcon, heardIcon, notFoundIcon } = this.getIcons();

    const data = this.props.data || [];
    // Convert Lat/Long to numbers and filter out invalid ones with stable processing
    const validMarkers = data
      .map(obs => {
        if (!obs) return null;
        const lat = Number(obs.Lat);
        const lng = Number(obs.Long);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { ...obs, Lat: lat, Long: lng };
      })
      .filter(obs => obs && !isNaN(obs.Lat) && !isNaN(obs.Long));
    
    console.log('ObservationMarker render - Valid Markers count:', validMarkers.length);
    
    if (validMarkers.length === 0) {
      return null;
    }

    // Use a stable key for the wrapper to prevent unnecessary component updates
    const wrapperKey = `wrapper-${validMarkers.length}`;

    return (
      <div key={wrapperKey} style={{ display: 'contents' }}>
        {validMarkers.length === 1 ? (
          <ObservationSingleMarker
            marker={validMarkers[0]}
            seenIcon={seenIcon}
            heardIcon={heardIcon}
            notFoundIcon={notFoundIcon}
            onMarkerClick={this.props.onMarkerClick} // Pass click handler if needed
          />
        ) : (
          <ObservationMarkerCluster
            markers={validMarkers}
            seenIcon={seenIcon}
            heardIcon={heardIcon}
            notFoundIcon={notFoundIcon}
            onMarkerClick={this.props.onMarkerClick} // Pass click handler if needed
          />
        )}
      </div>
    );
  }
}

export default ObservationMarker;
