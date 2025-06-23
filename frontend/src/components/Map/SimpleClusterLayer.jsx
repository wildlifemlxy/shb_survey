// SimpleClusterLayer.jsx - Clean Google Maps-style clustering for valid coordinates only
import React from 'react';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import { Marker, Popup } from 'react-leaflet';

const SimpleClusterLayer = ({ data = [] }) => {
  // Only valid coordinates
  const validData = data.filter(obs => {
    const lat = parseFloat(obs.Lat);
    const lng = parseFloat(obs.Long);
    return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
  });

  // If there is only one point, show a single marker
  if (validData.length === 1) {
    const obs = validData[0];
    return (
      <Marker position={[parseFloat(obs.Lat), parseFloat(obs.Long)]}>
        <Popup>
          <div style={{ minWidth: 180 }}>
            <div><strong>ID:</strong> {obs["SHB individual ID (e.g. SHB1)"] || 'Unknown'}</div>
            <div><strong>Location:</strong> {obs.Location || 'Unknown'}</div>
            <div><strong>Date:</strong> {obs.Date || 'Unknown'}</div>
            <div><strong>Time:</strong> {obs.Time || 'Unknown'}</div>
          </div>
        </Popup>
      </Marker>
    );
  }

  // If more than one, show only clusters (no individual markers outside clusters)
  if (validData.length > 1) {
    return (
      <MarkerClusterGroup
        showCoverageOnHover={false}
        maxClusterRadius={50}
        spiderfyOnMaxZoom={true}
        removeOutsideVisibleBounds={true}
        animate={true}
      >
        {validData.map((obs, idx) => (
          <Marker
            key={idx}
            position={[parseFloat(obs.Lat), parseFloat(obs.Long)]}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div><strong>ID:</strong> {obs["SHB individual ID (e.g. SHB1)"] || 'Unknown'}</div>
                <div><strong>Location:</strong> {obs.Location || 'Unknown'}</div>
                <div><strong>Date:</strong> {obs.Date || 'Unknown'}</div>
                <div><strong>Time:</strong> {obs.Time || 'Unknown'}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    );
  }

  // If no valid data, render nothing
  return null;
};

export default SimpleClusterLayer;
