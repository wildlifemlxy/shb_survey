import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch bot data with encryption (requires authentication) - only selected data
export async function fetchBotData() {
  console.log("Fetching bot data from backend:");
  try {
    // Check if user is authenticated
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      console.log('User not authenticated, returning empty array');
      return []; // Return empty array for unauthenticated users
    }

    console.log('User is authenticated, attempting to fetch bot data with encryption...');
    
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
        
        const response = await tokenService.axiosPost(`${BASE_URL}/telegram`, { 
          ...encryptedData, 
          purpose: 'retrieve' 
        });
        console.log("Response from backend (encrypted with session keys):", response.data);
        
        if (response.data.success) {
          console.log('Bot data retrieved successfully:', response.data);
          // Check if response is encrypted - data is directly in response.data
          if (response.data.encryptedData) {
            console.log('Decrypting bot response with session private key...');
            const decryptedData = await tokenService.decryptBotResponse(response.data);
            console.log('Decrypted bot data:', decryptedData);
            if(decryptedData.success)
            {
              return decryptedData.data || [];
            }
            return decryptedData || [];
          } else {
            // Fallback to unencrypted response
            return response.data.data || [];
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
    console.error('Error fetching bot data from MongoDB:', error);
    return [];
  }
}

// Get bot info from Telegram API using bot token (requires authentication)
export async function getBotInfo(token) {
  console.log("Getting bot info from Telegram API for token blur:");
  try {
    if (!token) {
      return { success: false, error: 'Token is required' };
    }

    // Check if user is authenticated
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }

    console.log('User is authenticated, attempting to get bot info with encryption...');
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
        token,
        clientPublicKey: clientPublicKey
      });
      
      console.log('Encrypted bot info request data with client public key:', requestData);
      
      // Make authenticated request
      const response = await tokenService.axiosPost(`${BASE_URL}/telegram`, {
        purpose: 'getBotInfo',
        data: requestData
      });
      
      console.log('Bot info response received:', response);
      
      if (response && response.data) {
        console.log('Response data:', response.data);
        
        // Check if response is successful
        if (response.data.success) {
          let responseData = response.data;
          
          // Check if response is encrypted
          if (response.data.encryptedData) {
            const decryptedResponse = await tokenService.decryptBotResponse(response.data);
            responseData = decryptedResponse;
            console.log('Decrypted bot info response:', responseData);
          }
          
          // Extract bot data from the response
          const botData = responseData.data || responseData.result;
          console.log('Bot data extracted:', botData);
          
          if (botData) {
            let { username, first_name } = botData;
            console.log('Bot username:', username, 'First name:', first_name);
            
            // Format username: replace _ with space and capitalize each word
            if (username) {
              username = username.replace(/_/g, ' ')
                .replace(/\b\w/g, c => c.toUpperCase());
              username = username.charAt(0).toUpperCase() + username.slice(1);
              // Replace 'Shb' with 'SHB' if present at the start or as a word
              username = username.replace(/\bShb\b/g, 'SHB');
            }
            
            return {
              success: true,
              data: {
                name: username || '',
                desc: first_name || '',
                username: botData.username,
                first_name: botData.first_name
              }
            };
          } else {
            return { success: false, error: 'Invalid bot token or bot info not found' };
          }
        } else {
          return { success: false, error: response.data.error || 'Failed to get bot info from server' };
        }
      } else {
        throw new Error('No response received from server');
      }
    } catch (encryptionError) {
      console.error('Encrypted bot info request failed:', encryptionError);
      return { success: false, error: 'Failed to get bot info - encryption error' };
    }
    
  } catch (error) {
    console.error('Error getting bot info:', error);
    return { success: false, error: 'Failed to get bot info' };
  }
}

// Create a new bot (requires authentication)
export async function createBot(name, description, token) {
  console.log("Creating new bot:");
  try {
    if (!name || !description || !token) {
      return { success: false, error: 'Name, description, and token are required' };
    }

    // Check if user is authenticated
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }

    console.log('User is authenticated, attempting to create bot with encryption...');
    
    try {
      // Initialize encryption session with unique keys if not already done
      if (!await tokenService.getPublicKey()) {
        console.log('Initializing encryption session with unique RSA keys...');
        await tokenService.initializeEncryptionSession();
      }

      // Encrypt the request data with client public key included
      const clientPublicKey = await tokenService.getPublicKey();
      const requestData = await tokenService.encryptData({
        name,
        description,
        token,
        clientPublicKey: clientPublicKey
      });
      
      console.log('Encrypted bot creation request data with client public key:', requestData);
      
      // Make authenticated request
      const response = await tokenService.axiosPost(`${BASE_URL}/telegram`, {
        purpose: 'createBot',
        data: requestData
      });
      
      console.log('Bot creation response received:', response);
      
      if (response && response.data) {
        console.log('Response data:', response.data);
        
        // Check if response is successful
        if (response.data.success) {
          let responseData = response.data;
          
          // Check if response is encrypted
          if (response.data.encryptedData) {
            const decryptedResponse = await tokenService.decryptBotResponse(response.data);
            responseData = decryptedResponse;
            console.log('Decrypted bot creation response:', responseData);
          }
          
          console.log('Bot created successfully:', responseData);
          return { success: true, data: responseData };
        } else {
          return { success: false, error: response.data.error || 'Failed to create bot' };
        }
      } else {
        throw new Error('No response received from server');
      }
    } catch (encryptionError) {
      console.error('Encrypted bot creation request failed:', encryptionError);
      return { success: false, error: 'Failed to create bot - encryption error' };
    }
    
  } catch (error) {
    console.error('Error creating bot:', error);
    return { success: false, error: 'Failed to create bot' };
  }
}

// Get bot groups from Telegram API using bot token (requires authentication)
export async function getBotGroups(token) {
  console.log("Getting bot groups from Telegram API for token:");
  try {
    if (!token) {
      return { success: false, error: 'Token is required' };
    }

    // Check if user is authenticated
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }

    console.log('User is authenticated, attempting to get bot groups with encryption...');
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
        token,
        clientPublicKey: clientPublicKey
      });
      
      console.log('Encrypted bot groups request data with client public key:', requestData);
      
      // Make authenticated request
      const response = await tokenService.axiosPost(`${BASE_URL}/telegram`, {
        purpose: 'getBotGroups',
        data: requestData
      });
      
      console.log('Bot groups response received:', response);
      
      if (response && response.data) {
        console.log('Response data:', response.data);
        
        // Check if response is successful
        if (response.data.success) {
          let responseData = response.data;
          
          // Check if response is encrypted
          if (response.data.encryptedData) {
            const decryptedResponse = await tokenService.decryptBotResponse(response.data);
            responseData = decryptedResponse;
            console.log('Decrypted bot groups response:', responseData);
          }
          
          // Extract groups data from the response
          const groupsData = responseData.groups || [];
          console.log('Bot groups extracted:', groupsData);
          
          return {
            success: true,
            groups: groupsData
          };
        } else {
          return { success: false, error: response.data.error || 'Failed to get bot groups from server' };
        }
      } else {
        throw new Error('No response received from server');
      }
    } catch (encryptionError) {
      console.error('Encrypted bot groups request failed:', encryptionError);
      return { success: false, error: 'Failed to get bot groups - encryption error' };
    }
    
  } catch (error) {
    console.error('Error getting bot groups:', error);
    return { success: false, error: 'Failed to get bot groups' };
  }
}
