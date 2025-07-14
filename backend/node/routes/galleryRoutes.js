var express = require('express');
var router = express.Router();
var multer = require('multer');
var path = require('path');
var fs = require('fs');


// Import Gallery Controller and Token Encryption
const galleryController = require('../Controller/Gallery/galleryController');
const tokenEncryption = require('../middleware/tokenEncryption');

// Initialize gallery on startup
galleryController.initializeGallery();

// Ensure Gallery directory exists
const galleryDir = path.resolve(__dirname, '../Gallery');
if (!fs.existsSync(galleryDir)) {
  fs.mkdirSync(galleryDir, { recursive: true });
}

const upload = multer({ dest: galleryDir }).array('files');

router.post('/', upload, async function(req, res) {
  // Check for encrypted or plain JSON body with 'purpose'
  const { purpose } = req.body;
  console.log('Received request with purpose:', req.body);
  if (purpose === 'upload') {
    try {
      // Encrypted metadata is in req.body.encryptedData
      if (!req.body.encryptedData) {
        return res.status(400).json({ error: 'Missing encryptedData in request.' });
      }
      // Parse encryptedData if it's a string
      let encryptedData = req.body.encryptedData;
      if (typeof encryptedData === 'string') {
        try {
          encryptedData = JSON.parse(encryptedData);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid encryptedData format' });
        }
      }
      let decryptedMeta = null;
      try {
        decryptedMeta = tokenEncryption.decryptRequestData(encryptedData);
      } catch (e) {
        console.error('Failed to decrypt metadata:', e);
        return res.status(400).json({ error: 'Failed to decrypt metadata.' });
      }
      if (!decryptedMeta || !decryptedMeta.success) {
        return res.status(400).json({ error: 'Invalid encrypted metadata.' });
      }
      const metadata = decryptedMeta.data;
      // Files are in req.files
      const files = req.files || [];
      console.log('Received gallery upload:', {
        metadata,
        fileCount: files.length,
        fileNames: files.map(f => f.originalname)
      });

      // Determine subfolder based on metadata.type
      let subfolder = 'Others';
      if (metadata.data.type === 'pictures') subfolder = 'Pictures';
      else if (metadata.data.type === 'videos') subfolder = 'Videos';

      const destDir = path.join(galleryDir, subfolder);

      // Move each uploaded file to the correct subfolder, log destination
      for (const file of files) {
        const destPath = path.join(destDir, file.originalname);
        // Double-check parent directory exists for each file
        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        console.log(`[Gallery Upload] Moving file: ${file.path} -> ${destPath}`);
        try {
          fs.renameSync(file.path, destPath);
        } catch (moveErr) {
          console.error(`[Gallery Upload] Failed to move file: ${file.path} -> ${destPath}`, moveErr);
        }
      }

      // TODO: Save metadata to DB if needed
      return res.json({ result: { success: true, message: `Saved ${files.length} file(s) to ${subfolder}` } });
    } catch (error) {
      console.error('Error handling gallery upload:', error);
      return res.status(500).json({ error: 'Failed to handle gallery upload.' });
    }
  } else {
    // Default: not handled
    return res.status(400).json({ error: 'Invalid or missing purpose' });
  }
});

module.exports = router;
