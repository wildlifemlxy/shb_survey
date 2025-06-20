import React, { Component } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import HeatmapLayer from './HeatmapLayer';
import { SATELLITE_PROVIDERS, DEFAULT_SATELLITE_PROVIDER, getLatestImageryUrl, shouldRefreshMaps, forceMapRefresh } from '../../config/mapConfig';
import '../../css/components/Map/Map_improved.css';

class Map extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.state = {
      windowWidth: window.innerWidth,
      mapStyle: 'hybrid', // Default to hybrid (no satellite only option)
      currentZoom: 11, // Start zoomed out to show Singapore boundaries
      isHeatmapMode: false,
      showAdvancedMapOptions: false,
      lastRefreshTime: Date.now()
    };
  }

  componentDidMount() {
    window.addEventListener('resize', this.handleResize);
    
    // Check if maps need refreshing for latest satellite imagery
    if (shouldRefreshMaps()) {
      console.log('Refreshing satellite imagery for latest updates...');
      forceMapRefresh();
    }
    
    // Set up auto-refresh timer (every 5 minutes for component-only refresh)
    this.refreshInterval = setInterval(() => {
      this.autoRefreshMap();
    }, 5 * 60 * 1000); // 5 minutes
    
    // Force map to invalidate size after mount to fix sizing issues
    setTimeout(() => {
      if (window.map && window.map.invalidateSize) {
        window.map.invalidateSize();
      }
    }, 100);
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.handleResize);
    
    // Clear auto-refresh interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    // Clear resize timeout
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
  }

  componentDidUpdate(prevProps, prevState) {
    // Force map refresh when map style changes or when component updates
    if (prevState.mapStyle !== this.state.mapStyle || 
        prevState.lastRefreshTime !== this.state.lastRefreshTime ||
        prevProps.data !== this.props.data) {
      setTimeout(() => {
        this.invalidateMapSize();
      }, 100);
    }
  }

  // Enhanced map resize handler
  invalidateMapSize = () => {
    try {
      // Try multiple methods to ensure map size is correct
      if (this.mapRef.current) {
        const mapInstance = this.mapRef.current;
        if (mapInstance && mapInstance.invalidateSize) {
          mapInstance.invalidateSize(true);
        }
      }
      
      // Also try global window.map if available
      if (window.map && window.map.invalidateSize) {
        window.map.invalidateSize(true);
      }
      
      // Force a re-render if map container exists
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        // Trigger a resize event
        window.dispatchEvent(new Event('resize'));
      }
    } catch (error) {
      console.warn('Error invalidating map size:', error);
    }
  }

  handleResize = () => {
    this.setState({ windowWidth: window.innerWidth });
    // Debounce resize to avoid too many calls
    clearTimeout(this.resizeTimeout);
    this.resizeTimeout = setTimeout(() => {
      this.invalidateMapSize();
    }, 150);
  }

  standardizeData = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return [];
    }
    
    // Return data without any coordinate standardization/rounding
    // Preserve exact coordinate precision for landmarks
    return data.map(observation => ({
      ...observation,
      // Ensure coordinates are parsed as numbers but keep full precision
      Lat: observation.Lat ? parseFloat(observation.Lat) : observation.Lat,
      Long: observation.Long ? parseFloat(observation.Long) : observation.Long
    }));
  };

  convertExcelTime(serial) {
    if (serial === undefined || serial === null || serial === "") return "";

    const totalSeconds = Math.round(86400 * serial);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

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
    const { mapStyle, lastRefreshTime } = this.state;
    
    switch (mapStyle) {
      case 'hybrid':
        // Google hybrid view with labels synchronized with Google Maps
        const hybridProvider = SATELLITE_PROVIDERS['GOOGLE_HYBRID_SYNC'];
        const hybridLatestUrl = getLatestImageryUrl('GOOGLE_HYBRID_SYNC', true);
        const hybridRefreshParam = `&refresh=${lastRefreshTime}`;
        return {
          url: hybridLatestUrl + hybridRefreshParam,
          attribution: hybridProvider.attribution + ' | Updated: ' + hybridProvider.updateFrequency,
          maxZoom: hybridProvider.maxZoom,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          updateWhenIdle: false,
          updateWhenZooming: false,
          updateInterval: 200,
          detectRetina: true,
          tileSize: 256,
          zoomOffset: 0
        };
      case 'street':
        return {
          url: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png?refresh=${lastRefreshTime}`,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          subdomains: ['a', 'b', 'c'],
          updateWhenIdle: false,
          updateWhenZooming: false,
          detectRetina: true,
          tileSize: 256,
          zoomOffset: 0
        };
      default:
        // Default to hybrid
        const defaultProvider = SATELLITE_PROVIDERS['GOOGLE_HYBRID_SYNC'];
        const defaultLatestUrl = getLatestImageryUrl('GOOGLE_HYBRID_SYNC', true);
        const defaultRefreshParam = `&refresh=${lastRefreshTime}`;
        return {
          url: defaultLatestUrl + defaultRefreshParam,
          attribution: defaultProvider.attribution + ' | Updated: ' + defaultProvider.updateFrequency,
          maxZoom: defaultProvider.maxZoom,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          updateWhenIdle: false,
          updateWhenZooming: false,
          updateInterval: 200,
          detectRetina: true,
          tileSize: 256,
          zoomOffset: 0
        };
    }
  };

  renderMapStyleSelector = () => {
    const { mapStyle, isHeatmapMode } = this.state;
    
    return (
      <div className="map-style-selector" style={{
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        padding: '12px 16px',
        borderRadius: '12px',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
        border: '2px solid rgba(220, 38, 38, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        backdropFilter: 'blur(15px)',
        flex: '1 1 280px',
        minWidth: '280px'
      }}>
        <label style={{ 
          fontSize: '14px', 
          fontWeight: '700', 
          color: '#DC2626',
          whiteSpace: 'nowrap'
        }}>
          🗺️ Map Style:
        </label>
        <select 
          value={mapStyle} 
          onChange={(e) => this.setState({ mapStyle: e.target.value })}
          style={{ 
            border: '2px solid #DC2626', 
            borderRadius: '6px',
            padding: '6px 10px',
            outline: 'none',
            fontSize: '14px',
            color: '#000000 !important',
            background: 'white',
            fontWeight: '600',
            flex: 1,
            minWidth: '140px'
          }}
        >
          <option value="hybrid">🗺️ Hybrid</option>
          <option value="street">🏙️ Street Map</option>
        </select>
        
        {isHeatmapMode && (
          <button
            onClick={this.resetToHybridMode}
            style={{
              background: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '6px 10px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: '600',
              whiteSpace: 'nowrap'
            }}
            title="Reset to hybrid mode"
          >
            🔄 Reset
          </button>
        )}
        
        <button
          onClick={this.autoRefreshMap}
          style={{
            background: '#22C55E',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '12px',
            cursor: 'pointer',
            fontWeight: '600',
            whiteSpace: 'nowrap'
          }}
          title="Refresh map tiles for latest imagery"
        >
          🔄 Refresh
        </button>
      </div>
    );
  };

  // Handle heatmap click to enable advanced map options and auto-zoom
  handleHeatmapClick = (heatmapData) => {
    console.log('Heatmap clicked with exact coordinates:', heatmapData);
    
    // Log exact coordinate information
    if (heatmapData.exactCoordinates) {
      console.log(`Exact coordinates: ${heatmapData.exactCoordinates.lat}, ${heatmapData.exactCoordinates.lng}`);
      console.log(`Number of observations at this location: ${heatmapData.count}`);
      if (heatmapData.observations) {
        console.log('All observations at this location:', heatmapData.observations);
      }
    }
    
    this.setState({
      isHeatmapMode: true,
      showAdvancedMapOptions: true
    });
    
    // Auto-zoom to the clicked location with exact coordinates if autoZoom is enabled
    if (heatmapData.autoZoom && window.map) {
      const targetZoom = Math.max(18, heatmapData.zoom + 3); // Zoom in further for exact coordinates
      
      // Use exact coordinates for precise positioning
      const exactLat = heatmapData.exactCoordinates ? heatmapData.exactCoordinates.lat : heatmapData.latlng.lat;
      const exactLng = heatmapData.exactCoordinates ? heatmapData.exactCoordinates.lng : heatmapData.latlng.lng;
      
      window.map.setView([exactLat, exactLng], targetZoom, {
        animate: true,
        duration: 0.5
      });
      
      // Show a temporary popup with exact coordinate information
      if (heatmapData.count > 1) {
        const popup = L.popup()
          .setLatLng([exactLat, exactLng])
          .setContent(`
            <div style="text-align: center;">
              <strong>${heatmapData.count} observations</strong><br/>
              at exact coordinates:<br/>
              <code>${exactLat.toFixed(8)}, ${exactLng.toFixed(8)}</code>
            </div>
          `)
          .openOn(window.map);
          
        // Auto-close popup after 3 seconds
        setTimeout(() => {
          if (window.map && popup) {
            window.map.closePopup(popup);
          }
        }, 3000);
      }
    }
  };

  // Auto-refresh map tiles without page reload
  autoRefreshMap = () => {
    const now = Date.now();
    this.setState({ 
      lastRefreshTime: now,
      mapStyle: this.state.mapStyle // Force re-render with new tiles
    });
    
    // Update localStorage to track refresh
    if (typeof window !== 'undefined') {
      localStorage.setItem('lastMapRefresh', now.toString());
    }
  };

  // Reset to hybrid mode (no satellite only)
  resetToHybridMode = () => {
    this.setState({
      mapStyle: 'hybrid',
      isHeatmapMode: false,
      showAdvancedMapOptions: false
    });
    
    // Reset zoom to Singapore boundaries overview level
    if (window.map) {
      const singaporeCenter = [1.3521, 103.8198];
      window.map.setView(singaporeCenter, 11); // Zoom 11 shows Singapore boundaries well
    }
  };

  render() {
    const { data = [], height = '100%' } = this.props;
    console.log("Map Data:", data);
    
    // Standardize coordinates for same locations
    const standardizedData = this.standardizeData(data);
    console.log("Standardized Map Data:", standardizedData);
    
    // Singapore bounds - constrain map to Singapore only
    const singaporeCenter = [1.3521, 103.8198];
    const singaporeBounds = [
      [1.16, 103.6], // Southwest corner
      [1.48, 104.0]  // Northeast corner
    ];
    
    const tileConfig = this.getTileLayerConfig();

    // Define the observation types and their colors for the legend
    const observationTypes = [
      { type: "Seen", color: "#A8E6CF" },
      { type: "Heard", color: "#D1C4E9" },
      { type: "Not found", color: "#FFCDD2" },
    ];

    return (
      <div className="map-container fixed-size map-zero-movement" style={{ height, width: '100%' }}>
        {/* Single Header Panel - Combined for better layout */}
        <div className="map-header-panel" style={{ 
          display: 'flex', 
          gap: '15px', 
          marginBottom: '15px',
          flexWrap: 'wrap',
          padding: '10px 0',
          alignItems: 'flex-start'
        }}>
          {/* Map Style Control */}
          {this.renderMapStyleSelector()}

          {/* Legend */}
          <div 
            className="map-legend"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              padding: '14px',
              borderRadius: '10px',
              boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              backdropFilter: 'blur(10px)',
              minWidth: '180px',
              flex: '1 1 180px'
            }}
          >
            <h4 style={{ 
              fontSize: '15px', 
              fontWeight: '700', 
              marginBottom: '10px',
              color: '#DC2626'
            }}>
              🏷️ Legend
            </h4>
            
            {/* Observation Type Legend */}
            <div style={{ marginBottom: '8px' }}>
              {observationTypes.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '4px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: 'rgba(248, 250, 252, 0.8)'
                }}>
                  <div style={{ marginRight: '8px' }}>
                    <svg width="12" height="18" viewBox="0 0 24 36">
                      <path 
                        d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12z"
                        fill={item.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="4" fill="white" />
                    </svg>
                  </div>
                  <span style={{ 
                    fontSize: '12px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Map Container - Fixed scrolling and boundaries */}
        <div 
          className="map-container map-zero-movement"
          style={{ 
            height: 'calc(100vh - 280px)', 
            width: '100%', 
            border: '3px solid #DC2626', 
            borderRadius: '12px', 
            overflow: 'hidden',
            minHeight: '500px',
            maxHeight: 'calc(100vh - 280px)',
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            transform: 'translateZ(0)',
            contain: 'layout style paint',
            isolation: 'isolate',
            backfaceVisibility: 'hidden',
            willChange: 'auto'
          }}
        >
          <MapContainer 
            center={singaporeCenter} 
            zoom={11} // Start at zoom 11 to show Singapore boundaries
            style={{ 
              height: '100%', 
              width: '100%', 
              position: 'relative',
              flex: 1,
              zIndex: 1
            }}
            className="size-locked"
            minZoom={10} // Allow zoom out to see Singapore boundaries clearly
            maxZoom={22}
            zoomControl={true} // Enable zoom control
            attributionControl={false}
            dragging={true} // Enable dragging/scrolling
            scrollWheelZoom={true} // Enable scroll wheel zoom
            doubleClickZoom={true}
            touchZoom={true} // Enable touch zoom
            boxZoom={true} // Enable box zoom
            keyboard={true} // Enable keyboard navigation
            maxBounds={singaporeBounds}
            maxBoundsViscosity={0.7} // Allow some flexibility at boundaries
            ref={this.mapRef}
            whenCreated={(mapInstance) => {
              window.map = mapInstance;
              // Set bounds and zoom to show Singapore clearly
              mapInstance.fitBounds(singaporeBounds);
              mapInstance.setMaxBounds(singaporeBounds);
              
              // Add zoom event listener for live updates
              mapInstance.on('zoomend', () => {
                const newZoom = mapInstance.getZoom();
                this.setState({ currentZoom: newZoom });
              });
              
              // Add move event listener for live updates
              mapInstance.on('moveend', () => {
                const newZoom = mapInstance.getZoom();
                this.setState({ currentZoom: newZoom });
              });
              
              setTimeout(() => {
                mapInstance.invalidateSize();
                mapInstance.setZoom(11); // Start with Singapore boundaries visible
              }, 100);
            }}
          >
          <TileLayer
            key={this.state.mapStyle}
            url={tileConfig.url}
            attribution={tileConfig.attribution}
            maxZoom={20}
          />
          
          {/* Show heatmap only when data exists */}
          {standardizedData.length > 0 && (
            <HeatmapLayer 
              data={standardizedData} 
              maxZoom={16} 
              onHeatmapClick={this.handleHeatmapClick}
            />
          )}
          
          {/* Conditional rendering based on zoom level and data existence */}
          {standardizedData.length > 0 && (
            this.state.currentZoom < 16 ? (
              // Show clustered markers when zoomed out
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
                          <p><strong>Exact Coordinates:</strong> {parseFloat(observation.Lat).toFixed(8)}, {parseFloat(observation.Long).toFixed(8)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null
                ))}
              </MarkerClusterGroup>
            ) : (
              // Show individual markers when zoomed in (along with heatmap)
              standardizedData.map((observation, index) => (
                observation.Lat && observation.Long ? (
                   <Marker 
                    key={`individual-${index}`}
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
                        <p><strong>Exact Coordinates:</strong> {parseFloat(observation.Lat).toFixed(8)}, {parseFloat(observation.Long).toFixed(8)}</p>
                      </div>
                    </Popup>
                  </Marker>
                ) : null
              ))
            )
          )}

          <ZoomControl position="bottomright" />
        </MapContainer>
        
        {/* Show message when no data */}
        {standardizedData.length === 0 && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'rgba(255, 255, 255, 0.95)',
            padding: '20px',
            borderRadius: '12px',
            textAlign: 'center',
            border: '2px solid #DC2626',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
            zIndex: 1000
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🗺️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#DC2626' }}>Singapore Map Ready</h3>
            <p style={{ margin: 0, fontSize: '14px', color: '#7B7B7B' }}>
              Waiting for bird observation data to load...
            </p>
          </div>
        )}
      </div>
    </div>
  );
  }
}

export default Map;