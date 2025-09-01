import React, { Component } from 'react';
import { GOOGLE_MAPS_API_KEY } from '../../config/mapConfig';

class GoogleMapWithClustering extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.map = null;
    this.markers = [];
    this.markerClusterer = null;
    this.state = {
      isLoaded: false,
      error: null
    };
  }

  componentDidMount() {
    console.log('GoogleMapWithClustering mounted');
    console.log('API Key:', GOOGLE_MAPS_API_KEY ? 'Available' : 'Missing');
    this.loadGoogleMapsScript();
  }

  componentDidUpdate(prevProps) {
    // Update markers when data changes
    if (prevProps.data !== this.props.data && this.map) {
      this.updateMarkers();
    }
    
    // Update zoom when zoom prop changes
    if (prevProps.zoom !== this.props.zoom && this.map) {
      this.map.setZoom(this.props.zoom);
    }
  }

  loadGoogleMapsScript = () => {
    console.log('Loading Google Maps script...');
    // Check if Google Maps is already loaded
    if (window.google && window.google.maps) {
      console.log('Google Maps already loaded');
      this.setState({ isLoaded: true });
      this.initializeMap();
      return;
    }

    // Create script element for Google Maps
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Google Maps script loaded successfully');
      this.setState({ isLoaded: true });
      this.initializeMap();
    };
    
    script.onerror = () => {
      console.error('Failed to load Google Maps script');
      this.setState({ error: 'Failed to load Google Maps API' });
    };

    console.log('Adding Google Maps script to document head...');
    document.head.appendChild(script);
  };

  initializeMap = () => {
    console.log('Initializing Google Maps...');
    if (!this.mapRef.current || !window.google) {
      console.error('Map ref or Google Maps not available');
      return;
    }

    const { zoom = 11 } = this.props;
    
    try {
      // Initialize the map
      this.map = new window.google.maps.Map(this.mapRef.current, {
        center: { lat: 1.352083, lng: 103.819836 }, // Singapore center
        zoom: zoom,
        mapTypeId: window.google.maps.MapTypeId.SATELLITE, // Force satellite view only
        restriction: {
          latLngBounds: {
            north: 1.5504753,
            south: 1.1304753,
            west: 103.6920359,
            east: 104.0120359,
          },
        },
        streetViewControl: false, // Disable street view
        mapTypeControl: false, // Disable map type controls since we only want satellite
        zoomControl: true,
        zoomControlOptions: {
          position: window.google.maps.ControlPosition.RIGHT_CENTER,
        },
        fullscreenControl: true,
        scaleControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });

      console.log('Google Maps initialized successfully');

      // Add zoom change listener
      this.map.addListener('zoom_changed', () => {
        const newZoom = this.map.getZoom();
        if (this.props.onZoomLevelChange) {
          this.props.onZoomLevelChange(newZoom);
        }
      });

      // Add click listener to close popups
      this.map.addListener('click', () => {
        if (this.props.closeObservationPopup) {
          this.props.closeObservationPopup();
        }
      });

      // Initialize markers
      this.updateMarkers();
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      this.setState({ error: `Failed to initialize map: ${error.message}` });
    }
  };

  updateMarkers = () => {
    if (!this.map || !window.google) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    const { data } = this.props;
    if (!data || !Array.isArray(data)) return;

    // Create markers for each observation
    data.forEach((observation, index) => {
      const lat = parseFloat(observation.Lat);
      const lng = parseFloat(observation.Long);

      if (isNaN(lat) || isNaN(lng)) return;

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
          iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png';
          break;
        default:
          iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png';
      }

      const marker = new window.google.maps.Marker({
        position: { lat, lng },
        map: this.map,
        title: `${observation.Location || 'Unknown Location'} - ${seenHeard}`,
        icon: {
          url: iconUrl,
          scaledSize: new window.google.maps.Size(25, 41),
          origin: new window.google.maps.Point(0, 0),
          anchor: new window.google.maps.Point(12, 41),
        },
      });

      // Create info window content
      const infoContent = this.createInfoWindowContent(observation);
      const infoWindow = new window.google.maps.InfoWindow({
        content: infoContent,
        maxWidth: 350,
      });

      // Add click listener to marker
      marker.addListener('click', () => {
        // Close any open info windows
        this.markers.forEach(m => {
          if (m.infoWindow) {
            m.infoWindow.close();
          }
        });

        // Open this info window
        infoWindow.open(this.map, marker);
        
        // Call the parent's popup handler if provided
        if (this.props.openObservationPopup) {
          this.props.openObservationPopup(observation);
        }
      });

      // Store reference to info window
      marker.infoWindow = infoWindow;
      this.markers.push(marker);
    });

    console.log(`Created ${this.markers.length} markers on the map`);
  };

  createInfoWindowContent = (observation) => {
    const formatDate = (serialDate) => {
      if (!serialDate) return 'Unknown';
      try {
        const date = new Date((serialDate - 25569) * 86400 * 1000);
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      } catch {
        return 'Invalid Date';
      }
    };

    const formatTime = (serialTime) => {
      if (!serialTime) return 'Unknown';
      try {
        if (typeof serialTime === 'string' && (serialTime.includes('AM') || serialTime.includes('PM'))) {
          return serialTime;
        }
        const totalSeconds = Math.round(86400 * serialTime);
        const hours = Math.floor(totalSeconds / 3600) % 24;
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
      } catch {
        return 'Invalid Time';
      }
    };

    return `
      <div style="max-width: 300px; font-family: Arial, sans-serif; line-height: 1.4;">
        <h3 style="margin: 0 0 12px 0; color: #1f2937; font-size: 16px; font-weight: 600;">
          🐦 ${observation.Location || 'Unknown Location'}
        </h3>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">Status:</strong> 
          <span style="
            color: ${observation["Seen/Heard"] === 'seen' ? '#059669' : 
                   observation["Seen/Heard"] === 'heard' ? '#d97706' : 
                   observation["Seen/Heard"] === 'not found' ? '#6b7280' : '#2563eb'};
            font-weight: 600;
            text-transform: capitalize;
          ">
            ${observation["Seen/Heard"] || 'Unknown'}
          </span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">📅 Date:</strong> 
          <span style="color: #6b7280;">${formatDate(observation.Date)}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">🕐 Time:</strong> 
          <span style="color: #6b7280;">${formatTime(observation.Time)}</span>
        </div>
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">📍 Coordinates:</strong> 
          <span style="color: #6b7280; font-family: monospace;">${observation.Lat}, ${observation.Long}</span>
        </div>
        ${observation.Observer ? `
        <div style="margin-bottom: 8px;">
          <strong style="color: #374151;">👤 Observer:</strong> 
          <span style="color: #6b7280;">${observation.Observer}</span>
        </div>
        ` : ''}
        ${observation.Notes ? `
        <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;">
          <strong style="color: #374151;">📝 Notes:</strong><br>
          <span style="font-style: italic; color: #4b5563; margin-top: 4px; display: block;">${observation.Notes}</span>
        </div>
        ` : ''}
      </div>
    `;
  };

  render() {
    const { height = '100%' } = this.props;
    const { error, isLoaded } = this.state;

    if (error) {
      return (
        <div style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          border: '2px dashed #d1d5db',
          borderRadius: '12px',
          margin: '16px'
        }}>
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Google Maps Error</h3>
            <p style={{ margin: '0 0 8px 0' }}>{error}</p>
            <p style={{ margin: 0, fontSize: '14px' }}>Please check your API key and internet connection.</p>
          </div>
        </div>
      );
    }

    if (!isLoaded) {
      return (
        <div style={{ 
          height, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          margin: '16px'
        }}>
          <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px' }}>
            <div style={{ 
              fontSize: '48px', 
              marginBottom: '16px',
              animation: 'pulse 2s infinite'
            }}>🗺️</div>
            <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Loading Google Maps...</h3>
            <p style={{ margin: 0, fontSize: '14px' }}>Please wait while we initialize the map</p>
            <div style={{
              width: '40px',
              height: '4px',
              background: '#e5e7eb',
              borderRadius: '2px',
              margin: '16px auto',
              overflow: 'hidden'
            }}>
              <div style={{
                width: '40px',
                height: '4px',
                background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
                borderRadius: '2px',
                animation: 'loading 1.5s infinite'
              }}></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={{ position: 'relative', height, width: '100%' }}>
        <div 
          ref={this.mapRef} 
          style={{ 
            height, 
            width: '100%',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }} 
        />
        {/* Removed MapControls since we only want satellite view */}
        <style jsx>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    );
  }
}

export default GoogleMapWithClustering;
