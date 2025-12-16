const DatabaseConnectivity = require("../../Database/databaseConnectivity");


class TelegramController {
  // Create a new Telegram bot entry in the database
  async createBot(token, name, description) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      const bot = {
        token,
        name,
        description: description || '',
      };
      const result = await db.insertDocument(databaseName, collectionName, bot);
      return {
        success: true,
        message: 'Bot inserted successfully',
        insertedId: result.insertedId || null,
        bot
      };
    } catch (err) {
      console.error('Error inserting bot:', err);
      return {
        success: false,
        message: 'Error inserting bot',
        error: err.message
      };
    }
  }

  // Retrieve all Telegram bot entries from the database
  async getAllBots() {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Telegram Bots";
      const bots = await db.getAllDocuments(databaseName, collectionName);
      console.log('Retrieved bots:', bots);
     return {
        success: true,
        message: 'Bots retrieved',
        data: bots
      };
    } catch (err) {
      console.error('Error retrieving bots:', err);
      return {
        success: false,
        message: 'Error retrieving bots',
        error: err.message
      };
    }
  }

  // Store chat history (always insert, do not check for existing)
  async storeChatHistory(token, chatId, message) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Only date, ignore time
      const dateStr = today.toISOString().slice(0, 10); // YYYY-MM-DD

      await db.insertDocument(databaseName, collectionName, {
        token,
        chatId,
        date: dateStr,
        message,
        sentAt: new Date()
      });
      return { success: true, message: 'Chat history stored.' };
    } catch (err) {
      console.error('Error storing chat history:', err);
      return { success: false, message: 'Error storing chat history', error: err.message };
    }
  }

  // Save the Telegram messageId and chatId for an event
  async saveTelegramMessageId(eventId, chatId, messageId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Survey Events";
      // Store as an array of objects to support multiple chats per event
      const update = {
        $addToSet: {
          TelegramMessages: { chatId, messageId }
        }
      };
      const filter = { _id: eventId };
      await db.updateDocument(databaseName, collectionName, filter, update);
      return { success: true, message: 'Telegram messageId saved.' };
    } catch (err) {
      console.error('Error saving Telegram messageId:', err);
      return { success: false, message: 'Error saving Telegram messageId', error: err.message };
    }
  }

  // Retrieve the Telegram messageId for an event and chat
  async getTelegramMessageId(eventId, chatId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Survey Events";
      const event = await db.getDocument(databaseName, collectionName, { _id: eventId });
      if (event && Array.isArray(event.TelegramMessages)) {
        const found = event.TelegramMessages.find(m => m.chatId === chatId);
        return found ? found.messageId : null;
      }
      return null;
    } catch (err) {
      console.error('Error retrieving Telegram messageId:', err);
      return null;
    }
  }

  // Retrieve chat history for a given token and chatId (optionally filter by date)
  async getChatHistory(token, chatId, date = null) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Chat History";
      const query = { token, chatId };
      if (date) {
        // date should be in YYYY-MM-DD format
        query.date = date;
      }
      const history = await db.getAllDocuments(databaseName, collectionName, query, { sentAt: -1 });
      console.log('Retrieved chat history:', history);
      return {
        success: true,
        message: 'Chat history retrieved.',
        data: history
      };
    } catch (err) {
      console.error('Error retrieving chat history:', err);
      return {
        success: false,
        message: 'Error retrieving chat history',
        error: err.message
      };
    }
  }
}

module.exports = TelegramController;
