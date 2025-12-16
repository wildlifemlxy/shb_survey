var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  handleUpload,
  handleGallery,
  handleStream,
  handleAuthUrl,
  handleOAuthCallback,
  handleDelete
} = require('../Controller/Images/ImageControllers');

// Configure multer for file uploads (in memory storage for Google Drive upload)
const storage = multer.memoryStorage();

// File filter to accept only images
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, png, gif, webp)'));
  }
};

// Initialize multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024 // 200MB limit
  }
});

// Single unified POST endpoint with multiple conditions
router.post('/', upload.single('image'), async function(req, res, next) {
  var requestData = req.body;
  
  if (requestData.purpose === "upload") {
    return await handleUpload(req, res);
  }
  else if (requestData.purpose === "gallery") {
    return await handleGallery(req, res);
  }
  else if (requestData.purpose === "stream") {
    return await handleStream(req, res);
  }
  else if (requestData.purpose === "delete") {
    return await handleDelete(req, res);
  }
  else {
    return res.status(400).json({
      success: false,
      error: 'Invalid purpose. Supported: upload, gallery, stream, delete'
    });
  }
});

// GET endpoint to generate OAuth authorization URL
router.get('/auth-url', handleAuthUrl);

// GET endpoint to handle OAuth callback (Google redirects here with code)
router.get('/', handleOAuthCallback);

module.exports = router;

