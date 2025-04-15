import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';  // You need to import Leaflet to create custom icons

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
    const createClusterCustomIcon = (cluster) => {
      const count = cluster.getChildCount();
      let size = 'small';
      let gradient = 'radial-gradient(circle, #1B7B6E, #2A9D8F)'; // teal variant
    
      if (count >= 10 && count < 50) {
        size = 'medium';
        gradient = 'radial-gradient(circle, #C46B00, #F4A261)'; // orange variant
      } else if (count >= 50) {
        size = 'large';
        gradient = 'radial-gradient(circle, #9B1D1D, #E76F51)'; // red variant
      }
    
      const sizeMap = {
        small: 30,
        medium: 40,
        large: 50
      };
    
      return new L.DivIcon({
        html: `
          <div 
            style="
              background: ${gradient};
              width: ${sizeMap[size]}px;
              height: ${sizeMap[size]}px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: 600;
              font-size: 0.75rem;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            "
          >
            ${count}
          </div>
        `,
        className: 'custom-cluster-icon',
        iconSize: new L.Point(sizeMap[size], sizeMap[size])
      });
    };    

    const createPinpointIcon = () => {
      return new L.DivIcon({
        html: `
          <div 
            style="
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
              font-size: 30px; /* Increased size of the emoji */
            "
          >
            <span 
              style="
                color: yellow; /* Emoji color */
                font-size: 25px; /* Bigger emoji size */
                font-weight: 900; /* Make it bold */
                text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.5); /* Optional: adds shadow for more thickness */
                transform: rotate(10deg);
              "
            >
              📍
            </span>  
          </div>
        `,
        className: 'custom-pin-icon',
        iconSize: new L.Point(40, 40), // Size of the icon
        iconAnchor: [20, 40], // Anchor the icon properly
        popupAnchor: [0, -40], // Popup location
      });
    };    
    
    return (
      <div className="map-container" style={{ height: '100vh', width: '100%' }}>
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

          {/* MarkerClusterGroup with customized cluster marker */}
          <MarkerClusterGroup iconCreateFunction={createClusterCustomIcon}>
            {data.map((observation, index) => (
              observation.Lat && observation.Long ? (
                 <Marker 
                  key={index} 
                  position={[observation.Lat, observation.Long]}
                  icon={createPinpointIcon()} // Apply custom pinpoint icon
                >
                  <Popup>
                    <div className="map-popup">
                      <h3>{observation.Location}</h3>
                      <p><strong>Observer:</strong> {observation['Observer name']}</p>
                      <p><strong>Bird ID:</strong> {observation['SHB individual ID (e.g. SHB1)']}</p>
                      <p><strong>Date:</strong> {observation.Date}</p>
                      <p><strong>Activity:</strong> {observation["Activity (foraging, preening, calling, perching, others)"]}</p>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MarkerClusterGroup>
        </MapContainer>
      </div>
    );
  }
}

export default Map;
