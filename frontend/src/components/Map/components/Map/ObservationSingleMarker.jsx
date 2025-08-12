import React, { Component } from 'react';
import { Marker } from 'react-leaflet';

class ObservationSingleMarker extends Component {
  handleMarkerClick = (e) => {
    const { marker, onMarkerClick } = this.props;
    if (onMarkerClick) {
      // Get the pixel position of the marker for popup positioning
      const map = e.target._map;
      const point = map.latLngToContainerPoint(e.latlng);
      
      // Get the map container's offset relative to the viewport
      const mapContainer = map.getContainer();
      const mapRect = mapContainer.getBoundingClientRect();
      
      const position = {
        x: mapRect.left + point.x,
        y: mapRect.top + point.y
      };
      
      console.log('Marker clicked - position:', position, 'point:', point, 'mapRect:', mapRect);
      onMarkerClick(marker, position);
    }
  };

  render() {
    const { marker, seenIcon, heardIcon, notFoundIcon } = this.props;
    
    // Create stable key using multiple fallbacks to prevent re-rendering
    const markerKey = marker._id || 
                     marker.id || 
                     `${marker.Location}-${marker.Lat}-${marker.Long}` ||
                     `${marker.Lat}-${marker.Long}-${marker["Seen/Heard"]}`;
    
    // Normalize the seen/heard value for consistent icon selection
    const seenHeardValue = (marker["Seen/Heard"] || '').toLowerCase().trim();
    
    let selectedIcon = seenIcon; // Default to seen icon
    if (seenHeardValue === 'heard') {
      selectedIcon = heardIcon;
    } else if (seenHeardValue === 'not found') {
      selectedIcon = notFoundIcon;
    }
    
    return (
      <Marker
        key={markerKey}
        position={[marker.Lat, marker.Long]}
        icon={selectedIcon}
        eventHandlers={{
          click: this.handleMarkerClick
        }}
      />
    );
  }
}

export default ObservationSingleMarker;