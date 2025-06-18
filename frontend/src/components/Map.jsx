import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { standardizeCoordinates } from '../utils/coordinateStandardization';

class Map extends Component {
  constructor(props) {
    super(props);
    this.state = {
      windowWidth: window.innerWidth,
      mapStyle: 'satellite', // 'satellite', 'terrain', 'street'
      statistics: {
        totalObservations: 0,
        seen: 0,
        heard: 0,
        notFound: 0,
      }
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    this.calculateStatistics(this.props.data);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.calculateStatistics(this.props.data);
    }
  }

  calculateStatistics(data) 
  {
    console.log("Statistic Data:", data);
    let seen = 0;
    let heard = 0;
    let notFound = 0;

    data.forEach(observation => {
      if (observation["Seen/Heard"]) {
        if (observation["Seen/Heard"].toLowerCase().includes("seen")) seen++;
        else if (observation["Seen/Heard"].toLowerCase().includes("heard")) heard++;
        else if (observation["Seen/Heard"].toLowerCase().includes("not found")) notFound++;
      }
    });

    this.setState({
      statistics: {
        totalObservations: data.length,
        seen,
        heard,
        notFound,
      }
    });
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
          style="background: ${gradient};
          width: ${sizeMap[size]}px;
          height: ${sizeMap[size]}px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 600;
          font-size: 0.75rem;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          ${count}
        </div>
      `,
      className: 'custom-cluster-icon',
      iconSize: new L.Point(sizeMap[size], sizeMap[size])
    });
  };

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
          style="width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;">
          <svg width="24" height="36" viewBox="0 0 24 36">
            <path 
              d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12z"
              fill="${pinColor}"
              stroke="white"
              stroke-width="1" />
            <circle cx="12" cy="12" r="5" fill="white" />
          </svg>
        </div>
      `,
      className: 'custom-pin-icon',
      iconSize: new L.Point(32, 36),
      iconAnchor: [16, 36],
      popupAnchor: [0, -36],
    });
  };

  getTileLayerConfig = () => {
    const { mapStyle } = this.state;
    
    switch (mapStyle) {
      case 'satellite':
        return {
          url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
          overlay: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            opacity: 0.8
          }
        };
      case 'terrain':
        return {
          url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
          attribution: 'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, <a href="http://viewfinderpanoramas.org">SRTM</a> | Map style: &copy; <a href="https://opentopomap.org">OpenTopoMap</a>'
        };
      case 'street':
        return {
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        };
      default:
        return this.getTileLayerConfig(); // Default to satellite
    }
  };

  renderMapStyleSelector = () => {
    const { mapStyle } = this.state;
    
    return (
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '8px',
        padding: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        zIndex: 1000,
        fontSize: '12px'
      }}>
        <div style={{ fontWeight: 600, marginBottom: '8px', color: '#DC2626' }}>🗺️ Map Style</div>
        
        {['satellite', 'terrain', 'street'].map(style => (
          <button
            key={style}
            onClick={() => this.setState({ mapStyle: style })}
            style={{
              display: 'block',
              width: '100%',
              background: mapStyle === style ? '#DC2626' : '#F3F4F6',
              color: mapStyle === style ? 'white' : '#374151',
              border: 'none',
              padding: '6px 12px',
              borderRadius: '4px',
              fontSize: '11px',
              cursor: 'pointer',
              marginBottom: '4px',
              textAlign: 'left'
            }}
          >
            {style === 'satellite' && '🛰️'} 
            {style === 'terrain' && '🏔️'} 
            {style === 'street' && '🗺️'} 
            {style.charAt(0).toUpperCase() + style.slice(1)}
          </button>
        ))}
      </div>
    );
  };

  render() {
    const { data } = this.props;
    console.log("Map Data:", data);
    
    // Standardize coordinates for same locations
    const standardizedData = standardizeCoordinates(data);
    console.log("Standardized Map Data:", standardizedData);
    
    const singaporeCenter = [1.3521, 103.8198];
    const tileConfig = this.getTileLayerConfig();

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
            key={this.state.mapStyle}
            url={tileConfig.url}
            attribution={tileConfig.attribution}
            maxZoom={20}
          />
          {/* Optional overlay for satellite with labels */}
          {tileConfig.overlay && (
            <TileLayer
              url={tileConfig.overlay.url}
              attribution=""
              maxZoom={20}
              opacity={tileConfig.overlay.opacity}
            />
          )}
          
          {/* Map Style Selector */}
          {this.renderMapStyleSelector()}
          
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
                    <circle cx="12" cy="12" r="5" fill="white" />
                  </svg>
                </div>
                <span style={{ fontSize: '12px' }}>{item.type}</span>
              </div>
            ))}
          </div>

          <MarkerClusterGroup 
            key={JSON.stringify(standardizedData)}
            iconCreateFunction={this.createClusterCustomIcon}
          >
            {standardizedData.map((observation, index) => (
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

          {/* Statistics Panel */}
          <div className="statistics-panel" style={{
            position: 'absolute',
            top: '10px',
            left: '10px',
            backgroundColor: 'white',
            padding: '10px',
            borderRadius: '5px',
            boxShadow: '0 1px 5px rgba(0,0,0,0.4)',
            zIndex: 1000
          }}>
            <h4>Statistics</h4>
            <p style={{ color: '#8884d8' }}><strong>Total:</strong> {this.state.statistics.totalObservations}</p>
            <p style={{ color: '#6DAE80' }}><strong>Seen:</strong> {this.state.statistics.seen}</p>
            <p style={{ color: '#B39DDB' }}><strong>Heard:</strong> {this.state.statistics.heard}</p>
            <p style={{ color: '#EF9A9A' }}p><strong>Not Found:</strong> {this.state.statistics.notFound}</p>
          </div>

          {this.renderMapStyleSelector()}
        </MapContainer>
      </div>
    );
  }
}

export default Map;
