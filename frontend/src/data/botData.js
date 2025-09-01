import simpleApiService from '../utils/simpleApiService';

// Central bot data management
export class BotDataService {
  constructor() {
    this.bots = [];
    this.isLoading = false;
    this.error = null;
    this.lastUpdated = null;
  }

  // Load all bots from backend
  async loadBots() {
    try {
      this.isLoading = true;
      this.error = null;
      
      const result = await simpleApiService.getAllBots();
      console.log('BotDataService loadBots result:', result);
      
      if (result.success) {
        this.bots = result.data || [];
        this.lastUpdated = new Date();
        this.isLoading = false;
        return { success: true, data: this.bots };
      } else {
        this.error = result.error;
        this.isLoading = false;
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Error loading bots:', error);
      this.error = error.message;
      this.isLoading = false;
      return { success: false, error: error.message };
    }
  }

  // Get bot info from Telegram API
  async getBotInfo(token) {
    try {
      return await simpleApiService.getBotInfo(token);
    } catch (error) {
      console.error('Error getting bot info:', error);
      return { success: false, error: error.message };
    }
  }

  // Create/register a new bot
  async createBot(name, description, token) {
    try {
      const result = await simpleApiService.createBot(name, description, token);
      
      if (result.success) {
        // Reload bots after successful creation
        await this.loadBots();
      }
      
      return result;
    } catch (error) {
      console.error('Error creating bot:', error);
      return { success: false, error: error.message };
    }
  }

  // Get bot groups/chats
  async getBotGroups(token) {
    try {
      return await simpleApiService.getBotGroups(token);
    } catch (error) {
      console.error('Error getting bot groups:', error);
      return { success: false, error: error.message };
    }
  }

  // Get chat history
  async getChatHistory(token, chatId) {
    try {
      return await simpleApiService.getChatHistory(token, chatId);
    } catch (error) {
      console.error('Error getting chat history:', error);
      return { success: false, error: error.message };
    }
  }

  // Get current bot data
  getBots() {
    return {
      bots: this.bots,
      isLoading: this.isLoading,
      error: this.error,
      lastUpdated: this.lastUpdated
    };
  }

  // Find bot by name
  findBotByName(name) {
    return this.bots.find(bot => bot.name === name);
  }

  // Find bot by token
  findBotByToken(token) {
    return this.bots.find(bot => bot.token === token);
  }

  // Refresh bot data
  async refresh() {
    return await this.loadBots();
  }
}

// Create singleton instance
const botDataService = new BotDataService();

// Export singleton and class
export default botDataService;

// Export individual functions for backward compatibility
export const getBotInfo = (token) => botDataService.getBotInfo(token);
export const createBot = (name, description, token) => botDataService.createBot(name, description, token);
export const getBotGroups = (token) => botDataService.getBotGroups(token);
export const getChatHistory = (token, chatId) => botDataService.getChatHistory(token, chatId);
export const getAllBots = () => botDataService.loadBots();
export const refreshBotData = () => botDataService.refresh();
