import React, { Component } from 'react';
import ObservationMarker from './components/Map/ObservationMarker';
import { MapContainer, TileLayer, ZoomControl, Popup, useMapEvent } from 'react-leaflet';
import ObservationPopup from './ObservationPopup';
import 'leaflet/dist/leaflet.css';

// Fix for default markers issue in React Leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Functional component to listen for zoom events
function MapZoomListener({ onZoomLevelChange }) {
  useMapEvent('zoomend', (e) => {
    const map = e.target;
    const newZoom = map.getZoom();
    console.log('Zoom level changed:', newZoom);
    if (onZoomLevelChange) {
      onZoomLevelChange(newZoom);
    }
  });
  return null;
}

class Map extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.state = {
      mapStyle: 'hybrid',
      minZoom: 11,
      selectedObs: null, // Add selected observation for map-level popup
    };
    // Create a stable key that doesn't change unnecessarily
    this.lastDataHash = null;
  }

  // Generate a hash of the data to detect real changes
  generateDataHash = (data) => {
    if (!data || !Array.isArray(data)) return 'empty';
    return data.map(obs => 
      obs ? `${obs.Lat}:${obs.Long}:${obs["Seen/Heard"]}:${obs._id || obs.Location}` : 'null'
    ).join('|');
  };

  // Placeholder for map type change, if implemented in the future
  handleMapTypeChange = (newType) => {
    this.setState({ mapStyle: newType });
    if (this.props.onMapTypeChange) {
      this.props.onMapTypeChange(newType);
    }
  };

  handleMarkerClick = (obs) => {
    this.setState({ selectedObs: obs });
  };

  handlePopupClose = () => {
    this.setState({ selectedObs: null });
  };

  render() {
    const { height = '100%', data, zoom = 13 } = this.props;
    const { minZoom, selectedObs } = this.state;

    console.log('Map render - data:', data);
    console.log('Map render - zoom:', zoom);

    // Generate stable key based on data content, not just length
    const dataHash = this.generateDataHash(data);
    const hasDataChanged = this.lastDataHash !== dataHash;
    if (hasDataChanged) {
      this.lastDataHash = dataHash;
    }

    return (
      <div style={{ height, width: '100%', position: 'relative' }}>
        <MapContainer
          center={[1.352083, 103.819836]}
          zoom={zoom}
          minZoom={minZoom}
          maxZoom={18}
          maxBounds={[[1.1304753, 103.6920359], [1.5504753, 104.0120359]]}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
          doubleClickZoom={false}
          whenCreated={(map) => {
            this.mapRef.current = map;
          }}
        >
          <MapZoomListener onZoomLevelChange={this.props.onZoomLevelChange} />
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution="&copy; Google"
          />
          {data && data.length > 0 && (
            <ObservationMarker
              key={`markers-${dataHash}`}
              data={data}
              onMarkerClick={this.handleMarkerClick}
            />
          )}
          {selectedObs && (
            <Popup
              position={[selectedObs.Lat, selectedObs.Long]}
              onClose={this.handlePopupClose}
              className="observation-popup"
            >
              <ObservationPopup obs={selectedObs} />
            </Popup>
          )}
          <ZoomControl position="topright" />
        </MapContainer>
      </div>
    );
  }
}

export default Map;