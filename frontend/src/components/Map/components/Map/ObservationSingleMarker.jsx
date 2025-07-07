import React, { Component } from 'react';
import { Marker, Popup } from 'react-leaflet';
import ObservationPopup from '../../ObservationPopup';

class ObservationSingleMarker extends Component {
  // Example: Add a method to handle marker click (optional)

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
      >
        <Popup className="observation-popup">
          <ObservationPopup obs={marker} />
        </Popup>
      </Marker>
    );
  }
}

export default ObservationSingleMarker;