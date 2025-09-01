// Google Maps Integration Service
// This service handles Google Maps API integration for enhanced features

import { GOOGLE_MAPS_API_KEY, USE_GOOGLE_MAPS, GOOGLE_MAP_TYPES, DEFAULT_MAP_TYPE } from '../config/mapConfig';

class GoogleMapsService {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
  }

  // Load Google Maps JavaScript API
  async loadGoogleMapsAPI() {
    if (this.isLoaded) {
      return Promise.resolve(window.google);
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve(window.google);
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve(window.google);
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Get enhanced tile URLs with API key for better rate limits and features
  getEnhancedTileUrl(mapType = DEFAULT_MAP_TYPE) {
    if (!USE_GOOGLE_MAPS || !GOOGLE_MAPS_API_KEY) {
      // Fallback to free tile URLs - only satellite is supported
      const tileTypes = {
        satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
      };
      return tileTypes[mapType] || tileTypes.satellite;
    }

    // For Google Maps JavaScript API, we don't use tile URLs
    // The API handles tiles internally
    return null;
  }

  // Geocoding service using Google Maps API
  async geocodeAddress(address) {
    if (!USE_GOOGLE_MAPS || !GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API not available');
    }

    try {
      await this.loadGoogleMapsAPI();
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve, reject) => {
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results[0]) {
            const location = results[0].geometry.location;
            resolve({
              lat: location.lat(),
              lng: location.lng(),
              formatted_address: results[0].formatted_address
            });
          } else {
            reject(new Error(`Geocoding failed: ${status}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to geocode address: ${error.message}`);
    }
  }

  // Reverse geocoding service
  async reverseGeocode(lat, lng) {
    if (!USE_GOOGLE_MAPS || !GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API not available');
    }

    try {
      await this.loadGoogleMapsAPI();
      const geocoder = new window.google.maps.Geocoder();
      const latlng = { lat: parseFloat(lat), lng: parseFloat(lng) };
      
      return new Promise((resolve, reject) => {
        geocoder.geocode({ location: latlng }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve({
              formatted_address: results[0].formatted_address,
              components: results[0].address_components
            });
          } else {
            reject(new Error(`Reverse geocoding failed: ${status}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to reverse geocode: ${error.message}`);
    }
  }

  // Calculate distance between two points using Google Maps Geometry API
  async calculateDistance(origin, destination) {
    if (!USE_GOOGLE_MAPS || !GOOGLE_MAPS_API_KEY) {
      // Fallback to Haversine formula
      return this.haversineDistance(origin.lat, origin.lng, destination.lat, destination.lng);
    }

    try {
      await this.loadGoogleMapsAPI();
      const service = new window.google.maps.DistanceMatrixService();
      
      return new Promise((resolve, reject) => {
        service.getDistanceMatrix({
          origins: [origin],
          destinations: [destination],
          travelMode: window.google.maps.TravelMode.WALKING,
          unitSystem: window.google.maps.UnitSystem.METRIC,
        }, (response, status) => {
          if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
            const result = response.rows[0].elements[0];
            resolve({
              distance: result.distance.text,
              duration: result.duration.text,
              distanceValue: result.distance.value,
              durationValue: result.duration.value
            });
          } else {
            reject(new Error(`Distance calculation failed: ${status}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to calculate distance: ${error.message}`);
    }
  }

  // Fallback Haversine distance calculation
  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return {
      distance: `${distance.toFixed(2)} km`,
      distanceValue: distance * 1000 // in meters
    };
  }

  // Places search service
  async searchPlaces(query, location, radius = 5000) {
    if (!USE_GOOGLE_MAPS || !GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API not available');
    }

    try {
      await this.loadGoogleMapsAPI();
      const service = new window.google.maps.places.PlacesService(document.createElement('div'));
      
      return new Promise((resolve, reject) => {
        service.textSearch({
          query,
          location: new window.google.maps.LatLng(location.lat, location.lng),
          radius
        }, (results, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            resolve(results.map(place => ({
              name: place.name,
              address: place.formatted_address,
              location: {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              },
              rating: place.rating,
              types: place.types
            })));
          } else {
            reject(new Error(`Places search failed: ${status}`));
          }
        });
      });
    } catch (error) {
      throw new Error(`Failed to search places: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new GoogleMapsService();
