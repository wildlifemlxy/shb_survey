var express = require('express');
var router = express.Router();

// Single POST /mfa endpoint - handles setup and verification based on req.body
router.post('/', async (req, res) => {
  try {
    const { purpose } = req.body;
    console.log('MFA Request:', req.body);

    switch (purpose) {
      case 'setup':
        return handleSetup(req, res);
      case 'verify':
        return handleVerify(req, res);
      case 'qr_scan':
        return handleQRScan(req, res);
      case 'approval':
        return handleApproval(req, res);
      case 'request_approval':
        return handleRequestApproval(req, res);
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid purpose. Use: setup, verify, qr_scan, approval, or request_approval',
          timestamp: Date.now()
        });
    }
  } catch (error) {
    console.error('MFA error:', error);
    return res.status(500).json({
      success: false,
      message: 'MFA operation failed',
      error: error.message,
      timestamp: Date.now()
    });
  }
});

async function handleSetup(req, res) {
  const { userId, email, deviceId } = req.body;
  const qrData = {
    type: 'mobile_login',
    userId,
    email,
    deviceId,
    timestamp: Date.now(),
    webAppUrl: req.get('origin') || 'https://gentle-dune-0405ec500.1.azurestaticapps.net'
  };

  return res.json({
    success: true,
    message: 'MFA setup successful',
    data: { qrData, type: 'setup' },
    timestamp: Date.now()
  });
}

async function handleVerify(req, res) {
  const { userId, email, code, approved } = req.body;
  let verificationResult = false;

  if (code) {
    verificationResult = /^\d{6,8}$/.test(code);
  } else if (typeof approved !== 'undefined') {
    verificationResult = approved === true;
  }

  if (!verificationResult) {
    return res.status(400).json({
      success: false,
      message: 'MFA verification failed',
      timestamp: Date.now()
    });
  }

  const io = req.app.get('io');
  if (io) {
    io.emit('mobile-auth-response', {
      approved: true,
      userData: { userId, email }
    });
  }

  return res.json({
    success: true,
    message: 'MFA verification successful',
    data: { userData: { userId, email }, verified: true },
    timestamp: Date.now()
  });
}

async function handleQRScan(req, res) {
  const { userId, email } = req.body;
  const io = req.app.get('io');
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
  const io = req.app.get('io');

  if (io) {
    const userRoom = `user_${email}`;
    const approvalRequest = {
      userId,
      email,
      sessionId,
      message: 'Login approval required',
      timestamp: Date.now()
    };
    io.to(userRoom).emit('mobile-approval-request', approvalRequest);
    io.emit('mobile-approval-request', approvalRequest);
  }

  return res.json({
    success: true,
    message: 'Mobile approval request sent via Socket.IO',
    sessionId,
    timestamp: Date.now()
  });
}

async function handleApproval(req, res) {
  const { userId, email, approved, sessionId } = req.body;
  const io = req.app.get('io');
  const response = {
    approved,
    sessionId,
    userData: approved ? { userId, email } : null,
    timestamp: Date.now()
  };

  if (io) {
    if (sessionId) io.to(`session_${sessionId}`).emit('mobile-auth-response', response);
    io.emit('mobile-auth-response', response);
  }

  return res.json({
    success: true,
    message: approved ? 'Login approved' : 'Login denied',
    approved,
    sessionId,
    userData: approved ? { userId, email } : null,
    timestamp: Date.now()
  });
}

module.exports = router;
