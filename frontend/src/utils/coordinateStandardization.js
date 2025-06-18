// Coordinate standardization for same locations
// This ensures that observations at the same location use identical coordinates for proper map clustering

// Standard coordinates for known locations
const LOCATION_COORDINATES = {
  // Bukit Batok Nature Park
  'BBNP': { lat: 1.3504, lng: 103.7646 },
  'Bukit Batok Nature Park': { lat: 1.3504, lng: 103.7646 },
  'Bukit Batok nature park': { lat: 1.3504, lng: 103.7646 },
  
  // Mandai Boardwalk (various forms)
  'Mandai Boardwalk': { lat: 1.405431, lng: 103.79276 },
  'Mandai boardwalk': { lat: 1.405431, lng: 103.79276 },
  'Amazon River, Tree Frog entry on way to Iora,Mandai Boardwalk': { lat: 1.405431, lng: 103.79276 },
  
  // Singapore Botanic Gardens
  'SBG': { lat: 1.310082, lng: 103.814398 },
  'Singapore Botanic Gardens': { lat: 1.310082, lng: 103.814398 },
  
  // Rifles Range Nature Park
  'RRNP': { lat: 1.3431, lng: 103.7787 },
  'Rifles Range Nature Park': { lat: 1.3431, lng: 103.7787 },
  
  // Sungei Buloh Wetland Reserve
  'SBWR': { lat: 1.440506, lng: 103.735108 },
  'Sungei Buloh Wetland Reserve': { lat: 1.440506, lng: 103.735108 },
  
  // Other locations with consistent coordinates
  'Rail Corridor, Kranji': { lat: 1.414142, lng: 103.754915 },
  'Springleaf': { lat: 1.40109, lng: 103.819359 },
  'Pulau Ubin': { lat: 1.406141, lng: 103.969981 },
  'Windsor Nature Park': { lat: 1.3598687, lng: 103.8266265 },
  'Hindhede Nature Park': { lat: 1.3491978, lng: 103.7749333 },
  'Gillian Barracks': { lat: 1.278055, lng: 103.804811 },
  'Bukit Timah nature reserve': { lat: 1.3461171, lng: 103.775869 },
  'Bukit Timah Nature Reserve': { lat: 1.3461171, lng: 103.775869 }
};

/**
 * Standardizes coordinates for observations at the same location
 * @param {Array} data - Array of observation objects
 * @returns {Array} - Array with standardized coordinates
 */
export const standardizeCoordinates = (data) => {
  if (!data || !Array.isArray(data)) {
    return data;
  }

  return data.map(observation => {
    const location = observation.Location;
    
    if (location && LOCATION_COORDINATES[location]) {
      return {
        ...observation,
        Lat: LOCATION_COORDINATES[location].lat,
        Long: LOCATION_COORDINATES[location].lng
      };
    }
    
    // If location not in our standardized list, keep original coordinates
    return observation;
  });
};

/**
 * Normalizes location names to handle variations in naming
 * @param {string} locationName - Original location name
 * @returns {string} - Normalized location name
 */
export const normalizeLocationName = (locationName) => {
  if (!locationName) return locationName;
  
  const normalized = locationName.trim();
  
  // Handle common variations
  const locationMappings = {
    'Mandai boardwalk': 'Mandai Boardwalk',
    'Amazon River, Tree Frog entry on way to Iora,Mandai Boardwalk': 'Mandai Boardwalk',
    'Bukit Batok nature park': 'Bukit Batok Nature Park',
    'Bukit Timah nature reserve': 'Bukit Timah Nature Reserve',
    'BBNP': 'Bukit Batok Nature Park',
    'RRNP': 'Rifles Range Nature Park',
    'SBWR': 'Sungei Buloh Wetland Reserve',
    'SBG': 'Singapore Botanic Gardens'
  };
  
  return locationMappings[normalized] || normalized;
};

export { LOCATION_COORDINATES };
