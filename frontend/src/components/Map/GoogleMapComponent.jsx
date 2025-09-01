import React, { Component } from 'react';
import { GOOGLE_MAPS_API_KEY, SINGAPORE_CENTER, SINGAPORE_ZOOM, DEFAULT_MAP_TYPE } from '../../config/mapConfig';

class GoogleMapComponent extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.map = null;
    this.markers = [];
    this.markerClusterer = null; // Add marker clusterer
    this.loadingTimeout = null; // Add timeout for loading
    this.retryCount = 0; // Add retry counter
    this.maxRetries = 3; // Maximum retry attempts
    this.state = {
      isLoaded: false,
      error: null,
      isLoadingMaps: false,
      isLoadingClusterer: false,
      selectedObservation: null, // Track selected observation for sidebar
    };
    
    // Throttle functions to improve performance
    this.throttledZoomChange = this.throttle((zoom) => {
      if (this.props.onZoomLevelChange) {
        this.props.onZoomLevelChange(zoom);
      }
    }, 100);

    this.throttledMapTypeChange = this.throttle((mapType) => {
      if (this.props.onMapTypeChange) {
        this.props.onMapTypeChange(mapType);
      }
    }, 100);
  }

  // Throttle function to limit event frequency
  throttle = (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  };

  componentDidMount() {
    // Set a timeout to prevent infinite loading
    this.loadingTimeout = setTimeout(() => {
      if (this.state.isLoadingMaps || this.state.isLoadingClusterer) {
        this.setState({
          error: 'Map loading timed out. Please refresh the page.',
          isLoadingMaps: false,
          isLoadingClusterer: false
        });
      }
    }, 15000); // 15 second timeout

    this.loadGoogleMapsScript();
  }

  componentDidUpdate(prevProps) {
    // Only update markers when data actually changes (not on every render)
    if (prevProps.data !== this.props.data && this.map) {
      console.log('Data changed, updating markers...');
      this.updateMarkers();
    }
    
    // Update zoom when zoom prop changes
    if (prevProps.zoom !== this.props.zoom && this.map && this.props.zoom !== undefined) {
      this.map.setZoom(this.props.zoom);
    }
  }

  loadGoogleMapsScript = () => {
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      this.setState({ isLoaded: true });
      this.loadMarkerClusterer();
      return;
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      console.log('Google Maps script already exists, waiting for load...');
      this.setState({ isLoadingMaps: true });
      existingScript.addEventListener('load', () => {
        this.setState({ isLoaded: true, isLoadingMaps: false });
        this.loadMarkerClusterer();
      });
      existingScript.addEventListener('error', () => {
        this.setState({ 
          error: 'Failed to load Google Maps API', 
          isLoadingMaps: false 
        });
      });
      return;
    }

    this.setState({ isLoadingMaps: true });

    // Create script element with improved loading
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
    // Create a global callback for faster initialization
    window.initGoogleMaps = () => {
      // Clear loading timeout on success
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }
      this.setState({ isLoaded: true, isLoadingMaps: false });
      this.loadMarkerClusterer();
      // Clean up global callback
      delete window.initGoogleMaps;
    };
    
    script.onerror = () => {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Google Maps loading failed, retrying... (${this.retryCount}/${this.maxRetries})`);
        setTimeout(() => {
          // Remove failed script
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          // Clean up global callback
          delete window.initGoogleMaps;
          // Retry loading
          this.setState({ isLoadingMaps: false }, () => {
            this.loadGoogleMapsScript();
          });
        }, 1000 * this.retryCount); // Exponential backoff
      } else {
        this.setState({ 
          error: 'Failed to load Google Maps API after multiple attempts. Please check your internet connection and API key.', 
          isLoadingMaps: false 
        });
        // Clean up global callback
        delete window.initGoogleMaps;
      }
    };

    document.head.appendChild(script);
  };

  loadMarkerClusterer = () => {
    // Check if MarkerClusterer is already loaded
    if (window.MarkerClusterer) {
      console.log('MarkerClusterer already loaded');
      this.initializeMap();
      return;
    }

    this.setState({ isLoadingClusterer: true });

    // Load MarkerClusterer library with faster CDN
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@google/markerclustererplus@4.0.1/dist/markerclustererplus.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    
    script.onload = () => {
      console.log('MarkerClusterer loaded successfully');
      // Clear loading timeout on success
      if (this.loadingTimeout) {
        clearTimeout(this.loadingTimeout);
        this.loadingTimeout = null;
      }
      this.setState({ isLoadingClusterer: false });
      this.initializeMap();
    };
    
    script.onerror = () => {
      console.warn('Failed to load MarkerClusterer, proceeding without clustering');
      this.setState({ isLoadingClusterer: false });
      // Proceed without clustering
      this.initializeMap();
    };

    document.head.appendChild(script);
  };

  initializeMap = () => {
    if (!this.mapRef.current || !window.google) return;

    const { zoom = SINGAPORE_ZOOM } = this.props;
    
    // Initialize the map with optimized settings for faster loading
    this.map = new window.google.maps.Map(this.mapRef.current, {
      center: { lat: SINGAPORE_CENTER.lat, lng: SINGAPORE_CENTER.lng }, // Singapore center from config
      zoom: 11, // Default zoom level
      minZoom: 11, // Minimum zoom level
      maxZoom: 20, // Maximum zoom level
      mapTypeId: window.google.maps.MapTypeId.HYBRID,
      restriction: {
        latLngBounds: {
          north: 1.5504753,
          south: 1.1304753,
          west: 103.6920359,
          east: 104.0120359,
        },
      },
      disableDefaultUI: true, // This removes ALL default controls including zoom
      gestureHandling: 'greedy', // Faster interaction
      backgroundColor: '#f3f4f6', // Fallback color during loading
    });

    // Use requestAnimationFrame for smoother initialization
    requestAnimationFrame(() => {
      // Add throttled zoom change listener
      this.map.addListener('zoom_changed', () => {
        const newZoom = this.map.getZoom();
        this.throttledZoomChange(newZoom);
        
        // Don't auto-close InfoWindow on zoom - let them stay open
      });

      // Add throttled map type change listener
      this.map.addListener('maptypeid_changed', () => {
        const mapType = this.map.getMapTypeId();
        this.throttledMapTypeChange(mapType);
      });

      // Simple map click handler - don't close InfoWindows
      this.map.addListener('click', () => {
        // Do nothing - let InfoWindows stay open
        console.log('Map clicked - InfoWindows preserved');
      });

      // Initialize markers after map is ready
      this.updateMarkers();

      // Don't start keep-alive mechanism - it causes blinking
      // this.startInfoWindowKeepAlive();
    });
  }

  // Aggressive keep-alive mechanism for InfoWindows
  startInfoWindowKeepAlive = () => {
    if (this.infoWindowKeepAlive) {
      clearInterval(this.infoWindowKeepAlive);
    }
    
    this.infoWindowKeepAlive = setInterval(() => {
      // Aggressively check and reopen InfoWindows
      this.openInfoWindows.forEach((infoWindow) => {
        try {
          // Check if InfoWindow is still attached to map
          if (!infoWindow.getMap() || infoWindow.getMap() !== this.map) {
            console.log('InfoWindow lost connection, reopening...');
            const marker = this.markers.find(m => m.infoWindow === infoWindow);
            if (marker && this.map) {
              infoWindow.open({
                anchor: marker,
                map: this.map,
                shouldFocus: false,
              });
            }
          }
        } catch (error) {
          console.warn('Error checking InfoWindow status:', error);
        }
      });
    }, 500); // Check every 500ms for more aggressive monitoring
  };

  updateMarkers = () => {
    if (!this.map || !window.google) return;

    // Clear existing markers and clusterer
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    const { data } = this.props;
    if (!data || !Array.isArray(data)) return;

    // Create markers for each observation
    // Group observations by coordinates to handle overlapping markers
    const coordinateGroups = new Map();
    
    data.forEach((observation, index) => {
      const lat = parseFloat(observation.Lat);
      const lng = parseFloat(observation.Long);

      if (isNaN(lat) || isNaN(lng)) return;

      const coordKey = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
      if (!coordinateGroups.has(coordKey)) {
        coordinateGroups.set(coordKey, []);
      }
      coordinateGroups.get(coordKey).push({ observation, index, lat, lng });
    });

    // Create markers with offset for overlapping coordinates
    coordinateGroups.forEach((observations, coordKey) => {
      // Log coordinates with multiple markers
      if (observations.length > 1) {
        console.log(`Found ${observations.length} markers at coordinate: ${coordKey}`);
      }
      
      observations.forEach((obsData, groupIndex) => {
        const { observation, index, lat, lng } = obsData;
        
        // Calculate offset for overlapping markers
        let offsetLat = lat;
        let offsetLng = lng;
        
        if (observations.length > 1) {
          // Spread markers in a circle pattern
          const radius = 0.0002; // Increased offset radius (~22 meters) for better visibility
          const angleStep = (2 * Math.PI) / observations.length;
          const angle = angleStep * groupIndex;
          
          offsetLat = lat + (radius * Math.cos(angle));
          offsetLng = lng + (radius * Math.sin(angle));
          
          console.log(`Marker ${groupIndex + 1}/${observations.length} at ${coordKey} offset to: ${offsetLat.toFixed(6)}, ${offsetLng.toFixed(6)}`);
        }

        // Determine marker color based on Seen/Heard value
        let iconUrl;
        const seenHeard = (observation["Seen/Heard"] || '').toLowerCase().trim();
        
        switch (seenHeard) {
          case 'seen':
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
            break;
          case 'heard':
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png';
            break;
          case 'not found':
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
            break;
          default:
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
        }

        const marker = new window.google.maps.Marker({
          position: { lat: offsetLat, lng: offsetLng },
          map: null, // Don't add to map directly, let clusterer handle it
          icon: {
            url: iconUrl,
            scaledSize: new window.google.maps.Size(25, 41),
            origin: new window.google.maps.Point(0, 0),
            anchor: new window.google.maps.Point(12, 41), // Bottom center of the marker
            labelOrigin: new window.google.maps.Point(12, 20), // Center for labels
          },
        });

        // Store observation reference for sidebar display
        marker.observation = observation;

        // Simple marker click handler to show details in sidebar
        marker.addListener('click', () => {
          console.log('Marker clicked - showing details in sidebar');
          this.setState({ selectedObservation: observation });
        });

        // Add marker to array for clustering
        this.markers.push(marker);
      });
    });

    // Log summary of marker creation
    console.log(`Total markers created: ${this.markers.length}`);
    console.log(`Total coordinate groups: ${coordinateGroups.size}`);
    const overlappingGroups = Array.from(coordinateGroups.values()).filter(group => group.length > 1);
    console.log(`Coordinate groups with multiple markers: ${overlappingGroups.length}`);

    // Initialize clustering if available
    if (window.MarkerClusterer && this.markers.length > 0) {
      // Custom cluster styles
      const clusterStyles = [
        {
          textColor: 'white',
          textSize: 12,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          url: this.createClusterIcon('#22c55e', 40), // Small clusters - Green
          height: 40,
          width: 40,
        },
        {
          textColor: 'white',
          textSize: 14,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          url: this.createClusterIcon('#f59e0b', 50), // Medium clusters - Orange
          height: 50,
          width: 50,
        },
        {
          textColor: 'white',
          textSize: 16,
          fontWeight: 'bold',
          fontFamily: 'Arial, sans-serif',
          url: this.createClusterIcon('#ef4444', 60), // Large clusters - Red
          height: 60,
          width: 60,
        }
      ];

      this.markerClusterer = new window.MarkerClusterer(this.map, this.markers, {
        gridSize: 40, // Increased grid size for better performance
        maxZoom: 13,  // Clusters break apart earlier when zooming in
        styles: clusterStyles,
        minimumClusterSize: 2,
        // Optimize for performance
        averageCenter: true,
        ignoreHidden: true,
        enableRetinaIcons: false, // Disable retina for better performance
      });
      console.log('Clustering enabled with', this.markers.length, 'markers');
    } else {
      // Fallback: add markers directly to map
      this.markers.forEach(marker => marker.setMap(this.map));
      console.log('Clustering not available, showing individual markers');
    }
  };

  // Helper function to create custom cluster icons
  createClusterIcon = (color, size) => {
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 2}" fill="${color}" stroke="#ffffff" stroke-width="3" opacity="0.9"/>
        <circle cx="${size/2}" cy="${size/2}" r="${size/2 - 8}" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.5"/>
      </svg>
    `;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  };

  componentWillUnmount() {
    // Clear loading timeout
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    // Clean up global callback if it exists
    if (window.initGoogleMaps) {
      delete window.initGoogleMaps;
    }
    
    // Clean up clusterer and markers
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
      this.markerClusterer = null;
    }
    
    // Clean up markers and their event listeners
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers = [];
    
    // Clear map reference
    if (this.map) {
      window.google.maps.event.clearInstanceListeners(this.map);
      this.map = null;
    }
  }

  // Handle map type changes from external controls
  handleMapTypeChangeFromControls = (mapType) => {
    if (!this.map || !window.google) return;

    const mapTypeId = window.google.maps.MapTypeId[mapType.toUpperCase()];
    if (mapTypeId) {
      this.map.setMapTypeId(mapTypeId);
    }
  };

  // Render detailed observation information in the sidebar
  renderObservationDetails = (observation) => {
    // Helper functions for formatting
    const formatDate = (dateValue) => {
      if (!dateValue) return 'Unknown';
      try {
        let date;
        
        // Handle different date formats
        if (typeof dateValue === 'string') {
          // Handle ISO date strings like "2024-12-15"
          if (dateValue.includes('-')) {
            date = new Date(dateValue);
          }
        }
        
        // Handle Excel serial number format
        if (typeof dateValue === 'number') {
          date = new Date((dateValue - 25569) * 86400 * 1000);
        }
        
        if (date && !isNaN(date.getTime())) {
          // Format as dd/mm/yyyy
          const day = date.getDate().toString().padStart(2, '0');
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        }
        
        return 'Invalid Date';
      } catch {
        return 'Invalid Date';
      }
    };

    const formatTime = (timeValue) => {
      if (!timeValue) return 'Unknown';
      try {
        // Handle string time formats like "08:45" or "8:45 AM"
        if (typeof timeValue === 'string') {
          // If already in 24-hour format, just ensure proper padding
          if (timeValue.includes(':') && !timeValue.includes('AM') && !timeValue.includes('PM')) {
            const [hours, minutes] = timeValue.split(':');
            const hour24 = parseInt(hours);
            const min = parseInt(minutes);
            
            if (!isNaN(hour24) && !isNaN(min) && hour24 >= 0 && hour24 <= 23) {
              return `${hour24.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} hrs`;
            }
          }
          
          // Convert from 12-hour format to 24-hour format
          if (timeValue.includes('AM') || timeValue.includes('PM')) {
            const isPM = timeValue.includes('PM');
            const timeOnly = timeValue.replace(/AM|PM/gi, '').trim();
            const [hours, minutes] = timeOnly.split(':');
            let hour24 = parseInt(hours);
            const min = parseInt(minutes);
            
            if (!isNaN(hour24) && !isNaN(min)) {
              if (isPM && hour24 !== 12) hour24 += 12;
              if (!isPM && hour24 === 12) hour24 = 0;
              
              return `${hour24.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')} hrs`;
            }
          }
        }
        
        // Handle Excel serial time format
        if (typeof timeValue === 'number') {
          const totalSeconds = Math.round(86400 * timeValue);
          const hours = Math.floor(totalSeconds / 3600) % 24;
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} hrs`;
        }
        
        return 'Invalid Time';
      } catch {
        return 'Invalid Time';
      }
    };

    // Extract and format data
    const location = observation.Location || 'Unknown Location';
    const seenHeardValue = observation["Seen/Heard"] || 'Unknown';
    const formattedDate = formatDate(observation.Date);
    const formattedTime = formatTime(observation.Time);
    const lat = parseFloat(observation.Lat).toFixed(6);
    const lng = parseFloat(observation.Long).toFixed(6);
    const observer = observation.Observer || observation["Observer name"] || '';
    const species = observation.Species || '';
    const notes = observation.Notes || '';
    
    // Additional fields from the data structure
    const shbId = observation["SHB individual ID"] || '';
    const numberOfBirds = observation["Number of Birds"] || '';
    const treeHeight = observation["Height of tree/m"] || '';
    const birdHeight = observation["Height of bird/m"] || '';
    const activity = observation.Activity || '';
    const activityDetails = observation["Activity Details"] || observation["Activity (foraging, preening, calling, perching, others)"] || '';
    const serialNumber = observation.serialNumber || '';
    
    const statusColor = seenHeardValue === 'seen' ? '#22c55e' : 
                       seenHeardValue === 'heard' ? '#f59e0b' : 
                       seenHeardValue === 'not found' ? '#dc2626' : '#3b82f6';

    return (
      <div>
        {/* Header with close button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          paddingBottom: '10px',
          borderBottom: '2px solid #e5e7eb'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937',
            maxWidth: '80%',
            wordWrap: 'break-word'
          }}>
            {location}
          </h3>
          <button
            onClick={() => this.setState({ selectedObservation: null })}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px',
              borderRadius: '4px',
              lineHeight: 1
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#f3f4f6'}
            onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Status */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            color: '#6b7280', 
            textTransform: 'uppercase',
            marginBottom: '4px'
          }}>
            Status
          </div>
          <div style={{
            color: statusColor,
            fontWeight: 'bold',
            textTransform: 'capitalize',
            fontSize: '16px'
          }}>
            {seenHeardValue}
          </div>
        </div>

        {/* Serial Number */}
        {serialNumber && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Serial #
            </div>
            <div style={{ fontSize: '14px', color: '#1f2937' }}>
              {serialNumber}
            </div>
          </div>
        )}

        {/* SHB ID and Number of Birds */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px', 
          marginBottom: '16px' 
        }}>
          {shbId && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#6b7280', 
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}>
                SHB Individual ID
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 'bold',
                color: '#059669'
              }}>
                {shbId}
              </div>
            </div>
          )}
          {numberOfBirds && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#6b7280', 
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}>
                Number of Birds
              </div>
              <div style={{ fontSize: '14px', color: '#1f2937' }}>
                {numberOfBirds}
              </div>
            </div>
          )}
        </div>

        {/* Observer */}
        {observer && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Observer Name
            </div>
            <div style={{ fontSize: '14px', color: '#1f2937' }}>
              {observer}
            </div>
          </div>
        )}

        {/* Date and Time */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px', 
          marginBottom: '16px' 
        }}>
          <div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Date
            </div>
            <div style={{ fontSize: '14px', color: '#1f2937' }}>
              {formattedDate}
            </div>
          </div>
          <div>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Time
            </div>
            <div style={{ fontSize: '14px', color: '#1f2937' }}>
              {formattedTime}
            </div>
          </div>
        </div>

        {/* Heights */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px', 
          marginBottom: '16px' 
        }}>
          {treeHeight && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#6b7280', 
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}>
                Tree Height (m)
              </div>
              <div style={{ fontSize: '14px', color: '#1f2937' }}>
                {treeHeight}
              </div>
            </div>
          )}
          {birdHeight && (
            <div>
              <div style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#6b7280', 
                textTransform: 'uppercase',
                marginBottom: '4px'
              }}>
                Bird Height (m)
              </div>
              <div style={{ fontSize: '14px', color: '#1f2937' }}>
                {birdHeight}
              </div>
            </div>
          )}
        </div>

        {/* Activity */}
        {activity && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Activity
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#1f2937',
              backgroundColor: '#f0f9ff',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #bae6fd'
            }}>
              {activity}
            </div>
          </div>
        )}

        {/* Activity Details */}
        {activityDetails && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Activity Details
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#1f2937',
              backgroundColor: '#f0f9ff',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #bae6fd'
            }}>
              {activityDetails}
            </div>
          </div>
        )}

        {/* Species */}
        {species && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Species
            </div>
            <div style={{ fontSize: '14px', color: '#1f2937' }}>
              {species}
            </div>
          </div>
        )}

        {/* Notes */}
        {notes && (
          <div style={{ marginBottom: '16px' }}>
            <div style={{ 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#6b7280', 
              textTransform: 'uppercase',
              marginBottom: '4px'
            }}>
              Notes
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#4b5563',
              fontStyle: 'italic',
              backgroundColor: '#f9fafb',
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              maxHeight: '120px',
              overflowY: 'auto',
              lineHeight: '1.4',
              wordWrap: 'break-word'
            }}>
              {notes}
            </div>
          </div>
        )}
      </div>
    );
  };

  render() {
    const { height = '100%' } = this.props;
    const { error, isLoadingMaps, isLoadingClusterer, isLoaded, selectedObservation } = this.state;

    if (error) {
      return (
        <div style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f3f4f6',
          border: '2px dashed #d1d5db',
          borderRadius: '8px'
        }}>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Google Maps Error</h3>
            <p style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{error}</p>
            <p style={{ margin: '0 0 16px 0', fontSize: '12px', opacity: 0.8 }}>Please check your API key and internet connection.</p>
            <button
              onClick={() => {
                this.retryCount = 0;
                this.setState({ 
                  error: null, 
                  isLoadingMaps: false, 
                  isLoadingClusterer: false,
                  isLoaded: false 
                });
                this.loadGoogleMapsScript();
              }}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              Retry Loading Map
            </button>
          </div>
        </div>
      );
    }

    const isLoading = isLoadingMaps || isLoadingClusterer || !isLoaded;

    return (
      <div style={{ display: 'flex', height, width: '100%' }}>
        {/* Map Container */}
        <div style={{ 
          flex: selectedObservation ? '1 1 70%' : '1 1 100%', 
          position: 'relative', 
          height: '100%',
          transition: 'flex 0.3s ease-in-out'
        }}>
          {/* Loading overlay */}
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              borderRadius: '8px'
            }}>
              {/* Loading spinner */}
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginBottom: '16px'
              }}></div>
              
              {/* Loading text */}
              <div style={{
                fontSize: '14px',
                color: '#6b7280',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {isLoadingMaps ? 'Loading Google Maps...' : 
                 isLoadingClusterer ? 'Loading Map Clustering...' : 
                 'Initializing Map...'}
              </div>
              
              {/* Progress indicator */}
              <div style={{
                width: '200px',
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                marginTop: '12px',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  backgroundColor: '#3b82f6',
                  borderRadius: '2px',
                  width: isLoadingMaps ? '33%' : isLoadingClusterer ? '66%' : '100%',
                  transition: 'width 0.3s ease-in-out'
                }}></div>
              </div>
            </div>
          )}
          
          <div 
            ref={this.mapRef} 
            style={{ 
              height: '100%', 
              width: '100%',
              borderRadius: '8px',
              overflow: 'hidden',
              opacity: isLoading ? 0.3 : 1,
              transition: 'opacity 0.3s ease-in-out'
            }} 
          />
        </div>

        {/* Details Sidebar */}
        {selectedObservation && (
          <div style={{
            flex: '0 0 30%',
            backgroundColor: '#ffffff',
            borderLeft: '1px solid #e5e7eb',
            padding: '20px',
            overflow: 'auto',
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {this.renderObservationDetails(selectedObservation)}
          </div>
        )}
        
        {/* Add CSS for spinner animation */}
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
}

export default GoogleMapComponent;
