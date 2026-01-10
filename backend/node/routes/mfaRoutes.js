var express = require('express');
var router = express.Router();
const { sendOneSignalNotification } = require('../services/notificationService');

// Single POST /mfa endpoint - handles setup and verification based on req.body
router.post('/', async (req, res) => {
  try {
    const { purpose, userId, email, deviceId, deviceType, code, approved } = req.body;

    const io = req.app.get('io'); // Get the Socket.IO instance
    console.log('MFA Request:', req.body);
    
    switch (purpose) {
      case 'setup':
        return await handleSetup(req, res);
      case 'verify':
        return await handleVerify(req, res);
      case 'qr_scan':
        return await handleQRScan(req, res);
      case 'approval':
        return await handleApproval(req, res);
      case 'request_approval':
        return await handleRequestApproval(req, res);
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid purpose. Use: setup, verify, qr_scan, approval, or request_approval',
          timestamp: Date.now()
        });
    }
    
  } catch (error) {
    console.error('MFA error:', error);
    res.status(500).json({
      success: false,
      message: 'MFA operation failed',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

// Handle MFA Setup
async function handleSetup(req, res) {
  const { userId, email, deviceId, deviceType } = req.body;
  
  console.log('MFA Setup:', { userId, email, deviceId, deviceType });
  
  // Generate QR data
  const timestamp = Date.now();
  const qrData = {
    type: 'mobile_login',
    userId,
    email,
    deviceId,
    timestamp,
    webAppUrl: req.get('origin') || 'https://gentle-dune-0405ec500.1.azurestaticapps.net'
  };
  
  return res.json({
    success: true,
    message: 'MFA setup successful',
    data: {
      qrData,
      type: 'setup'
    },
    timestamp: Date.now()
  });
}

// Handle MFA Verification
async function handleVerify(req, res) {
  const { userId, email, code, approved } = req.body;
  
  console.log('MFA Verify:', { userId, email, code, approved });
  
  let verificationResult = false;
  
  if (code) {
    // Verify PIN/Code
    verificationResult = /^\d{6,8}$/.test(code);
  } else if (typeof approved !== 'undefined') {
    // Verify approval
    verificationResult = approved === true;
  }
  
  if (verificationResult) {
    // Emit success to web browser
    const io = req.app.get('io'); // Get the Socket.IO instance
    if (io) {
      io.emit('mobile-auth-response', {
        approved: true,
        userData: { userId, email }
      });
    }
    
    return res.json({
      success: true,
      message: 'MFA verification successful',
      data: {
        userData: { userId, email },
        verified: true
      },
      timestamp: Date.now()
    });
  } else {
    return res.status(400).json({
      success: false,
      message: 'MFA verification failed',
      timestamp: Date.now()
    });
  }
}

// Handle QR Code Scan
async function handleQRScan(req, res) {
  const { userId, email, deviceId } = req.body;
  
  console.log('QR Scan:', { userId, email, deviceId });
  
  // Emit QR scan success to web browser
  const io = req.app.get('io'); // Get the Socket.IO instance
  if (io) {
    io.emit('qr-login-response', {
      success: true,
      userData: { userId, email }
    });
  }
  
  return res.json({
    success: true,
    message: 'QR scan successful - login completed',
    userData: { userId, email },
    timestamp: Date.now()
  });
}

async function handleRequestApproval(req, res) {
  const { userId, email, sessionId } = req.body;
  
  console.log('Requesting Mobile Approval:', { userId, email, sessionId });
  
  // Send approval request to Android app via Socket.IO
  const io = req.app.get('io');
  if (io) {
    // Emit to USER room (Android app joins this room when logged in)
    const userRoom = `user_${email}`;
    console.log(`📤 Emitting mobile-approval-request to user room: ${userRoom}`);
    
    // Emit to user's room so their Android app receives it
    io.to(userRoom).emit('mobile-approval-request', {
      userId,
      email,
      sessionId,
      message: 'Login approval required',
      timestamp: Date.now()
    });
    console.log('✅ Mobile approval request sent to Android app via Socket.IO');
    
    // Also broadcast to all connected clients as fallback
    console.log('📤 Broadcasting mobile-approval-request to all connected clients');
    io.emit('mobile-approval-request', {
      userId,
      email,
      sessionId,
      message: 'Login approval required',
      timestamp: Date.now()
    });
    console.log('✅ Broadcast sent to all clients');
  } else {
    console.error('❌ Socket.IO instance not available');
  }
  
  return res.json({
    success: true,
    message: 'Mobile approval request sent via Socket.IO',
    sessionId: sessionId,
    timestamp: Date.now()
  });
}


// Handle Mobile Approval
async function handleApproval(req, res) {
  const { userId, email, approved, sessionId } = req.body;
  
  console.log('🔐 Mobile Approval Request:', { userId, email, approved, sessionId });
  
  const io = req.app.get('io'); // Get the Socket.IO instance
  
  if (io) {
    // Log all connected sockets and their rooms for debugging
    const sockets = await io.fetchSockets();
    console.log(`📊 Total connected sockets: ${sockets.length}`);
    sockets.forEach(s => {
      console.log(`  Socket ${s.id} rooms:`, Array.from(s.rooms));
    });
    
    if (sessionId) {
      const roomName = `session_${sessionId}`;
      console.log(`📤 Emitting mobile-auth-response to room: ${roomName}`);
      
      // Emit to specific session room
      io.to(roomName).emit('mobile-auth-response', {
        approved: approved,
        sessionId: sessionId,
        userData: approved ? { userId, email } : null,
        timestamp: Date.now()
      });
      console.log(`✅ Mobile auth response sent to room: ${roomName}`);
    }
    
    // ALSO broadcast to ALL connected clients as fallback
    // The frontend will filter by sessionId
    console.log('📤 Broadcasting mobile-auth-response to ALL connected clients as fallback');
    io.emit('mobile-auth-response', {
      approved: approved,
      sessionId: sessionId,
      userData: approved ? { userId, email } : null,
      timestamp: Date.now()
    });
    console.log('✅ Broadcast sent to all clients');
  } else {
    console.error('❌ Socket.IO instance not available!');
  }
  
  return res.json({
    success: true,
    message: approved ? 'Login approved' : 'Login denied',
    approved: approved,
    sessionId: sessionId,
    userData: approved ? { userId, email } : null,
    timestamp: Date.now()
  });
}

module.exports = router;
// Handle Request for Mobile Approval - Send notification to Android app
