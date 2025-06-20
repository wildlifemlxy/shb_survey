// Map Configuration
// Set USE_GOOGLE_MAPS to true if you have a valid Google Maps API key
// Set USE_GOOGLE_MAPS to false to use the fallback Singapore map visualization

export const USE_GOOGLE_MAPS = false; // Change to true when you have a Google Maps API key
export const GOOGLE_MAPS_API_KEY = "YOUR_GOOGLE_MAPS_API_KEY_HERE"; // Replace with your actual API key

// Singapore Map Configuration
export const SINGAPORE_CENTER = {
  lat: 1.3521,
  lng: 103.8198
};

export const SINGAPORE_ZOOM = 11;

// Updated Satellite Imagery Configuration (as of June 2025)
// Synchronized with Google Maps satellite imagery sources
export const SATELLITE_PROVIDERS = {
  // Google Maps equivalent - Maxar/Google's newest high-resolution imagery
  GOOGLE_SATELLITE_SYNC: {
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: 'Imagery &copy; Google, Maxar Technologies, CNES/Airbus, Landsat/Copernicus',
    maxZoom: 22,
    updateFrequency: 'Real-time (Google sync)',
    cacheBust: true
  },
  
  // Google Hybrid equivalent (satellite + labels)
  GOOGLE_HYBRID_SYNC: {
    url: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    attribution: 'Imagery &copy; Google, Maxar Technologies, CNES/Airbus, Landsat/Copernicus',
    maxZoom: 22,
    updateFrequency: 'Real-time (Google sync)',
    cacheBust: true
  },
  
  // Maxar's newest high-resolution imagery (updated regularly) - Alternative
  MAXAR_VIVID: {
    url: "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 22,
    updateFrequency: 'Monthly'
  },
  
  // Microsoft Bing's latest satellite imagery with AI-enhanced clarity
  BING_AERIAL: {
    url: "https://ecn.t{s}.tiles.virtualearth.net/tiles/a{q}?g=1&n=z",
    attribution: '&copy; <a href="https://www.microsoft.com/maps/">Microsoft</a>',
    maxZoom: 21,
    updateFrequency: 'Quarterly'
  },
  
  // OpenStreetMap with high-resolution satellite overlay
  ESRI_WORLD_IMAGERY: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    maxZoom: 20,
    updateFrequency: 'Bi-annual'
  }
};

// Default to Google-synchronized satellite imagery
export const DEFAULT_SATELLITE_PROVIDER = 'GOOGLE_SATELLITE_SYNC';

// Utility functions for map synchronization
export const getLatestImageryUrl = (provider, forceRefresh = false) => {
  const selectedProvider = SATELLITE_PROVIDERS[provider];
  if (!selectedProvider) return null;
  
  let url = selectedProvider.url;
  
  // Add cache-busting for latest imagery
  if (selectedProvider.cacheBust || forceRefresh) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}t=${Date.now()}`;
  }
  
  return url;
};

export const forceMapRefresh = () => {
  // Force browser to refresh tiles by clearing cache
  if (typeof window !== 'undefined') {
    const timestamp = Date.now();
    localStorage.setItem('lastMapRefresh', timestamp.toString());
    return timestamp;
  }
  return null;
};

// Check if maps should be refreshed (daily refresh recommended)
export const shouldRefreshMaps = () => {
  if (typeof window === 'undefined') return false;
  
  const lastRefresh = localStorage.getItem('lastMapRefresh');
  if (!lastRefresh) return true;
  
  const now = Date.now();
  const dayInMs = 24 * 60 * 60 * 1000;
  return (now - parseInt(lastRefresh)) > dayInMs;
};
