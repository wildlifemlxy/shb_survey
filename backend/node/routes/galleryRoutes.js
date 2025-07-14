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

router.post('/', upload, async function(req, res) 
{
  const io = req.app.get('io'); // Get the Socket.IO instance
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
      const videoThumbnails = {};
      for (const file of files) {
        const destPath = path.join(destDir, file.originalname);
        // Double-check parent directory exists for each file
        const parentDir = path.dirname(destPath);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        try {
          fs.renameSync(file.path, destPath);
          // If MOV video, extract thumbnail using ffmpeg
          if (file.originalname.toLowerCase().endsWith('.mov')) {
            const thumbPath = destPath + '.thumb.jpg';
            const ffmpeg = require('child_process');
            // Extract first frame as JPEG thumbnail
            try {
              ffmpeg.execSync(`ffmpeg -y -i "${destPath}" -frames:v 1 -q:v 2 "${thumbPath}"`);
              if (fs.existsSync(thumbPath)) {
                const thumbBuffer = fs.readFileSync(thumbPath);
                videoThumbnails[file.originalname] = 'data:image/jpeg;base64,' + thumbBuffer.toString('base64');
                // Optionally delete the temp thumbnail file
                fs.unlinkSync(thumbPath);
              }
            } catch (ffErr) {
              console.error(`[Gallery Upload] ffmpeg thumbnail error for ${file.originalname}:`, ffErr);
            }
          }
        } catch (moveErr) {
        }
      }
      // Save videoThumbnails to a temp file for retrieval (or DB if needed)
      if (Object.keys(videoThumbnails).length > 0) {
        const thumbMetaPath = path.join(destDir, 'videoThumbnails.json');
        let existingThumbs = {};
        if (fs.existsSync(thumbMetaPath)) {
          try {
            existingThumbs = JSON.parse(fs.readFileSync(thumbMetaPath));
          } catch {}
        }
        Object.assign(existingThumbs, videoThumbnails);
        fs.writeFileSync(thumbMetaPath, JSON.stringify(existingThumbs));
      }
      if (io) {
          io.emit('survey-updated', {
              message: 'Survey updated successfully',
          });
      }
      // TODO: Save metadata to DB if needed
      return res.json({ result: { success: true, message: `Saved ${files.length} file(s) to ${subfolder}` } });
    } catch (error) {
      console.error('Error handling gallery upload:', error);
      return res.status(500).json({ error: 'Failed to handle gallery upload.' });
    }
  } 
  else if (purpose === 'retrieve') {
    // Always return all files as an array of { name, type, data (base64) }
    try {
      const allowed = ['Pictures', 'Videos'];
      const subfolders = allowed;
      let allFiles = [];
      for (const sub of subfolders) {
        const dir = path.join(galleryDir, sub);
        // Load video thumbnails if present
        let videoThumbnails = {};
        const thumbMetaPath = path.join(dir, 'videoThumbnails.json');
        if (fs.existsSync(thumbMetaPath)) {
          try {
            videoThumbnails = JSON.parse(fs.readFileSync(thumbMetaPath));
          } catch {}
        }
        if (fs.existsSync(dir)) {
          const subFiles = fs.readdirSync(dir).filter(filename => !filename.startsWith('.') && filename !== '.gitkeep' && !filename.endsWith('.thumb.jpg') && filename !== 'videoThumbnails.json');
          for (const filename of subFiles) {
            const filePath = path.join(dir, filename);
            const fileBuffer = fs.readFileSync(filePath);
            const base64Data = fileBuffer.toString('base64');
            // Debug: log base64 and file size for .mov files
            let thumbnailUrl = undefined;
            if (filename.toLowerCase().endsWith('.mov')) {
              console.log(`[Gallery Retrieve] MOV file: ${filename}, size: ${fileBuffer.length} bytes, base64 (first 100):`, base64Data.substring(0, 100));
              if (videoThumbnails[filename]) {
                thumbnailUrl = videoThumbnails[filename];
              }
            }
            allFiles.push({
              name: filename,
              type: sub.toLowerCase(),
              data: base64Data,
              thumbnailUrl
            });
          }
        }
      }
      return res.json({ files: allFiles });
    } catch (error) {
      console.error('Error retrieving gallery files:', error);
      return res.status(500).json({ error: 'Failed to retrieve gallery files.' });
    }
  }
  else {
    // Default: not handled
    return res.status(400).json({ error: 'Invalid or missing purpose' });
  }
});

module.exports = router;
