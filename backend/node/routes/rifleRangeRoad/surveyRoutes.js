const express = require('express');
const RifleRangeRoadSurveyController = require('../../Controller/RifleRangeRoad/surveyController');

const router = express.Router();

router.post('/', async (req, res) => {
  if (req.body?.purpose === 'insert') {
    const io = req.app.get('io');
    try {
      const { purpose, ...surveyData } = req.body;
      const controller = new RifleRangeRoadSurveyController();
      const result = await controller.insertSurvey(surveyData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message || 'Failed to insert survey'
        });
      }

      if (io) {
        io.emit('surveyInserted', {
          action: 'insert',
          surveyId: result.insertedId,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        message: 'Survey inserted successfully',
        insertedId: result.insertedId
      });
    } catch (error) {
      console.error('Error inserting Rifle Range Road survey:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to insert survey'
      });
    }
  }

  if (req.body?.purpose === 'update') {
    const io = req.app.get('io');
    try {
      const recordId = req.body.recordId || req.body._id;
      if (!recordId) {
        return res.status(400).json({
          success: false,
          error: 'Record ID is required for update'
        });
      }

      const updatedData = { ...req.body };
      delete updatedData.purpose;
      delete updatedData.recordId;

      const controller = new RifleRangeRoadSurveyController();
      const result = await controller.updateSurvey(recordId, updatedData);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message || 'Failed to update survey'
        });
      }

      if (io) {
        io.emit('surveyUpdated', {
          action: 'update',
          recordId,
          data: updatedData,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        message: 'Survey updated successfully',
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      console.error('Error updating Rifle Range Road survey:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to update survey'
      });
    }
  }

  if (req.body?.purpose === 'delete') {
    const io = req.app.get('io');
    try {
      const controller = new RifleRangeRoadSurveyController();
      const result = await controller.deleteSurvey(req.body.surveyId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.message || 'Failed to delete survey'
        });
      }

      if (io) {
        io.emit('surveyDeleted', {
          action: 'delete',
          surveyId: req.body.surveyId,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        message: 'Survey deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting Rifle Range Road survey:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete survey'
      });
    }
  }

  if (req.body?.purpose !== 'retrieve') {
    return res.status(400).json({
      success: false,
      surveys: [],
      error: 'Unsupported survey request'
    });
  }

  const controller = new RifleRangeRoadSurveyController();
  const result = await controller.getAllSurveys();
  return res.status(result.success ? 200 : 500).json(result);
});

module.exports = router;