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
      mapStyle: 'satellite', // Default to satellite
      currentZoom: 12, // Track current zoom level
      isHeatmapMode: false, // Track if heatmap was clicked
      showAdvancedMapOptions: false, // Show hybrid/street only after heatmap click
      lastRefreshTime: Date.now(), // Track last refresh for auto-refresh
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
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.data !== this.props.data) {
      this.calculateStatistics(this.props.data);
    }
    
    // Force map refresh when map style changes
    if (prevState.mapStyle !== this.state.mapStyle || prevState.lastRefreshTime !== this.state.lastRefreshTime) {
      setTimeout(() => {
        if (window.map && window.map.invalidateSize) {
          window.map.invalidateSize();
        }
      }, 100);
    }
  }

  standardizeData = (data) => {
    if (!data || !Array.isArray(data)) {
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

  calculateStatistics(data) {
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
    const { mapStyle, lastRefreshTime } = this.state;
    
    switch (mapStyle) {
      case 'satellite':
        // Use Google-synchronized satellite imagery for latest updates
        const selectedProvider = SATELLITE_PROVIDERS[DEFAULT_SATELLITE_PROVIDER];
        const latestUrl = getLatestImageryUrl(DEFAULT_SATELLITE_PROVIDER, true);
        // Add refresh timestamp for component-level cache busting
        const refreshParam = `&refresh=${lastRefreshTime}`;
        return {
          url: latestUrl + refreshParam,
          attribution: selectedProvider.attribution + ' | Updated: ' + selectedProvider.updateFrequency,
          maxZoom: selectedProvider.maxZoom,
          // Google Maps tile servers for best performance
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          updateWhenIdle: false,
          updateWhenZooming: false,
          updateInterval: 200,
          // Force refresh with current timestamp to get latest imagery
          detectRetina: true,
          tileSize: 256,
          zoomOffset: 0
        };
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
        return this.getTileLayerConfig(); // Default to satellite
    }
  };

  renderMapStyleSelector = () => {
    const { mapStyle, showAdvancedMapOptions, isHeatmapMode } = this.state;
    
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
          🛰️ Map Style:
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
          <option value="satellite">🛰️ Satellite</option>
          <option value="hybrid">🗺️ Hybrid (Landmarks)</option>
          <option value="street">🏙️ Street Map</option>
        </select>
        
        {isHeatmapMode && (
          <button
            onClick={this.resetToSatelliteMode}
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
            title="Reset to satellite only mode"
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

  // Reset to satellite only mode
  resetToSatelliteMode = () => {
    this.setState({
      mapStyle: 'satellite',
      isHeatmapMode: false,
      showAdvancedMapOptions: false
    });
    
    // Reset zoom to overview level
    if (window.map) {
      const singaporeCenter = [1.3521, 103.8198];
      window.map.setView(singaporeCenter, 12);
    }
  };

  render() {
    const { data, height = '100%' } = this.props;
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
      <div style={{ height, width: '100%' }}>
        {/* Enhanced Information Panels - Outside the map for better visibility */}
        <div className="map-info-panels" style={{ 
          display: 'flex', 
          gap: '15px', 
          marginBottom: '20px',
          flexWrap: 'wrap',
          padding: '10px 0'
        }}>
          {/* Enhanced Statistics Panel - Moved outside map legend for better visibility */}
          <div 
            className="map-statistics-panel"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              fontSize: '14px',
              minWidth: '220px',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              flex: '1 1 220px',
              backdropFilter: 'blur(15px)'
            }}>
            <h4 style={{ 
              margin: '0 0 12px 0', 
              fontSize: '16px', 
              color: '#DC2626',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              📊 Survey Statistics
              <span style={{ 
                fontSize: '12px', 
                color: '#6B7280',
                fontWeight: '400'
              }}>
                (Live Data)
              </span>
            </h4>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: '8px',
              marginBottom: '12px'
            }}>
              <div style={{ 
                background: 'rgba(34, 197, 94, 0.1)', 
                padding: '8px', 
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#059669' }}>
                  {this.state.statistics.totalObservations}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  Total Observations
                </div>
              </div>
              <div style={{ 
                background: 'rgba(59, 130, 246, 0.1)', 
                padding: '8px', 
                borderRadius: '6px',
                textAlign: 'center'
              }}>
                <div style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  color: this.state.currentZoom >= 16 ? '#059669' : '#DC2626'
                }}>
                  {this.state.currentZoom}
                </div>
                <div style={{ fontSize: '11px', color: '#6B7280' }}>
                  Current Zoom
                </div>
              </div>
            </div>
            <div style={{ 
              fontSize: '12px', 
              marginBottom: '8px',
              padding: '6px 8px',
              background: this.state.currentZoom >= 16 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(251, 146, 60, 0.1)',
              borderRadius: '4px',
              border: `1px solid ${this.state.currentZoom >= 16 ? '#22C55E' : '#FB923C'}`
            }}>
              <strong>View Mode:</strong> {this.state.currentZoom >= 16 ? '🔍 Individual + Heatmap' : this.state.currentZoom >= 14 ? '🗺️ Semi-Clustered' : '🌍 Clustered'}
            </div>
            <div style={{ 
              fontSize: '12px',
              padding: '6px 8px',
              background: this.state.isHeatmapMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              borderRadius: '4px',
              border: `1px solid ${this.state.isHeatmapMode ? '#EF4444' : '#22C55E'}`,
              textAlign: 'center'
            }}>
              <strong>Map Mode:</strong> {this.state.isHeatmapMode ? '🔓 Advanced (Heatmap Clicked)' : '🔒 Satellite Only'}
            </div>
          </div>

          {/* Enhanced Instructions Panel */}
          <div style={{
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            padding: '16px',
            borderRadius: '12px',
            boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
            fontSize: '12px',
            maxWidth: '240px',
            border: '2px solid rgba(34, 197, 94, 0.2)',
            flex: '1 1 220px',
            backdropFilter: 'blur(15px)'
          }}>
            <h5 style={{ 
              margin: '0 0 8px 0', 
              color: '#059669',
              fontWeight: '700',
              fontSize: '14px'
            }}>
              💡 Map Instructions
            </h5>
            <ul style={{ margin: '4px 0 0 0', paddingLeft: '16px' }}>
              <li style={{ marginBottom: '4px' }}>Zoom in (16+) for individual markers</li>
              <li style={{ marginBottom: '4px' }}>Zoom out (12-15) for clustered view</li>
              <li style={{ marginBottom: '4px' }}>Click markers for details</li>
              <li style={{ marginBottom: '4px' }}>Area names shown on hybrid mode</li>
            </ul>
          </div>

          {/* Map Style Control */}
          {this.renderMapStyleSelector()}

          {/* Enhanced Zoom Level Indicator */}
          <div style={{
            backgroundColor: this.state.currentZoom >= 16 ? 'rgba(34, 197, 94, 0.9)' : this.state.currentZoom >= 14 ? 'rgba(251, 146, 60, 0.9)' : 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            padding: '12px 16px',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: '700',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            minWidth: '140px',
            justifyContent: 'center'
          }}>
            <span>Zoom: {this.state.currentZoom}</span>
            <span>{this.state.currentZoom >= 16 ? '🔍' : this.state.currentZoom >= 14 ? '🗺️' : '🌍'}</span>
          </div>

          {/* Enhanced Legend - Moved outside map for better visibility */}
          <div 
            className="map-legend"
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.98)',
              padding: '16px',
              borderRadius: '12px',
              boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
              border: '2px solid rgba(220, 38, 38, 0.2)',
              backdropFilter: 'blur(15px)',
              minWidth: '200px',
              flex: '1 1 200px'
            }}
          >
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '700', 
              marginBottom: '12px',
              color: '#DC2626',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🏷️ Observation Types
              <span style={{ 
                fontSize: '11px', 
                color: '#6B7280',
                fontWeight: '400'
              }}>
                & Areas
              </span>
            </h4>
            
            {/* Observation Type Legend */}
            <div style={{ marginBottom: '12px' }}>
              {observationTypes.map((item, index) => (
                <div key={index} style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  marginBottom: '6px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: 'rgba(248, 250, 252, 0.8)'
                }}>
                  <div style={{ marginRight: '10px' }}>
                    <svg width="14" height="20" viewBox="0 0 24 36">
                      <path 
                        d="M12 0C5.383 0 0 5.383 0 12c0 9 12 24 12 24s12-15 12-24c0-6.617-5.383-12-12-12z"
                        fill={item.color}
                        stroke="white"
                        strokeWidth="2"
                      />
                      <circle cx="12" cy="12" r="5" fill="white" />
                    </svg>
                  </div>
                  <span style={{ 
                    fontSize: '13px',
                    fontWeight: '500',
                    color: '#374151'
                  }}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Area Names Display */}
            <div style={{
              borderTop: '1px solid rgba(220, 38, 38, 0.2)',
              paddingTop: '12px'
            }}>
              <div style={{ 
                fontSize: '12px',
                color: '#6B7280',
                marginBottom: '6px',
                fontWeight: '600'
              }}>
                🌐 Key Areas (Hybrid Mode):
              </div>
              <div style={{ 
                fontSize: '11px',
                color: '#374151',
                lineHeight: '1.4'
              }}>
                • Singapore Botanic Gardens<br/>
                • Sentosa Island<br/>
                • East Coast Park<br/>
                • Jurong Bird Park<br/>
                • MacRitchie Reservoir<br/>
                • Marina Bay Gardens
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Map Container - ZERO Movement & Maximum Stability */}
        <div 
          className="map-container map-zero-movement"
          style={{ 
            height: 'calc(100vh - 320px)', 
            width: '100%', 
            border: '3px solid #DC2626', 
            borderRadius: '12px', 
            overflow: 'hidden',
            minHeight: '500px',
            maxHeight: 'calc(100vh - 320px)',
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
            zoom={12}
            style={{ 
              height: '100%', 
              width: '100%', 
              position: 'relative',
              flex: 1,
              zIndex: 1
            }}
            minZoom={11}
            maxZoom={22}
            zoomControl={false}
            attributionControl={false}
            dragging={true}
            scrollWheelZoom={true}
            doubleClickZoom={true}
            maxBounds={singaporeBounds}
            maxBoundsViscosity={0.8}
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
                mapInstance.setZoom(12); // Start with overview then allow zoom in for heatmap
              }, 100);
            }}
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
          {/* Heatmap Layer - shows when zoomed in */}
          <HeatmapLayer 
            data={standardizedData} 
            maxZoom={16} 
            onHeatmapClick={this.handleHeatmapClick}
          />
          
          {/* Conditional rendering based on zoom level */}
          {this.state.currentZoom < 16 ? (
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
          )}

          <ZoomControl position="bottomright" />
        </MapContainer>
      </div>
    </div>
    );
  }
}

export default Map;
