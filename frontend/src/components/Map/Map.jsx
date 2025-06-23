import React, { Component } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons for Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

class Map extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.state = {
      mapStyle: 'hybrid',
      currentZoom: 13,
      useHybridMode: true,
      mapError: false,
      showIndividualMarkers: false, // Only show after heatmap click
    };
  }

  componentDidMount() {
    // Force map to resize properly after mounting
    setTimeout(() => {
      const mapInstance = this.state.useHybridMode ? window.hybridMap : window.map;
      if (mapInstance && mapInstance.invalidateSize) {
        mapInstance.invalidateSize();
      }
    }, 100);
  }

  render() {
    const { height = '100%' } = this.props;
    const { mapStyle, currentZoom, useHybridMode, mapError, showIndividualMarkers } = this.state;
    
    // Only show map
    return (
      <div style={{ height, width: '100%', position: 'relative' }}>
        <MapContainer
          center={[1.3521, 103.8198]}
          zoom={13}
          minZoom={11}
          maxBounds={[[1.15, 103.5], [1.50, 104.1]]}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
            attribution="&copy; Google Maps Hybrid"
          />
          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>
    );
  }
}

export default Map;