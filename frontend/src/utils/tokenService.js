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
    
    this.token = token;
    this.publicKey = publicKey;
    this.sessionId = sessionId;
    
    // Store in localStorage for persistence during session
    localStorage.setItem('token', token);
    localStorage.setItem('publicKey', publicKey);
    localStorage.setItem('sessionId', sessionId);
    localStorage.setItem('tokenTimestamp', Date.now().toString());
    
    console.log('New session initialized:', { sessionId, userId: user.id });
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
}

export default new TokenService();
