// Example integration for your backend/node/app.js
// Add these routes and middleware to your existing Express app

const express = require('express');
const cors = require('cors');
const tokenEncryption = require('./middleware/tokenEncryption');
const secureRoutes = require('./routes/secureRoutes');

// Your existing app setup...
const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Public authentication routes (no token required)
app.post('/api/auth/login', tokenEncryption.login);

// Protected routes (require valid token)
app.use('/api/auth/refresh', tokenEncryption.authenticateToken, tokenEncryption.refreshToken);
app.use('/api/auth/logout', tokenEncryption.authenticateToken, tokenEncryption.logout);

// All secure API routes
app.use('/api', secureRoutes);

// Public key endpoint (for client-side encryption setup)
app.get('/api/encryption/public-key', (req, res) => {
  res.json({ 
    publicKey: tokenEncryption.publicKey,
    algorithm: 'RSA-OAEP',
    keySize: 2048
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }
  
  res.status(500).json({ error: 'Internal server error' });
});

// Your existing routes and server startup...

module.exports = app;
