import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch events data with encryption (requires authentication)
export async function fetchEventsData() {
  console.log("Fetching survey events from backend:");
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
      console.log('Encryption session initialized with public key:', await tokenService.getPublicKey());

      // Check if token service is available
      console.log('Checking token validity...');
      const isTokenValid = tokenService.isTokenValid();
      console.log('Token validation result:', isTokenValid);
      
      if (isTokenValid) {
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
        
        const response = await tokenService.axiosPost(`${BASE_URL}/events`, { 
          ...encryptedData, 
          purpose: 'retrieve' 
        });
        console.log("Response from backend events (encrypted with session keys):", response.data);
        
        if (response.data.success) {
          console.log('Events data retrieved successfully:', response.data);
          // Check if response is encrypted - data is directly in response.data
          if (response.data.encryptedData) {
            console.log('Decrypting events response with session private key...');
            const decryptedData = await tokenService.decryptSurveyResponse(response.data);
            console.log('Decrypted events data:', decryptedData.events.events);
            return decryptedData.events.events;
          } else {
            // Fallback to unencrypted response
            return [];
          }
        }
      } else {
        console.log('Token is not valid, cannot proceed with encrypted request');
        return [];
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
    console.error('Error fetching events from MongoDB:', error);
    return [];
  }
}

// Add new events data with encryption (requires authentication)
export async function addNewEvents(eventsData) {
  try {
    console.log("Adding new events to backend:", eventsData);
    
    // Check authentication status with detailed logging
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    
    console.log('isAuthenticated addEvents:', isAuthenticated);
    console.log('tokenValid addEvents:', tokenValid);
    
    // Check if user is authenticated
    if (!tokenValid) {
      console.log('Token validation failed - authentication required');
      return { success: false, message: 'Authentication required for adding events' };
    }

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      events: eventsData,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    console.log('Encrypted request data for addEvent:', encryptedData);
    
    // Make authenticated request using regular axios (backend returns plain JSON)
    const response = await axios.post(`${BASE_URL}/events`, { 
      purpose: 'addEvent',
      ...encryptedData
    });
    console.log("Response from backend (addEvent):", response.data);

    if (response.status === 200 && response.data.success) {
      return { success: true, message: 'Events added successfully', events: response.data.events };
    } else {
      return { success: false, message: response.data.message || 'Failed to add events' };
    }
  } catch (error) {
    console.error('Error adding events to MongoDB:', error);
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}

// Delete events data with encryption (requires authentication)
export async function deleteEvents(eventIds) {
  try {
    console.log("Deleting events from backend:", eventIds);
    
    // Check authentication status with detailed logging
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    
    console.log('isAuthenticated deleteEvents:', isAuthenticated);
    console.log('tokenValid deleteEvents:', tokenValid);
    
    // Check if user is authenticated
    if (!tokenValid) {
      console.log('Token validation failed - authentication required');
      return { success: false, message: 'Authentication required for deleting events' };
    }

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      eventIds: eventIds,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    console.log('Encrypted request data for deleteEvent:', encryptedData);
    
    // Make authenticated request using regular axios (backend returns plain JSON)
    const response = await axios.post(`${BASE_URL}/events`, { 
      purpose: 'deleteEvent',
      ...encryptedData
    });
    console.log("Response from backend (deleteEvent):", response.data);

    if (response.status === 200 && response.data.success) {
      return { success: true, message: 'Events deleted successfully', deletedCount: response.data.deletedCount };
    } else {
      return { success: false, message: response.data.message || 'Failed to delete events' };
    }
  } catch (error) {
    console.error('Error deleting events from MongoDB:', error);
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}

// Update event fields data with encryption (requires authentication)
export async function updateEvents(eventId, eventFields) {
  try {
    console.log("Updating event fields in backend:", eventId, eventFields);
    
    // Check authentication status with detailed logging
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    
    console.log('isAuthenticated updateEvents:', isAuthenticated);
    console.log('tokenValid updateEvents:', tokenValid);
    
    // Check if user is authenticated
    if (!tokenValid) {
      console.log('Token validation failed - authentication required');
      return { success: false, message: 'Authentication required for updating events' };
    }

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      eventId: eventId,
      ...eventFields,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    console.log('Encrypted request data for updateEventFields:', encryptedData);
    
    // Make authenticated request using regular axios (backend returns plain JSON)
    const response = await axios.post(`${BASE_URL}/events`, { 
      purpose: 'updateEventFields',
      ...encryptedData
    });
    console.log("Response from backend (updateEventFields):", response.data);

    if (response.status === 200 && response.data.success) {
      return { success: true, message: 'Event updated successfully', event: response.data.event };
    } else {
      return { success: false, message: response.data.message || 'Failed to update event' };
    }
  } catch (error) {
    console.error('Error updating event in MongoDB:', error);
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}

// Update event participants with encryption (requires authentication)
export async function updateParticipants(eventId, participants) {
  try {
    console.log("Updating event participants in backend:", eventId, participants);
    
    // Check authentication status with detailed logging
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    
    console.log('isAuthenticated updateParticipants:', isAuthenticated);
    console.log('tokenValid updateParticipants:', tokenValid);
    
    // Check if user is authenticated
    if (!tokenValid) {
      console.log('Token validation failed - authentication required');
      return { success: false, message: 'Authentication required for updating participants' };
    }

    // Prepare request data with purpose first, then encrypt
    const requestPayload = {
      eventId: eventId,
      participants: participants,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    
    const encryptedData = await tokenService.encryptData(requestPayload);
    console.log('Encrypted request data for updateParticipants:', encryptedData);
    
    // Make authenticated request using regular axios (backend returns plain JSON)
    const response = await axios.post(`${BASE_URL}/events`, { 
      purpose: 'updateParticipants',
      ...encryptedData
    });
    console.log("Response from backend (updateParticipants):", response.data);

    if (response.status === 200 && response.data.success) {
      return { success: true, message: 'Participants updated successfully', event: response.data.event };
    } else {
      return { success: false, message: response.data.message || 'Failed to update participants' };
    }
  } catch (error) {
    console.error('Error updating participants in MongoDB:', error);
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}