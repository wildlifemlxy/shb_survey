import React, { Component, createRef } from 'react';
import ObservationMarkerCluster from './ObservationMarkerCluster';
import ObservationSingleMarker from './ObservationSingleMarker';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../../../../css/components/Map/MapNoBlue.css';

class ObservationMarker extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    // Custom marker icons
    const seenIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    const heardIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    const notFoundIcon = new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });


    const data = this.props.data || [];
    // Convert Lat/Long to numbers and filter out invalid ones
    const validMarkers = data
      .map(obs => {
        if (!obs) return null;
        const lat = Number(obs.Lat);
        const lng = Number(obs.Long);
        if (isNaN(lat) || isNaN(lng)) return null;
        return { ...obs, Lat: lat, Long: lng };
      })
      .filter(obs => obs && !isNaN(obs.Lat) && !isNaN(obs.Long));
    console.log('Valid Markers data:', validMarkers);
    if (validMarkers.length === 0) {
      return null;
    }

    return (
      <>
        {validMarkers.length === 1 ? (
          <ObservationSingleMarker
            marker={validMarkers[0]}
            seenIcon={seenIcon}
            heardIcon={heardIcon}
            notFoundIcon={notFoundIcon}
            onMarkerClick={this.props.onMarkerClick}
          />
        ) : (
          <ObservationMarkerCluster
            markers={validMarkers}
            seenIcon={seenIcon}
            heardIcon={heardIcon}
            notFoundIcon={notFoundIcon}
            onMarkerClick={this.props.onMarkerClick}
          />
        )}
      </>
    );
  }
}

export default ObservationMarker;
