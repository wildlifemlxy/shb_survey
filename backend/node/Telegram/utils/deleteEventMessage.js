/**
 * Delete Telegram Event Messages
 * Utility to delete Telegram messages when an event is deleted from the website
 */

const TelegramApi = require('./telegramApi');
const botConfig = require('../config/botConfig');

/**
 * Delete all Telegram messages associated with an event
 * @param {Object} event - The event object from database (must include TelegramMessages array)
 * @returns {Promise<Object>} Result with success count and errors
 */
async function deleteTelegramEventMessages(event) {
  const results = {
    deleted: 0,
    failed: 0,
    errors: []
  };

  try {
    const telegramApi = new TelegramApi(botConfig.BOT_TOKEN);

    // Check if event has TelegramMessages stored
    if (!event.TelegramMessages || !Array.isArray(event.TelegramMessages) || event.TelegramMessages.length === 0) {
      console.log(`No TelegramMessages stored for event ${event._id} - nothing to delete`);
      return results;
    }

    console.log(`Found ${event.TelegramMessages.length} Telegram message(s) to delete for event ${event._id}`);

    // Delete each message
    for (const msg of event.TelegramMessages) {
      try {
        await telegramApi.deleteMessage(msg.chatId, msg.messageId);
        console.log(`✅ Deleted Telegram message ${msg.messageId} from chat ${msg.chatId}`);
        results.deleted++;
      } catch (error) {
        console.error(`Error deleting Telegram message ${msg.messageId} from chat ${msg.chatId}:`, error.message);
        results.failed++;
        results.errors.push({
          chatId: msg.chatId,
          messageId: msg.messageId,
          error: error.message
        });
      }
    }

    console.log(`Telegram message deletion complete: ${results.deleted} deleted, ${results.failed} failed`);
    return results;
  } catch (error) {
    console.error('Error in deleteTelegramEventMessages:', error.message);
    throw error;
  }
}

module.exports = { deleteTelegramEventMessages };
