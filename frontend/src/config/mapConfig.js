// Map Configuration
// Set USE_GOOGLE_MAPS to true if you have a valid Google Maps API key
// Set USE_GOOGLE_MAPS to false to use the fallback Singapore map visualization

export const USE_GOOGLE_MAPS = import.meta.env.VITE_USE_GOOGLE_MAPS !== undefined ? 
  import.meta.env.VITE_USE_GOOGLE_MAPS === 'true' : true; // Use environment variable or fallback to true
//export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "AIzaSyDnOgMPzB6DfoPXV_E9apa4zXSGKmpw8KU"; // Use environment variable or fallback
export const GOOGLE_MAPS_API_KEY = "AIzaSyDnOgMPzB6DfoPXV_E9apa4zXSGKmpw8KU"; // Use environment variable or fallback

// Singapore Map Configuration
export const SINGAPORE_CENTER = {
  lat: 1.3521,
  lng: 103.8198
};

export const SINGAPORE_ZOOM = 11;

// Google Maps specific configuration
export const GOOGLE_MAP_TYPES = {
  HYBRID: 'hybrid',
  SATELLITE: 'satellite'
};

export const DEFAULT_MAP_TYPE = 'hybrid'; // Default to hybrid view


