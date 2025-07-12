import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch bot data with encryption (requires authentication)
export async function fetchBotData() {
  try {
    // Check if user is authenticated
    if (!tokenService.isTokenValid()) {
      console.log('No valid token for fetching bot data');
      return []; // Return empty array for unauthenticated users
    }

    // Encrypt the request data
    const requestData = await tokenService.encryptData({ purpose: 'retrieve' });
    
    // Make authenticated request
    const response = await tokenService.makeAuthenticatedRequest(`${BASE_URL}/telegram`, {
      method: 'POST',
      body: JSON.stringify(requestData)
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response from MongoDB:', data);
      if (data.success) {
        return data.data;
      }
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching bots from MongoDB:', error);
    if (error.message === 'Authentication failed') {
      // Token expired during request
      return [];
    }
    return [];
  }
}
