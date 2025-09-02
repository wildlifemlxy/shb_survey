var express = require('express');
var router = express.Router();

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

// Handle Request for Mobile Approval - Send notification to Android app
async function handleRequestApproval(req, res) {
  const { userId, email, sessionId } = req.body;
  
  console.log('Requesting Mobile Approval:', { userId, email, sessionId });
  
  // Send approval request to Android app via Socket.IO (for real-time communication)
  const io = req.app.get('io'); // Get the Socket.IO instance
  if (io) {
    io.emit('mobile-approval-request', {
      userId,
      email,
      sessionId,
      message: 'Login approval required',
      timestamp: Date.now()
    });
    
    console.log('Mobile approval request sent to Android app via Socket.IO');
  }
  
  return res.json({
    success: true,
    message: 'Mobile approval request sent to Android app via Socket.IO',
    sessionId: sessionId,
    timestamp: Date.now()
  });
}

// Handle Mobile Approval
async function handleApproval(req, res) {
  const { userId, email, approved, sessionId } = req.body;
  
  console.log('Mobile Approval:', { userId, email, approved, sessionId });
  
  // Emit approval response to web browser
  const io = req.app.get('io'); // Get the Socket.IO instance
  if (io) {
    io.emit('mobile-auth-response', {
      approved: approved,
      sessionId: sessionId, // Include sessionId in the response
      userData: approved ? { userId, email } : null
    });
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
