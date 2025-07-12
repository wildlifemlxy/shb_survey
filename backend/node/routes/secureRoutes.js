// Backend routes example for your Node.js server
// Save this as: backend/routes/secureRoutes.js

const express = require('express');
const router = express.Router();
const tokenEncryption = require('../middleware/tokenEncryption');

// Apply authentication middleware to all routes
router.use(tokenEncryption.authenticateToken);
router.use(tokenEncryption.handleEncryptedData);

// Secure survey submission
router.post('/surveys', async (req, res) => {
  try {
    const surveyData = req.body; // Already decrypted by middleware
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;

    console.log('Received survey from user:', userId, 'session:', sessionId);

    // Validate survey data
    if (!surveyData || !surveyData.location || !surveyData.observations) {
      return res.status(400).json({ error: 'Invalid survey data' });
    }

    // Add metadata
    const survey = {
      ...surveyData,
      userId,
      sessionId,
      submittedAt: new Date().toISOString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    };

    // Save to database (implement your database logic)
    const savedSurvey = await saveSurveyToDatabase(survey);

    res.json({
      success: true,
      surveyId: savedSurvey.id,
      message: 'Survey submitted successfully'
    });

  } catch (error) {
    console.error('Survey submission error:', error);
    res.status(500).json({ error: 'Failed to submit survey' });
  }
});

// Get user's surveys
router.get('/surveys', async (req, res) => {
  try {
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Get surveys based on user role
    let surveys;
    if (userRole === 'Admin') {
      // Admins can see all surveys
      surveys = await getAllSurveysFromDatabase();
    } else {
      // Users can only see their own surveys
      surveys = await getUserSurveysFromDatabase(userId);
    }

    // Filter sensitive data based on role
    const filteredSurveys = surveys.map(survey => {
      if (userRole === 'Admin' || survey.userId === userId) {
        return survey; // Full access
      } else {
        // Limited access for other users
        return {
          id: survey.id,
          location: survey.location,
          submittedAt: survey.submittedAt,
          // Exclude sensitive fields
        };
      }
    });

    res.json(filteredSurveys);

  } catch (error) {
    console.error('Error fetching surveys:', error);
    res.status(500).json({ error: 'Failed to fetch surveys' });
  }
});

// Update user settings
router.put('/user/settings', async (req, res) => {
  try {
    const settings = req.body; // Already decrypted by middleware
    const userId = req.user.userId;

    // Validate settings
    if (!settings) {
      return res.status(400).json({ error: 'Invalid settings data' });
    }

    // Update user settings in database
    const updatedSettings = await updateUserSettingsInDatabase(userId, settings);

    res.json({
      success: true,
      settings: updatedSettings,
      message: 'Settings updated successfully'
    });

  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Get user profile
router.get('/user/profile', async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get user profile from database
    const userProfile = await getUserProfileFromDatabase(userId);

    if (!userProfile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Remove sensitive information
    const safeProfile = {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role,
      createdAt: userProfile.createdAt,
      lastLogin: userProfile.lastLogin,
      settings: userProfile.settings
      // Don't include password, tokens, etc.
    };

    res.json(safeProfile);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Submit encrypted event data
router.post('/events', async (req, res) => {
  try {
    const eventData = req.body; // Already decrypted by middleware
    const userId = req.user.userId;
    const sessionId = req.user.sessionId;

    // Validate event data
    if (!eventData || !eventData.eventType) {
      return res.status(400).json({ error: 'Invalid event data' });
    }

    // Add metadata
    const event = {
      ...eventData,
      userId,
      sessionId,
      timestamp: new Date().toISOString(),
      ipAddress: req.ip
    };

    // Save to database
    const savedEvent = await saveEventToDatabase(event);

    res.json({
      success: true,
      eventId: savedEvent.id,
      message: 'Event submitted successfully'
    });

  } catch (error) {
    console.error('Event submission error:', error);
    res.status(500).json({ error: 'Failed to submit event' });
  }
});

// Get session info
router.get('/session', (req, res) => {
  try {
    const sessionInfo = {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
      sessionId: req.user.sessionId,
      loginTime: new Date(req.user.iat * 1000),
      expiryTime: new Date(req.user.exp * 1000),
      isValid: true
    };

    res.json(sessionInfo);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get session info' });
  }
});

// Database helper functions (implement these based on your database)
async function saveSurveyToDatabase(survey) {
  // Implement your database save logic
  // Example for MongoDB:
  // const Survey = require('../models/Survey');
  // return await Survey.create(survey);
  
  console.log('Saving survey to database:', survey);
  return { id: 'generated_id', ...survey };
}

async function getAllSurveysFromDatabase() {
  // Implement your database query logic
  console.log('Fetching all surveys from database');
  return [];
}

async function getUserSurveysFromDatabase(userId) {
  // Implement your database query logic
  console.log('Fetching surveys for user:', userId);
  return [];
}

async function updateUserSettingsInDatabase(userId, settings) {
  // Implement your database update logic
  console.log('Updating settings for user:', userId, settings);
  return settings;
}

async function getUserProfileFromDatabase(userId) {
  // Implement your database query logic
  console.log('Fetching profile for user:', userId);
  return null;
}

async function saveEventToDatabase(event) {
  // Implement your database save logic
  console.log('Saving event to database:', event);
  return { id: 'generated_event_id', ...event };
}

module.exports = router;
