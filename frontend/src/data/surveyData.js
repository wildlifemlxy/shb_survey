import axios from 'axios';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch survey data and return the result (no setState)
export async function fetchEventsData() {
  try {
    const response = await axios.post(`${BASE_URL}/events`, { purpose: 'retrieve' });
    if (response.data.result.success) {
      return response.data.result.events;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching events from MongoDB:', error);
    return [];
  }
}
