// Test script to verify statistics calculation
import fallbackData from './fallbackData.js';
import { getUniqueLocations } from '../utils/dataProcessing.jsx';

// Function to calculate real statistics from survey data
const calculateStatistics = (data) => {
  if (!data || data.length === 0) {
    return {
      totalObservations: '50+',
      uniqueLocations: '15+',
      totalVolunteers: '30+',
      yearsActive: '3+'
    };
  }

  // Calculate total observations
  const totalObservations = data.length;

  // Calculate unique locations
  const uniqueLocations = getUniqueLocations(data);

  // Calculate unique volunteers/observers
  const uniqueObservers = new Set();
  data.forEach(observation => {
    const observer = observation['Observer name'] || observation.Observer;
    if (observer && typeof observer === 'string') {
      // Split by comma and clean up observer names
      const observers = observer.split(',').map(name => name.trim());
      observers.forEach(name => {
        if (name && name !== 'E.g. MS' && name.length > 1) {
          uniqueObservers.add(name);
        }
      });
    }
  });

  // Calculate years active based on date range
  const validDates = [];
  data.forEach(observation => {
    const dateValue = observation.Date;
    if (dateValue) {
      // Handle Excel date format (numeric)
      if (!isNaN(parseInt(dateValue))) {
        const excelDate = parseInt(dateValue);
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        validDates.push(date);
      } else if (typeof dateValue === 'string' && dateValue.includes('/')) {
        // Handle formatted date string
        const [day, month, year] = dateValue.split('/');
        if (year && month && day) {
          validDates.push(new Date(parseInt(year), parseInt(month) - 1, parseInt(day)));
        }
      }
    }
  });

  let yearsActive = 1;
  if (validDates.length > 0) {
    const minDate = new Date(Math.min(...validDates));
    const maxDate = new Date(Math.max(...validDates));
    const timeDiff = maxDate.getTime() - minDate.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    yearsActive = Math.max(1, Math.ceil(daysDiff / 365));
  }

  return {
    totalObservations: totalObservations > 0 ? `${totalObservations}` : '50+',
    uniqueLocations: uniqueLocations.length > 0 ? uniqueLocations.length : '15+',
    totalVolunteers: uniqueObservers.size > 0 ? `${uniqueObservers.size}` : '30+',
    yearsActive: yearsActive > 1 ? `${yearsActive}` : '3+'
  };
};

// Test the calculation
console.log('Testing statistics calculation with fallback data:');
console.log('Fallback data length:', fallbackData.length);
console.log('Sample observation:', fallbackData[0]);

const testStats = calculateStatistics(fallbackData);
console.log('Calculated statistics:', testStats);

const uniqueLocations = getUniqueLocations(fallbackData);
console.log('Unique locations:', uniqueLocations);

export { testStats };
