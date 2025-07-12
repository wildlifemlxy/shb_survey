import axios from 'axios';

class TokenService {
  constructor() {
    this.token = null;
    this.publicKey = null;
    this.sessionId = null;
  }

  // Initialize with fresh token from each login
  initializeSession(loginResponse) {
    const { token, publicKey, sessionId, user } = loginResponse;
    console.log('Initializing session with response:', loginResponse);
    
    this.token = token;
    this.publicKey = publicKey;
    this.sessionId = sessionId;
    
    // Store in localStorage for persistence during session
    localStorage.setItem('token', token);
    localStorage.setItem('publicKey', publicKey);
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    
    // Safe access to user ID with fallback
    const userId = user && (user.id || user._id) ? (user.id || user._id) : 'unknown';
    console.log('New session initialized:', { sessionId, userId });
    return true;
  }

  // Get current token
  getToken() {
    if (!this.token) {
      this.token = localStorage.getItem('token');
    }
    return this.token;
  }

  // Get session ID
  getSessionId() {
    if (!this.sessionId) {
      this.sessionId = localStorage.getItem('sessionId');
    }
    return this.sessionId;
  }

  // Check if token is valid and not expired
  isTokenValid() {
    const token = this.getToken();
    console.log('Checking token validity - Token exists:', !!token);
    
    if (!token) return false;

    try {
      // Decode JWT payload
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      console.log('Token payload:', payload);
      console.log('Current time:', now);
      console.log('Token expires at:', payload.exp);
      console.log('Time until expiry:', payload.exp - now, 'seconds');
      
      // Check if token is expired (with 5-second buffer for clock skew)
      if (payload.exp <= (now + 5)) {
        console.log('Token expired or about to expire');
        this.clearSession();
        return false;
      }

      // Check if session is too old (additional security)
      const tokenTimestamp = localStorage.getItem('tokenTimestamp');
      if (tokenTimestamp) {
        const tokenAge = Date.now() - parseInt(tokenTimestamp);
        const maxAge = 30 * 60 * 1000; // 30 minutes max session (was 2 minutes)
        
        console.log('Token age:', tokenAge / 1000, 'seconds');
        console.log('Max age allowed:', maxAge / 1000, 'seconds');
        
        if (tokenAge > maxAge) {
          console.log('Session too old, clearing');
          this.clearSession();
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Token validation error:', error);
      this.clearSession();
      return false;
    }
  }

  // Get token payload
  getTokenPayload() {
    const token = this.getToken();
    if (!token) return null;

    try {
      return JSON.parse(atob(token.split('.')[1]));
    } catch (error) {
      console.error('Error parsing token payload:', error);
      return null;
    }
  }

  // Make authenticated API request with token using axios
  async makeAuthenticatedRequest(url, options = {}) {
    const token = this.getToken();
    if (!token || !this.isTokenValid()) {
      throw new Error('No valid token available');
    }

    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Session-ID': this.getSessionId()
    };

    const axiosConfig = {
      method: options.method || 'POST',
      url: url,
      headers: {
        ...defaultHeaders,
        ...options.headers
      },
      data: options.body ? JSON.parse(options.body) : options.data
    };

    try {
      const response = await axios(axiosConfig);
      return response;
    } catch (error) {
      // Handle token expiration
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Token rejected by server, clearing session');
        this.clearSession();
        throw new Error('Authentication failed');
      }
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }

  // Convenience method for axios POST requests
  async axiosPost(url, data = {}, headers = {}) {
    const token = this.getToken();
    if (!token || !this.isTokenValid()) {
      throw new Error('No valid token available');
    }

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Session-ID': this.getSessionId(),
        ...headers
      }
    };

