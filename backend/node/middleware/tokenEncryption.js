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

    return jwt.sign(payload, process.env.JWT_SECRET, {
      algorithm: 'HS256'
    });
  }

  // Verify JWT token
  verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
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
      const { email, password } = req.body;
      
      // Validate user credentials (implement your user validation logic)
      const user = await this.validateUser(email, password);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = this.generateToken(user);
      const sessionId = crypto.randomUUID();

      // Store session info (use Redis or database in production)
      this.storeSesion(sessionId, user.id, token);

      res.json({
        token,
        publicKey: this.publicKey,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
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
      
      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Logout failed' });
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
}

module.exports = new TokenEncryptionMiddleware();
