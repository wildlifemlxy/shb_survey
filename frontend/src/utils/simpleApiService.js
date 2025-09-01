import axios from 'axios';

const API_BASE_URL = 
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Simple API service for public data operations only
class SimpleApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Public survey operations only
  async getPublicStats() {
    try {
      const response = await axios.post(`${this.baseURL}/surveys`, {
        purpose: 'getPublicStatistics'
      });
      console.log("Get public stats response:", response.data);
      return response.data;
    } catch (error) {
      console.error('Get public stats error:', error);
      throw error;
    }
  }

  // Login method
  async login(credentials) {
    try {
      const response = await axios.post(`${this.baseURL}/users`, {
        purpose: 'login',
        email: credentials.email,
        password: credentials.password
      });
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout method
  async logout() {
    try {
      const response = await axios.post(`${this.baseURL}/users`, {
        purpose: 'logout'
      });
      return response.data;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  }

  // Reset password method
  async resetPassword(data) {
    try {
      const response = await axios.post(`${this.baseURL}/users`, {
        purpose: 'resetPassword',
        email: data.email
      });
      return response.data;
    } catch (error) {
      console.error('Reset password error:', error);
      throw error;
    }
  }

  // Change password method
  async changePassword(data) {
    try {
      const response = await axios.post(`${this.baseURL}/users`, {
        purpose: 'change-password',
        email: data.email,
        newPassword: data.newPassword
      });
      console.log('Change password response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Change password error:', error);
      throw error;
    }
  }

  // Public survey operations only
  async getStats() {
    try {
      const response = await axios.post(`${this.baseURL}/surveys`, {
        purpose: 'retrieve'
      });
      return response.data.surveyResult.surveys;
    } catch (error) {
      console.error('Get public stats error:', error);
      throw error;
    }
  }

  // Submit new survey
  async submitSurvey(surveyData) {
    try {
      const response = await axios.post(`${this.baseURL}/surveys`, {
        purpose: 'insert',
        ...surveyData
      });
      return response.data;
    } catch (error) {
      console.error('Submit survey error:', error);
      throw error;
    }
  }

  // Update survey
  async updateSurvey(recordId, updatedData) {
    try {
      const response = await axios.post(`${this.baseURL}/surveys`, {
        purpose: 'update',
        recordId: recordId,
        ...updatedData
      });
      return response.data;
    } catch (error) {
      console.error('Update survey error:', error);
      throw error;
    }
  }

  // Delete survey
  async deleteSurvey(surveyId) {
    try {
      const response = await axios.post(`${this.baseURL}/surveys`, {
        purpose: 'delete',
        surveyId: surveyId
      });
      return response.data;
    } catch (error) {
      console.error('Delete survey error:', error);
      throw error;
    }
  }

  // Bot-related methods
  async getAllBots() {
    try {
      const response = await axios.post(`${this.baseURL}/telegram`, {
        purpose: 'retrieve'
      });
      return response.data;
    } catch (error) {
      console.error('Get all bots error:', error);
      throw error;
    }
  }

  async getBotInfo(token) {
    try {
      const response = await axios.post(`${this.baseURL}/telegram`, {
        purpose: 'getBotInfo',
        token: token
      });
      return response.data;
    } catch (error) {
      console.error('Get bot info error:', error);
      throw error;
    }
  }

  async createBot(name, description, token) {
    try {
      const response = await axios.post(`${this.baseURL}/telegram`, {
        purpose: 'createBot',
        name: name,
        description: description,
        token: token
      });
      return response.data;
    } catch (error) {
      console.error('Create bot error:', error);
      throw error;
    }
  }

  async getBotGroups(token) {
    try {
      const response = await axios.post(`${this.baseURL}/telegram`, {
        purpose: 'getBotGroups',
        token: token
      });
      return response.data;
    } catch (error) {
      console.error('Get bot groups error:', error);
      throw error;
    }
  }

  async getChatHistory(token, chatId) {
    try {
      const response = await axios.post(`${this.baseURL}/telegram`, {
        purpose: 'getChatHistory',
        token: token,
        chatId: chatId
      });
      return response.data;
    } catch (error) {
      console.error('Get chat history error:', error);
      throw error;
    }
  }

  // MFA - Request mobile approval
  async requestMobileApproval(userData) {
    try {
      const response = await axios.post(`${this.baseURL}/mfa`, {
        purpose: 'request_approval',
        userId: userData.id || userData.userId,
        email: userData.email,
        sessionId: userData.sessionId || Date.now().toString()
      });
      return response.data;
    } catch (error) {
      console.error('Request mobile approval error:', error);
      throw error;
    }
  }

}

const simpleApiService = new SimpleApiService();
export default simpleApiService;
