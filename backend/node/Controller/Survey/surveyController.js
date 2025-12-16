const DatabaseConnectivity = require("../../Database/databaseConnectivity");
const { ObjectId } = require('mongodb');

class SurveyController 
{
  async getAllSurveys() 
  {
    const db = DatabaseConnectivity.getInstance();
    try 
    {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Wildlife Survey";
      const documents = await db.getAllDocuments(databaseName, collectionName);
      return {
        success: true,
        surveys: documents,
        message: 'Surveys retrieved successfully'
      };
    } catch (err) {
      console.error('Error retrieving surveys:', err);
      return {
        success: false,
        surveys: [],
        count: 0,
        message: 'Error retrieving surveys',
        error: err.message
      };
    }
  }

  async updateSurvey(recordId, updatedData) {
      const db = DatabaseConnectivity.getInstance();
      try {
          // Validate recordId
          if (!ObjectId.isValid(recordId)) {
              throw new Error('Invalid record ID format');
          }
          
          // Initialize database connection
          await db.initialize();
          const databaseName = "Straw-Headed-Bulbul";
          const collectionName = "Wildlife Survey";
          
          // Remove any fields that shouldn't be updated
          const sanitizedData = { ...updatedData };
          delete sanitizedData._id; // Don't allow updating the _id field
          
          // Update the document using db.updateDocument
          const result = await db.updateDocument(
              databaseName, 
              collectionName, 
              { _id: new ObjectId(recordId) }, 
              { $set: sanitizedData }
          );
          
          if (result.matchedCount === 0) {
              throw new Error('Survey record not found');
          }
          
          if (result.modifiedCount === 0) {
              console.log('No changes were made to the survey record');
          }
          
          return {
              success: true,
              matchedCount: result.matchedCount,
              modifiedCount: result.modifiedCount,
              message: 'Survey updated successfully'
          };
          
      } catch (error) {
          console.error('Error in updateSurvey:', error);
          return {
              success: false,
              message: 'Error updating survey',
              error: error.message
          };
      }
  }

  async insertSurvey(surveyData) {
    const db = DatabaseConnectivity.getInstance();
    try {
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Wildlife Survey";
      const result = await db.insertDocument(databaseName, collectionName, surveyData);
      return {
        success: true,
        message: 'Survey inserted successfully',
        insertedId: result.insertedId || null
      };
    } catch (err) {
      console.error('Error inserting survey:', err);
      return {
        success: false,
        message: 'Error inserting survey',
        error: err.message
      };
    }
  }

  async deleteSurvey(recordId) {
    const db = DatabaseConnectivity.getInstance();
    try {
      // Validate recordId
      if (!ObjectId.isValid(recordId)) {
        throw new Error('Invalid record ID format');
      }
      
      // Initialize database connection
      await db.initialize();
      const databaseName = "Straw-Headed-Bulbul";
      const collectionName = "Wildlife Survey";
      
      // Delete the document using db.deleteDocument
      const result = await db.deleteDocument(
        databaseName, 
        collectionName, 
        { _id: new ObjectId(recordId) }
      );
      
      if (result.deletedCount === 0) {
        throw new Error('Survey record not found');
      }
      
      return {
        success: true,
        deletedCount: result.deletedCount,
        message: 'Survey deleted successfully'
      };
      
    } catch (error) {
      console.error('Error in deleteSurvey:', error);
      return {
        success: false,
        message: 'Error deleting survey',
        error: error.message
      };
    } finally {
      await db.close();
    }
  }
}

module.exports = SurveyController;
