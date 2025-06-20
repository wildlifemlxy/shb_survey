// Map utilities for handling Leaflet sizing issues
export const forceMapResize = () => {
  // Force all Leaflet maps to invalidate their size
  setTimeout(() => {
    if (window.map && window.map.invalidateSize) {
      window.map.invalidateSize(true);
    }
    
    // Also trigger a window resize event to force re-calculation
    window.dispatchEvent(new Event('resize'));
  }, 100);
};

export const handleTabChange = (tabName) => {
  // When switching to map tab, force resize
  if (tabName === 'map') {
    setTimeout(() => {
      forceMapResize();
    }, 200);
  }
};

export const initializeMapUtils = () => {
  // Add global CSS to ensure maps are properly sized
  const style = document.createElement('style');
  style.textContent = `
    .leaflet-container {
      height: 100% !important;
      width: 100% !important;
    }
    .leaflet-map-pane,
    .leaflet-tile-pane {
      width: 100% !important;
      height: 100% !important;
    }
  `;
  document.head.appendChild(style);
};
