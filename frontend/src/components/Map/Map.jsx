import React, { Component } from 'react';
import ObservationMarker from './components/Map/ObservationMarker';
import { MapContainer, TileLayer, ZoomControl, Popup, useMapEvent } from 'react-leaflet';
import ObservationPopup from './ObservationPopup';

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
  }

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
    const { height = '100%', data, zoom } = this.props;
    const { minZoom, selectedObs } = this.state;

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
        >
          <MapZoomListener onZoomLevelChange={this.props.onZoomLevelChange} />
          <TileLayer
            url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          />
          <ObservationMarker
            data={data}
            onMarkerClick={this.handleMarkerClick}
          />
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