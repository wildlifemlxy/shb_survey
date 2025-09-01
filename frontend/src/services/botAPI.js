import axios from 'axios';

const BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://shb-backend.azurewebsites.net';

// Bot management API functions
export const botAPI = {
  // Get bot information from Telegram API using token
  async getBotInfo(token) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'getBotInfo',
        token
      });
      
      if (response.data.ok && response.data.result) {
        const botInfo = response.data.result;
        return {
          success: true,
          data: {
            name: botInfo.first_name,
            desc: botInfo.first_name + (botInfo.last_name ? ` ${botInfo.last_name}` : ''),
            username: botInfo.username
          }
        };
      } else {
        return { success: false, error: 'Invalid bot token or API response' };
      }
    } catch (error) {
      console.error('Error getting bot info:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to get bot info'
      };
    }
  },

  // Create/register a new bot
  async createBot(name, description, token) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'createBot',
        token,
        name,
        description
      });
      
      return {
        success: true,
        data: response.data.bot,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error creating bot:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to create bot'
      };
    }
  },

  // Get all registered bots
  async getAllBots() {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'retrieve'
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data || []
        };
      } else {
        return { 
          success: false, 
          error: response.data.error || 'Failed to retrieve bots' 
        };
      }
    } catch (error) {
      console.error('Error getting all bots:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to retrieve bots'
      };
    }
  },

  // Get bot groups/chats
  async getBotGroups(token) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'getBotGroups',
        token
      });
      
      return {
        success: true,
        groups: response.data.groups || []
      };
    } catch (error) {
      console.error('Error getting bot groups:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to get bot groups'
      };
    }
  },

  // Get chat history
  async getChatHistory(token, chatId) {
    try {
      const response = await axios.post(`${BASE_URL}/telegram`, {
        purpose: 'getChatHistory',
        token,
        chatId
      });
      
      if (response.data.success) {
        return {
          success: true,
          data: response.data.data || []
        };
      } else {
        return { 
          success: false, 
          error: response.data.error || 'Failed to get chat history' 
        };
      }
    } catch (error) {
      console.error('Error getting chat history:', error);
      return { 
        success: false, 
        error: error.response?.data?.error || error.message || 'Failed to get chat history'
      };
    }
  }
};

export default botAPI;
