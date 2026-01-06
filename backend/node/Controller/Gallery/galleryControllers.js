const { google } = require('googleapis');

class GalleryController {
  // Google Drive API Configuration
  static GOOGLE_DRIVE_CONFIG = {
    targetFolderId: '1bjcOdnLRtxIdcIub-hD9RMXMfQyz2JMX',
    clientId: '389626720765-84tdf20hilcfeg3us8pvh3m5085d12jc.apps.googleusercontent.com',
    clientSecret: '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',
    redirectUri: 'http://localhost:3001/images'
  };

  static oauthRefreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN || null;
  static googleAuthClient = null;

  constructor() {
    // Initialize OAuth 2.0 client if not already done
    if (!GalleryController.googleAuthClient) {
      GalleryController.googleAuthClient = GalleryController.initializeOAuth2Client();
    }
  }

  // Initialize OAuth 2.0 client
  static initializeOAuth2Client() {
    try {
      const oauth2Client = new google.auth.OAuth2(
        GalleryController.GOOGLE_DRIVE_CONFIG.clientId,
        GalleryController.GOOGLE_DRIVE_CONFIG.clientSecret,
        GalleryController.GOOGLE_DRIVE_CONFIG.redirectUri
      );

      if (GalleryController.oauthRefreshToken) {
        oauth2Client.setCredentials({
          refresh_token: GalleryController.oauthRefreshToken
        });
        console.log('✓ OAuth 2.0 client initialized with refresh token');
      } else {
        console.warn('⚠ OAuth 2.0 refresh token not configured');
      }

      return oauth2Client;
    } catch (error) {
      console.error('Error initializing OAuth 2.0 client:', error.message);
      return null;
    }
  }

  // Upload image to Google Drive
  static async uploadImage(filename, fileBuffer, mimetype) {
    try {
      if (!GalleryController.googleAuthClient) {
        throw new Error('Google Drive client not initialized');
      }

      const drive = google.drive({
        version: 'v3',
        auth: GalleryController.googleAuthClient
      });

      const fileMetadata = {
        name: filename,
        parents: [GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId]
      };

      const media = {
        mimeType: mimetype,
        body: require('stream').Readable.from(fileBuffer)
      };

      const response = await drive.files.create({
        resource: fileMetadata,
        media: media,
        fields: 'id, name, webViewLink, size, createdTime'
      });

      return {
        id: response.data.id,
        name: response.data.name,
        webLink: response.data.webViewLink,
        size: response.data.size,
        createdTime: response.data.createdTime
      };
    } catch (error) {
      console.error('Error uploading to Google Drive:', error.message);
      throw new Error('Failed to upload file to Google Drive');
    }
  }

