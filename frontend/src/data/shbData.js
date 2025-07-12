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

    console.log('User is authenticated, attempting to fetch data with encryption...');
    
    try {
      // Initialize encryption session with unique keys if not already done
      if (!await tokenService.getPublicKey()) {
        console.log('Initializing encryption session with unique RSA keys...');
        await tokenService.initializeEncryptionSession();
      }

      // Check if token service is available
      if (tokenService.isTokenValid()) {
        console.log('Using encrypted request with token service...');
        
        // Prepare request data with purpose first, then encrypt
        const requestPayload = {
          encrypted: true,
          requiresEncryption: true,
          publicKey: await tokenService.getPublicKey(),
          sessionId: tokenService.getKeySessionId()
        };
        
        console.log('Request payload being sent:', {
          encrypted: requestPayload.encrypted,
          requiresEncryption: requestPayload.requiresEncryption,
          publicKeyLength: requestPayload.publicKey ? requestPayload.publicKey.length : 0,
          publicKeyStart: requestPayload.publicKey ? requestPayload.publicKey.substring(0, 50) : 'None',
          sessionId: requestPayload.sessionId
        });
        
        const encryptedData = await tokenService.encryptData(requestPayload);
        console.log('Encrypted request data:', encryptedData);
        
        const response = await tokenService.axiosPost(`${BASE_URL}/surveys`, { 
          ...encryptedData, 
          purpose: 'retrieve' 
        });
        console.log("Response from backend (encrypted with session keys):", response.data);
        
        if (response.data.success) {
            console.log('Survey data retrieved successfully:', response.data);
          // Check if response is encrypted - data is directly in response.data
          if (response.data.encryptedData) {
            console.log('Decrypting survey response with session private key...');
            const decryptedData = await tokenService.decryptSurveyResponse(response.data);
            console.log('Decrypted survey data:', decryptedData.result.surveys);
            return {"surveys": decryptedData.result.surveys, "volunteers": decryptedData.userCount}
          } else {
            // Fallback to unencrypted response
            return [];
          }
        }
      }
    } catch (encryptionError) {
      console.error('Encrypted request failed:', encryptionError);
      console.log('Authenticated users require encrypted requests. Returning empty array.');
      // For authenticated users, we should never fallback to unencrypted requests
      // Return empty array instead of making insecure requests
      return [];
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

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      data: surveyData
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    
    // Make authenticated request using axios through tokenService
    const response = await tokenService.axiosPost(`${BASE_URL}/surveys`, { 
      ...encryptedData, 
      purpose: 'insert' 
    });

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
