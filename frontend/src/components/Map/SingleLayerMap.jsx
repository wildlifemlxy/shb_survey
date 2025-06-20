import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { motion } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Eye, Headphones, XCircle, MapPin, Calendar, Clock, TreePine } from 'lucide-react';
import { formatDate, formatTime, createCustomIcon, filterValidData, calculateMapStats } from '../../utils/mapSingleLayerUtils';
import '../../css/components/Map/SingleLayerMap.css';

// Fix default marker icon issue with Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

class SingleLayerMap extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedObservation: null,
      mapReady: false
    };
    this.mapRef = React.createRef();
  }

  componentDidMount() {
    setTimeout(() => {
      this.setState({ mapReady: true });
    }, 100);
  }

  renderPopupContent = (observation) => {
    const seenHeard = observation["Seen/Heard"];
    const statusIcon = seenHeard === 'Seen' ? Eye : 
                      seenHeard === 'Heard' ? Headphones : XCircle;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="popup-container"
      >
        <div className="popup-header">
          <div className={`popup-icon ${seenHeard === 'Seen' ? 'seen' : seenHeard === 'Heard' ? 'heard' : 'not-found'}`}>
            {React.createElement(statusIcon)}
          </div>
          <div>
            <h3 className="popup-title">
              {observation["SHB individual ID (e.g. SHB1)"] || 'Unknown ID'}
            </h3>
            <span className={`popup-status ${seenHeard === 'Seen' ? 'seen' : seenHeard === 'Heard' ? 'heard' : 'not-found'}`}>
              {seenHeard || 'Unknown'}
            </span>
          </div>
        </div>

        <div className="popup-details">
          <div className="popup-detail-row">
            <MapPin />
            <span className="popup-detail-label">Location:</span>
            <span className="popup-detail-value">{observation.Location || 'Unknown'}</span>
          </div>
          
          <div className="popup-detail-row">
            <Calendar />
            <span className="popup-detail-label">Date:</span>
            <span className="popup-detail-value">{formatDate(observation.Date)}</span>
          </div>
          
          <div className="popup-detail-row">
            <Clock />
            <span className="popup-detail-label">Time:</span>
            <span className="popup-detail-value">{formatTime(observation.Time)}</span>
          </div>

          {observation["Height of bird/m"] && observation["Height of bird/m"] !== 'N/A' && (
            <div className="popup-detail-row">
              <TreePine />
              <span className="popup-detail-label">Bird Height:</span>
              <span className="popup-detail-value">{observation["Height of bird/m"]}m</span>
            </div>
          )}

          {observation["Activity (foraging, preening, calling, perching, others)"] && (
            <div className="popup-activity">
              <span className="popup-activity-label">Activity:</span>
              <p className="popup-activity-text">
                {observation["Activity (foraging, preening, calling, perching, others)"]}
              </p>
            </div>
          )}

          {observation["Observer name"] && (
            <div className="popup-observer">
              Observer: {observation["Observer name"]}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  render() {
    const { data } = this.props;
    const { mapReady } = this.state;
    
    // Filter data to only show valid coordinates
    const validData = filterValidData(data);
    const stats = calculateMapStats(validData);

    // Singapore bounds
    const singaporeBounds = [[1.15, 103.6], [1.48, 104.1]];
    const defaultCenter = [1.3521, 103.8198]; // Singapore center

    if (!mapReady) {
      return (
        <div className="map-loading">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading Map...</p>
          </div>
        </div>
      );
    }

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="single-layer-map-container"
      >
        {/* Map Header */}
        <div className="map-header">
          <div className="map-header-content">
            <div className="map-header-info">
              <h2>🗺️ Observation Map</h2>
              <p>{validData.length} observations with GPS coordinates</p>
            </div>
            <div className="map-legend">
              <div className="legend-item">
                <div className="legend-dot seen"></div>
                <span>Seen</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot heard"></div>
                <span>Heard</span>
              </div>
              <div className="legend-item">
                <div className="legend-dot not-found"></div>
                <span>Not Found</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="map-container">
          <MapContainer
            ref={this.mapRef}
            center={defaultCenter}
            zoom={11}
            style={{ height: '100%', width: '100%' }}
            maxBounds={singaporeBounds}
            maxBoundsViscosity={1.0}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {validData.map((observation, index) => {
              const lat = parseFloat(observation.Lat);
              const lng = parseFloat(observation.Long);
              
              return (
                <Marker
                  key={index}
                  position={[lat, lng]}
                  icon={createCustomIcon(observation)}
                >
                  <Popup>
                    {this.renderPopupContent(observation)}
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Quick Stats Footer */}
        <div className="map-footer">
          <div className="map-footer-content">
            <div className="footer-stats">
              <span className="footer-stat">
                <strong className="stat-count seen">{stats.seenCount}</strong> Seen
              </span>
              <span className="footer-stat">
                <strong className="stat-count heard">{stats.heardCount}</strong> Heard
              </span>
              <span className="footer-stat">
                <strong className="stat-count not-found">{stats.notFoundCount}</strong> Not Found
              </span>
            </div>
            <div className="footer-locations">
              {stats.uniqueLocations} Unique Locations
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
}

export default SingleLayerMap;
