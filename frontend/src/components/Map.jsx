import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      windowWidth: window.innerWidth
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  handleResize = () => {
    this.setState({ windowWidth: window.innerWidth });
  };

  render() {
    const { data } = this.props;
    const singaporeCenter = [1.3521, 103.8198];

    return (
      <div className="map-container">
        <MapContainer 
          center={singaporeCenter} 
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          minZoom={11}
          zoomControl={false}           // Hides the + / − buttons
          attributionControl={false}   // Hides the bottom-right attribution text
          dragging={true}              // Keeps dragging enabled
          scrollWheelZoom={true}       // Allows zooming with scroll (optional)
          doubleClickZoom={true}       // Allows zooming with double click (optional)
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />

          {/* Directly map data to markers without clustering */}
          {data.map((observation, index) => (
            observation.Lat && observation.Long ? (
              <Marker 
                key={index} 
                position={[observation.Lat, observation.Long]}
              >
                <Popup>
                  <div className="map-popup">
                    <h3>{observation.Location}</h3>
                    <p><strong>Observer:</strong> {observation['Observer name']}</p>
                    <p><strong>Bird ID:</strong> {observation['SHB individual ID (e.g. SHB1)']}</p>
                    <p><strong>Date:</strong> {observation.formattedDate}</p>
                    <p><strong>Activity:</strong> {observation["Activity (foraging, preening, calling, perching, others)"]}</p>
                  </div>
                </Popup>
              </Marker>
            ) : null
          ))}
          
          {/* Add zoom control in a better position for mobile */}
          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>
    );
  }
}

export default Map;
