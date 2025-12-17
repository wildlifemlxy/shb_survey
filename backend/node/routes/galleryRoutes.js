var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const GalleryController = require('../Controller/Gallery/GalleryControllers');

// Create a singleton instance
const galleryController = new GalleryController();

// Configure multer for file uploads (in memory storage for Google Drive upload)
const storage = multer.memoryStorage();

// File filter to accept images and videos
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/jpg',
    // Videos
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska',
    'video/webm',
    'video/mpeg',
    'video/ogg',
    'video/3gpp',
    'video/3gpp2'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image (jpeg, png, gif, webp, jpg) and video (mp4, mov, avi, mkv, webm, mpeg, ogg, 3gp) files are allowed'));
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
    return await galleryController.handleUpload(req, res);
  }
  else if (requestData.purpose === "gallery") {
    return await galleryController.handleGallery(req, res);
  }
  else if (requestData.purpose === "stream") {
    return await galleryController.handleStream(req, res);
  }
  else if (requestData.purpose === "delete") {
    return await galleryController.handleDelete(req, res);
  }
  else if (requestData.purpose === "bulk-delete") {
    return await galleryController.handleBulkDelete(req, res);
  }
  else {
    return res.status(400).json({
      success: false,
      error: 'Invalid purpose. Supported: upload, gallery, stream, delete, bulk-delete'
    });
  }
});

// GET endpoint to generate OAuth authorization URL
router.get('/auth-url', galleryController.handleAuthUrl.bind(galleryController));

// GET endpoint to handle OAuth callback (Google redirects here with code)
router.get('/', galleryController.handleOAuthCallback.bind(galleryController));

module.exports = router;

