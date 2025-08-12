import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch chat history for a specific bot and chatId with encryption (requires authentication)
export async function fetchChatData(botToken, chatId) {
  console.log("Getting chat data from backend:");
  try {
    if (!botToken) {
      return { success: false, error: 'Bot token is required' };
    }

    // Check if user is authenticated
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }

    console.log('User is authenticated, attempting to get chat data with encryption...');
    console.log("TokenService:", tokenService.isTokenValid(), tokenService.getPublicKey());

    try {
      // Initialize encryption session with unique keys if not already done
      if (!await tokenService.getPublicKey()) {
        console.log('Initializing encryption session with unique RSA keys...');
        await tokenService.initializeEncryptionSession();
      }

      // Encrypt the request data with client public key included
      const clientPublicKey = await tokenService.getPublicKey();
      const requestData = await tokenService.encryptData({
        token: botToken,
        chatId: chatId,
        clientPublicKey: clientPublicKey
      });
      
      console.log('Encrypted chat data request data with client public key:', requestData);
      
      // Make authenticated request
      const response = await tokenService.axiosPost(`${BASE_URL}/telegram`, {
        purpose: 'getChatHistory',
        data: requestData
      });
      
      console.log('Chat data response received:', response);
      
      if (response && response.data) {
        console.log('Response data:', response.data);
        
        // Check if response is successful
        if (response.data.success) {
          let responseData = response.data;
          
          // Check if response is encrypted
          if (response.data.encryptedData) {
            const decryptedResponse = await tokenService.decryptBotResponse(response.data);
            responseData = decryptedResponse;
            console.log('Decrypted chat data response:', responseData);
          }
          
          // Extract chat data from the response
          const chatData = responseData.data || responseData.result;
          console.log('Chat data extracted:', chatData);
          
          if (chatData) {
            return chatData;
          } else {
            return [];
          }
        } else {
          return [];
        }
      } else {
        throw new Error('No response received from server');
      }
    } catch (encryptionError) {
      console.error('Encrypted chat data request failed:', encryptionError);
      return [];
    }
    
  } catch (error) {
    console.error('Error getting chat data:', error);
    return [];
  }
}
