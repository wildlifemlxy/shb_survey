import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';

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

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      console.log("Map Data Updated", this.props.data);
    }
  }

  convertExcelTime(serial) {
    if (serial === undefined || serial === null || serial === "") return "";

    const totalSeconds = Math.round(86400 * serial);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  handleResize = () => {
    this.setState({ windowWidth: window.innerWidth });
  };

  createClusterCustomIcon = (cluster) => {
    const count = cluster.getChildCount();
    let size = 'small';
    let gradient = 'radial-gradient(circle, #1B7B6E, #2A9D8F)';

    if (count >= 10 && count < 50) {
      size = 'medium';
      gradient = 'radial-gradient(circle, #C46B00, #F4A261)';
    } else if (count >= 50) {
      size = 'large';
      gradient = 'radial-gradient(circle, #9B1D1D, #E76F51)';
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

  // Define colors for each observation type, including "Not Found"
  getObservationColor = (observerName) => {
    const seenColor = "#A8E6CF";  // Green for "Seen"
    const heardColor = "#D1C4E9"; // Blue for "Heard"
    const notFoundColor = "#FFCDD2"; // Tomato for "Not Found"

    if (observerName) {
      if (observerName.toLowerCase().includes("seen")) {
        return seenColor;
      } else if (observerName.toLowerCase().includes("heard")) {
        return heardColor;
      } else if (observerName.toLowerCase().includes("not found")) {
        return notFoundColor;
      }
    }
  };

  createPinpointIcon = (observerName, hs) => {
    const pinColor = this.getObservationColor(hs);
    const rotation = "10deg";

    return new L.DivIcon({
      html: `
        <div 
          style="
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
          "
        >
          <svg width="24" height="36" viewBox="0 0 24 36">
            <path 
              d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12z"
              fill="${pinColor}"
              stroke="white"
              stroke-width="1"
            />
            <circle 
              cx="12" 
              cy="12" 
              r="5" 
              fill="white" 
            />
          </svg>
        </div>
      `,
      className: 'custom-pin-icon',
      iconSize: new L.Point(32, 36),
      iconAnchor: [16, 36],
      popupAnchor: [0, -36],
    });
  };

  render() {
    const { data } = this.props;
    console.log("Map Data:", data);
    const singaporeCenter = [1.3521, 103.8198];

    // Define the observation types and their colors for the legend
    const observationTypes = [
      { type: "Seen", color: "#A8E6CF" },
      { type: "Heard", color: "#D1C4E9" },
      { type: "Not found", color: "#FFCDD2" },
    ];

    return (
      <div className="map-container" style={{ height: '40vh', width: '100%' }}>
        <MapContainer 
          center={singaporeCenter} 
          zoom={11}
          style={{ height: '100%', width: '100%' }}
          minZoom={11}
          zoomControl={false}
          attributionControl={false}
          dragging={true}
          scrollWheelZoom={true}
          doubleClickZoom={true}
          maxBoundsViscosity={1.0}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Custom legend */}
          <div className="map-legend" style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
            zIndex: 1000
          }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '5px' }}>Observation Type</div>
            {observationTypes.map((item, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '5px' }}>
                <div style={{ marginRight: '5px' }}>
                  <svg width="12" height="18" viewBox="0 0 24 36">
                    <path 
                      d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12z"
                      fill={item.color}
                      stroke="white"
                      stroke-width="1"
                    />
                    <circle 
                      cx="12" 
                      cy="12" 
                      r="5" 
                      fill="white" 
                    />
                  </svg>
                </div>
                <span style={{ fontSize: '12px' }}>{item.type}</span>
              </div>
            ))}
          </div>

          <MarkerClusterGroup 
            key={JSON.stringify(data)}
            iconCreateFunction={this.createClusterCustomIcon}
          >
            {data.map((observation, index) => (
              observation.Lat && observation.Long ? (
                 <Marker 
                  key={index} 
                  position={[observation.Lat, observation.Long]}
                  icon={this.createPinpointIcon(observation['Observer name'], observation['Seen/Heard'])}
                >
                  <Popup>
                    <div className="map-popup">
                      <h3>{observation.Location}</h3>
                      <p><strong>Observer:</strong> {observation['Observer name']}</p>
                      <p><strong>Bird ID:</strong> {observation['SHB individual ID (e.g. SHB1)']}</p>
                      <p><strong>Date & Time:</strong> {observation.Date} {this.convertExcelTime(observation.Time)}</p>
                      <p><strong>Activity:</strong> {observation["Activity (foraging, preening, calling, perching, others)"]}</p>
                      <p><strong>Height of Tree:</strong> {observation["Height of tree/m"]}m</p>
                      <p><strong>Height of Bird:</strong> {observation["Height of bird/m"]}m</p>
                      <p><strong>Location Name:</strong> {observation['Location']}</p>
                    </div>
                  </Popup>
                </Marker>
              ) : null
            ))}
          </MarkerClusterGroup>

          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>
    );
  }
}

export default Map;
