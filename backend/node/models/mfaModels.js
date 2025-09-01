// MFA API Data Models
// These models match the mobile app's interface requirements

// MFA Setup Request Model
class MfaSetupRequest {
  constructor(userId, email, deviceId, deviceType = 'mobile') {
    this.userId = userId;
    this.email = email;
    this.deviceId = deviceId;
    this.deviceType = deviceType;
    this.timestamp = Date.now();
  }
}

// MFA Verification Request Model
class MfaVerificationRequest {
  constructor(sessionId, code = null, approved = null, deviceId = null) {
    this.sessionId = sessionId;
    this.code = code; // For PIN/TOTP verification
    this.approved = approved; // For push notification approval (true/false)
    this.deviceId = deviceId;
    this.timestamp = Date.now();
  }
}

// MFA Response Model
class MfaResponse {
  constructor(success, message, data = null, error = null) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = Date.now();
  }

  // For successful setup
  static setupSuccess(sessionId, qrData, expiresAt) {
    return new MfaResponse(true, 'MFA setup successful', {
      sessionId: sessionId,
      qrData: qrData,
      expiresAt: expiresAt,
      type: 'setup'
    });
  }

  // For successful verification
  static verificationSuccess(userData) {
    return new MfaResponse(true, 'MFA verification successful', {
      userData: userData,
      type: 'verification'
    });
  }

  // For approval request
  static approvalRequested(sessionId, expiresAt) {
    return new MfaResponse(true, 'Approval request sent', {
      sessionId: sessionId,
      expiresAt: expiresAt,
      type: 'approval_request'
    });
  }

  // For QR login success
  static qrLoginSuccess(userData) {
    return new MfaResponse(true, 'QR login successful', {
      userData: userData,
      type: 'qr_login'
    });
  }

  // For errors
  static error(message, errorCode = null) {
    return new MfaResponse(false, message, null, {
      code: errorCode,
      message: message
    });
  }
}

// QR Data Model
class QrData {
  constructor(type, sessionId, userId, email, timestamp, expiresAt, webAppUrl) {
    this.type = type; // 'mfa_setup', 'qr_login', etc.
    this.sessionId = sessionId;
    this.userId = userId;
    this.email = email;
    this.timestamp = timestamp;
    this.expiresAt = expiresAt;
    this.webAppUrl = webAppUrl;
  }
}

// Session Model
class MfaSession {
  constructor(sessionId, userId, email, deviceId, type = 'mfa', expirationMinutes = 5) {
    this.sessionId = sessionId;
    this.userId = userId;
    this.email = email;
    this.deviceId = deviceId;
    this.type = type; // 'mfa', 'qr_login', 'approval'
    this.status = 'pending'; // 'pending', 'verified', 'expired', 'denied'
    this.timestamp = Date.now();
    this.expiresAt = Date.now() + (expirationMinutes * 60 * 1000);
    this.verifiedAt = null;
  }

  isExpired() {
    return Date.now() > this.expiresAt;
  }

  markAsVerified() {
    this.status = 'verified';
    this.verifiedAt = Date.now();
  }

  markAsDenied() {
    this.status = 'denied';
    this.verifiedAt = Date.now();
  }
}

module.exports = {
  MfaSetupRequest,
  MfaVerificationRequest,
  MfaResponse,
  QrData,
  MfaSession
};
