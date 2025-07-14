// Backend middleware example for your Node.js server
// Save this as: backend/middleware/tokenEncryption.js

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const UsersController = require('../Controller/Users/usersController');

class TokenEncryptionMiddleware {
  constructor() {
    this.initializeKeys();
  }

  // Initialize RSA key pair (call once on server startup)
  initializeKeys() {
    try {
      // Try to load existing keys
      const keyDir = path.join(__dirname, '../keys');
      const privateKeyPath = path.join(keyDir, 'private.pem');
      const publicKeyPath = path.join(keyDir, 'public.pem');

      if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
        this.privateKey = fs.readFileSync(privateKeyPath, 'utf8');
        this.publicKey = fs.readFileSync(publicKeyPath, 'utf8');
        console.log('Loaded existing RSA keys');
      } else {
        // Generate new keys
        this.generateKeys();
        console.log('Generated new RSA keys');
      }
    } catch (error) {
      console.error('Error initializing keys:', error);
      this.generateKeys();
    }
  }

  // Generate new RSA key pair
  generateKeys() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.publicKey = publicKey;
    this.privateKey = privateKey;

    // Save keys to disk (in production, use Azure Key Vault)
    try {
      const keyDir = path.join(__dirname, '../keys');
      if (!fs.existsSync(keyDir)) {
        fs.mkdirSync(keyDir, { recursive: true });
      }
      
      fs.writeFileSync(path.join(keyDir, 'private.pem'), privateKey);
      fs.writeFileSync(path.join(keyDir, 'public.pem'), publicKey);
      
      // Set restrictive permissions
      fs.chmodSync(path.join(keyDir, 'private.pem'), 0o600);
    } catch (error) {
      console.error('Error saving keys:', error);
    }
  }

  // Generate JWT token for user
  generateToken(userData) {
    const payload = {
      userId: userData.id,
      email: userData.email,
      role: userData.role,
      sessionId: crypto.randomUUID(),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (5 * 60) // 5 minutes
    };

    console.log('G1234456:', process.env.JWT_SECRET);

    /*return jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256'
    });*/
    return jwt.sign(payload, 'your-super-secret-jwt-key-change-this-in-production-min-32-chars',
      { algorithm: 'HS256' });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      //return jwt.verify(token, process.env.JWT_SECRET);
      return jwt.verify(token, 'your-super-secret-jwt-key-change-this-in-production-min-32-chars');
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Decrypt data received from client
  decryptData(encryptedPackage, userToken) {
    try {
      // Verify token first
      const tokenData = this.verifyToken(userToken);
      
      // Verify user owns this data
      if (tokenData.userId !== encryptedPackage.userId) {
        throw new Error('Unauthorized access to encrypted data');
      }

      // If client sent AES key, encrypt it first
      if (encryptedPackage.requiresServerEncryption && encryptedPackage.aesKey) {
        // Encrypt the AES key with RSA
        const aesKeyBuffer = Buffer.from(encryptedPackage.aesKey);
        const encryptedKey = crypto.publicEncrypt(this.publicKey, aesKeyBuffer);
        
        // Return encrypted package
        return {
          encryptedData: encryptedPackage.encryptedData,
          encryptedKey: encryptedKey.toString('base64'),
          iv: encryptedPackage.iv,
          userId: tokenData.userId,
          sessionId: tokenData.sessionId,
          timestamp: encryptedPackage.timestamp
        };
      }

      // If AES key is already encrypted, decrypt the data
      if (encryptedPackage.encryptedKey) {
        // Decrypt AES key with RSA private key
        const aesKey = crypto.privateDecrypt(
          this.privateKey, 
          Buffer.from(encryptedPackage.encryptedKey, 'base64')
        );
        
        // Decrypt data with AES key
        const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, 
          Buffer.from(encryptedPackage.iv));
        decipher.setAuthTag(Buffer.from(encryptedPackage.authTag, 'hex'));
        
        let decrypted = decipher.update(
          Buffer.from(encryptedPackage.encryptedData), 'hex', 'utf8'
        );
        decrypted += decipher.final('utf8');
        
        return JSON.parse(decrypted);
      }

      throw new Error('Invalid encrypted package format');
    } catch (error) {
      console.error('Decryption error:', error);
      throw error;
    }
  }

  // Decrypt login data (special case - no token required)
  async decryptLoginData(encryptedPackage) {
    try {
      console.log('Decrypting login data:', encryptedPackage);
      
      // For login, we decrypt using the AES key provided by client
      if (encryptedPackage.requiresServerEncryption && encryptedPackage.aesKey) {
        // Convert arrays back to buffers
        const aesKey = Buffer.from(encryptedPackage.aesKey);
        const iv = Buffer.from(encryptedPackage.iv);
        const encryptedDataArray = new Uint8Array(encryptedPackage.encryptedData);
        
        // For Web Crypto API AES-GCM, the encrypted data includes the auth tag at the end
        // Extract the auth tag (last 16 bytes) and encrypted content (everything else)
        const authTagLength = 16; // AES-GCM auth tag is always 16 bytes
        const encryptedContent = encryptedDataArray.slice(0, -authTagLength);
        const authTag = encryptedDataArray.slice(-authTagLength);
        
        // Create decipher using AES-GCM with 256-bit key
        const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
        decipher.setAuthTag(Buffer.from(authTag));
        
        // Decrypt the data
        let decrypted = decipher.update(Buffer.from(encryptedContent), null, 'utf8');
        decrypted += decipher.final('utf8');

        console.log('Successfully decrypted login data', decrypted);
        return JSON.parse(decrypted);
      }

      throw new Error('Invalid encrypted login package format');
    } catch (error) {
      console.error('Login decryption error:', error);
      throw error;
    }
  }

  // Middleware function for Express.js
  authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    try {
      const decoded = this.verifyToken(token);
      req.user = decoded;
      req.token = token;
      next();
    } catch (error) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
  };

  // Handle encrypted data middleware
  handleEncryptedData = (req, res, next) => {
    if (req.body && req.body.requiresServerEncryption) {
      try {
        // Process encrypted data
        const processedData = this.decryptData(req.body, req.token);
        req.body = processedData;
        next();
      } catch (error) {
        return res.status(400).json({ error: 'Failed to process encrypted data' });
      }
    } else {
      next();
    }
  };

  // Login endpoint
  login = async (req, res) => {
    try {
      console.log('[LOGIN] Backend login endpoint hit');
      // Handle both encrypted and direct format
      let email, password, newPassword, userId;
      if (req.body.loginDetails) {
        // Check if loginDetails is encrypted data
        if (req.body.loginDetails.requiresServerEncryption && req.body.loginDetails.encryptedData) {
          try {
            // Decrypt the loginDetails
            const decryptedData = await this.decryptLoginData(req.body.loginDetails);
            email = decryptedData.email;
            // Always use lowercase 'password' property
            password = typeof decryptedData.password === 'string' ? decryptedData.password : (typeof decryptedData.Password === 'string' ? decryptedData.Password : '');
            newPassword = decryptedData.newPassword;
            userId = decryptedData.userId;
            console.log('Successfully decrypted login credentials');
          } catch (decryptError) {
            console.error('Failed to decrypt login data:', decryptError);
            return res.status(400).json({
              success: false,
              message: 'Failed to decrypt login data'
            });
          }
        } else {
          // Direct loginDetails format: { email, password, newPassword, userId }
          email = req.body.loginDetails.email;
          password = req.body.loginDetails.password;
          newPassword = req.body.loginDetails.newPassword;
          userId = req.body.loginDetails.userId;
        }
      } else {
        // Direct format: { email, password, newPassword, userId }
        email = req.body.email;
        password = req.body.password;
        newPassword = req.body.newPassword;
        userId = req.body.userId;
      }

      // Ensure password is a string
      if (typeof password !== 'string') password = '';

      console.log('Extracted credentials - email:', email, 'password:', password ? '[REDACTED]' : 'undefined', 'newPassword:', newPassword ? '[REDACTED]' : 'undefined', 'userId:', userId);

      // Validate user credentials (implement your user validation logic)
      const user = await this.validateUser(email, password);
      if (!user) {
        return res.json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      // If firstTimeLogin, allow login with provided email and password, and return firstTimeLogin flag
      // The frontend should prompt for new password after login

      // Generate token
      const token = this.generateToken(user);
      const sessionId = crypto.randomUUID();

      // Store session info (use Redis or database in production)
      this.storeSesion(sessionId, user.id, token);

      // Return response in format expected by your frontend
      res.json({
        success: true,
        data: user,
        message: 'Login successful',
        // Additional token-based auth data
        token,
        publicKey: this.publicKey,
        sessionId
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  };

  // Refresh token endpoint
  refreshToken = async (req, res) => {
    try {
      const decoded = this.verifyToken(req.token);
      
      // Generate new token
      const newToken = this.generateToken({
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role
      });

      const newSessionId = crypto.randomUUID();

      res.json({
        token: newToken,
        publicKey: this.publicKey,
        sessionId: newSessionId,
        user: {
          id: decoded.userId,
          email: decoded.email,
          role: decoded.role
        }
      });
    } catch (error) {
      res.status(401).json({ error: 'Token refresh failed' });
    }
  };

  // Logout endpoint
  logout = async (req, res) => {
    try {
      // Invalidate session (implement session blacklisting)
      const sessionId = req.headers['x-session-id'];
      if (sessionId) {
        this.invalidateSession(sessionId);
      }
      
      res.json({ 
        success: true,
        message: 'Logged out successfully' 
      });
    } catch (error) {
      res.status(500).json({ 
        success: false,
        error: 'Logout failed' 
      });
    }
  };

  // Change password endpoint
  changePassword = async (req, res) => {
    console.log('Change password request body:', req.body);
    try {
      // Decrypt if encrypted (supports both direct and nested loginDetails)
      let decryptedData = null;
      if (req.body.loginDetails && req.body.loginDetails.requiresServerEncryption && req.body.loginDetails.encryptedData) {
        try {
          decryptedData = await this.decryptLoginData(req.body.loginDetails);
        } catch (decryptError) {
          console.error('Failed to decrypt password change data:', decryptError);
          return res.status(400).json({
            success: false,
            message: 'Failed to decrypt password change data'
          });
        }
      } else if (req.body.requiresServerEncryption && req.body.encryptedData) {
        try {
          decryptedData = await this.decryptLoginData(req.body);
        } catch (decryptError) {
          console.error('Failed to decrypt password change data:', decryptError);
          return res.status(400).json({
            success: false,
            message: 'Failed to decrypt password change data'
          });
        }
      }

      // Extract values
      let email, newPassword, userId;
      if (decryptedData) {
        email = decryptedData.email;
        newPassword = decryptedData.newPassword;
        userId = decryptedData.userId;
      } else if (req.body.loginDetails) {
        email = req.body.loginDetails.email;
        newPassword = req.body.loginDetails.newPassword;
        userId = req.body.loginDetails.userId;
      } else {
        email = req.body.email;
        newPassword = req.body.newPassword;
        userId = req.body.userId;
      }

      console.log('Extracted values - email:', email, 'newPassword length:', newPassword?.length);

      // Validate required fields
      if (!email || !newPassword) {
        console.log('Validation failed:', {
          email: !!email,
          newPassword: !!newPassword
        });
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: email and newPassword are required'
        });
      }

      // Validate password length
      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters long'
        });
      }

      var controller = new UsersController();
      var result = await controller.changePasswordByEmail(email, newPassword);
      console.log('Password change result:', result);

      if (result.success) {
        console.log('Password changed successfully for:', email);
        return res.json({
          success: true,
          message: result.message || 'Password changed successfully'
        });
      } else {
        console.log('Password change failed for:', email);
        return res.json({
          success: false,
          message: result.message || 'Failed to change password'
        });
      }
    } catch (error) {
      console.error('Error during password change:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Password change failed due to server error.' 
      });
    }
  };

  // Reset password endpoint
  resetPassword = async (req, res) => {
    try {
      // Handle both direct format and nested loginDetails format
      let email;
      if (req.body.loginDetails) {
        // Nested format: { purpose: "resetPassword", loginDetails: { email } }
        email = req.body.loginDetails.email;
      } else {
        // Direct format: { email }
        email = req.body.email;
      }
      
      console.log('Password reset request for email:', email);
      
      // Validate required fields
      if (!email) {
        console.log('Validation failed: email is required');
        return res.status(400).json({
          success: false,
          message: 'Email is required for password reset'
        });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address'
        });
      }
      
      var controller = new UsersController();
      var result = await controller.resetPassword(email);
      console.log('Password reset result:', result);
      
      if (result.success) {
        console.log('Password reset email sent successfully for:', email);
        return res.json({
          success: true,
          message: result.message || 'Password reset email sent successfully'
        });
      } else {
        console.log('Password reset failed for:', email);
        return res.json({
          success: false,
          message: result.message || 'Failed to send password reset email'
        });
      }
    } catch (error) {
      console.error('Error during password reset:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Password reset failed due to server error.' 
      });
    }
  };

  // Helper methods (implement these based on your database)
  async validateUser(email, password) {
    try {
      const controller = new UsersController();
      const result = await controller.verifyUser(email, password);
      
      if (result.success && result.user) {
        return {
          id: result.user._id || result.user.id,
          email: result.user.email || email,
          role: result.user.role || 'user',
          name: result.user.name,
          firstTimeLogin: result.user.firstTimeLogin
        };
      }
      return null;
    } catch (error) {
      console.error('User validation error:', error);
      return null;
    }
  }

  storeSesion(sessionId, userId, token) {
    // Store session info in Redis/database
    // For now, we'll store in memory (use Redis/database in production)
    if (!this.sessions) {
      this.sessions = new Map();
    }
    this.sessions.set(sessionId, {
      userId,
      token,
      timestamp: Date.now()
    });
    
    // Clean up old sessions (older than 2 hours)
    const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
    for (const [key, value] of this.sessions.entries()) {
      if (value.timestamp < twoHoursAgo) {
        this.sessions.delete(key);
      }
    }
  }

  invalidateSession(sessionId) {
    // Remove session from Redis/database
    if (this.sessions) {
      this.sessions.delete(sessionId);
    }
  }

  // Decrypt request data using AES-256-GCM
  decryptRequestData(requestBody) {
    try {
      console.log('Decrypting request data:', requestBody);
      
      // Handle client-side encrypted format (from frontend tokenService)
      if (requestBody.encryptedData && requestBody.aesKey && requestBody.iv && 
          Array.isArray(requestBody.encryptedData) && Array.isArray(requestBody.aesKey) && Array.isArray(requestBody.iv)) {
        console.log('Handling client-side encrypted format with raw AES key...');
        
        // Convert arrays to buffers
        const aesKey = Buffer.from(requestBody.aesKey);
        const iv = Buffer.from(requestBody.iv);
        const encryptedWithTag = Buffer.from(requestBody.encryptedData);
        
        // For AES-GCM, extract auth tag (last 16 bytes) and encrypted content
        const authTagLength = 16;
        const encryptedContent = encryptedWithTag.slice(0, -authTagLength);
        const authTag = encryptedWithTag.slice(-authTagLength);
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt the data
        let decrypted = decipher.update(encryptedContent, null, 'utf8');
        console.log('Decrypted content length:', decrypted.length);
        decrypted += decipher.final('utf8');
        
        console.log('Successfully decrypted client-side encrypted request data', decrypted);
        return {
          success: true,
          data: JSON.parse(decrypted)
        };
      }
      // Handle server-side encrypted format (legacy)
      else if (requestBody.encryptedData && requestBody.encryptedAESKey && requestBody.iv) {
        console.log('Handling server-side encrypted format with RSA-encrypted AES key...');
        
        // Decrypt the AES key using server's private key
        const aesKey = crypto.privateDecrypt(
          this.privateKey,
          Buffer.from(requestBody.encryptedAESKey, 'base64')
        );
        
        // Convert IV from base64
        const iv = Buffer.from(requestBody.iv, 'base64');
        
        // Convert encrypted data from base64
        const encryptedWithTag = Buffer.from(requestBody.encryptedData, 'base64');
        
        // For AES-GCM, extract auth tag (last 16 bytes) and encrypted content
        const authTagLength = 16;
        const encryptedContent = encryptedWithTag.slice(0, -authTagLength);
        const authTag = encryptedWithTag.slice(-authTagLength);
        
        // Create decipher
        const decipher = crypto.createDecipheriv('aes-256-gcm', aesKey, iv);
        decipher.setAuthTag(authTag);
        
        // Decrypt the data
        let decrypted = decipher.update(encryptedContent, null, 'utf8');
        decrypted += decipher.final('utf8');
        
        console.log('Successfully decrypted server-side encrypted request data', decrypted);
        return {
          success: true,
          data: JSON.parse(decrypted)
        };
      } else {
        throw new Error('Missing required encryption fields in request');
      }
    } catch (error) {
      console.error('Request decryption error:', error);
      return {
        success: false,
        error: 'Failed to decrypt request data: ' + error.message
      };
    }
  }

  // Encrypt response data using AES-256-GCM with client's public key
  encryptResponseData(data, clientPublicKey = null) {
    try {
      // Generate a random AES key and IV
      const aesKey = crypto.randomBytes(32); // 256-bit key
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      
      // Sanitize data to remove circular references and non-serializable objects
      const sanitizedData = this.sanitizeDataForSerialization(data);
      
      // Convert data to JSON string
      const jsonData = JSON.stringify(sanitizedData);
      
      // Create cipher
      const cipher = crypto.createCipheriv('aes-256-gcm', aesKey, iv);
      
      // Encrypt the data
      let encrypted = cipher.update(jsonData, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get the auth tag
      const authTag = cipher.getAuthTag();
      
      // Combine encrypted data and auth tag
      const encryptedWithTag = Buffer.concat([encrypted, authTag]);
      
      // Use client's public key if provided, otherwise use server's public key
      let publicKeyToUse = this.publicKey;
      let usingClientKey = false;
      
      if (clientPublicKey) {
        try {
          
          // Ensure clientPublicKey is a string
          if (typeof clientPublicKey !== 'string') {
            publicKeyToUse = this.publicKey;
            usingClientKey = false;
          } else {
            
            // Check if it's already in PEM format or base64 SPKI format
            let publicKeyObject;
            
            if (clientPublicKey.startsWith('-----BEGIN PUBLIC KEY-----')) {
              // It's already in PEM format, use directly
              publicKeyObject = crypto.createPublicKey({
                key: clientPublicKey,
                format: 'pem',
                type: 'spki'
              });
            } else {
              const publicKeyDER = Buffer.from(clientPublicKey, 'base64');
              
              // Create public key object from DER-encoded SPKI data
              publicKeyObject = crypto.createPublicKey({
                key: publicKeyDER,
                format: 'der',
                type: 'spki'
              });
            }
            
            
            // Test the key by encrypting a small test buffer
            const testData = Buffer.from('test');
            const testEncrypted = crypto.publicEncrypt({
              key: publicKeyObject,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: 'sha256'
            }, testData);
            
         
            
            publicKeyToUse = publicKeyObject;
            usingClientKey = true;
      
          }
        } catch (keyError) {

          publicKeyToUse = this.publicKey;
          usingClientKey = false;
        }
      } else {
      }
      
      // Encrypt the AES key with the chosen RSA public key
     
      const encryptedAESKey = crypto.publicEncrypt({
        key: publicKeyToUse,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: 'sha256'
      }, aesKey);
      
      
      const result = {
        success: true,
        encryptedData: encryptedWithTag.toString('base64'),
        encryptedAESKey: encryptedAESKey.toString('base64'),
        iv: iv.toString('base64'),
        algorithm: 'aes-256-gcm',
        usingClientKey: usingClientKey
      };
      
      return result;
    } catch (error) {

      return {
        success: false,
        error: 'Failed to encrypt response data'
      };
    }
  }

  // Helper method to sanitize data for JSON serialization
  sanitizeDataForSerialization(data, seen = new WeakSet()) {
    if (data === null || typeof data !== 'object') {
      return data;
    }

    // Handle circular references
    if (seen.has(data)) {
      return '[Circular Reference]';
    }
    seen.add(data);

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeDataForSerialization(item, seen));
    }

    // Handle objects
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      // Skip properties that commonly cause circular references in Express objects
      if (key === 'req' || key === 'res' || key === 'socket' || key === 'parser' || 
          key === 'connection' || key === 'client' || key === '_httpMessage' ||
          key === 'readable' || key === 'writable' || key === 'domain') {
        continue;
      }

      // Skip functions
      if (typeof value === 'function') {
        continue;
      }

      // Skip symbols
      if (typeof value === 'symbol') {
        continue;
      }

      // Recursively sanitize nested objects
      try {
        sanitized[key] = this.sanitizeDataForSerialization(value, seen);
      } catch (error) {
        // If sanitization fails for this property, skip it
        console.warn('🔐 [ENCRYPTION] Skipping property due to sanitization error:', key, error.message);
        continue;
      }
    }

    return sanitized;
  }

  // Middleware wrapper for encrypting response data in Express routes
  async encryptResponseDataMiddleware(req, res, dataCallback, clientPublicKey = null) {
    try {
      
      // Execute the callback to get the data
      const data = await dataCallback();

      // Use provided client public key, or fallback to request headers/body
      const finalClientPublicKey = clientPublicKey || req.headers['x-client-public-key'] || req.body.clientPublicKey;
      
      // Encrypt the data
      const encryptedResult = this.encryptResponseData(data, finalClientPublicKey);
      
      if (encryptedResult.success) {
        return res.json(encryptedResult);
      } else {
        return res.status(500).json({ 
          error: 'Failed to encrypt response data',
          details: encryptedResult.error 
        });
      }
    } catch (error) {
      console.error('🔐 [MIDDLEWARE] Encrypted response middleware error:', error);
      return res.status(500).json({ 
        error: 'Internal server error during encryption',
        details: error.message 
      });
    }
  }

  // Decrypt bot response data (for frontend tokenService compatibility)
  decryptBotResponse(encryptedResponseData) {
    try {
      console.log('Decrypting bot response data:', encryptedResponseData);
      
      // Handle the structure that comes from encryptResponseDataMiddleware
      let encryptedData, encryptedAESKey, iv;
      
      if (encryptedResponseData.encryptedData && encryptedResponseData.encryptedAESKey && encryptedResponseData.iv) {
        // Direct structure from middleware
        encryptedData = encryptedResponseData.encryptedData;
        encryptedAESKey = encryptedResponseData.encryptedAESKey;
        iv = encryptedResponseData.iv;
      } else {
        throw new Error('Invalid encrypted response structure');
      }
      
      console.log('Extracted components for decryption:', {
        hasEncryptedData: !!encryptedData,
        hasEncryptedAESKey: !!encryptedAESKey,
        hasIv: !!iv
      });
      
      // This method is intended for frontend use, but we're providing the structure
      // The actual decryption should happen on the frontend with the private key
      // For server-side use, we would need the private key
      
      // Return the structured data for frontend processing
      return {
        success: true,
        encryptedData: encryptedData,
        encryptedAESKey: encryptedAESKey,
        iv: iv,
        algorithm: 'aes-256-gcm'
      };
    } catch (error) {
      console.error('Bot response decryption error:', error);
      return {
        success: false,
        error: 'Failed to decrypt bot response: ' + error.message
      };
    }
  }
}

module.exports = new TokenEncryptionMiddleware();
