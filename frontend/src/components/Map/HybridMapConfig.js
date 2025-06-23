// HybridMap Configuration - Settings for live map updates and display options
// Updated: June 21, 2025

export const HYBRID_MAP_CONFIG = {
  // Update intervals (in milliseconds)
  DEFAULT_REFRESH_INTERVAL: 30000, // 30 seconds
  FAST_REFRESH_INTERVAL: 10000, // 10 seconds for high-activity areas
  SLOW_REFRESH_INTERVAL: 60000, // 1 minute for low-activity areas
  
  // Connection settings
  CONNECTION_TIMEOUT: 5000, // 5 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000, // 2 seconds
  
  // Map display settings
  DEFAULT_CENTER: [1.3521, 103.8198], // Singapore
  DEFAULT_ZOOM: 13, // Lower zoom to include offshore areas
  MIN_ZOOM: 10, // Set min zoom in to 10
  MAX_ZOOM: 10, // Set max zoom out to 10
  SINGAPORE_BOUNDS: [[1.15, 103.5], [1.50, 104.1]], // Expanded bounds to include offshore areas
  
  // Clustering settings
  CLUSTER_ZOOM_THRESHOLD: 14,
  MAX_CLUSTER_RADIUS: 50,
  CLUSTER_SIZES: {
    SMALL: { min: 1, max: 9, size: 28, color: '#3B82F6' },
    MEDIUM: { min: 10, max: 49, size: 36, color: '#F59E0B' },
    LARGE: { min: 50, max: Infinity, size: 44, color: '#EF4444' }
  },
  
  // Marker settings
  INDIVIDUAL_MARKER_SIZE: 24,
  GROUP_MARKER_SIZE: 32,
  MARKER_COLORS: {
    SEEN: '#10B981',      // Green
    HEARD: '#3B82F6',     // Blue
    NOT_FOUND: '#EF4444', // Red
    DEFAULT: '#DC2626'    // Dark red
  },
  
  // Heatmap settings
  HEATMAP_ZOOM_THRESHOLD: 16,
  HEATMAP_RADIUS: {
    BASE: 25,
    MAX_BONUS: 40,
    INTENSITY_MULTIPLIER: 10,
    COUNT_MULTIPLIER: 8,
    RECENT_BONUS: 10
  },
  HEATMAP_OPACITY: {
    BASE: 0.3,
    MAX: 0.9,
    INTENSITY_BONUS: 0.2,
    COUNT_BONUS: 0.05,
    RECENT_BONUS: 0.1
  },

  // Zoom-based layer visibility settings
  ZOOM_LAYER_CONFIG: {
    HEATMAP_ZOOM_MIN: 15,      // Show heatmap starting at zoom level 14
    HEATMAP_ZOOM_MAX: 19,      // Keep heatmap visible up to max zoom
    MARKERS_ZOOM_MIN: 12,      // Show markers starting at zoom level 12  
    MARKERS_ZOOM_MAX: 16,      // Hide markers after zoom level 16
    TRANSITION_ZONE: {
      START: 14,               // Transition zone start
      END: 16,                 // Transition zone end
      BLEND_OPACITY: true,     // Enable opacity blending in transition
      SMOOTH_SCALING: true     // Enable smooth scaling during transition
    },
    AUTO_ZOOM_CONFIG: {
      ENABLED: true,           // Enable auto-zoom functionality
      ZOOM_TO_HEATMAP: 15,     // Auto zoom level to show heatmap clearly
      ZOOM_TO_MARKERS: 13,     // Auto zoom level to show markers clearly
      ANIMATION_DURATION: 1000  // Animation duration in milliseconds
    }
  },
  
  // Live update settings
  RECENT_UPDATE_THRESHOLD: 300000, // 5 minutes
  LIVE_UPDATE_COLORS: {
    CONNECTED: '#10B981',
    UPDATING: '#F59E0B',
    DISCONNECTED: '#EF4444',
    STATIC: '#6B7280'
  },
  
  // Tile layer configurations with live update support
  TILE_SOURCES: {
    STREET: {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors',
      cacheBuster: true
    },
    HYBRID: {
      url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
      attribution: '&copy; Google Maps Hybrid',
      cacheBuster: true
    }
  },
  
  // Data processing settings
  COORDINATE_PRECISION: 6, // Decimal places for coordinate grouping
  COORDINATE_TOLERANCE: 0.000001, // Tolerance for coordinate matching
  
  // Weight calculation settings
  OBSERVATION_WEIGHTS: {
    SEEN: { weight: 1.0, intensity: 1.2 },
    HEARD: { weight: 0.8, intensity: 1.0 },
    NOT_FOUND: { weight: 0.3, intensity: 0.6 },
    DEFAULT: { weight: 0.5, intensity: 1.0 }
  },
  
  // Recent observation bonuses
  RECENCY_BONUSES: {
    WITHIN_DAY: 1.5,
    WITHIN_WEEK: 1.3,
    WITHIN_MONTH: 1.1,
    OLDER: 1.0
  },
  
  // Animation settings
  ANIMATIONS: {
    PULSE_DURATION: '1.5s',
    GLOW_DURATION: '2s',
    TRANSITION_DURATION: '0.3s',
    HOVER_SCALE: 1.2,
    CLUSTER_HOVER_SCALE: 1.1
  },
  
  // Performance settings
  MAX_MARKERS_BEFORE_CLUSTERING: 100,
  DEBOUNCE_DELAY: 300, // milliseconds
  MAX_CONCURRENT_REQUESTS: 3,
  
  // Error handling
  ERROR_RETRY_INTERVALS: [1000, 2000, 5000], // Progressive retry delays
  MAX_ERROR_COUNT: 5,
  ERROR_RESET_TIME: 300000, // 5 minutes
  
  // Responsive breakpoints
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  
  // Feature flags
  FEATURES: {
    LIVE_UPDATES: true,
    HYBRID_MODE: true,
    CLUSTERING: true,
    HEATMAP: true,
    ANIMATIONS: true,
    ACCESSIBILITY: true,
    DARK_MODE: true,
    PRINT_SUPPORT: true
  }
};

// Only export config and tile source for hybrid/street map types
export function getTileSource(type, isLive) {
  if (type === 'street') {
    return {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap contributors'
    };
  }
  // Default to hybrid
  return {
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; Google Maps Hybrid'
  };
}
