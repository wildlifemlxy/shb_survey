const DatabaseConnectivity = require("../../Database/databaseConnectivity");

class EventsController {
  async getAllEvents() {
    const db = new DatabaseConnectivity();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Survey Events";
      const documents = await db.getAllDocuments(databaseName, collectionName);
      return {
        success: true,
        events: documents,
        message: 'Events retrieved successfully'
      };
    } catch (err) {
      console.error('Error retrieving events:', err);
      return {
        success: false,
        events: [],
        count: 0,
        message: 'Error retrieving events',
        error: err.message
      };
    } finally {
      await db.close();
    }
    }

    async updateEventParticipants(eventId, participants) {
      const db = new DatabaseConnectivity();
      try {
        await db.initialize();
        const databaseName = "Straw-Headed-Bulbul";
        const collectionName = "Survey Events";
        const filter = { _id: eventId };
        const update = { $set: { Participants: participants } };
        const result = await db.updateDocument(databaseName, collectionName, filter, update);
        return {
          success: true,
          result,
          message: 'Participants updated successfully'
        };
      } catch (err) {
        console.error('Error updating participants:', err);
        return {
          success: false,
          message: 'Error updating participants',
          error: err.message
        };
      } finally {
        await db.close();
      }
    }

    async updateEventFields(eventId, eventFields) {
      const db = new DatabaseConnectivity();
      try {
        await db.initialize();
        const databaseName = "Straw-Headed-Bulbul";
        const collectionName = "Survey Events";
        const filter = { _id: eventId };
        // Remove eventId, purpose, and _id from eventFields if present
        const { eventId: _, purpose: __, _id: ___, ...fieldsToUpdate } = eventFields;
        const update = { $set: fieldsToUpdate };
        const result = await db.updateDocument(databaseName, collectionName, filter, update);
        return {
          success: true,
          result,
          message: 'Event fields updated successfully'
        };
      } catch (err) {
        console.error('Error updating event fields:', err);
        return {
          success: false,
          message: 'Error updating event fields',
          error: err.message
        };
      } finally {
        await db.close();
      }
    }

    async addEvents(events) {
      const db = new DatabaseConnectivity();
      try {
        await db.initialize();
        const databaseName = "Straw-Headed-Bulbul";
        const collectionName = "Survey Events";
        const result = await db.insertDocuments(databaseName, collectionName, events);
        return {
          success: true,
          events: result,
          message: 'Events added successfully'
        };
      } catch (err) {
        console.error('Error adding events:', err);
        return {
          success: false,
          events: [],
          message: 'Error adding events',
          error: err.message
        };
      } finally {
        await db.close();
      }
    }

  // Save the Telegram messageId and chatId for an event
  async saveTelegramMessageId(eventId, chatId, messageId) {
    const db = new DatabaseConnectivity();
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
    } finally {
      await db.close();
    }
  }

  // Retrieve the Telegram messageId for an event and chat
  async getTelegramMessageId(eventId, chatId) {
    const db = new DatabaseConnectivity();
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
    } finally {
      await db.close();
    }
  }
}

module.exports = EventsController;
