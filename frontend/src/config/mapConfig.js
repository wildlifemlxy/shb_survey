// Map Configuration
// API key is now fetched from the backend at runtime for security
// The backend endpoint /api/map/config provides the Google Maps API key

let apiKeyPromise = null;
let cachedApiKey = null;
let cachedUseGoogleMaps = true;

/**
 * Fetch map configuration from backend
 * This keeps the API key secure by not exposing it in frontend code
 */
export const fetchMapConfig = async () => {
  if (cachedApiKey !== null) {
    return { apiKey: cachedApiKey, useGoogleMaps: cachedUseGoogleMaps };
  }

  if (!apiKeyPromise) {
    apiKeyPromise = (async () => {
      try {
        // Determine the backend URL based on environment
        const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/api/map/config`);
        
        if (!response.ok) {
          throw new Error(`Backend returned ${response.status}`);
        }
        const data = await response.json();
        if (data.success) {
          cachedApiKey = data.apiKey;
          cachedUseGoogleMaps = data.useGoogleMaps !== false;
          return { apiKey: cachedApiKey, useGoogleMaps: cachedUseGoogleMaps };
        } else {
          throw new Error(data.error || 'Failed to fetch map config');
        }
      } catch (error) {
        console.error('Error fetching map config from backend:', error);
        // Fallback: try environment variable (for local development)
        cachedApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
        cachedUseGoogleMaps = import.meta.env.VITE_USE_GOOGLE_MAPS !== 'false';
        return { apiKey: cachedApiKey, useGoogleMaps: cachedUseGoogleMaps };
      }
    })();
  }

  return apiKeyPromise;
};

// Legacy exports for backward compatibility (will be empty initially, populated via fetchMapConfig)
export const USE_GOOGLE_MAPS = true;
export const GOOGLE_MAPS_API_KEY = "";

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


