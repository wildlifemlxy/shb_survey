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
    console.log("Inserting survey data to backend:", surveyData);
    
    // Check authentication status with detailed logging
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    
    console.log('isAuthenticated insert:', isAuthenticated);
    console.log('tokenValid insert:', tokenValid);
    
    // Check if user is authenticated
    if (!tokenValid) {
      console.log('Token validation failed - authentication required');
      return { success: false, message: 'Authentication required for data submission' };
    }

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      data: surveyData,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    console.log('Encrypted request data for insert:', encryptedData);
    
    // Make authenticated request using regular axios (backend returns plain JSON)
    const response = await axios.post(`${BASE_URL}/surveys`, { 
      purpose: 'insert',
      ...encryptedData
    });
    console.log("Response from backend (insert):", response.data);

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

// Update survey data with encryption (requires authentication)
export async function updateSurveyData(recordId, updatedData) {
  try {
    console.log("Updating survey data in backend:", { recordId, updatedData });
    
    // Check authentication status with detailed logging
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    
    console.log('isAuthenticated update:', isAuthenticated);
    console.log('tokenValid update:', tokenValid);
    
    // Check if user is authenticated
    if (!tokenValid) {
      console.log('Token validation failed - authentication required');
      return { success: false, message: 'Authentication required for data submission' };
    }

    // Validate recordId
    if (!recordId) {
      return { success: false, message: 'Record ID is required for update' };
    }

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      recordId: recordId,
      updatedRowData: updatedData,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    console.log('Encrypted request data for update:', encryptedData);
    
    // Make authenticated request using regular axios (backend returns plain JSON)
    const response = await axios.post(`${BASE_URL}/surveys`, { 
      purpose: 'update',
      ...encryptedData
    });
    console.log("Response from backend (update):", response.data);

    if (response.status === 200 && response.data.result && response.data.result.success) {
      return { success: true, message: response.data.result.message };
    } else {
      return { success: false, message: response.data.result?.message || 'Update failed' };
    }
  } catch (error) {
    console.error('Error updating shbData in MongoDB:', error);
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}

// Delete survey data with encryption (requires authentication)
export async function deleteSurveyData(recordId) {
  try {
    console.log("Deleting survey data from backend:", { recordId });
    
    // Check authentication status with detailed logging
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    
    console.log('isAuthenticated delete:', isAuthenticated);
    console.log('tokenValid delete:', tokenValid);
    
    // Check if user is authenticated
    if (!tokenValid) {
      console.log('Token validation failed - authentication required');
      return { success: false, message: 'Authentication required for data deletion' };
    }

    // Validate recordId
    if (!recordId) {
      return { success: false, message: 'Record ID is required for deletion' };
    }

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      recordId: recordId,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    console.log('Encrypted request data for delete:', encryptedData);
    
    // Make authenticated request using regular axios (backend returns plain JSON)
    const response = await axios.post(`${BASE_URL}/surveys`, { 
      purpose: 'delete',
      ...encryptedData
    });
    console.log("Response from backend (delete):", response.data);

    if (response.status === 200 && response.data.result && response.data.result.success) {
      return { success: true, message: response.data.result.message };
    } else {
      return { success: false, message: response.data.result?.message || 'Delete failed' };
    }
  } catch (error) {
    console.error('Error deleting shbData from MongoDB:', error);
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}