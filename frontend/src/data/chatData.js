import axios from 'axios';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch chat history for a specific bot and chatId
export async function fetchChatData(botToken, chatId) {
  try {
    console.log('Fetching chat history for botToken:', botToken, 'and chatId:', chatId);
    const response = await axios.post(`${BASE_URL}/telegram`, {
      purpose: 'getChatHistory',
      token: botToken,
      chatId
    });
    console.log('Response from MongoDB:', response.data);
    if (response.data.success) {
      return response.data.data;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching chat history from MongoDB:', error);
    return [];
  }
}
