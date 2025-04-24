// src/services/apiService.js
import axios from 'axios';

const API_URL = 'http://localhost:3001/api';

const apiService = {
  // Survey related endpoints
  getSurveys: async () => {
    try {
      const response = await axios.get(`${API_URL}/surveys`);
      return response.data;
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  },
  
  refreshSurveys: async () => {
    try {
      const response = await axios.post(`${API_URL}/surveys/refresh`);
      return response.data;
    } catch (error) {
      console.error('Error refreshing surveys:', error);
      throw error;
    }
  },
  
  updateWwfLedSurvey: async (index, survey) => {
    try {
      const response = await axios.put(`${API_URL}/surveys/wwf-led/${index}`, survey);
      return response.data;
    } catch (error) {
      console.error('Error updating WWF-led survey:', error);
      throw error;
    }
  },
  
  updateVolunteerLedSurvey: async (index, survey) => {
    try {
      const response = await axios.put(`${API_URL}/surveys/volunteer-led/${index}`, survey);
      return response.data;
    } catch (error) {
      console.error('Error updating volunteer-led survey:', error);
      throw error;
    }
  },
  
  // Telegram related endpoints
  getTelegramConfig: async () => {
    try {
      const response = await axios.get(`${API_URL}/telegram/config`);
      return response.data;
    } catch (error) {
      console.error('Error fetching telegram config:', error);
      throw error;
    }
  },
  
  updateTelegramConfig: async (config) => {
    try {
      const response = await axios.put(`${API_URL}/telegram/config`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating telegram config:', error);
      throw error;
    }
  },
  
  addTelegramGroup: async (group) => {
    try {
      const response = await axios.post(`${API_URL}/telegram/groups`, group);
      return response.data;
    } catch (error) {
      console.error('Error adding telegram group:', error);
      throw error;
    }
  },
  
  removeTelegramGroup: async (index) => {
    try {
      const response = await axios.delete(`${API_URL}/telegram/groups/${index}`);
      return response.data;
    } catch (error) {
      console.error('Error removing telegram group:', error);
      throw error;
    }
  },
  
  // Send message to Telegram
  sendTelegramMessage: async (data) => {
    try {
      const response = await axios.post(`${API_URL}/telegram/send`, data);
      return response.data;
    } catch (error) {
      console.error('Error sending telegram message:', error);
      throw error;
    }
  }
};

export default apiService;