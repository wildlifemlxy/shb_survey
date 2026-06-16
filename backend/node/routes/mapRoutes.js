var express = require('express');
var router = express.Router();

/**
 * GET /api/map/config
 * Returns Google Maps configuration including API key
 * This endpoint should be called from the frontend to get the API key securely
 */
router.get('/config', (req, res) => {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'Google Maps API key not configured'
      });
    }

    res.json({
      success: true,
      apiKey: apiKey,
      useGoogleMaps: process.env.USE_GOOGLE_MAPS !== 'false'
    });
  } catch (error) {
    console.error('Error fetching map config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch map configuration'
    });
  }
});

module.exports = router;
