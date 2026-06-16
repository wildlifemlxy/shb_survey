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
          console.log('\n========== UPDATE SURVEY CALLED ==========');
          console.log('recordId received:', recordId);
          console.log('recordId type:', typeof recordId);
          console.log('updatedData:', JSON.stringify(updatedData, null, 2));
          
          // Validate recordId
          if (!recordId) {
              console.error('❌ recordId is empty/null/undefined');
              throw new Error('Record ID is required');
          }
          
          if (!ObjectId.isValid(recordId)) {
              console.error('❌ Invalid ObjectId format:', recordId);
              throw new Error('Invalid record ID format');
          }
          
          console.log('✅ recordId is valid ObjectId format');
          
          // Initialize database connection
          await db.initialize();
          console.log('✅ Database connected');
          
          const databaseName = "Straw-Headed-Bulbul";
          const collectionName = "Wildlife Survey";
          
          // Remove any fields that shouldn't be updated
          const sanitizedData = { ...updatedData };
          delete sanitizedData._id; // Don't allow updating the _id field
          
          console.log('Sanitized data for update:', JSON.stringify(sanitizedData, null, 2));
          
          const query = { _id: new ObjectId(recordId) };
          console.log('Query filter:', JSON.stringify(query, null, 2));
          
          const updateOp = { $set: sanitizedData };
          console.log('Update operation:', JSON.stringify(updateOp, null, 2));
          
          // Update the document using db.updateDocument
          console.log('Calling db.updateDocument...');
          const result = await db.updateDocument(
              databaseName, 
              collectionName, 
              query, 
              updateOp
          );
          
          console.log('Update result received:', JSON.stringify(result, null, 2));
          console.log('matchedCount:', result.matchedCount);
          console.log('modifiedCount:', result.modifiedCount);
          
          if (result.matchedCount === 0) {
              console.error('❌ No document found with ID:', recordId);
              throw new Error('Survey record not found');
          }
          
          if (result.modifiedCount === 0) {
              console.log('⚠️ No changes were made to the survey record (may be same values)');
          }
          
          console.log('✅ Update successful');
          return {
              success: true,
              matchedCount: result.matchedCount,
              modifiedCount: result.modifiedCount,
              message: 'Survey updated successfully'
          };
          
      } catch (error) {
          console.error('❌ Error in updateSurvey:', error.message);
          console.error('Full error:', error);
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
    }
  }
}

module.exports = SurveyController;
