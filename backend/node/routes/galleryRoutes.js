var express = require('express');
var router = express.Router();
var multer = require('multer');
var path = require('path');
var fs = require('fs');

// Import Gallery Controller
const galleryController = require('../Controller/Gallery/galleryController');

// Initialize gallery on startup
galleryController.initializeGallery();

// Configure multer for file uploads to backend uploads folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadType = req.body.type || 'pictures'; // 'pictures' or 'videos'
    const uploadPath = path.join(__dirname, '../../Gallery/', uploadType);
    
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
        const filePath = path.join(__dirname, '../../Gallery/', type, filename);
        
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
        if (type === 'Pictures' || type === 'pictures') {
            const imageTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'webp': 'image/webp'
            };
            contentType = imageTypes[fileExtension] || 'image/jpeg';
        } else if (type === 'Videos' || type === 'videos') {
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
                const { type } = req.body;
                const files = req.files;

                const result = await galleryController.processUploadedFiles(files, type);

                if (io) {
                    io.emit('gallery-updated', {
                        message: result.message,
                        uploadedFiles: result.files
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
                            url: `http://localhost:3001/gallery/file/${type}/${item.filename}`,
                            blobUrl: `http://localhost:3001/gallery/file/${type}/${item.filename}`
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
            else {
                return res.status(400).json({ error: 'Invalid purpose.' });
            }
        }
    });
});

module.exports = router;