  // Handle upload
  async handleUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
      }

      if (!GalleryController.googleAuthClient) {
        return res.status(503).json({
          success: false,
          error: 'Google Drive service not initialized. Please check server configuration and try again.'
        });
      }

      console.log('Uploading image to Google Drive:', req.file.originalname);

      const filename = req.file.originalname;
      const driveFile = await GalleryController.uploadImage(filename, req.file.buffer, req.file.mimetype);

      console.log('Image uploaded to Google Drive successfully:', driveFile.name);

      // Prepare response with new image data
      const responseData = {
        success: true,
        message: 'Image uploaded to Google Drive successfully',
        file: {
          id: driveFile.id,
          name: driveFile.name,
          filename: filename,
          originalName: req.file.originalname,
          size: driveFile.size,
          mimetype: req.file.mimetype,
          webLink: driveFile.webLink,
          uploadedAt: driveFile.createdTime
        }
      };

      // Emit socket event to notify all connected clients about new image
      if (req.app.get('io')) {
        const newImageData = {
          id: driveFile.id,
          title: filename.replace(/\.[^.]+$/, ''),
          alt: filename,
          src: `/images/stream/${driveFile.id}`,
          mimeType: req.file.mimetype,
          createdTime: driveFile.createdTime
        };
        
        console.log('📡 Broadcasting image_uploaded event to all clients');
        req.app.get('io').emit('image_uploaded', newImageData);
      }

      return res.json(responseData);
    } catch (error) {
      console.error('Error uploading image:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to upload image',
        message: error.message
      });
    }
  }

  // Handle gallery retrieval
  async handleGallery(req, res) {
    try {
      console.log('=== GALLERY RETRIEVAL REQUEST (OAuth) ===');
      
      if (!GalleryController.googleAuthClient) {
        return res.status(503).json({
          success: false,
          error: 'OAuth client not initialized',
          message: 'Please authenticate first by visiting /images/auth-url'
        });
      }

      if (!GalleryController.oauthRefreshToken) {
        return res.status(503).json({
          success: false,
          error: 'OAuth authentication not configured',
          message: 'Please authenticate first by visiting /images/auth-url'
        });
      }

      console.log('📡 Querying Google Drive API for images and videos...');
      
      const drive = google.drive({
        version: 'v3',
        auth: GalleryController.googleAuthClient
      });

      const response = await drive.files.list({
        q: `'${GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
        spaces: 'drive',
        fields: 'files(id, name, createdTime, mimeType)',
        pageSize: 100,
        orderBy: 'createdTime desc'
      });

      console.log(`✅ Found ${response.data.files.length} media files`);

      const images = response.data.files.map(file => ({
        src: `/images/stream/${file.id}`,
        alt: file.name,
        title: file.name.replace(/\.[^.]+$/, ''),
        id: file.id,
        mimeType: file.mimeType,
        createdTime: file.createdTime
      }));

      // Return data directly
      return res.json({
        success: true,
        message: 'Gallery retrieved successfully',
        images: images,
        count: images.length,
        source: 'google_oauth'
      });
    } catch (error) {
      console.error('❌ Gallery retrieval error:', error.message);
      return res.json({
        success: true,
        message: 'Gallery retrieval initiated',
        images: [],
        error: error.message
      });
    }
  }

  // Handle stream
  async handleStream(req, res) {
    try {
      const { fileId } = req.body;

      console.log('=== Stream Image Request ===');
      console.log('File ID:', fileId);

      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'File ID is required'
        });
      }

      if (!GalleryController.googleAuthClient) {
        return res.status(503).json({
          success: false,
          error: 'Google Service Account not initialized'
        });
      }

      const drive = google.drive({
        version: 'v3',
        auth: GalleryController.googleAuthClient
      });

      // Get file metadata with parents to verify it's from the target folder
      console.log('Fetching file metadata...');
      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'name, mimeType, size, parents, trashed'
      });

      console.log('✓ File metadata retrieved:', fileMetadata.data.name);
      console.log('File MIME Type:', fileMetadata.data.mimeType);
      console.log('Target folder ID:', GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId);
      console.log('File is trashed:', fileMetadata.data.trashed);

      // Determine if it's a video
      const isVideo = fileMetadata.data.mimeType && fileMetadata.data.mimeType.startsWith('video/');
      console.log(`Media Type: ${isVideo ? '🎬 VIDEO' : '🖼️ IMAGE'} - ${fileMetadata.data.mimeType}`);

      // Check if file is in trash
      if (fileMetadata.data.trashed === true) {
        console.error('Security: File is in trash');
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'File is in trash and cannot be accessed'
        });
      }

      // Verify file is from target folder
      const fileParents = fileMetadata.data.parents || [];
      console.log('File parents:', fileParents);
      const isFromTargetFolder = fileParents.includes(GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId);

      if (!isFromTargetFolder) {
        console.error('Security: File is not from target folder');
        console.error('File parents:', fileParents);
        console.error('Target folder:', GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId);
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'File must be from target folder: ' + GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId
        });
      }

      console.log('✓ File verified to be from target folder');

      // Get file stream
      const mediaLabel = isVideo ? '🎬 VIDEO' : '🖼️ IMAGE';
      console.log(`${mediaLabel} Starting file stream... ${fileMetadata.data.name}`);
      console.log(`File size: ${fileMetadata.data.size} bytes`);

      const response = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'stream' }
      );

      // Set headers for proper streaming
      res.setHeader('Content-Type', fileMetadata.data.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${fileMetadata.data.name}"`);
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('Pragma', 'public');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Connection', 'keep-alive');
      
      // Only set Content-Length if size is available and reasonable
      if (fileMetadata.data.size && fileMetadata.data.size > 0 && fileMetadata.data.size < 5 * 1024 * 1024 * 1024) {
        res.setHeader('Content-Length', fileMetadata.data.size);
      }

      console.log(`📤 Headers set, piping stream...`);

      // Pipe stream to response with error handling
      response.data.on('error', (error) => {
        console.error(`❌ Google Drive stream error for ${fileId}:`, error.message);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Failed to stream file from Google Drive'
          });
        }
      });

      response.data.on('data', (chunk) => {
      //  console.log(`📥 Streaming chunk: ${chunk.length} bytes`);
      });

      response.data.on('end', () => {
        console.log(`✅ Google Drive stream ended for ${fileId}: ${fileMetadata.data.name}`);
      });

      res.on('error', (error) => {
        console.error(`❌ Response error for ${fileId}:`, error.message);
        if (response.data) {
          response.data.destroy();
        }
      });

      // Pipe with error handling
      response.data.pipe(res).on('error', (error) => {
        console.error(`❌ Pipe error for ${fileId}:`, error.message);
      });

      res.on('finish', () => {
        console.log(`✅ Response finished for ${fileId}: ${fileMetadata.data.name}`);
      });
    } catch (error) {
      console.error('=== Stream Error ===');
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve media',
          message: error.message
        });
      }
    }
  }

  // Handle auth-url generation
  async handleAuthUrl(req, res) {
    try {
      const oauth2Client = new google.auth.OAuth2(
        GalleryController.GOOGLE_DRIVE_CONFIG.clientId,
        GalleryController.GOOGLE_DRIVE_CONFIG.clientSecret,
        GalleryController.GOOGLE_DRIVE_CONFIG.redirectUri
      );

      const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: ['https://www.googleapis.com/auth/drive.file'],
        prompt: 'consent'
      });

      console.log('✓ OAuth authorization URL generated');
      res.json({
        success: true,
        authUrl: authUrl,
        message: 'Redirect user to this URL to authorize Google Drive access'
      });
    } catch (error) {
      console.error('Error generating auth URL:', error.message);
      res.status(500).json({
        success: false,
        error: 'Failed to generate authorization URL',
        message: error.message
      });
    }
  }

  // Handle OAuth callback
  async handleOAuthCallback(req, res) {
    try {
      const { code, scope, error: errorParam } = req.query;

      console.log('=== OAuth Callback Received (GET) ===');
      console.log('Query Parameters:', req.query);

      if (errorParam) {
        console.error('OAuth Error:', errorParam);
        return res.status(400).json({
          success: false,
          error: `OAuth Error: ${errorParam}`
        });
      }

      if (!code) {
        console.warn('No authorization code in query parameters');
        return res.status(400).json({
          success: false,
          error: 'Authorization code is required'
        });
      }

      console.log('Authorization code received:', code.substring(0, 20) + '...');
      console.log('Scope:', scope);

      const oauth2Client = new google.auth.OAuth2(
        GalleryController.GOOGLE_DRIVE_CONFIG.clientId,
        GalleryController.GOOGLE_DRIVE_CONFIG.clientSecret,
        GalleryController.GOOGLE_DRIVE_CONFIG.redirectUri
      );

      console.log('Exchanging code for tokens...');
      
      // Exchange code for tokens
      const { tokens } = await oauth2Client.getToken(code);

      console.log('=== Tokens Received ===');
      console.log('Access Token:', tokens.access_token ? tokens.access_token.substring(0, 20) + '...' : 'N/A');
      console.log('Refresh Token:', tokens.refresh_token ? tokens.refresh_token.substring(0, 20) + '...' : 'N/A');
      console.log('Expires In:', tokens.expiry_date);
      console.log('Token Type:', tokens.token_type);

      // Store refresh token globally
      if (tokens.refresh_token) {
        GalleryController.oauthRefreshToken = tokens.refresh_token;
        console.log('✓ OAuth refresh token stored globally');
      }

      // Update global OAuth client with new tokens
      GalleryController.googleAuthClient.setCredentials(tokens);
      console.log('✓ Global OAuth client updated with new credentials');

      // Send response
      const responseData = {
        success: true,
        message: 'OAuth authentication successful',
        tokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date,
          token_type: tokens.token_type
        },
        nextSteps: 'Add GOOGLE_OAUTH_REFRESH_TOKEN=' + (tokens.refresh_token || GalleryController.oauthRefreshToken) + ' to your environment variables to persist authentication'
      };

      console.log('=== Response Data ===');
      console.log(JSON.stringify(responseData, null, 2));

      return res.json(responseData);
    } catch (error) {
      console.error('=== OAuth Callback Error ===');
      console.error('Error Type:', error.name);
      console.error('Error Message:', error.message);
      console.error('Error Stack:', error.stack);
      
      return res.status(500).json({
        success: false,
        error: 'Failed to authenticate with Google',
        message: error.message
      });
    }
  }

  // Handle delete (trash) image from Google Drive
  async handleDelete(req, res) {
    try {
      const { fileId } = req.body;

      if (!fileId) {
        return res.status(400).json({
          success: false,
          error: 'Missing fileId',
          message: 'File ID is required to delete an image'
        });
      }

      if (!GalleryController.googleAuthClient) {
        return res.status(500).json({
          success: false,
          error: 'Google Drive client not initialized',
          message: 'Unable to connect to Google Drive'
        });
      }

      const drive = google.drive({
        version: 'v3',
        auth: GalleryController.googleAuthClient
      });

      // Verify file exists and is from target folder
      const fileMetadata = await drive.files.get({
        fileId: fileId,
        fields: 'name, parents'
      });

      const fileParents = fileMetadata.data.parents || [];
      const isFromTargetFolder = fileParents.includes(GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId);

      if (!isFromTargetFolder) {
        return res.status(403).json({
          success: false,
          error: 'Access denied',
          message: 'File must be from target folder to delete'
        });
      }

      // Move file to trash
      await drive.files.update({
        fileId: fileId,
        resource: {
          trashed: true
        }
      });

      console.log('🗑️ Image moved to trash:', fileId);

      // Emit socket event to notify all clients that image was deleted
      const io = req.app.get('io');
      if (io) {
        io.sockets.emit('image_deleted', { fileId: fileId });
        console.log('📡 Socket event emitted: image_deleted for', fileId);
      }

      return res.status(200).json({
        success: true,
        message: 'Image moved to trash successfully',
        fileId: fileId
      });
    } catch (error) {
      console.error('❌ Error deleting image:', error.message);
      console.error('Error Stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to delete image',
        message: error.message
      });
    }
  }

  // Handle bulk delete (trash) images from Google Drive
  async handleBulkDelete(req, res) {
    try {
      const { fileIds } = req.body;

      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Missing or invalid fileIds',
          message: 'At least one file ID is required to delete images'
        });
      }

      if (!GalleryController.googleAuthClient) {
        return res.status(500).json({
          success: false,
          error: 'Google Drive client not initialized',
          message: 'Unable to connect to Google Drive'
        });
      }

      const drive = google.drive({
        version: 'v3',
        auth: GalleryController.googleAuthClient
      });

      const deletedFileIds = [];
      const failedFileIds = [];

      // Delete each file
      for (const fileId of fileIds) {
        try {
          // Verify file exists and is from target folder
          const fileMetadata = await drive.files.get({
            fileId: fileId,
            fields: 'name, parents'
          });

          const fileParents = fileMetadata.data.parents || [];
          const isFromTargetFolder = fileParents.includes(GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId);

          if (!isFromTargetFolder) {
            console.warn(`⚠️ File ${fileId} is not from target folder, skipping`);
            failedFileIds.push(fileId);
            continue;
          }

          // Move file to trash
          await drive.files.update({
            fileId: fileId,
            resource: {
              trashed: true
            }
          });

          deletedFileIds.push(fileId);
          console.log('🗑️ Image moved to trash:', fileId);
        } catch (error) {
          console.error(`❌ Error deleting file ${fileId}:`, error.message);
          failedFileIds.push(fileId);
        }
      }

      // Emit socket events for each deleted file
      const io = req.app.get('io');
      if (io) {
        deletedFileIds.forEach(fileId => {
          io.sockets.emit('image_deleted', { fileId: fileId });
          console.log('📡 Socket event emitted: image_deleted for', fileId);
        });
      }

      return res.status(200).json({
        success: true,
        message: `Bulk delete completed. ${deletedFileIds.length} file(s) deleted.`,
        deletedFileIds: deletedFileIds,
        failedFileIds: failedFileIds,
        totalRequested: fileIds.length
      });
    } catch (error) {
      console.error('❌ Error in bulk delete:', error.message);
      console.error('Error Stack:', error.stack);

      return res.status(500).json({
        success: false,
        error: 'Failed to delete images',
        message: error.message
      });
    }
  }
}

// Initialize the static client on module load
GalleryController.googleAuthClient = GalleryController.initializeOAuth2Client();

module.exports = GalleryController;
