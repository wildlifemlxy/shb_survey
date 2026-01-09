import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';

// Retrieve all events
export async function getAllEvents() {
  try {
    const response = await axios.post(`${BASE_URL}/events`, {
      purpose: 'retrieve'
    });
    console.log('Events API response:', response.data.result.events.events);
    return response.data.result.events.events;
  } catch (error) {
    console.error('Error retrieving events:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to retrieve events';
    return { success: false, error: errorMessage };
  }
}

// Delete an event by ID
export async function deleteEvents(eventId) {
  try {
    const response = await axios.post(`${BASE_URL}/events`, {
      purpose: 'deleteEvent',
      eventId: eventId
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting event:', error);
    const errorMessage = error.response?.data?.error || 
                         error.response?.data?.details || 
                         error.message || 
                         'Failed to delete event';
    return { success: false, error: errorMessage };
  }
}

// Update an event by ID (using updateEventFields from backend)
export async function updateEvents(eventId, eventData) {
  try {
    const response = await axios.post(`${BASE_URL}/events`, {
      purpose: 'updateEventFields',
      eventId: eventId,
      ...eventData
    });
    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update event';
    return { success: false, error: errorMessage };
  }
}

// Update participants for an event
export async function updateParticipants(eventId, participants) {
  try {
    const response = await axios.post(`${BASE_URL}/events`, {
      purpose: 'updateParticipants',
      eventId: eventId,
      participants: participants
    });
    return response.data;
  } catch (error) {
    console.error('Error updating participants:', error);
    const errorMessage = error.response?.data?.error || error.message || 'Failed to update participants';
    return { success: false, error: errorMessage };
  }
}
