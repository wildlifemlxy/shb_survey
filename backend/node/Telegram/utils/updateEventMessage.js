/**
 * Update Telegram Event Message
 * Utility to update Telegram messages when event participants change via website
 */

const TelegramApi = require('./telegramApi');
const { buildSurveyMessage, formatEventDate } = require('./messageTemplates');
const botConfig = require('../config/botConfig');
const parseCustomDate = require('../../cron/parseCustomDate');
const TelegramController = require('../../Controller/Telegram/telegramController');

// Singleton reference for Socket.IO
let socketIOInstance = null;

function setSocketIO(io) {
  socketIOInstance = io;
}

/**
 * Update Telegram message for an event when participants change
 * @param {string} eventId - The event ID
 * @param {Object} event - The event object from database
 * @param {Array} participants - Updated participants list
 */
async function updateTelegramEventMessage(eventId, event, participants) {
  try {
    const telegramApi = new TelegramApi(botConfig.BOT_TOKEN);
    const telegramController = new TelegramController();
    
    // Set Socket.IO instance for real-time updates
    if (socketIOInstance) {
      telegramController.setSocketIO(socketIOInstance);
    }
    
    // Set storeChatHistory function so edited messages update chat history
    telegramApi.setStoreChatHistory(telegramController.storeChatHistory.bind(telegramController));
    
    // Use parseCustomDate to correctly parse D/M/YYYY format
    const parsedDate = parseCustomDate(event.Date);
    const eventData = {
      date: event.formattedDate || (parsedDate ? formatEventDate(parsedDate) : event.Date),
      location: event.Location || '',
      meetingPoint: event.Location || '',
      time: event.Time || '',
      participants: participants
    };

    const messageText = buildSurveyMessage(eventData, botConfig.TRAINING_LINK);
    const buttons = telegramApi.createRegistrationButtons(eventId, botConfig);

    // Update messages for all stored TelegramMessages
    if (event.TelegramMessages && Array.isArray(event.TelegramMessages)) {
      console.log(`Found ${event.TelegramMessages.length} Telegram message(s) to update`);
      
      for (const msg of event.TelegramMessages) {
        try {
          await telegramApi.editMessageText(msg.chatId, msg.messageId, messageText, {
            inlineKeyboard: buttons
          });
          console.log(`✅ Updated Telegram message for event ${eventId} in chat ${msg.chatId}`);
        } catch (error) {
          console.error(`Error updating Telegram message in chat ${msg.chatId}:`, error.message);
        }
      }
    } else {
      console.log(`No TelegramMessages stored for event ${eventId} - cannot update`);
    }
  } catch (error) {
    console.error('Error in updateTelegramEventMessage:', error.message);
    throw error;
  }
}

module.exports = { updateTelegramEventMessage, setSocketIO };
