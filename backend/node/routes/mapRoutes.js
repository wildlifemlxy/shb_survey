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
    
    console.log('📍 Map config endpoint called');
    console.log('  API Key exists:', !!apiKey);
    console.log('  API Key length:', apiKey.length);
    
    if (!apiKey) {
      console.warn('  ⚠️ Google Maps API key not configured in environment');
      return res.status(500).json({
        success: false,
        error: 'Google Maps API key not configured'
      });
    }

    console.log('  ✅ Returning API key successfully');
    res.json({
      success: true,
      apiKey: apiKey,
      useGoogleMaps: process.env.USE_GOOGLE_MAPS !== 'false'
    });
  } catch (error) {
    console.error('❌ Error fetching map config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch map configuration'
    });
  }
});

module.exports = router;
