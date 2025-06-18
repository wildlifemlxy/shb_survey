import React, { Component } from 'react';
import { Wrapper, Status } from '@googlemaps/react-wrapper';

const render = (status) => {
  switch (status) {
    case Status.LOADING:
      return <div className="map-loading">Loading Singapore Map...</div>;
    case Status.FAILURE:
      return <div className="map-error">Error loading map</div>;
    default:
      return null;
  }
};

class GoogleMapComponent extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this.map = null;
    this.markers = [];
    this.infoWindow = null;
  }

  componentDidMount() {
    this.initializeMap();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.data !== this.props.data) {
      this.updateMarkers();
    }
  }

  initializeMap = () => {
    if (!this.mapRef.current) return;

    // Singapore center coordinates
    const singaporeCenter = { lat: 1.3521, lng: 103.8198 };
    
    this.map = new window.google.maps.Map(this.mapRef.current, {
      zoom: 11,
      center: singaporeCenter,
      mapTypeId: 'hybrid', // Shows satellite view with street names
      styles: [
        {
          featureType: 'poi.park',
          elementType: 'geometry',
          stylers: [{ color: '#2E7D32' }] // Highlight parks in darker green
        },
        {
          featureType: 'landscape.natural',
          elementType: 'geometry',
          stylers: [{ color: '#4CAF50' }] // Natural areas in green
        },
        {
          featureType: 'water',
          elementType: 'geometry',
          stylers: [{ color: '#0288D1' }] // Water in blue
        }
      ],
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: window.google.maps.MapTypeControlStyle.HORIZONTAL_BAR,
        position: window.google.maps.ControlPosition.TOP_CENTER,
      },
      zoomControl: true,
      zoomControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_CENTER,
      },
      scaleControl: true,
      streetViewControl: true,
      streetViewControlOptions: {
        position: window.google.maps.ControlPosition.RIGHT_TOP,
      },
      fullscreenControl: true,
    });

    this.infoWindow = new window.google.maps.InfoWindow();
    this.updateMarkers();
  };

  updateMarkers = () => {
    if (!this.map || !this.props.data) return;

    // Clear existing markers
    this.markers.forEach(marker => marker.setMap(null));
    this.markers = [];

    // Create markers for each observation
    this.props.data.forEach((observation, index) => {
      const lat = parseFloat(observation.Lat);
      const lng = parseFloat(observation.Long);

      if (!isNaN(lat) && !isNaN(lng)) {
        // Singapore-themed marker colors based on activity
        const getMarkerColor = (activity) => {
          if (!activity || typeof activity !== 'string') return '#DC2626'; // Singapore Red default
          const activityLower = activity.toLowerCase();
          if (activityLower.includes('calling')) return '#059669'; // Green for calling
          if (activityLower.includes('singing')) return '#2563EB'; // Blue for singing
          if (activityLower.includes('perching')) return '#D97706'; // Orange for perching
          if (activityLower.includes('foraging')) return '#7C3AED'; // Purple for foraging
          if (activityLower.includes('preening')) return '#0891B2'; // Cyan for preening
          return '#DC2626'; // Singapore Red default
        };

        const marker = new window.google.maps.Marker({
          position: { lat, lng },
          map: this.map,
          title: `${observation.Location} - ${observation['SHB individual ID (e.g. SHB1)']}`,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: getMarkerColor(observation.Activity),
            fillOpacity: 0.8,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
          },
        });

        // Create info window content
        const infoContent = `
          <div class="marker-info">
            <h4>${observation.Location}</h4>
            <p><strong>Bird ID:</strong> ${observation['SHB individual ID (e.g. SHB1)'] || 'N/A'}</p>
            <p><strong>Observer:</strong> ${observation['Observer name'] || 'N/A'}</p>
            <p><strong>Date:</strong> ${this.formatDate(observation.Date)}</p>
            <p><strong>Time:</strong> ${this.formatTime(observation.Time)}</p>
            <p><strong>Activity:</strong> ${observation.Activity || 'N/A'}</p>
            <p><strong>Tree Height:</strong> ${observation['Height of tree/m'] || 'N/A'}m</p>
            <p><strong>Bird Height:</strong> ${observation['Height of bird/m'] || 'N/A'}m</p>
            <p><strong>Coordinates:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
          </div>
        `;

        marker.addListener('click', () => {
          this.infoWindow.setContent(infoContent);
          this.infoWindow.open(this.map, marker);
        });

        this.markers.push(marker);
      }
    });

    // Fit map to show all markers if there are any
    if (this.markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      this.markers.forEach(marker => bounds.extend(marker.getPosition()));
      this.map.fitBounds(bounds);
      
      // Don't zoom in too much for single marker
      if (this.markers.length === 1) {
        this.map.setZoom(15);
      }
    }
  };

  formatDate = (excelDate) => {
    if (!excelDate) return 'N/A';
    if (typeof excelDate === 'string') return excelDate;
    
    // Convert Excel serial date to JavaScript date
    const date = new Date((excelDate - 25569) * 86400 * 1000);
    return date.toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  formatTime = (excelTime) => {
    if (!excelTime) return 'N/A';
    if (typeof excelTime === 'string') return excelTime;
    
    // Convert Excel time fraction to time string
    const totalSeconds = Math.round(86400 * excelTime);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  render() {
    return (
      <div className="google-map-container" style={{
        border: '2px solid #DC2626',
        borderRadius: '8px',
        overflow: 'hidden',
        background: '#F9FAFB'
      }}>
        <div className="map-header" style={{
          background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
          color: 'white',
          padding: '12px 16px'
        }}>
          <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🇸🇬</span>
            Live Singapore Conservation Map
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '8px' }}>
              <path d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22S19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9S10.62 6.5 12 6.5S14.5 7.62 14.5 9S13.38 11.5 12 11.5Z"/>
            </svg>
          </h3>
          <div className="map-legend">
            <div className="legend-item">
              <div className="legend-marker" style={{backgroundColor: '#4CAF50'}}></div>
              <span>Calling</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker" style={{backgroundColor: '#2196F3'}}></div>
              <span>Singing</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker" style={{backgroundColor: '#FF9800'}}></div>
              <span>Perching</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker" style={{backgroundColor: '#9C27B0'}}></div>
              <span>Foraging</span>
            </div>
            <div className="legend-item">
              <div className="legend-marker" style={{backgroundColor: '#00BCD4'}}></div>
              <span>Preening</span>
            </div>
          </div>
        </div>
        <div ref={this.mapRef} className="google-map" />
        <div className="map-footer">
          <p>Total Observations: {this.props.data?.length || 0} | Singapore Straw-headed Bulbul Conservation Project</p>
        </div>
      </div>
    );
  }
}

class GoogleMap extends Component {
  render() {
    return (
      <Wrapper
        apiKey="AIzaSyBHNr0vGHGPGHGPGHGPGHGPGHGPGHGPGH" // Replace with your Google Maps API key
        render={render}
        libraries={['places', 'geometry']}
      >
        <GoogleMapComponent {...this.props} />
      </Wrapper>
    );
  }
}

export default GoogleMap;
