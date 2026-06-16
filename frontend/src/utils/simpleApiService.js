import axios from 'axios';
import { BASE_URL } from '../config/apiConfig.js';
import { logger } from './diagnosticLogger.js';

// Simple API service for public data operations only
class SimpleApiService {
  constructor() {
  }

  // Public survey operations only
  async getPublicStats() {
    try {
      const response = await axios.post(`${BASE_URL}/surveys`, {
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
      const response = await axios.post(`${BASE_URL}/users`, {
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
      const response = await axios.post(`${BASE_URL}/users`, {
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
      console.log('Reset password request data:', data);
      const response = await axios.post(`${BASE_URL}/users`, {
        purpose: 'reset-password',
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
      const response = await axios.post(`${BASE_URL}/users`, {
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
      const response = await axios.post(`${BASE_URL}/surveys`, {
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
      const response = await axios.post(`${BASE_URL}/surveys`, {
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
    logger.section('🚀 UPDATE SURVEY - STARTING REQUEST');
    
    try {
      // Step 1: Validate inputs
      logger.section('STEP 1: INPUT VALIDATION');
      logger.info('recordId', recordId);
      logger.info('recordId type', typeof recordId);
      logger.info('updatedData keys', Object.keys(updatedData));
      
      if (!recordId) {
        logger.error('recordId is empty', recordId);
        throw new Error('recordId cannot be empty');
      }
      logger.success('recordId is not empty', '✓');
      
      if (typeof recordId !== 'string') {
        logger.error('recordId type is wrong', typeof recordId);
        throw new Error('recordId must be a string');
      }
      logger.success('recordId is a string', '✓');
      
      // Step 2: Build payload
      logger.section('STEP 2: BUILD PAYLOAD');
      const payload = {
        purpose: 'update',
        recordId: recordId,
        ...updatedData
      };
      logger.json('Payload to send', payload);
      logger.info('API endpoint', `${BASE_URL}/surveys`);
      
      // Step 3: Send request
      logger.section('STEP 3: SEND HTTP REQUEST');
      logger.pending('Sending POST request');
      
      const response = await axios.post(`${BASE_URL}/surveys`, payload);
      
      // Step 4: Handle response
      logger.section('STEP 4: HANDLE RESPONSE');
      logger.info('HTTP Status', response.status);
      logger.json('Response data', response.data);
      
      if (response.data && response.data.success) {
        logger.section('STEP 5: SUCCESS');
        logger.success('Backend confirmed update', response.data.message);
        logger.info('Modified count', response.data.modifiedCount);
        logger.complete(true);
        return response.data;
      } else {
        logger.section('STEP 5: BACKEND ERROR');
        logger.error('Backend success flag', response.data?.success);
        logger.error('Backend error message', response.data?.error);
        logger.complete(false);
        return response.data;
      }
    } catch (error) {
      logger.section('⚠️ EXCEPTION CAUGHT');
      logger.error('Error type', error.constructor.name);
      logger.error('Error message', error.message);
      
      if (error.response) {
        logger.section('HTTP ERROR DETAILS');
        logger.error('Response status', error.response.status);
        logger.json('Response data', error.response.data);
      } else if (error.request) {
        logger.section('NETWORK ERROR');
        logger.error('No response received', 'Request was made but server did not respond');
      } else {
        logger.section('REQUEST SETUP ERROR');
        logger.error('Error', error.message);
      }
      
      logger.complete(false);
      throw error;
    }
  }

  // Delete survey
  async deleteSurvey(surveyId) {
    try {
      const response = await axios.post(`${BASE_URL}/surveys`, {
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
      const response = await axios.post(`${BASE_URL}/telegram`, {
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
      const response = await axios.post(`${BASE_URL}/telegram`, {
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
      const response = await axios.post(`${BASE_URL}/telegram`, {
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
      const response = await axios.post(`${BASE_URL}/telegram`, {
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
      const response = await axios.post(`${BASE_URL}/telegram`, {
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

  async getAllChatHistory(token) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'getAllChatHistory',
        token: token
      });
      return response.data;
    } catch (error) {
      console.error('Get all chat history error:', error);
      throw error;
    }
  }

  // Send a message using a bot
  async sendTelegramMessage(token, chatId, message, options = {}) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'sendMessage',
        token: token,
        chatId: chatId,
        message: message,
        options: options
      });
      return response.data;
    } catch (error) {
      console.error('Send Telegram message error:', error);
      throw error;
    }
  }

  // Delete a bot
  async deleteBot(botId) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'deleteBot',
        botId: botId
      });
      return response.data;
    } catch (error) {
      console.error('Delete bot error:', error);
      throw error;
    }
  }

  // Update bot status
  async updateBotStatus(botId, isActive) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'updateBotStatus',
        botId: botId,
        isActive: isActive
      });
      return response.data;
    } catch (error) {
      console.error('Update bot status error:', error);
      throw error;
    }
  }

  // Get bot by ID
  async getBotById(botId) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'getBotById',
        botId: botId
      });
      return response.data;
    } catch (error) {
      console.error('Get bot by ID error:', error);
      throw error;
    }
  }

  // MFA - Request mobile approval
  async requestMobileApproval(userData) {
    try {
      const response = await axios.post(`${BASE_URL}/mfa`, {
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
