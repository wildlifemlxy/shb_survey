/**
 * Filter Utility Functions
 * Provides common filtering operations for survey data
 */

/**
 * Filters data based on location and activity criteria
 * @param {Array} data - The array of data objects to filter
 * @param {Object} filters - The filter criteria object
 * @param {string} filters.filterLocation - Location filter value
 * @param {string} filters.filterActivity - Activity filter value
 * @returns {Array} Filtered array of data objects
 */
export const filterData = (data, filters) => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  let filtered = [...data];
  const { filterLocation, filterActivity } = filters;

  // Apply location filter
  if (filterLocation && filterLocation.trim() !== '') {
    filtered = filtered.filter(item => {
      const itemLocation = item.Location || '';
      return itemLocation.toLowerCase().includes(filterLocation.toLowerCase());
    });
  }

  // Apply activity filter
  if (filterActivity && filterActivity.trim() !== '') {
    filtered = filtered.filter(item => {
      const itemActivity = item["Activity (foraging, preening, calling, perching, others)"] || '';
      return itemActivity.toLowerCase().includes(filterActivity.toLowerCase());
    });
  }

  return filtered;
};

/**
 * Extracts unique locations from data array
 * @param {Array} data - The array of data objects
 * @returns {Array} Array of unique location strings
 */
export const getUniqueLocations = (data) => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  const locations = data
    .map(item => item.Location)
    .filter(location => location && location.trim() !== '')
    .filter((location, index, arr) => arr.indexOf(location) === index)
    .sort();

  return locations;
};

/**
 * Extracts unique activities from data array
 * @param {Array} data - The array of data objects
 * @returns {Array} Array of unique activity strings
 */
export const getUniqueActivities = (data) => {
  if (!data || !Array.isArray(data)) {
    return [];
  }

  const activities = data
    .map(item => item["Activity (foraging, preening, calling, perching, others)"])
    .filter(activity => activity && activity.trim() !== '')
    .filter((activity, index, arr) => arr.indexOf(activity) === index)
    .sort();

  return activities;
};

/**
 * Creates filter options for select elements
 * @param {Array} values - Array of values to create options from
 * @param {string} defaultLabel - Default option label (e.g., "All Locations")
 * @returns {Array} Array of option objects with value and label properties
 */
export const createFilterOptions = (values, defaultLabel = "All") => {
  const options = [{ value: '', label: defaultLabel }];
  
  if (values && Array.isArray(values)) {
    values.forEach(value => {
      if (value && value.trim() !== '') {
        options.push({ value, label: value });
      }
    });
  }

  return options;
};

/**
 * Validates filter values
 * @param {Object} filters - Filter object to validate
 * @returns {Object} Object with validation results
 */
export const validateFilters = (filters) => {
  const validation = {
    isValid: true,
    errors: []
  };

  if (!filters || typeof filters !== 'object') {
    validation.isValid = false;
    validation.errors.push('Filters must be an object');
    return validation;
  }

  // Add specific validation rules as needed
  const { filterLocation, filterActivity } = filters;

  if (filterLocation && typeof filterLocation !== 'string') {
    validation.isValid = false;
    validation.errors.push('Location filter must be a string');
  }

  if (filterActivity && typeof filterActivity !== 'string') {
    validation.isValid = false;
    validation.errors.push('Activity filter must be a string');
  }

  return validation;
};

/**
 * Resets filters to default state
 * @returns {Object} Default filter object
 */
export const getDefaultFilters = () => ({
  filterLocation: '',
  filterActivity: ''
});

/**
 * Checks if any filters are active
 * @param {Object} filters - Filter object to check
 * @returns {boolean} True if any filter has a value
 */
export const hasActiveFilters = (filters) => {
  if (!filters || typeof filters !== 'object') {
    return false;
  }

  const { filterLocation, filterActivity } = filters;
  return !!(filterLocation && filterLocation.trim() !== '') || 
         !!(filterActivity && filterActivity.trim() !== '');
};

/**
 * Counts filtered results
 * @param {Array} originalData - Original unfiltered data
 * @param {Array} filteredData - Filtered data
 * @returns {Object} Object with count information
 */
export const getFilterStats = (originalData, filteredData) => {
  const originalCount = originalData ? originalData.length : 0;
  const filteredCount = filteredData ? filteredData.length : 0;
  const filteredOut = originalCount - filteredCount;
  const filterPercentage = originalCount > 0 ? Math.round((filteredCount / originalCount) * 100) : 0;

  return {
    originalCount,
    filteredCount,
    filteredOut,
    filterPercentage,
    hasFiltering: filteredCount < originalCount
  };
};

/**
 * Debounce function for filter changes
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounceFilter = (func, wait = 300) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Searches data with text query across multiple fields
 * @param {Array} data - Data array to search
 * @param {string} query - Search query string
 * @param {Array} searchFields - Fields to search in
 * @returns {Array} Filtered data matching search query
 */
export const searchData = (data, query, searchFields = ['Location']) => {
  if (!data || !Array.isArray(data) || !query || query.trim() === '') {
    return data;
  }

  const searchTerm = query.toLowerCase().trim();
  
  return data.filter(item => {
    return searchFields.some(field => {
      const fieldValue = item[field];
      if (fieldValue && typeof fieldValue === 'string') {
        return fieldValue.toLowerCase().includes(searchTerm);
      }
      return false;
    });
  });
};
