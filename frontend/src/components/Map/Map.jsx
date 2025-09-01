import React, { Component } from 'react';
import ObservationMarker from './components/Map/ObservationMarker';
import { MapContainer, TileLayer, ZoomControl, useMapEvent } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { USE_GOOGLE_MAPS, GOOGLE_MAPS_API_KEY } from '../../config/mapConfig';
import googleMapsService from '../../services/googleMapsService';

// Fix for default markers issue in React Leaflet
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Functional component to listen for zoom events and map clicks
function MapZoomListener({ onZoomLevelChange, onMapClick, closeObservationPopup }) {
  useMapEvent('zoomend', (e) => {
    const map = e.target;
    const newZoom = map.getZoom();
    console.log('Zoom level changed:', newZoom);
    if (onZoomLevelChange) {
      onZoomLevelChange(newZoom);
    }
    // Close popup when zoom changes
    if (closeObservationPopup) {
      closeObservationPopup();
    }
  });

  useMapEvent('zoomstart', (e) => {
    // Close popup when zoom starts for immediate feedback
    if (closeObservationPopup) {
      closeObservationPopup();
    }
  });

  useMapEvent('dragstart', (e) => {
    // Close popup when user starts dragging the map
    if (closeObservationPopup) {
      closeObservationPopup();
    }
  });

  useMapEvent('click', (e) => {
    if (onMapClick) {
      onMapClick(e);
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
      tileUrl: null,
    };
    // Create a stable key that doesn't change unnecessarily
    this.lastDataHash = null;
  }

  componentDidMount() {
    // Initialize enhanced tile URL with Google Maps API key
    this.updateTileUrl();
  }

  updateTileUrl = () => {
    const tileUrl = googleMapsService.getEnhancedTileUrl(this.state.mapStyle);
    this.setState({ tileUrl });
  };

  // Generate a hash of the data to detect real changes
  generateDataHash = (data) => {
    if (!data || !Array.isArray(data)) return 'empty';
    return data.map(obs => 
      obs ? `${obs.Lat}:${obs.Long}:${obs["Seen/Heard"]}:${obs._id || obs.Location}` : 'null'
    ).join('|');
  };

  // Prevent unnecessary re-renders that could cause popup blinking
  shouldComponentUpdate(nextProps, nextState) {
    // Check if zoom changed
    if (this.props.zoom !== nextProps.zoom) return true;
    
    // Check if data changed using our hash function
    const currentDataHash = this.generateDataHash(this.props.data);
    const nextDataHash = this.generateDataHash(nextProps.data);
    if (currentDataHash !== nextDataHash) return true;
    
    // Check if state changed
    if (this.state.mapStyle !== nextState.mapStyle || 
        this.state.minZoom !== nextState.minZoom) return true;
    
    // No significant changes, prevent re-render
    return false;
  }

  // Placeholder for map type change, if implemented in the future
  handleMapTypeChange = (newType) => {
    this.setState({ mapStyle: newType }, () => {
      this.updateTileUrl();
    });
    if (this.props.onMapTypeChange) {
      this.props.onMapTypeChange(newType);
    }
  };

  render() {
    const { height = '100%', data, zoom = 13 } = this.props;
    const { minZoom, tileUrl } = this.state;

    console.log('Map render - data:', data);
    console.log('Map render - zoom:', zoom);
    console.log('Map render - Google Maps API enabled:', USE_GOOGLE_MAPS);

    // Generate stable key based on data content, not just length
    const dataHash = this.generateDataHash(data);
    const hasDataChanged = this.lastDataHash !== dataHash;
    if (hasDataChanged) {
      this.lastDataHash = dataHash;
    }

    // Use enhanced tile URL or fallback
    const currentTileUrl = tileUrl || "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}";

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
          <MapZoomListener 
            onZoomLevelChange={this.props.onZoomLevelChange} 
            onMapClick={this.props.closeObservationPopup}
            closeObservationPopup={this.props.closeObservationPopup}
          />
          <TileLayer
            url={currentTileUrl}
            attribution={USE_GOOGLE_MAPS && GOOGLE_MAPS_API_KEY ? 
              "&copy; Google Maps Platform" : 
              "&copy; Google"}
          />
          {data && data.length > 0 && (
            <ObservationMarker
              key={`markers-${dataHash}`}
              data={data}
              onMarkerClick={this.props.openObservationPopup}
            />
          )}
          <ZoomControl position="topright" />
        </MapContainer>
      </div>
    );
  }
}

export default Map;