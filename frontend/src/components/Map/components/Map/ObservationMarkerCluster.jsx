import React, { Component } from 'react';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { Marker } from 'react-leaflet';
import L from 'leaflet';
import './ObservationMarkerCluster.css';

// Custom iconCreateFunction for gradient backgrounds by cluster size
const iconCreateFunction = (cluster) => {
    console.log('Creating cluster icon for:', cluster);
  const count = cluster.getChildCount();
  let className = 'custom-cluster-icon ';
  if (count <= 10) {
    className += 'cluster-range-1';
  } else if (count <= 50) {
    className += 'cluster-range-2';
  } else if (count <= 100) {
    className += 'cluster-range-3';
  } else {
    className += 'cluster-range-4';
  }
  return L.divIcon({
    html: `<div class="custom-cluster-content"><span>${count}</span></div>`,
    className: className,
  });
};

class ObservationMarkerCluster extends Component {
  handleMarkerClick = (marker) => (e) => {
    const { onMarkerClick } = this.props;
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
      
      console.log('Cluster marker clicked - position:', position, 'point:', point, 'mapRect:', mapRect);
      onMarkerClick(marker, position);
    }
  };

  render() {
    const { markers, seenIcon, heardIcon, notFoundIcon } = this.props;
    return (
      <MarkerClusterGroup iconCreateFunction={iconCreateFunction}>
        {markers.map((obs, idx) => {
          // Normalize the seen/heard value for consistent icon selection
          const seenHeardValue = (obs["Seen/Heard"] || '').toLowerCase().trim();
          
          let selectedIcon = seenIcon; // Default to seen icon
          if (seenHeardValue === 'heard') {
            selectedIcon = heardIcon;
          } else if (seenHeardValue === 'not found') {
            selectedIcon = notFoundIcon;
          }
          
          // Create stable key using multiple fallbacks
          const markerKey = obs._id || 
                           obs.id || 
                           `${obs.Location}-${obs.Lat}-${obs.Long}` ||
                           `marker-${idx}-${obs.Lat}-${obs.Long}`;
          
          return (
            <Marker
              key={markerKey}
              position={[obs.Lat, obs.Long]}
              icon={selectedIcon}
              eventHandlers={{
                click: this.handleMarkerClick(obs)
              }}
            />
          );
        })}
      </MarkerClusterGroup>
    );
  }
}

export default ObservationMarkerCluster;
