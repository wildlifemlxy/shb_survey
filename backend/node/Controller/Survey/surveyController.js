const DatabaseConnectivity = require("../../Database/databaseConnectivity");

class SurveyController {
  async getAllSurveys() {
    const db = new DatabaseConnectivity();
    try {
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
    } finally {
      await db.close();
    }
  }

  async insertSurvey(surveyData) {
    const db = new DatabaseConnectivity();
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
    } finally {
      await db.close();
    }
  }
}

module.exports = SurveyController;