    try {
      const response = await axios.post(url, data, config);
      return response;
    } catch (error) {
      // Handle token expiration
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Token rejected by server, clearing session');
        this.clearSession();
        throw new Error('Authentication failed');
      }
      console.error('Axios POST request failed:', error);
      throw error;
    }
  }

  // Convenience method for axios GET requests
  async axiosGet(url, headers = {}) {
    const token = this.getToken();
    if (!token || !this.isTokenValid()) {
      throw new Error('No valid token available');
    }

    const config = {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Session-ID': this.getSessionId(),
        ...headers
      }
    };

    try {
      const response = await axios.get(url, config);
      return response;
    } catch (error) {
      // Handle token expiration
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log('Token rejected by server, clearing session');
        this.clearSession();
        throw new Error('Authentication failed');
      }
      console.error('Axios GET request failed:', error);
      throw error;
    }
  }

  // Encrypt sensitive data before sending (client-side)
  async encryptData(data) {
    if (!this.publicKey) {
      this.publicKey = localStorage.getItem('publicKey');
    }

    if (!this.publicKey) {
      console.warn('No public key available for encryption');
      return data; // Return unencrypted if no key
    }

    try {
      // Generate random AES key
      const aesKey = crypto.getRandomValues(new Uint8Array(32));
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // Import AES key for Web Crypto API
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        aesKey,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );

      // Encrypt data with AES
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        cryptoKey,
        encodedData
      );

      // Return encrypted package (server will encrypt AES key with RSA)
      return {
        encryptedData: Array.from(new Uint8Array(encryptedData)),
        aesKey: Array.from(aesKey),
        iv: Array.from(iv),
        sessionId: this.getSessionId(),
        timestamp: Date.now(),
        requiresServerEncryption: true
      };
    } catch (error) {
      console.error('Client-side encryption failed:', error);
      return data; // Fallback to unencrypted
    }
  }

  // Clear session data on logout
  clearSession() {
    this.token = null;
    this.publicKey = null;
    this.sessionId = null;
    
    // Clear from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('publicKey');
    localStorage.removeItem('sessionId');
    localStorage.removeItem('tokenTimestamp');
    
    console.log('Session cleared');
  }

  // Get user info from token
  getUserInfo() {
    const payload = this.getTokenPayload();
    if (!payload) return null;

    return {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      sessionId: payload.sessionId,
      loginTime: new Date(payload.iat * 1000),
      expiryTime: new Date(payload.exp * 1000)
    };
  }

  // Get remaining time in seconds until token expires
  getTimeUntilExpiry() {
    const payload = this.getTokenPayload();
    if (!payload) return 0;

    const now = Date.now() / 1000;
    const timeLeft = payload.exp - now;
    return Math.max(0, Math.floor(timeLeft));
  }

  // Check if token is about to expire (within 30 seconds)
  isTokenNearExpiry() {
    return this.getTimeUntilExpiry() <= 30;
  }

  // Refresh token if needed (call this periodically)
  async refreshTokenIfNeeded() {
    const payload = this.getTokenPayload();
    if (!payload) return false;

    const now = Date.now() / 1000;
    const timeUntilExpiry = payload.exp - now;
    
    // Refresh if less than 30 seconds remaining
    if (timeUntilExpiry < 30) {
      try {
        const response = await this.makeAuthenticatedRequest('/api/auth/refresh', {
          method: 'POST'
        });
        
        if (response.status === 200) {
          const refreshData = response.data;
          this.initializeSession(refreshData);
          return true;
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        return false;
      }
    }
    
    return true;
  }

  // RSA Key Generation for survey data encryption - generates unique keys per session
  async generateRSAKeyPair(forceNew = false) {
    try {
      // Generate unique session ID for this key pair
      const sessionId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      
      // Always generate new unique keys if forced or if no keys exist
      if (forceNew || !this.privateKey || !this.publicKeyBase64) {
        console.log(`Generating new unique RSA key pair for session: ${sessionId}`);
        
        const keyPair = await crypto.subtle.generateKey(
          {
            name: "RSA-OAEP",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
          },
          true,
          ["encrypt", "decrypt"]
        );

        // Export public key to send to backend
        const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
        const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer)));

        // Store unique keys for this session
        this.privateKey = keyPair.privateKey;
        this.publicKeyBase64 = publicKeyBase64;
        this.keySessionId = sessionId;
        
        // Store key metadata in localStorage for session persistence
        localStorage.setItem('rsaKeySessionId', sessionId);
        localStorage.setItem('rsaKeyTimestamp', Date.now().toString());
        
        console.log(`Generated unique RSA key pair with session ID: ${sessionId}`);
        return publicKeyBase64;
      } else {
        console.log(`Using existing RSA key pair for session: ${this.keySessionId}`);
        return this.publicKeyBase64;
      }
    } catch (error) {
      console.error('RSA key generation failed:', error);
      throw error;
    }
  }

  // Clear existing keys and force generation of new unique keys
  clearRSAKeys() {
    this.privateKey = null;
    this.publicKeyBase64 = null;
    this.keySessionId = null;
    localStorage.removeItem('rsaKeySessionId');
    localStorage.removeItem('rsaKeyTimestamp');
    console.log('Cleared RSA keys - will generate new unique keys on next request');
  }

  // Check if keys are valid and not expired (optional expiration check)
  areKeysValid(maxAgeHours = 24) {
    if (!this.privateKey || !this.publicKeyBase64 || !this.keySessionId) {
      return false;
    }
    
    const keyTimestamp = localStorage.getItem('rsaKeyTimestamp');
    if (!keyTimestamp) {
      return false;
    }
    
    const ageInHours = (Date.now() - parseInt(keyTimestamp)) / (1000 * 60 * 60);
    return ageInHours < maxAgeHours;
  }

  // Decrypt survey response data
  async decryptSurveyResponse(encryptedData) {
    try {
      if (!this.privateKey) {
        throw new Error('Private key not available for decryption');
      }

      console.log('Decryption input:', encryptedData);

      // Handle the structure from backend: check if encryptedData is nested or direct
      let encryptedAESKey, data, iv;
      if (encryptedData.encryptedData && encryptedData.encryptedAESKey && encryptedData.iv) {
        // New format: direct properties
        encryptedAESKey = encryptedData.encryptedAESKey;
        data = encryptedData.encryptedData;
        iv = encryptedData.iv;
      } else if (encryptedData.encryptedData && typeof encryptedData.encryptedData === 'object') {
        // Old nested format
        ({ encryptedAESKey, encryptedData: data, iv } = encryptedData.encryptedData);
      } else {
        // Direct format
        ({ encryptedAESKey, encryptedData: data, iv } = encryptedData);
      }

      console.log('Extracted decryption components:', {
        hasEncryptedAESKey: !!encryptedAESKey,
        hasData: !!data,
        hasIv: !!iv,
        aesKeyLength: encryptedAESKey ? encryptedAESKey.length : 0,
        dataLength: data ? data.length : 0,
        ivLength: iv ? iv.length : 0,
        aesKeyStart: encryptedAESKey ? encryptedAESKey.substring(0, 50) : 'None',
        dataStart: data ? data.substring(0, 50) : 'None',
        ivValue: iv
      });

      // Validate base64 strings before attempting to decode
      function isValidBase64(str) {
        try {
          return btoa(atob(str)) === str;
        } catch (err) {
          return false;
        }
      }

      if (!isValidBase64(encryptedAESKey)) {
        throw new Error('encryptedAESKey is not valid base64');
      }
      if (!isValidBase64(data)) {
        throw new Error('encryptedData is not valid base64');
      }
      if (!isValidBase64(iv)) {
        throw new Error('iv is not valid base64');
      }

      // Convert base64 to ArrayBuffer
      const encryptedKeyBuffer = Uint8Array.from(atob(encryptedAESKey), c => c.charCodeAt(0));
      const encryptedDataWithTagBuffer = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const ivBuffer = Uint8Array.from(atob(iv), c => c.charCodeAt(0));

      console.log('Buffer sizes:', {
        encryptedKeyBuffer: encryptedKeyBuffer.length,
        encryptedDataWithTagBuffer: encryptedDataWithTagBuffer.length,
        ivBuffer: ivBuffer.length
      });

      // For AES-GCM, the backend concatenated encrypted data + auth tag (16 bytes)
      // We need to separate them for Web Crypto API
      const authTagLength = 16; // AES-GCM auth tag is always 16 bytes
      const encryptedDataBuffer = encryptedDataWithTagBuffer.slice(0, -authTagLength);
      const authTag = encryptedDataWithTagBuffer.slice(-authTagLength);

      console.log('Separated AES-GCM components:', {
        encryptedDataLength: encryptedDataBuffer.length,
        authTagLength: authTag.length
      });

      // Decrypt AES key using RSA private key
      console.log('Attempting to decrypt AES key with RSA private key...');
      console.log('Private key info:', {
        hasPrivateKey: !!this.privateKey,
        keySessionId: this.keySessionId,
        encryptedKeySize: encryptedKeyBuffer.length
      });
      
      let aesKeyBuffer;
      try {
        aesKeyBuffer = await crypto.subtle.decrypt(
          {
            name: "RSA-OAEP",
          },
          this.privateKey,
          encryptedKeyBuffer
        );
        console.log('AES key decrypted successfully, size:', aesKeyBuffer.byteLength);
      } catch (rsaError) {
        console.error('RSA decryption failed - this means key mismatch!');
        console.error('RSA error details:', rsaError);
        console.error('RSA error name:', rsaError.name);
        console.error('RSA error code:', rsaError.code);
        console.log('Key session ID:', this.keySessionId);
        console.log('Encrypted key buffer size:', encryptedKeyBuffer.length);
        console.log('Expected RSA encrypted size for 2048-bit key:', 256, 'bytes');
        console.log('Public key that was sent to backend (first 100 chars):', this.publicKeyBase64 ? this.publicKeyBase64.substring(0, 100) : 'None');
        console.log('Public key full length:', this.publicKeyBase64 ? this.publicKeyBase64.length : 0);
        
        // Try to export our public key to see what format we have
        try {
          if (this.privateKey) {
            const keyInfo = await crypto.subtle.exportKey("jwk", this.privateKey);
            console.log('Our private key JWK info (partial):', {
              kty: keyInfo.kty,
              alg: keyInfo.alg,
              key_ops: keyInfo.key_ops,
              nLength: keyInfo.n ? keyInfo.n.length : 'undefined'
            });
          }
        } catch (keyError) {
          console.error('Could not export key info:', keyError);
        }
        
        throw new Error(`RSA decryption failed: ${rsaError.message}. This typically means the backend encrypted with a different public key than the one corresponding to this private key.`);
      }

      // Import AES key
      const aesKey = await crypto.subtle.importKey(
        "raw",
        aesKeyBuffer,
        {
          name: "AES-GCM",
        },
        false,
        ["decrypt"]
      );

      console.log('AES key imported successfully');

      // Prepare data for AES-GCM decryption (encrypted data + auth tag concatenated)
      const dataForDecryption = new Uint8Array(encryptedDataBuffer.length + authTag.length);
      dataForDecryption.set(encryptedDataBuffer);
      dataForDecryption.set(authTag, encryptedDataBuffer.length);

      // Decrypt data using AES-GCM
      console.log('Attempting to decrypt data with AES-GCM...');
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: ivBuffer,
        },
        aesKey,
        dataForDecryption
      );

      console.log('Data decrypted successfully, size:', decryptedBuffer.byteLength);

      // Convert decrypted data back to string and parse JSON
      const decryptedString = new TextDecoder().decode(decryptedBuffer);
      console.log('Decrypted string (first 200 chars):', decryptedString.substring(0, 200));
      
      const result = JSON.parse(decryptedString);
      console.log('Successfully parsed JSON result');
      return result;
    } catch (error) {
      console.error('Decryption failed at step:', error.message);
      console.error('Full error:', error);
      throw error;
    }
  }

  // Get public key for backend encryption - ensures unique keys exist
  async getPublicKey(forceNewKeys = false) {
    // Check if we need to generate new keys
    if (forceNewKeys || !this.areKeysValid()) {
      console.log('Generating new unique keys due to force flag or invalid/expired keys');
      await this.generateRSAKeyPair(true);
    } else if (!this.publicKeyBase64) {
      console.log('No public key found, generating new unique keys');
      await this.generateRSAKeyPair();
    }
    
    // Convert base64 SPKI to PEM format for backend
    if (this.publicKeyBase64) {
      const pemFormatted = `-----BEGIN PUBLIC KEY-----\n${this.publicKeyBase64.match(/.{1,64}/g).join('\n')}\n-----END PUBLIC KEY-----`;
      console.log('Converted public key to PEM format for backend');
      console.log('PEM key (first 200 chars):', pemFormatted.substring(0, 200));
      return pemFormatted;
    }
    
    return this.publicKeyBase64;
  }

  // Get current key session ID
  getKeySessionId() {
    return this.keySessionId || localStorage.getItem('rsaKeySessionId');
  }

  // Initialize session with unique keys
  async initializeEncryptionSession() {
    try {
      // Always generate new unique keys for each session
      const sessionId = await this.generateRSAKeyPair(true);
      console.log(`Initialized new encryption session with unique keys: ${this.keySessionId}`);
      return {
        sessionId: this.keySessionId,
        publicKey: this.publicKeyBase64,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to initialize encryption session:', error);
      throw error;
    }
  }
}

export default new TokenService();
