/**
 * Telegram API Utilities
 * Helper functions for interacting with Telegram Bot API
 */

const axios = require('axios');

class TelegramApi {
  constructor(botToken) {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${botToken}`;
    this.storeChatHistoryFn = null;
  }

  /**
   * Set the function to store chat history
   */
  setStoreChatHistory(fn) {
    this.storeChatHistoryFn = fn;
  }

  /**
   * Send a message with optional inline keyboard buttons
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: options.parseMode || 'HTML',
      };

      // Add inline keyboard if provided
      if (options.inlineKeyboard) {
        payload.reply_markup = {
          inline_keyboard: options.inlineKeyboard
        };
      }

      // Add reply to message if provided
      if (options.replyToMessageId) {
        payload.reply_to_message_id = options.replyToMessageId;
      }

      const response = await axios.post(`${this.baseUrl}/sendMessage`, payload);
      
      // Store chat history if function is set
      console.log('📝 sendMessage - storeChatHistoryFn exists:', !!this.storeChatHistoryFn);
      console.log('📝 sendMessage - response.data.ok:', response.data?.ok);
      if (this.storeChatHistoryFn && response.data && response.data.ok) {
        try {
          console.log('📝 Calling storeChatHistoryFn for chatId:', chatId);
          const storeResult = await this.storeChatHistoryFn(this.botToken, chatId.toString(), text, 'bot', null);
          console.log('📝 storeChatHistory result:', storeResult);
        } catch (storeError) {
          console.error('Error storing chat history:', storeError.message);
        }
      } else {
        console.log('⚠️ NOT storing chat history - fn:', !!this.storeChatHistoryFn, 'ok:', response.data?.ok);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Edit an existing message text and buttons
   */
  async editMessageText(chatId, messageId, text, options = {}) {
    try {
      const payload = {
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: options.parseMode || 'HTML',
      };

      // Add inline keyboard if provided
      if (options.inlineKeyboard) {
        payload.reply_markup = {
          inline_keyboard: options.inlineKeyboard
        };
      }

      const response = await axios.post(`${this.baseUrl}/editMessageText`, payload);
      
      // Store edited message in chat history
      console.log('📝 editMessageText - storeChatHistoryFn exists:', !!this.storeChatHistoryFn);
      console.log('📝 editMessageText - response.data.ok:', response.data?.ok);
      if (this.storeChatHistoryFn && response.data && response.data.ok) {
        try {
          console.log('📝 Calling storeChatHistoryFn (edit) for chatId:', chatId);
          const storeResult = await this.storeChatHistoryFn(this.botToken, chatId.toString(), text, 'bot', null);
          console.log('📝 storeChatHistory (edit) result:', storeResult);
        } catch (storeError) {
          console.error('Error storing edited message to chat history:', storeError.message);
        }
      } else {
        console.log('⚠️ NOT storing edited message - fn:', !!this.storeChatHistoryFn, 'ok:', response.data?.ok);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error editing message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Answer callback query (acknowledge button press)
   */
  async answerCallbackQuery(callbackQueryId, text = '', showAlert = false) {
    try {
      const response = await axios.post(`${this.baseUrl}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text: text,
        show_alert: showAlert
      });
      return response.data;
    } catch (error) {
      console.error('Error answering callback:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Delete a message from a chat
   */
  async deleteMessage(chatId, messageId) {
    try {
      const response = await axios.post(`${this.baseUrl}/deleteMessage`, {
        chat_id: chatId,
        message_id: messageId
      });
      return response.data;
    } catch (error) {
      console.error('Error deleting message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Pin a message in a chat
   */
  async pinChatMessage(chatId, messageId, disableNotification = true) {
    try {
      const response = await axios.post(`${this.baseUrl}/pinChatMessage`, {
        chat_id: chatId,
        message_id: messageId,
        disable_notification: disableNotification
      });
      return response.data;
    } catch (error) {
      console.error('Error pinning message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Unpin a specific message in a chat
   */
  async unpinChatMessage(chatId, messageId) {
    try {
      const response = await axios.post(`${this.baseUrl}/unpinChatMessage`, {
        chat_id: chatId,
        message_id: messageId
      });
      return response.data;
    } catch (error) {
      console.error('Error unpinning message:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get chat info including pinned message
   */
  async getChat(chatId) {
    try {
      const response = await axios.post(`${this.baseUrl}/getChat`, {
        chat_id: chatId
      });
      return response.data;
    } catch (error) {
      console.error('Error getting chat:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get bot info
   */
  async getMe() {
    try {
      const response = await axios.get(`${this.baseUrl}/getMe`);
      return response.data;
    } catch (error) {
      console.error('Error getting bot info:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Get updates (for polling mode)
   */
  async getUpdates(offset = 0, timeout = 30) {
    try {
      const response = await axios.get(`${this.baseUrl}/getUpdates`, {
        params: {
          offset: offset,
          timeout: timeout,
          allowed_updates: ['message', 'callback_query']
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting updates:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Create inline keyboard buttons for Join/Leave
   */
  createRegistrationButtons(eventId, config) {
    return [
      [
        {
          text: config.BUTTONS.JOIN,
          callback_data: `${config.CALLBACK.JOIN}${eventId}`
        },
        {
          text: config.BUTTONS.LEAVE,
          callback_data: `${config.CALLBACK.LEAVE}${eventId}`
        }
      ]
    ];
  }

  /**
   * Send a message with Join/Leave inline buttons to multiple chat IDs
   * @param {string} message - The message text to send
   * @param {string} eventId - The event ID for button callbacks
   * @param {Object} config - Bot configuration with CHAT_IDS, BUTTONS, CALLBACK
   * @param {Function} storeChatHistory - Optional function to store chat history
   * @param {Function} saveMessageId - Optional function to save message ID to event
   */
  async sendMessageWithButtons(message, eventId, config, storeChatHistory = null, saveMessageId = null) {
    const CHAT_IDS = config.CHAT_IDS;
    
    // Create inline keyboard with Join/Leave buttons
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: config.BUTTONS.JOIN, callback_data: `${config.CALLBACK.JOIN}${eventId}` },
          { text: config.BUTTONS.LEAVE, callback_data: `${config.CALLBACK.LEAVE}${eventId}` }
        ]
      ]
    };

    const results = [];
    
    for (const chatId of CHAT_IDS) {
      try {
        // Store chat history if function provided
        if (storeChatHistory) {
          await storeChatHistory(this.botToken, chatId, message);
        }
        
        const res = await axios.post(`${this.baseUrl}/sendMessage`, {
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
          reply_markup: inlineKeyboard
        });
        
        // Save message_id to event if function provided
        if (eventId && saveMessageId && res.data?.result?.message_id) {
          await saveMessageId(eventId, chatId, res.data.result.message_id);
        }
        
        console.log(`Message sent to ${chatId}:`, res.data);
        results.push({ chatId, success: true, data: res.data });
      } catch (error) {
        console.error(`Error sending to ${chatId}:`, error.response?.data || error.message);
        results.push({ chatId, success: false, error: error.response?.data || error.message });
      }
    }
    
    return results;
  }
}

module.exports = TelegramApi;
