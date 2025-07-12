import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch survey data for public home page viewing (no authentication required)
export async function fetchSurveyDataForHomePage() {
  try {
    const response = await axios.post(`${BASE_URL}/surveys`, { purpose: 'retrievePublic' });
    if (response.data.result && response.data.result.success) {
      return response.data.result.statistics;
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


// Fetch survey data with encryption (requires authentication) - only selected data
export async function fetchSurveyData() {
  console.log("Fetching survey data from backend:");
  try {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      console.log('User not authenticated, returning empty array');
      return []; // Return empty array for unauthenticated users
    }

    // For now, let's try without token validation to see if backend works
    console.log('User is authenticated, attempting to fetch data...');
    
    // Try basic request first (without encryption)
    const basicRequestData = { purpose: 'retrieve' };
    
    try {
      // Try with token service if available
      if (tokenService.isTokenValid()) {
        console.log('Using token service for request...');
        const requestData = await tokenService.encryptData(basicRequestData);
        const response = await tokenService.axiosPost(`${BASE_URL}/surveys`, requestData);
        console.log("Response from backend (with token):", response.data);
        
        if (response.status === 200 && response.data.result && response.data.result.success) {
          return response.data.result.surveys || [];
        }
      } else {
        console.log('No valid token, trying basic axios request...');
        // Fallback to basic axios request
        const response = await axios.post(`${BASE_URL}/surveys`, basicRequestData);
        console.log("Response from backend (basic):", response.data);
        
        if (response.data.result && response.data.result.success) {
          return response.data.result.surveys || [];
        }
      }
    } catch (authError) {
      console.error('Authenticated request failed, trying basic request:', authError);
      // Try basic request as fallback
      const response = await axios.post(`${BASE_URL}/surveys`, basicRequestData);
      console.log("Response from backend (fallback):", response.data);
      
      if (response.data.result && response.data.result.success) {
        return response.data.result.surveys || [];
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching shbData from MongoDB:', error);
    return [];
  }
}

// Insert new survey data with encryption (requires authentication)
export async function insertSurveyData(surveyData) {
  try {
    // Check if user is authenticated
    if (!tokenService.isTokenValid()) {
      return { success: false, message: 'Authentication required for data submission' };
    }

    // Encrypt the request data
    const requestData = await tokenService.encryptData({
      purpose: 'insert',
      data: surveyData
    });
    
    // Make authenticated request using axios through tokenService
    const response = await tokenService.axiosPost(`${BASE_URL}/surveys`, requestData);
    
    if (response.status === 200 && response.data.result && response.data.result.success) {
      return { success: true, message: response.data.result.message };
    } else {
      return { success: false, message: response.data.result?.message || 'Insert failed' };
    }
  } catch (error) {
    console.error('Error inserting shbData to MongoDB:', error);
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}

// Fetch gallery data - public access (no authentication required)
export async function fetchGalleryDataPublic() {
  try {
    console.log("Fetching public gallery data from backend...");
    
    // Make a public request to fetch gallery data with blob URLs
    const response = await axios.post(`${BASE_URL}/gallery`, { purpose: 'retrieveWithBlobs' });
    
    if (response.status === 200 && response.data.result) {
      const data = response.data.result;
      console.log("Retrieved public gallery items:", data);
      
      // Combine pictures and videos into a single array
      const allItems = [
        ...(data.pictures || []),
        ...(data.videos || [])
      ];
      return allItems;
    } else {
      console.error('Failed to load gallery items from backend');
      return [];
    }
  } catch (error) {
    console.error('Error loading public gallery data:', error);
    return [];
  }
}

// Fetch gallery data with encryption (requires authentication)
export async function fetchGalleryData() {
  try {
    // Check if user is authenticated - if not, use public access
    if (!tokenService.isTokenValid()) {
      console.log('No valid token, fetching public gallery data');
      return await fetchGalleryDataPublic();
    }

    // For authenticated users, still use public access for now (since gallery is public)
    // Later you can implement this for private/approval features
    console.log('User authenticated, fetching gallery data...');
    return await fetchGalleryDataPublic();

    // TODO: Implement authenticated gallery access when needed for approval/management features
    /*
    // Encrypt the request data
    const requestData = await tokenService.encryptData({ purpose: 'retrieveWithBlobs' });
    
    // Make authenticated request using axios through tokenService
    const response = await tokenService.axiosPost(`${BASE_URL}/gallery`, requestData);
    
    if (response.status === 200 && response.data.result) {
      const data = response.data.result;
      console.log("Retrieved gallery items:", data);
      
      // Combine pictures and videos into a single array
      const allItems = [
        ...(data.pictures || []),
        ...(data.videos || [])
      ];
      return allItems;
    } else {
      console.error('Failed to load gallery items from backend');
      return [];
    }
    */
  } catch (error) {
    console.error('Error loading gallery data:', error);
    return [];
  }
}
