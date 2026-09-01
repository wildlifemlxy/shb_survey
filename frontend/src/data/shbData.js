import simpleApiService from '../utils/simpleApiService';

// Fetch survey data for public home page viewing (no authentication required)
export async function fetchSurveyDataForHomePage(databaseName = 'WWFSG') {
  try {
    const response = await simpleApiService.getPublicStats(databaseName);
    
    if (response.success && response.statistics) {
      return {
        observations: response.statistics.totalObservations || 0,
        locations: response.statistics.uniqueLocations || 0,
        volunteers: response.userCount || 0,
        yearsActive: response.statistics.numberOfYears || 0
      };
    } else {
      return {
        observations: 0,
        locations: 0,
        volunteers: 0,
        yearsActive: 0
      };
    }
  } catch (error) {
    console.error('Error fetching public survey statistics:', error);
    return {
      observations: 0,
      locations: 0,
      volunteers: 0,
      yearsActive: 0
    };
  }
}

export async function fetchSurveyData(databaseName = 'WWFSG') 
{
  try 
  {
    const response = await simpleApiService.getStats(databaseName);
    return response;
  } catch (error) {
    console.error('Error fetching public survey statistics:', error);
  }
}