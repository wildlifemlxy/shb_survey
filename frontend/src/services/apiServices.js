// src/services/apiService.js
import axios from 'axios';

// dynamically choose between your local and prod backends
const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : 'https://shb-backend.azurewebsites.net/api';

// create a single axios instance
const api = axios.create({
  baseURL: BASE_URL,
  // you can add headers, timeouts, interceptors, etc. here
});

const apiService = {
  // Survey related endpoints
  getSurveys: async () => {
    try {
      const { data } = await api.get('/surveys');
      return data;
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  },

  refreshSurveys: async () => {
    try {
      const { data } = await api.post('/surveys/refresh');
      return data;
    } catch (error) {
      console.error('Error refreshing surveys:', error);
      throw error;
    }
  },

  updateWwfLedSurvey: async (index, survey) => {
    try {
      const { data } = await api.put(`/surveys/wwf-led/${index}`, survey);
      return data;
    } catch (error) {
      console.error('Error updating WWF-led survey:', error);
      throw error;
    }
  },

  updateVolunteerLedSurvey: async (index, survey) => {
    try {
      const { data } = await api.put(`/surveys/volunteer-led/${index}`, survey);
      return data;
    } catch (error) {
      console.error('Error updating volunteer-led survey:', error);
      throw error;
    }
  },

  // Telegram related endpoints
  getTelegramConfig: async () => {
    try {
      const { data } = await api.get('/telegram/config');
      return data;
    } catch (error) {
      console.error('Error fetching telegram config:', error);
      throw error;
    }
  },

  updateTelegramConfig: async (config) => {
    try {
      const { data } = await api.put('/telegram/config', config);
      return data;
    } catch (error) {
      console.error('Error updating telegram config:', error);
      throw error;
    }
  },

  addTelegramGroup: async (group) => {
    try {
      const { data } = await api.post('/telegram/groups', group);
      return data;
    } catch (error) {
      console.error('Error adding telegram group:', error);
      throw error;
    }
  },

  removeTelegramGroup: async (index) => {
    try {
      const { data } = await api.delete(`/telegram/groups/${index}`);
      return data;
    } catch (error) {
      console.error('Error removing telegram group:', error);
      throw error;
    }
  },

  // Send message to Telegram
  sendTelegramMessage: async (data) => {
    try {
      const resp = await api.post('/telegram/send', data);
      return resp.data;
    } catch (error) {
      console.error('Error sending telegram message:', error);
      throw error;
    }
  },
};

export default apiService;
