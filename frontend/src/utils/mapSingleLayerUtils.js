// mapSingleLayerUtils.js - Utility functions for SingleLayerMap component
import L from 'leaflet';

export const formatDate = (serialDate) => {
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

export const formatTime = (serialTime) => {
  if (!serialTime) return 'Unknown';
  try {
    if (typeof serialTime === 'string' && (serialTime.includes('AM') || serialTime.includes('PM'))) {
      return serialTime;
    }
    const totalSeconds = Math.round(86400 * serialTime);
    const hours = Math.floor(totalSeconds / 3600) % 24;
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch {
    return 'Invalid Time';
  }
};

export const createCustomIcon = (observation) => {
  const seenHeard = observation["Seen/Heard"];
  let color = '#14b8a6'; // Default teal
  let iconHtml = '📍';

  switch(seenHeard) {
    case 'Seen':
      color = '#10b981'; // Green
      iconHtml = '👁️';
      break;
    case 'Heard':
      color = '#3b82f6'; // Blue
      iconHtml = '👂';
      break;
    case 'Not found':
      color = '#ef4444'; // Red
      iconHtml = '❌';
      break;
    default:
      color = '#6b7280'; // Gray
      iconHtml = '❓';
  }

  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        color: white;
        font-weight: bold;
      ">
        ${iconHtml}
      </div>
    `,
    className: 'custom-div-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -15]
  });
};

export const filterValidData = (data) => {
  return data.filter(obs => 
    obs.Lat && obs.Long && 
    !isNaN(parseFloat(obs.Lat)) && !isNaN(parseFloat(obs.Long))
  );
};

export const calculateMapStats = (validData) => {
  return {
    seenCount: validData.filter(obs => obs["Seen/Heard"] === "Seen").length,
    heardCount: validData.filter(obs => obs["Seen/Heard"] === "Heard").length,
    notFoundCount: validData.filter(obs => obs["Seen/Heard"] === "Not found").length,
    uniqueLocations: new Set(validData.map(obs => obs.Location)).size
  };
};
