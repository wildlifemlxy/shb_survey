import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch chat history for a specific bot and chatId with encryption (requires authentication)
export async function fetchChatData(botToken, chatId) {
  try {
    // Check if user is authenticated
    if (!tokenService.isTokenValid()) {
      console.log('No valid token for fetching chat data');
      return []; // Return empty array for unauthenticated users
    }

    console.log('Fetching chat history for botToken:', botToken, 'and chatId:', chatId);
    
    // Encrypt the request data
    const requestData = await tokenService.encryptData({
      purpose: 'getChatHistory',
      token: botToken,
      chatId
    });
    
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
    console.error('Error fetching chat history from MongoDB:', error);
    if (error.message === 'Authentication failed') {
      // Token expired during request
      return [];
    }
    return [];
  }
}
