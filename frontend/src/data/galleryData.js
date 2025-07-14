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

      // --- METADATA TRACKING LOGIC ---
      const metadataPath = path.resolve(__dirname, '../Gallery/gallery_metadata.json');
      let galleryMeta = [];
      if (fs.existsSync(metadataPath)) {
        try {
          const raw = fs.readFileSync(metadataPath, 'utf8');
          if (raw.trim()) galleryMeta = JSON.parse(raw);
        } catch (e) { galleryMeta = []; }
      }
      const now = new Date().toISOString();
      for (const file of files) {
        galleryMeta.push({
          action: 'upload',
          fileName: file.originalname,
          memberId: metadata.data.memberId || (metadata.data.uploadedBy && metadata.data.uploadedBy.id) || null,
          role: metadata.data.role || (metadata.data.uploadedBy && metadata.data.uploadedBy.role) || null,
          timestamp: now
        });
      }
      fs.writeFileSync(metadataPath, JSON.stringify(galleryMeta, null, 2));

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
      // Metadata tracking handled above
      return res.json({ result: { success: true, message: `Saved ${files.length} file(s) to ${subfolder}` } });
    } catch (error) {
      console.error('Error handling gallery upload:', error);
      return res.status(500).json({ error: 'Failed to handle gallery upload.' });
    }
  } 
  else if (purpose === 'retrieve') {
    // Always return all files as an array of { name, type, data (base64), memberId, role }
    try {
      const allowed = ['Pictures', 'Videos'];
      const subfolders = allowed;
      let allFiles = [];
      // Load metadata for uploader info
      const metadataPath = path.resolve(__dirname, '../Gallery/gallery_metadata.json');
      let galleryMeta = [];
      if (fs.existsSync(metadataPath)) {
        try {
          const raw = fs.readFileSync(metadataPath, 'utf8');
          if (raw.trim()) galleryMeta = JSON.parse(raw);
        } catch (e) { galleryMeta = []; }
      }
      // Build a lookup for latest upload info per file, including approval status
      const fileMetaMap = {};
      for (const entry of galleryMeta) {
        if (entry.action === 'upload') {
          fileMetaMap[entry.fileName] = { memberId: entry.memberId, role: entry.role, approved: entry.approved };
        }
        if (entry.action === 'approve') {
          if (fileMetaMap[entry.fileName]) fileMetaMap[entry.fileName].approved = true;
        }
        if (entry.action === 'reject') {
          if (fileMetaMap[entry.fileName]) fileMetaMap[entry.fileName].approved = false;
        }
        if (entry.action === 'delete') {
          if (fileMetaMap[entry.fileName]) delete fileMetaMap[entry.fileName];
        }
      }
      // Get user role and id from headers
      let userRole = null, userId = null;
      if (req.headers['x-user-role']) userRole = req.headers['x-user-role'];
      if (req.headers['x-user-id']) userId = req.headers['x-user-id'];
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
            // Attach memberId, role, and approved if available
            const meta = fileMetaMap[filename] || {};
            // WWF-Volunteer: only see approved or own uploads, others see all
            if (userRole === 'WWF-Volunteer') {
              if (meta.approved === true || (userId && meta.memberId === userId)) {
                allFiles.push({
                  name: filename,
                  type: sub.toLowerCase(),
                  data: base64Data,
                  thumbnailUrl,
                  memberId: meta.memberId || null,
                  role: meta.role || null,
                  approved: typeof meta.approved === 'boolean' ? meta.approved : null
                });
              }
            } else {
              allFiles.push({
                name: filename,
                type: sub.toLowerCase(),
                data: base64Data,
                thumbnailUrl,
                memberId: meta.memberId || null,
                role: meta.role || null,
                approved: typeof meta.approved === 'boolean' ? meta.approved : null
              });
            }
          }
        }
      }
      console.log('Retrieved gallery files:', allFiles);
      return res.json({ files: allFiles });
    } catch (error) {
      console.error('Error retrieving gallery files:', error);
      return res.status(500).json({ error: 'Failed to retrieve gallery files.' });
    }
  }
  else if(purpose === "delete")
  {
    try {
      console.log('Handling gallery delete request:', req.body);
      // Decrypt the encryptedData to get fileId
      if (!req.body.encryptedData) {
        return res.status(400).json({ error: 'Missing encryptedData in request.' });
      }
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
        console.log('Decrypted metadata:', decryptedMeta.data);
      } catch (e) {
        console.error('Failed to decrypt delete metadata:', e);
        return res.status(400).json({ error: 'Failed to decrypt metadata.' });
      }
      if (!decryptedMeta || !decryptedMeta.success) {
        return res.status(400).json({ error: 'Invalid encrypted metadata.' });
      }
      const {fileId} = decryptedMeta.data.data;
      console.log(`Deleting gallery file: ${fileId}`);

      if (!fileId) {
        return res.status(400).json({ error: 'Missing fileId in decrypted data.' });
      }


      // Try to find and delete the file in Pictures or Videos
      const subfolders = ['Pictures', 'Videos'];
      let deleted = false;
      let deletedSub = null;
      for (const sub of subfolders) {
        const filePath = path.join(galleryDir, sub, fileId);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          deleted = true;
          deletedSub = sub;
          break;
        }
      }
      if (!deleted) {
        return res.status(404).json({ error: 'File not found.' });
      }

      // --- METADATA TRACKING LOGIC ---
      const metadataPath = path.resolve(__dirname, '../Gallery/gallery_metadata.json');
      let galleryMeta = [];
      if (fs.existsSync(metadataPath)) {
        try {
          const raw = fs.readFileSync(metadataPath, 'utf8');
          if (raw.trim()) galleryMeta = JSON.parse(raw);
        } catch (e) { galleryMeta = []; }
      }
      // Remove all entries for this fileId from metadata
      galleryMeta = galleryMeta.filter(entry => entry.fileName !== fileId);
      fs.writeFileSync(metadataPath, JSON.stringify(galleryMeta, null, 2));

      // Optionally emit a socket event for gallery update
      if (io) {
        io.emit('survey-updated', { message: 'Gallery file deleted', fileId });
      }
      return res.json({ result: { success: true, message: `Deleted file: ${fileId}` } });
    } catch (error) {
      console.error('Error handling gallery delete:', error);
      return res.status(500).json({ error: 'Failed to delete gallery file.' });
    }
  }
  else if(purpose === 'approve') 
  {
    console.log('Handling gallery approve request:', req.body);
    try {
      // Decrypt the encryptedData to get fileId and user info
      if (!req.body.encryptedData) {
        return res.status(400).json({ error: 'Missing encryptedData in request.' });
      }
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
        console.log('Decrypted approve metadata:', decryptedMeta.data);
      } catch (e) {
        console.error('Failed to decrypt approve metadata:', e);
        return res.status(400).json({ error: 'Failed to decrypt metadata.' });
      }
      if (!decryptedMeta || !decryptedMeta.success) {
        return res.status(400).json({ error: 'Invalid encrypted metadata.' });
      }
      const { fileId, memberId, role } = decryptedMeta.data.data;
      if (!fileId) {
        return res.status(400).json({ error: 'Missing fileId in decrypted data.' });
      }
  
      // --- METADATA TRACKING LOGIC ---
      const metadataPath = path.resolve(__dirname, '../Gallery/gallery_metadata.json');
      let galleryMeta = [];
      if (fs.existsSync(metadataPath)) {
        try {
          const raw = fs.readFileSync(metadataPath, 'utf8');
          if (raw.trim()) galleryMeta = JSON.parse(raw);
        } catch (e) { galleryMeta = []; }
      }
      const now = new Date().toISOString();
      // Find the latest upload entry for this file and update it
      let found = false;
      for (let i = galleryMeta.length - 1; i >= 0; i--) {
        if (galleryMeta[i].action === 'upload' && galleryMeta[i].fileName === fileId && galleryMeta[i].role === 'WWF-Volunteer') {
          galleryMeta[i].action = 'approve';
          found = true;
          break;
        }
      }
      console.log(`Approving gallery file: ${fileId}, found: ${found}`);
      // Optionally, if not found, do nothing or log
      fs.writeFileSync(metadataPath, JSON.stringify(galleryMeta, null, 2));
  
      if (io) {
        io.emit('survey-updated', { message: 'Gallery file approved', fileId });
      }
      return res.json({ result: { success: true, message: `Approved file: ${fileId}` } });
    } catch (error) {
      console.error('Error handling gallery approve:', error);
      return res.status(500).json({ error: 'Failed to approve gallery file.' });
    }
  }
  else if(purpose === 'reject') 
  {
    console.log('Handling gallery reject request:', req.body);
    try {
      // Decrypt the encryptedData to get fileId and user info
      if (!req.body.encryptedData) {
        return res.status(400).json({ error: 'Missing encryptedData in request.' });
      }
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
        console.log('Decrypted approve metadata:', decryptedMeta.data);
      } catch (e) {
        console.error('Failed to decrypt approve metadata:', e);
        return res.status(400).json({ error: 'Failed to decrypt metadata.' });
      }
      if (!decryptedMeta || !decryptedMeta.success) {
        return res.status(400).json({ error: 'Invalid encrypted metadata.' });
      }
      const { fileId, memberId, role } = decryptedMeta.data.data;
      if (!fileId) {
        return res.status(400).json({ error: 'Missing fileId in decrypted data.' });
      }
  
      // --- METADATA TRACKING LOGIC ---
      const metadataPath = path.resolve(__dirname, '../Gallery/gallery_metadata.json');
      let galleryMeta = [];
      if (fs.existsSync(metadataPath)) {
        try {
          const raw = fs.readFileSync(metadataPath, 'utf8');
          if (raw.trim()) galleryMeta = JSON.parse(raw);
        } catch (e) { galleryMeta = []; }
      }
      const now = new Date().toISOString();
      // Find the latest upload entry for this file and update it
      let found = false;
      for (let i = galleryMeta.length - 1; i >= 0; i--) {
        if (galleryMeta[i].action === 'upload' && galleryMeta[i].fileName === fileId && galleryMeta[i].role === 'WWF-Volunteer') {
          galleryMeta[i].action = 'reject';
          found = true;
          break;
        }
      }
      console.log(`Reject gallery file: ${fileId}, found: ${found}`);
      // Optionally, if not found, do nothing or log
      fs.writeFileSync(metadataPath, JSON.stringify(galleryMeta, null, 2));
  
      if (io) {
        io.emit('survey-updated', { message: 'Gallery file rejected', fileId });
      }
      return res.json({ result: { success: true, message: `Rejected file: ${fileId}` } });
    } catch (error) {
      console.error('Error handling gallery reject:', error);
      return res.status(500).json({ error: 'Failed to reject gallery file.' });
    }
  }
  else {
    // Default: not handled
    return res.status(400).json({ error: 'Invalid or missing purpose' });
  }
});

module.exports = router;