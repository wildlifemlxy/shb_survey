const DatabaseConnectivity = require("../../Database/databaseConnectivity");
const { ObjectId } = require('mongodb');

class EventsController {
  async getAllEvents() {
    const db = DatabaseConnectivity.getInstance();
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
    }
    }

    async getEventById(eventId) {
      const db = DatabaseConnectivity.getInstance();
      try {
        await db.initialize();
        const collectionName = "Survey Events";
        // Convert string eventId to ObjectId if needed
        const query = { _id: ObjectId.isValid(eventId) ? new ObjectId(eventId) : eventId };
        const documents = await db.find(collectionName, query);
        const event = documents.length > 0 ? documents[0] : null;
        
        // Convert ObjectId to string for response
        if (event && event._id) {
          event._id = event._id.toString();
        }
        
        return {
          success: true,
          event: event,
          message: event ? 'Event retrieved successfully' : 'Event not found'
        };
      } catch (err) {
        console.error('Error retrieving event:', err);
        return {
          success: false,
          event: null,
          message: 'Error retrieving event',
          error: err.message
        };
      }
    }

    async updateEventParticipants(eventId, participants) {
      const db = DatabaseConnectivity.getInstance();
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
      }
    }

    async updateEventFields(eventId, eventFields) {
      const db = DatabaseConnectivity.getInstance();
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
      }
    }

    async addEvents(events) {
      const db = DatabaseConnectivity.getInstance();
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
      }
    }

    async deleteEvent(eventId) {
      const db = DatabaseConnectivity.getInstance();
      try {
        await db.initialize();
        const databaseName = "Straw-Headed-Bulbul";
        const collectionName = "Survey Events";
        const filter = { _id: eventId };
        const result = await db.deleteDocument(databaseName, collectionName, filter);
        return {
          success: true,
          result,
          message: 'Event deleted successfully'
        };
      } catch (err) {
        console.error('Error deleting event:', err);
        return {
          success: false,
          message: 'Error deleting event',
          error: err.message
        };
      }
    }
}

module.exports = EventsController;
