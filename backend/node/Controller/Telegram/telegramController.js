const DatabaseConnectivity = require("../../Database/databaseConnectivity");


class TelegramController {
  // Create a new Telegram bot entry in the database
  async createBot(token, name, description) {
    const db = new DatabaseConnectivity();
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
    } finally {
      await db.close();
    }
  }

  // Retrieve all Telegram bot entries from the database
  async getAllBots() {
    const db = new DatabaseConnectivity();
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
    } finally {
      await db.close();
    }
  }
}

module.exports = TelegramController;
