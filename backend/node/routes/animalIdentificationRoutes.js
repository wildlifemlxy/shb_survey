var express = require('express');
var router = express.Router();
const AnimalIdentificationController = require('../Controller/AnimalIdentification/animalIdentificationController');

// Create a singleton instance
const animalIdentificationController = new AnimalIdentificationController();

// Single unified POST endpoint with condition-based routing
router.post('/', async function(req, res, next) {
  var requestData = req.body;
  
  if (requestData.purpose === "identify") {
    // Animal/Bird identification using Gemini Vision + Wikipedia
    // Expected body: { purpose: "identify", image: "base64_encoded_image", mimeType: "image/jpeg" (optional) }
    return await animalIdentificationController.handleIdentification(req, res);
  }
  else {
    return res.status(400).json({
      success: false,
      error: 'Invalid purpose. Supported: identify'
    });
  }
});

module.exports = router;
