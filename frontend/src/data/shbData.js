import axios from 'axios';

// Fetch survey data and return the result (no setState)
export async function fetchSurveyData() {
  try {
    const response = await axios.post('http://localhost:3001/surveys', {purpose: "retrieve"});
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