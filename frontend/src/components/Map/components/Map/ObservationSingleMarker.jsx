import React, { Component } from 'react';
import { Marker, Popup } from 'react-leaflet';

class ObservationSingleMarker extends Component {
  // Example: Add a method to handle marker click (optional)

  render() {
    const { marker, seenIcon, heardIcon } = this.props;
    return (
      <Marker
        key={marker._id || `${marker.Lat},${marker.Long}`}
        position={[marker.Lat, marker.Long]}
        icon={marker["Seen/Heard"] === "Seen" ? seenIcon : heardIcon}
        eventHandlers={{ click: () => {
          if (this.props.onMarkerClick) {
            this.props.onMarkerClick(marker);
          }
        } }}
      >
      </Marker>
    );
  }
}

export default ObservationSingleMarker;