import axios from 'axios';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch bot data and return the result (no setState)
export async function fetchBotData() {
  try {
    const response = await axios.post(`${BASE_URL}/telegram`, { purpose: 'retrieve' });
    console.log('Response from MongoDB:', response.data);
    if (response.data.success) {
      return response.data.data;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching bots from MongoDB:', error);
    return [];
  }
}
