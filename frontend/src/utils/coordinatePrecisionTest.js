/**
 * Test utility for verifying exact coordinate precision in landmarks
 * This file helps test the enhanced Map component functionality
 */

// Test data with identical coordinates to verify landmark display
export const testCoordinatePrecisionData = [
  {
    "Lat": 1.3521123456789,
    "Long": 103.8198234567890,
    "Location": "Singapore Botanic Gardens - Point A",
    "Observer name": "Test Observer 1",
    "SHB individual ID (e.g. SHB1)": "SHB001",
    "Date": "2024-01-15",
    "Time": 0.375,
    "Activity (foraging, preening, calling, perching, others)": "Foraging",
    "Seen/Heard": "Seen",
    "Height of tree/m": 15,
    "Height of bird/m": 8,
    "Number of Birds": 2
  },
  {
    "Lat": 1.3521123456789, // Identical coordinates
    "Long": 103.8198234567890, // Identical coordinates
    "Location": "Singapore Botanic Gardens - Point B",
    "Observer name": "Test Observer 2",
    "SHB individual ID (e.g. SHB1)": "SHB002",
    "Date": "2024-01-15",
    "Time": 0.458,
    "Activity (foraging, preening, calling, perching, others)": "Calling",
    "Seen/Heard": "Heard",
    "Height of tree/m": 12,
    "Height of bird/m": 6,
    "Number of Birds": 1
  },
  {
    "Lat": 1.3521123456790, // Slightly different (last decimal)
    "Long": 103.8198234567891, // Slightly different (last decimal)
    "Location": "Singapore Botanic Gardens - Point C",
    "Observer name": "Test Observer 3",
    "SHB individual ID (e.g. SHB1)": "SHB003",
    "Date": "2024-01-16",
    "Time": 0.583,
    "Activity (foraging, preening, calling, perching, others)": "Perching",
    "Seen/Heard": "Seen",
    "Height of tree/m": 18,
    "Height of bird/m": 10,
    "Number of Birds": 3
  },
  {
    "Lat": 1.4405062345678,
    "Long": 103.7351089876543,
    "Location": "Sungei Buloh Wetland Reserve",
    "Observer name": "Test Observer 4",
    "SHB individual ID (e.g. SHB1)": "SHB004",
    "Date": "2024-01-16",
    "Time": 0.250,
    "Activity (foraging, preening, calling, perching, others)": "Singing",
    "Seen/Heard": "Heard",
    "Height of tree/m": 20,
    "Height of bird/m": 12,
    "Number of Birds": 1
  }
];

/**
 * Validates that coordinates maintain exact precision
 * @param {Array} data - Array of observation data
 * @returns {Object} - Validation results
 */
export const validateCoordinatePrecision = (data) => {
  const results = {
    totalObservations: data.length,
    uniqueCoordinates: new Set(),
    identicalCoordinateGroups: new Map(),
    precisionMaintained: true,
    issues: []
  };

  data.forEach((observation, index) => {
    const lat = parseFloat(observation.Lat);
    const lng = parseFloat(observation.Long);
    
    // Check if coordinates are valid numbers
    if (isNaN(lat) || isNaN(lng)) {
      results.issues.push(`Invalid coordinates at index ${index}: ${observation.Lat}, ${observation.Long}`);
      results.precisionMaintained = false;
      return;
    }
    
    // Create exact coordinate key with full precision
    const exactCoordKey = `${lat.toFixed(10)}_${lng.toFixed(10)}`;
    results.uniqueCoordinates.add(exactCoordKey);
    
    // Group observations by exact coordinates
    if (!results.identicalCoordinateGroups.has(exactCoordKey)) {
      results.identicalCoordinateGroups.set(exactCoordKey, []);
    }
    results.identicalCoordinateGroups.get(exactCoordKey).push({
      index,
      observation,
      lat,
      lng
    });
    
    // Check precision loss (comparing original string vs parsed number)
    const originalLatStr = observation.Lat.toString();
    const originalLngStr = observation.Long.toString();
    const parsedLatStr = lat.toString();
    const parsedLngStr = lng.toString();
    
    if (originalLatStr !== parsedLatStr || originalLngStr !== parsedLngStr) {
      results.issues.push(`Precision loss detected at index ${index}: Original(${originalLatStr}, ${originalLngStr}) vs Parsed(${parsedLatStr}, ${parsedLngStr})`);
    }
  });
  
  return results;
};

/**
 * Console log function to display coordinate validation results
 * @param {Object} validationResults - Results from validateCoordinatePrecision
 */
export const logCoordinateValidation = (validationResults) => {
  console.group('🎯 Coordinate Precision Validation');
  console.log(`📊 Total Observations: ${validationResults.totalObservations}`);
  console.log(`📍 Unique Coordinate Sets: ${validationResults.uniqueCoordinates.size}`);
  console.log(`🔍 Precision Maintained: ${validationResults.precisionMaintained ? '✅ Yes' : '❌ No'}`);
  
  if (validationResults.issues.length > 0) {
    console.group('⚠️ Issues Found:');
    validationResults.issues.forEach(issue => console.warn(issue));
    console.groupEnd();
  }
  
  console.group('📊 Coordinate Groups:');
  validationResults.identicalCoordinateGroups.forEach((group, coordKey) => {
    if (group.length > 1) {
      console.log(`🎯 ${coordKey}: ${group.length} observations at identical coordinates`);
      group.forEach(item => {
        console.log(`  - Index ${item.index}: ${item.observation.Location} (${item.observation['Observer name']})`);
      });
    }
  });
  console.groupEnd();
  
  console.groupEnd();
};

/**
 * Test function to verify heatmap functionality with exact coordinates
 * @param {Array} data - Observation data
 * @param {Function} onHeatmapClick - Heatmap click handler
 */
export const testHeatmapCoordinatePrecision = (data, onHeatmapClick) => {
  console.group('🔥 Heatmap Coordinate Precision Test');
  
  const validation = validateCoordinatePrecision(data);
  logCoordinateValidation(validation);
  
  // Simulate heatmap clicks for coordinate groups with multiple observations
  validation.identicalCoordinateGroups.forEach((group, coordKey) => {
    if (group.length > 1) {
      const [lat, lng] = coordKey.split('_').map(parseFloat);
      console.log(`🖱️ Simulating heatmap click at ${lat.toFixed(8)}, ${lng.toFixed(8)}`);
      
      // Simulate click data
      const heatmapClickData = {
        latlng: { lat, lng },
        observation: group[0].observation,
        observations: group.map(item => item.observation),
        weight: 0.8,
        zoom: 16,
        autoZoom: true,
        count: group.length,
        exactCoordinates: { lat, lng }
      };
      
      if (onHeatmapClick) {
        onHeatmapClick(heatmapClickData);
      }
    }
  });
  
  console.groupEnd();
};

export default {
  testCoordinatePrecisionData,
  validateCoordinatePrecision,
  logCoordinateValidation,
  testHeatmapCoordinatePrecision
};
