import React, { Component } from 'react';
import { BASE_URL } from '../../config/apiConfig.js';
import { fetchMapConfig, SINGAPORE_CENTER, SINGAPORE_ZOOM, DEFAULT_MAP_TYPE } from '../../config/mapConfig';
import { normalizeMapMarkerValue } from '../../utils/surveyTypeUtils';

class GoogleMapComponent extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.map = null;
    this.markers = [];
    this.routePolyline = null;
    this.lastMarkerDataHash = null;
    this.hasFittedInitialMarkers = false;
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
      detailTab: 'overview',
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

    // Fetch map config from backend and then load Google Maps
    fetchMapConfig().then(config => {
      this.googleMapsApiKey = config.apiKey;
      this.loadGoogleMapsScript();
    }).catch(error => {
      console.error('Failed to fetch map config:', error);
      this.setState({
        error: 'Failed to initialize map. Please refresh the page.',
        isLoadingMaps: false
      });
    });
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

    // Define global callback FIRST before creating the script
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

    // Create script element with improved loading
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${this.googleMapsApiKey}&libraries=geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    
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

    const { zoom = SINGAPORE_ZOOM, center = SINGAPORE_CENTER } = this.props;
    
    // Initialize the map with optimized settings for faster loading
    this.map = new window.google.maps.Map(this.mapRef.current, {
      center: { lat: center.lat, lng: center.lng },
      zoom,
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

  normalizeLampPostKey = (value) => {
    if (value === null || value === undefined) return null;

    const text = String(value).trim();
    if (!text) return null;

    const cleaned = text
      .toUpperCase()
      .replace(/^NO\.?\s*/, '')
      .replace(/^LTA\s+/, '')
      .replace(/^LAMP\s*POST\s*/, '')
      .replace(/^LAMPPOST\s*/, '')
      .replace(/^LP\s*/, '')
      .replace(/^POST\s*/, '')
      .replace(/^#/, '')
      .replace(/[^A-Z0-9]/g, '');

    if (!cleaned) return null;

    const trimmed = cleaned.replace(/^0+(?=\d)/, '');
    const variants = [];

    if (trimmed) variants.push(trimmed);

    const numericOnly = trimmed.replace(/[^0-9]/g, '');
    if (numericOnly) variants.push(numericOnly);

    const alphaSuffixMatch = trimmed.match(/^(\d+)([A-Z])$/u);
    if (alphaSuffixMatch) {
      const [, numericPart, suffix] = alphaSuffixMatch;
      variants.push(`${numericPart}${suffix}`);
      variants.push(numericPart);
    }

    return [...new Set(variants.filter(Boolean))].find(Boolean) || null;
  };

  getLampPostLookupKeys = (value) => {
    const normalizedKey = this.normalizeLampPostKey(value);
    if (!normalizedKey) return [];

    const keys = new Set([normalizedKey]);
    const numericPart = normalizedKey.replace(/[^0-9]/g, '');
    const alphaPart = normalizedKey.replace(/[^A-Z]/g, '');

    if (numericPart) {
      keys.add(numericPart);
      keys.add(String(Number(numericPart)));
    }

    if (alphaPart) {
      keys.add(`${numericPart}${alphaPart}`);
    }

    return Array.from(keys).filter(Boolean);
  };

  getCoordinatesForObservation = (observation) => {
    const coordinateText = observation['Co-ordinates/Nearest Landmarks']
      ?? observation['Co-ordinates/Nearest Landmark']
      ?? observation['Nearest Landmarks']
      ?? observation.Landmark;

    const directCoordinates = coordinateText ? (() => {
      const parts = String(coordinateText).trim().split(/[\s,]+/).filter(Boolean);
      if (parts.length < 2) return null;
      const lat = Number.parseFloat(parts[0]);
      const lng = Number.parseFloat(parts[1]);
      return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
    })() : null;

    if (directCoordinates) {
      return directCoordinates;
    }

    const latValue = observation.Lat ?? observation.Latitude ?? observation.latitude ?? observation.lat;
    const lngValue = observation.Long ?? observation.Lon ?? observation.Longitude ?? observation.longitude ?? observation.lng;
    const lat = Number(latValue);
    const lng = Number(lngValue);

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }

    return null;
  };

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

  getMarkerDataHash = (data) => {
    if (!Array.isArray(data)) return 'empty';

    return data.map(observation => {
      if (!observation) return 'null';
      const lat = observation.Lat ?? observation.Latitude ?? observation.latitude ?? observation.lat;
      const lng = observation.Long ?? observation.Lon ?? observation.Longitude ?? observation.longitude ?? observation.lng;
      return [
        observation._id || observation.id || observation.Location || '',
        observation.type || '',
        lat,
        lng,
        observation['Co-ordinates/Nearest Landmarks'] || '',
        observation['Which side of the road is it on? (N/S/On road)'] || '',
        observation['Seen/Heard'] || ''
      ].join(':');
    }).join('|');
  };

  updateMarkers = () => {
    if (!this.map || !window.google) return;

    const { data, isRifleRangeRoad = false, isExternalSurvey = false } = this.props;
    const markerDataHash = this.getMarkerDataHash(data);
    if (markerDataHash === this.lastMarkerDataHash) return;
    this.lastMarkerDataHash = markerDataHash;

    // Clear existing markers and clusterer
    if (this.markerClusterer) {
      this.markerClusterer.clearMarkers();
    }
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];
    if (this.routePolyline) {
      this.routePolyline.setMap(null);
      this.routePolyline = null;
    }

    if (!data || !Array.isArray(data)) return;

    // Create markers for each observation
    // Group observations by coordinates to handle overlapping markers
    const coordinateGroups = new Map();
    
    data.forEach((observation, index) => {
      const coordinates = this.getCoordinatesForObservation(observation);
      if (!coordinates) return;

      const markerValue = normalizeMapMarkerValue(observation, isExternalSurvey || isRifleRangeRoad);
      if (!markerValue) {
        console.log('Skipping map marker for invalid/unknown marker state:', observation['Co-ordinates/Nearest Landmarks'] || observation.Location || observation._id || 'unknown');
        return;
      }

      const { lat, lng } = coordinates;

      const coordKey = `${lat.toFixed(6)}_${lng.toFixed(6)}`;
      if (!coordinateGroups.has(coordKey)) {
        coordinateGroups.set(coordKey, []);
      }
      coordinateGroups.get(coordKey).push({ observation, index, lat, lng });
    });

    if (coordinateGroups.size > 0 && !isRifleRangeRoad && !this.hasFittedInitialMarkers) {
      const bounds = new window.google.maps.LatLngBounds();
      coordinateGroups.forEach(observations => {
        observations.forEach(({ lat, lng }) => bounds.extend({ lat, lng }));
      });
      this.map.fitBounds(bounds, 48);
      this.hasFittedInitialMarkers = true;
    }

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

        // Determine marker color based on the active map legend
        let iconUrl;
        const markerValue = normalizeMapMarkerValue(observation, isExternalSurvey || isRifleRangeRoad);

        switch (markerValue) {
          case 'seen':
          case 'on bridge':
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
            break;
          case 'heard':
          case 'off bridge':
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

    // Initialize clustering only for Rifle Range Road at zoom 16; other maps stay unclustered.
    const shouldCluster = Boolean(isRifleRangeRoad);
    if (window.MarkerClusterer && this.markers.length > 0 && shouldCluster) {
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
        gridSize: 40,
        maxZoom: 18,
        styles: clusterStyles,
        minimumClusterSize: 2,
        averageCenter: true,
        ignoreHidden: true,
        enableRetinaIcons: false,
        zoomOnClick: true,
      });

      console.log('Rifle Range Road clustering enabled with', this.markers.length, 'markers from zoom 15 to 18');
    } else {
      // Fallback: add markers directly to map
      this.markers.forEach(marker => marker.setMap(this.map));
      console.log('Clustering disabled for this map view, showing individual markers');
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
    if (this.map?.data) {
    }
    this.routePolyline = null;
    this.hasFittedInitialMarkers = false;
    
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
          } else if (dateValue.includes('/')) {
            const [day, month, year] = dateValue.split('/').map(Number);
            date = new Date(year, month - 1, day);
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

    // Extract and format data from both survey schemas
    const isRifleRangeRoad = Boolean(this.props.isRifleRangeRoad);
    const hasRifleSurveyFields = isRifleRangeRoad || Boolean(observation['Survey Date'] || observation['Time of Observation'] || observation['Which side of the road is it on? (N/S/On road)'] || observation['Which side of the road was it on?']);
    const commonName = observation['Common Name (If unavailable, sci name)'] || observation['Common Name'] || observation.Species || '';
    const scientificName = observation['Scientific Name (Genus/Species)'] || observation['Genus/Species Name'] || observation['Scientific Name'] || '';
    const location = observation.Location || observation.Site || observation['Survey Location'] || observation['Co-ordinates/Nearest Landmarks'] || (hasRifleSurveyFields ? 'Rifle Range Road' : 'Unknown Location');
    const seenHeardValue = hasRifleSurveyFields
      ? observation['Which side of the road is it on? (N/S/On road)'] || observation['Which side of the road was it on?'] || observation['Road Side'] || 'Unknown'
      : observation['Seen/Heard'] || 'Unknown';
    const formattedDate = formatDate(observation['Survey Date'] || observation['Survey date'] || observation.Date);
    const formattedTime = formatTime(observation['Time of Observation'] || observation['Observation Time'] || observation.Time);
    const resolvedCoordinates = this.getCoordinatesForObservation(observation);
    const lat = resolvedCoordinates ? resolvedCoordinates.lat.toFixed(6) : 'Unknown';
    const lng = resolvedCoordinates ? resolvedCoordinates.lng.toFixed(6) : 'Unknown';
    const observer = observation.Observer || observation['Observer name'] || observation['Observer Name'] || observation['Name of Surveyors'] || observation['iNat Username'] || '';
    const species = commonName || scientificName;
    const notes = observation.Notes || observation['Behaviours observed and/or other remarks'] || observation['Remarks'] || '';
    
    // Additional fields from the data structure
    const shbId = observation["SHB individual ID"] || '';
    const numberOfBirds = observation["Number of Birds"] || observation.Count || observation.count || '';
    const treeHeight = observation["Height of tree/m"] || '';
    const birdHeight = observation["Height of bird/m"] || '';
    const activity = observation.Activity || observation['Behaviour'] || '';
    const activityDetails = observation["Activity Details"] || observation["Activity (foraging, preening, calling, perching, others)"] || '';
    const surveyDirection = observation['Survey Direction'] || '';
    const surveyTimeRange = observation['Survey Start Time and End Time'] || '';
    const serialNumber = observation.serialNumber || '';
    const taxonomy = observation.Taxa || observation.Taxonomy || '';
    const targetSpecies = observation['Target Species?'] || observation['Target Species'] || '';
    const identified = observation['Identified?'] || '';
    const roadkill = observation['Roadkill?'] || '';
    const srdb3Status = observation['SRDB3 Status'] || observation['SRDB3 status'] || '';
    const iucnStatus = observation['IUCN Status'] || observation['IUCN status'] || '';
    const imageUrl = observation['Image URL'] || observation['Upload any pictures if available.'] || observation.imageUrl || '';
    const displayedFields = new Set([
      '_id', 'id', 'Location', 'Site', 'Survey Location', 'Seen/Heard',
      'Which side of the road is it on? (N/S/On road)', 'Which side of the road was it on?', 'Road Side', 'Survey Date',
      'Survey date', 'Date', 'Time of Observation', 'Observation Time', 'Time',
      'Lat', 'Latitude', 'latitude', 'lat', 'Long', 'Lon', 'Longitude', 'longitude', 'lng',
      'Observer', 'Observer name', 'Observer Name', 'Name of Surveyors', 'iNat Username', 'Species',
      'Common Name (If unavailable, sci name)', 'Common Name', 'Scientific Name (Genus/Species)',
      'Genus/Species Name', 'Scientific Name', 'Notes', 'Behaviours observed and/or other remarks', 'Remarks',
      'Image URL', 'Upload any pictures if available.', 'imageUrl', 'Survey Start Time', 'Survey End Time',
      'Survey Start Time and End Time', 'Survey Direction', 'Co-ordinates/Nearest Landmarks',
      'SHB individual ID', 'Number of Birds', 'Count', 'count', 'Height of tree/m',
      'Height of bird/m', 'Activity', 'Behaviour', 'Activity Details',
      'Activity (foraging, preening, calling, perching, others)', 'serialNumber',
      'Taxa', 'Taxonomy', 'Target Species?', 'Target Species', 'Identified?', 'Roadkill?',
      'SRDB3 Status', 'SRDB3 status', 'IUCN Status', 'IUCN status'
    ]);
    const additionalFields = Object.entries(observation).filter(([key, value]) =>
      !displayedFields.has(key) && value !== null && value !== undefined && String(value).trim() !== ''
    );
    
    const normalizedStatus = String(seenHeardValue).toLowerCase().trim();
    const statusColor = normalizedStatus === 'seen' || normalizedStatus === 'north' || normalizedStatus === 'n'
      ? '#22c55e'
      : normalizedStatus === 'heard' || normalizedStatus === 'south' || normalizedStatus === 's'
        ? '#f59e0b'
        : normalizedStatus === 'not found' || normalizedStatus === 'on road'
          ? '#dc2626'
          : '#3b82f6';

    const surveyFields = [
      ['Status', seenHeardValue],
      ['Identified?', identified],
      ['Count', numberOfBirds],
      ['Roadkill?', roadkill],
      ['Observer Name', observer],
      ['Date', formattedDate],
      ['Time', formattedTime],
      ['Survey Start Time', observation['Survey Start Time']],
      ['Survey End Time', observation['Survey End Time']],
      ['Survey Time', surveyTimeRange],
      ['Survey Direction', surveyDirection],
      ['Activity', activity],
      ['Activity Details', activityDetails],
      ['Behaviours / Remarks', notes],
      ['Serial #', serialNumber],
      ['Location', location],
      ['Latitude', lat],
      ['Longitude', lng]
    ].filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '');

    const detailTab = this.state.detailTab === 'survey' ? 'survey' : 'overview';

    if (hasRifleSurveyFields) {
      return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <button type="button" aria-label="Close survey details" onClick={() => this.setState({ selectedObservation: null })} style={{ background: 'none', border: 0, color: '#52647d', fontSize: '24px', cursor: 'pointer' }}>x</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: imageUrl ? 'minmax(0, 1fr) minmax(0, 1.35fr)' : 'minmax(0, 1fr)', gap: '24px', alignItems: 'stretch', minHeight: 0, flex: 1, overflow: 'hidden' }}>
          {imageUrl && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0, overflow: 'hidden' }}><a href={imageUrl} target="_blank" rel="noreferrer" aria-label={`Open full-size image for ${commonName || 'survey observation'}`}><img src={imageUrl} alt={commonName || 'Survey observation'} style={{ display: 'block', width: '100%', height: 'auto', maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', border: '1px solid #dbe5df', background: '#f8faf9', cursor: 'zoom-in' }} onError={(event) => { event.currentTarget.style.display = 'none'; }} /></a></div>}
            <div style={{ minHeight: 0, height: '100%', overflowY: 'auto', overflowX: 'hidden', paddingRight: '8px' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 3, paddingTop: '8px', backgroundColor: '#ffffff' }}>
          <h3 style={{ margin: 0, color: '#142039', fontSize: '28px', lineHeight: 1.2 }}>{commonName || location}</h3>
          {scientificName && <div style={{ marginTop: '10px', color: '#52647d', fontSize: '20px', fontStyle: 'italic' }}>{scientificName}</div>}

        {(taxonomy || targetSpecies || srdb3Status || iucnStatus) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '18px 24px', padding: '18px', marginBottom: '20px', border: '1px solid #9bbcab', borderRadius: '10px', background: '#edf3ef' }}>
            {[[ 'Taxonomy', taxonomy ], [ 'Target Species', targetSpecies ], [ 'SRDB3 Status', srdb3Status ], [ 'IUCN Status', iucnStatus ]].filter(([, value]) => value).map(([label, value]) => (
              <div key={label}><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div><strong style={{ color: '#142039', fontSize: '19px' }}>{value}</strong></div>
            ))}
          </div>
        )}

        <div role="tablist" aria-label="Survey detail sections" style={{ position: 'sticky', top: 0, zIndex: 2, display: 'flex', gap: '26px', borderBottom: '1px solid #dbe5df', margin: '0 0 20px', padding: '8px 0 4px', backgroundColor: '#ffffff', isolation: 'isolate' }}>
          {[['overview', 'Overview'], ['survey', 'Survey']].map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={detailTab === key} onClick={() => this.setState({ detailTab: key })} style={{ padding: '0 0 12px', border: 0, borderBottom: detailTab === key ? '3px solid #7ba995' : '3px solid transparent', outline: 'none', background: 'none', color: detailTab === key ? '#142039' : '#52647d', fontSize: '17px', fontWeight: detailTab === key ? 700 : 400, cursor: 'pointer' }}>{label}</button>
          ))}
        </div>
        </div>

        {detailTab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '22px 28px', marginBottom: '24px' }}>
              {[['Identified?', identified], ['Count', numberOfBirds], ['Roadkill?', roadkill]].filter(([, value]) => value).map(([label, value]) => (
                <div key={label}><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>{label}</div><div style={{ color: '#142039', fontSize: '19px' }}>{value}</div></div>
              ))}
            </div>
            {notes && <div style={{ padding: '18px', border: '1px solid #9bbcab', borderRadius: '10px', background: '#edf3ef' }}><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>Behaviours / Remarks</div><div style={{ color: '#142039', fontSize: '17px', lineHeight: 1.6 }}>{notes}</div></div>}
          </div>
        )}

        {detailTab === 'survey' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 24px' }}>{surveyFields.map(([label, value]) => <div key={label} style={{ minWidth: 0, padding: '8px 0', borderBottom: '1px solid #edf2f0' }}><strong style={{ display: 'block', color: '#52647d', fontSize: '12px', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '6px' }}>{label}</strong><span style={{ color: '#142039', overflowWrap: 'anywhere' }}>{String(value)}</span></div>)}</div>
              {additionalFields.length > 0 && <div style={{ marginTop: '22px' }}><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '10px' }}>Additional Survey Details</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 24px' }}>{additionalFields.map(([key, value]) => <div key={key} style={{ minWidth: 0, padding: '8px 0', borderBottom: '1px solid #edf2f0' }}><strong style={{ display: 'block', color: '#64748b', fontSize: '12px', marginBottom: '6px', overflowWrap: 'anywhere' }}>{key}</strong><span style={{ color: '#142039', overflowWrap: 'anywhere' }}>{String(value)}</span></div>)}</div></div>}
            </div>
        )}

          </div>
        </div>
      </div>
      );
    }

    /* Legacy detail markup retained below for reference. */
    return (
      <div>
        {/* Header with close button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
          padding: '20px 0 10px 20px',
          paddingBottom: '10px',
          backgroundColor: '#ffffff'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: 'bold',
            color: '#1f2937',
            maxWidth: '80%',
            wordWrap: 'break-word'
          }}>
            {commonName || location}
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

        {scientificName && (
          <div style={{ color: '#64748b', fontSize: '18px', fontStyle: 'italic', marginBottom: '24px' }}>
            {scientificName}
          </div>
        )}

        {(taxonomy || targetSpecies || srdb3Status || iucnStatus) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px 28px', padding: '20px 18px', marginBottom: '24px', border: '1px solid #9bbcab', borderRadius: '10px', backgroundColor: '#edf3ef' }}>
            {taxonomy && <div><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Taxonomy</div><strong style={{ fontSize: '20px', color: '#142039' }}>{taxonomy}</strong></div>}
            {targetSpecies && <div><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Target Species</div><strong style={{ fontSize: '20px', color: '#142039' }}>{targetSpecies}</strong></div>}
            {srdb3Status && <div><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>SRDB3 Status</div><strong style={{ fontSize: '20px', color: '#142039' }}>{srdb3Status}</strong></div>}
            {iucnStatus && <div><div style={{ color: '#52647d', fontSize: '12px', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>IUCN Status</div><strong style={{ fontSize: '20px', color: '#142039' }}>{iucnStatus}</strong></div>}
          </div>
        )}

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

        {hasRifleSurveyFields && (identified || numberOfBirds || roadkill) && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px 28px', marginBottom: '24px' }}>
            {identified && <div><div style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Identified?</div><div style={{ fontSize: '18px', color: '#1f2937' }}>{identified}</div></div>}
            {numberOfBirds && <div><div style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Count</div><div style={{ fontSize: '18px', color: '#1f2937' }}>{numberOfBirds}</div></div>}
            {roadkill && <div><div style={{ fontSize: '12px', color: '#6b7280', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Roadkill?</div><div style={{ fontSize: '18px', color: '#1f2937' }}>{roadkill}</div></div>}
          </div>
        )}

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
              {hasRifleSurveyFields ? 'Common Name' : 'Species'}
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
              {hasRifleSurveyFields ? 'Behaviours / Remarks' : 'Notes'}
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

        {additionalFields.length > 0 && (
          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '12px' }}>
              Additional Survey Details
            </div>
            {additionalFields.map(([key, value]) => (
              <div key={key} style={{ display: 'grid', gridTemplateColumns: 'minmax(140px, 1fr) minmax(0, 2fr)', gap: '12px', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                <strong style={{ color: '#64748b', fontSize: '12px', overflowWrap: 'anywhere' }}>{key}</strong>
                <span style={{ color: '#1f2937', fontSize: '14px', overflowWrap: 'anywhere' }}>{String(value)}</span>
              </div>
            ))}
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
        <style>{`
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
