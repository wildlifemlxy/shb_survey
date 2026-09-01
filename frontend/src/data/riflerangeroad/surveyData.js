import axios from 'axios';
import { BASE_URL } from '../../config/apiConfig.js';

const DATABASE_NAME = 'RifleRangeRoad';

export async function getRifleRangeRoadSurveyData() {
  try {
    const response = await axios.post(`${BASE_URL}/rifleRangeRoad/surveys`, {
      purpose: 'retrieve'
    });
    return response.data.surveys || [];
  } catch (error) {
    console.error('Error retrieving Rifle Range Road survey data:', error);
    return [];
  }
}

export { DATABASE_NAME };
