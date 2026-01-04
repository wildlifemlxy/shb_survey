/**
 * Send Telegram Message with Inline Buttons
 * Centralized function for sending survey messages with Join/Leave buttons
 */

const axios = require('axios');
const TelegramController = require('../../Controller/Telegram/telegramController');

/**
 * Send a Telegram message with inline keyboard buttons to all subscribers
 * @param {string} message - The message text to send (HTML format supported)
 * @param {string} eventId - The event ID for button callbacks
 * @param {Object} botConfig - Bot configuration with BOT_TOKEN, BUTTONS, CALLBACK
 * @param {Object} options - Optional callbacks
 * @param {Function} options.storeChatHistory - Function to store chat history (botToken, chatId, message)
 * @param {Function} options.saveMessageId - Function to save message ID to event (eventId, chatId, messageId)
 * @returns {Promise<Array>} Array of results for each chat ID
 */
async function sendTelegramMessage(message, eventId, botConfig, options = {}) {
  const { storeChatHistory, saveMessageId } = options;
  const url = `https://api.telegram.org/bot${botConfig.BOT_TOKEN}/sendMessage`;
  
  // Get all subscribers from database
  const telegramController = new TelegramController();
  const subscriberResult = await telegramController.getAllSubscribers();
  const CHAT_IDS = subscriberResult.chatIds.length > 0 
    ? subscriberResult.chatIds 
    : botConfig.CHAT_IDS; // Fallback to config if no subscribers
  
  console.log(`Sending to ${CHAT_IDS.length} subscriber(s):`, CHAT_IDS);
  
  // Create inline keyboard with Join/Leave buttons
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: botConfig.BUTTONS.JOIN, callback_data: `${botConfig.CALLBACK.JOIN}${eventId}` },
        { text: botConfig.BUTTONS.LEAVE, callback_data: `${botConfig.CALLBACK.LEAVE}${eventId}` }
      ]
    ]
  };

  const results = [];

  for (const chatId of CHAT_IDS) {
    try {
      const res = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard
      });
      
      // Store chat history AFTER successful send with senderType 'bot'
      if (storeChatHistory) {
        await storeChatHistory(botConfig.BOT_TOKEN, chatId, message, 'bot', 'SHB Survey Bot');
      }
      
      // Store message_id and chatId in the event for later editing
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

module.exports = { sendTelegramMessage };
