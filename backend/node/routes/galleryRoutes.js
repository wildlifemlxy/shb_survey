var express = require('express');
var router = express.Router();
var multer = require('multer');
var path = require('path');
var fs = require('fs');

// Determine base URL based on environment
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://shb-backend.azurewebsites.net'
  : 'http://localhost:3001';

// Import Gallery Controller and Token Encryption
const galleryController = require('../Controller/Gallery/galleryController');
const tokenEncryption = require('../middleware/tokenEncryption');

// Initialize gallery on startup
galleryController.initializeGallery();

// Configure multer for file uploads to backend uploads folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.type || 'pictures'; // 'pictures' or 'videos'
    
    // Map to correct subfolder names
    let subfolderName;
    if (uploadType.toLowerCase() === 'pictures') {
      subfolderName = 'Pictures';
    } else if (uploadType.toLowerCase() === 'videos') {
      subfolderName = 'Videos';
    } else {
      subfolderName = 'Pictures'; // Default fallback
    }
    
    const uploadPath = path.join(__dirname, '../Gallery/', subfolderName);
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

// File filter for images and videos
const fileFilter = (req, file, cb) => {
  const allowedTypes = {
    pictures: /jpeg|jpg|png|gif|webp/,
    videos: /mp4|avi|mov|wmv|flv|webm|mkv/
  };
  
  const uploadType = req.body.type || 'pictures';
  const fileExtension = path.extname(file.originalname).toLowerCase().substring(1);
  
  if (allowedTypes[uploadType] && allowedTypes[uploadType].test(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type for ${uploadType}. Only ${Object.keys(allowedTypes[uploadType]).join(', ')} files are allowed.`));
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB limit per file
    files: undefined // No limit on number of files
  }
});

// Route to serve individual files as blobs
router.get('/file/:type/:filename', function(req, res) {
    try {
        const { type, filename } = req.params;
        
        // Ensure we use the correct subfolder names (Pictures/Videos)
        let subfolderName;
        if (type.toLowerCase() === 'pictures' || type === 'Pictures') {
            subfolderName = 'Pictures';
        } else if (type.toLowerCase() === 'videos' || type === 'Videos') {
            subfolderName = 'Videos';
        } else {
            return res.status(400).json({ error: 'Invalid media type. Must be Pictures or Videos.' });
        }
        
        const filePath = path.join(__dirname, '../Gallery/', subfolderName, filename);
        
        console.log('Serving file:', filePath);
        
        // Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('File not found:', filePath);
            return res.status(404).json({ error: 'File not found' });
        }
        
        // Get file stats
        const stats = fs.statSync(filePath);
        const fileExtension = path.extname(filename).toLowerCase().substring(1);
        
        // Set appropriate content type
        let contentType = 'application/octet-stream';
        if (subfolderName === 'Pictures') {
            const imageTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp'
            };
            contentType = imageTypes[fileExtension] || 'image/jpeg';
        } else if (subfolderName === 'Videos') {
            const videoTypes = {
                'mp4': 'video/mp4',
                'avi': 'video/x-msvideo',
                'mov': 'video/quicktime',
                'wmv': 'video/x-ms-wmv',
                'flv': 'video/x-flv',
                'webm': 'video/webm',
                'mkv': 'video/x-matroska'
            };
            contentType = videoTypes[fileExtension] || 'video/mp4';
        }
        
        // Set headers for blob serving
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        
        // Create read stream and pipe to response
        const readStream = fs.createReadStream(filePath);
        readStream.on('error', (error) => {
            console.error('Error reading file:', error);
            res.status(500).json({ error: 'Failed to read file' });
        });
        
        readStream.pipe(res);
        
    } catch (error) {
        console.error('Error serving file:', error);
        res.status(500).json({ error: 'Failed to serve file' });
    }
});

router.post('/', function(req, res, next) 
{
    const io = req.app.get('io'); // Get the Socket.IO instance
    
    // First, try to parse the request to see if it's a file upload
    upload.array('files')(req, res, async function(err) {
        // Check if this is a file upload request (has files)
        if (req.files && req.files.length > 0) {
            // This is an upload request
            if (err) {
                console.error('Multer error:', err);
                return res.status(400).json({ error: err.message });
            }

            try {
                const { type, uploadedBy } = req.body;
                const files = req.files;

                // Parse uploadedBy if it's a string
                let userInfo = null;
                if (uploadedBy) {
                    try {
                        userInfo = typeof uploadedBy === 'string' ? JSON.parse(uploadedBy) : uploadedBy;
                    } catch (e) {
                        console.error('Error parsing uploadedBy:', e);
                        userInfo = { role: 'Unknown' };
                    }
                }

                const result = await galleryController.processUploadedFiles(files, type, userInfo);

                if (io) {
                    // Also emit survey-updated for event tracking
                    io.emit('survey-updated', {
                        message: 'Gallery updated successfully',
                    });
                }

                console.log('Files uploaded successfully:', result.files);
                return res.json(result);

            } catch (error) {
                console.error('Upload error:', error);
                return res.status(500).json({ 
                    error: 'Failed to upload files',
                    details: error.message 
                });
            }
        } else {
            // This is not a file upload, handle other purposes
            const purpose = req.body.purpose;
            
            if (purpose === "retrieve") {
                try {
                    const manifest = await galleryController.retrieveGalleryItems();
                    return res.json({"result": manifest});
                    
                } catch (error) {
                    console.error('Error retrieving gallery items:', error);
                    return res.status(500).json({ error: 'Failed to retrieve gallery items.' });
                }
            }
            else if (purpose === "retrieveWithBlobs") {
                try {
                    const manifest = await galleryController.retrieveGalleryItems();
                    
                    // Convert file paths to blob URLs
                    const processItems = (items, type) => {
                        return items.map(item => ({
                            ...item,
                            url: `${BASE_URL}/gallery/file/${type}/${item.filename}`,
                            blobUrl: `${BASE_URL}/gallery/file/${type}/${item.filename}`
                        }));
                    };
                    
                    const result = {
                        pictures: processItems(manifest.pictures || [], 'Pictures'),
                        videos: processItems(manifest.videos || [], 'Videos')
                    };
                    
                    console.log('Returning gallery items with blob URLs:', result);
                    return res.json({"result": result});
                    
                } catch (error) {
                    console.error('Error retrieving gallery items with blobs:', error);
                    return res.status(500).json({ error: 'Failed to retrieve gallery items with blobs.' });
                }
            }
            else if (purpose === "getStats") {
                try {
                    const stats = await galleryController.getGalleryStats();
                    return res.json({"result": stats});
                    
                } catch (error) {
                    console.error('Error getting gallery stats:', error);
                    return res.status(500).json({ error: 'Failed to get gallery statistics.' });
                }
            }
            else if (purpose === "approve") {
                try {
                    // Handle encrypted request data for approve purpose
                    if (req.body.data && req.body.data.encryptedData && req.body.data.requiresServerEncryption) {
                        try {
                            const decryptResult = tokenEncryption.decryptRequestData(req.body.data);
                            if (decryptResult.success) {
                                const requestData = decryptResult.data;
                                console.log('🔓 Decrypted approve media request data:', requestData);
                                
                                const mediaId = requestData.mediaId;
                                if (!mediaId) {
                                    return res.status(400).json({ error: 'Media ID is required.' });
                                }
                                
                                // Get client public key from decrypted request data
                                const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                                
                                // Apply token encryption for authenticated access with client's public key
                                return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                                    const result = await galleryController.approveMedia(mediaId);
                                    
                                    if (io) {
                                        io.emit('survey-updated', {
                                            message: 'Media approved',
                                            approvedMedia: result
                                        });
                                    }
                                    
                                    return {
                                        success: true,
                                        result: result,
                                        message: "Media approved successfully"
                                    };
                                }, clientPublicKey);
                            } else {
                                console.error('🔓 approve media request decryption failed:', decryptResult.error);
                                return res.status(400).json({ error: 'Failed to decrypt request data' });
                            }
                        } catch (decryptError) {
                            console.error('🔓 approve media request decryption error:', decryptError);
                            return res.status(400).json({ error: 'Invalid encrypted request' });
                        }
                    } else {
                        // Fallback for non-encrypted requests (backwards compatibility)
                        const { mediaId } = req.body;
                        const result = await galleryController.approveMedia(mediaId);
                        
                        if (io) {
                            io.emit('survey-updated', {
                                message: 'Media approved',
                                approvedMedia: result
                            });
                        }
                        
                        return res.json({"result": result, "message": "Media approved successfully"});
                    }
                } catch (err) {
                    console.error('Error in approve media:', err);
                    return res.status(500).json({ error: err.message || 'Failed to approve media.' });
                }
            }
            else if (purpose === "reject") {
                try {
                    // Handle encrypted request data for reject purpose
                    if (req.body.data && req.body.data.encryptedData && req.body.data.requiresServerEncryption) {
                        try {
                            const decryptResult = tokenEncryption.decryptRequestData(req.body.data);
                            if (decryptResult.success) {
                                const requestData = decryptResult.data;
                                console.log('🔓 Decrypted reject media request data:', requestData);
                                
                                const mediaId = requestData.mediaId;
                                const reason = requestData.reason;
                                if (!mediaId) {
                                    return res.status(400).json({ error: 'Media ID is required.' });
                                }
                                
                                // Get client public key from decrypted request data
                                const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                                
                                // Apply token encryption for authenticated access with client's public key
                                return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                                    const result = await galleryController.rejectMedia(mediaId, reason);
                                    
                                    if (io) {
                                        io.emit('survey-updated', {
                                            message: 'Media rejected',
                                            rejectedMedia: result
                                        });
                                    }
                                    
                                    return {
                                        success: true,
                                        result: result,
                                        message: "Media rejected successfully"
                                    };
                                }, clientPublicKey);
                            } else {
                                console.error('🔓 reject media request decryption failed:', decryptResult.error);
                                return res.status(400).json({ error: 'Failed to decrypt request data' });
                            }
                        } catch (decryptError) {
                            console.error('🔓 reject media request decryption error:', decryptError);
                            return res.status(400).json({ error: 'Invalid encrypted request' });
                        }
                    } else {
                        // Fallback for non-encrypted requests (backwards compatibility)
                        const { mediaId, reason } = req.body;
                        const result = await galleryController.rejectMedia(mediaId, reason);
                        
                        if (io) {
                            io.emit('survey-updated', {
                                message: 'Media rejected',
                                rejectedMedia: result
                            });
                        }
                        
                        return res.json({"result": result, "message": "Media rejected successfully"});
                    }
                } catch (err) {
                    console.error('Error in reject media:', err);
                    return res.status(500).json({ error: err.message || 'Failed to reject media.' });
                }
            }
            else if (purpose === "delete") {
                try {
                    // Handle encrypted request data for delete purpose
                    if (req.body.data && req.body.data.encryptedData && req.body.data.requiresServerEncryption) {
                        try {
                            const decryptResult = tokenEncryption.decryptRequestData(req.body.data);
                            if (decryptResult.success) {
                                const requestData = decryptResult.data;
                                console.log('🔓 Decrypted delete media request data:', requestData);
                                
                                const { mediaId, url, filename, type, location, uploadedBy } = requestData;
                                if (!mediaId) {
                                    return res.status(400).json({ error: 'Media ID is required.' });
                                }
                                
                                // Get client public key from decrypted request data
                                const clientPublicKey = requestData.clientPublicKey || requestData.publicKey;
                                
                                // Apply token encryption for authenticated access with client's public key
                                return await tokenEncryption.encryptResponseDataMiddleware(req, res, async () => {
                                    // Create media object with all information for proper deletion
                                    const mediaInfo = {
                                        mediaId,
                                        url,
                                        filename,
                                        type,
                                        location,
                                        uploadedBy,
                                        purpose: 'delete'
                                    };
                                    
                                    const result = await galleryController.deleteMedia(mediaInfo);
                                    
                                    if (io) {
                                        io.emit('survey-updated', {
                                            message: 'Media deleted',
                                            deletedMedia: result
                                        });
                                    }
                                    
                                    return {
                                        success: true,
                                        result: result,
                                        message: "Media deleted successfully"
                                    };
                                }, clientPublicKey);
                            } else {
                                console.error('🔓 delete media request decryption failed:', decryptResult.error);
                                return res.status(400).json({ error: 'Failed to decrypt request data' });
                            }
                        } catch (decryptError) {
                            console.error('🔓 delete media request decryption error:', decryptError);
                            return res.status(400).json({ error: 'Invalid encrypted request' });
                        }
                    } else {
                        // Fallback for non-encrypted requests (backwards compatibility)
                        const { mediaId, url, filename, type, location, uploadedBy, reason } = req.body;
                        
                        // Create media object with all information for proper deletion
                        const mediaInfo = {
                            mediaId,
                            url,
                            filename,
                            type,
                            location,
                            uploadedBy,
                            reason,
                            purpose: 'delete'
                        };
                        
                        const result = await galleryController.deleteMedia(mediaInfo);
                        
                        if (io) {
                            io.emit('survey-updated', {
                                message: 'Media deleted',
                                deletedMedia: result
                            });
                        }
                        
                        return res.json({"result": result, "message": "Media deleted successfully"});
                    }
                } catch (err) {
                    console.error('Error in delete media:', err);
                    return res.status(500).json({ error: err.message || 'Failed to delete media.' });
                }
            }
            else {
                return res.status(400).json({ error: 'Invalid purpose.' });
            }
        }
    });
});

module.exports = router;
