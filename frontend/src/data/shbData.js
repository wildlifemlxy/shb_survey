import axios from 'axios';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch survey data and return the result (no setState)
export async function fetchSurveyData() {
  try {
    const response = await axios.post(`${BASE_URL}/surveys`, { purpose: 'retrieve' });
    if (response.data.result.success) {
      return response.data.result.surveys;
    } else {
      return [];
    }
  } catch (error) {
    console.error('Error fetching shbData from MongoDB:', error);
    return [];
  }
}

// Insert new survey data
export async function insertSurveyData(surveyData) {
  try {
    const response = await axios.post(`${BASE_URL}/surveys`, {
      purpose: 'insert',
      data: surveyData
    });
    if (response.data.result.success) {
      return { success: true, message: response.data.result.message };
    } else {
      return { success: false, message: response.data.result.message || 'Insert failed' };
    }
  } catch (error) {
    console.error('Error inserting shbData to MongoDB:', error);
    return { success: false, message: error.message };
  }
}