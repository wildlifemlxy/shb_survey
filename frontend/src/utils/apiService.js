import tokenService from './tokenService';

const API_BASE_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://shb-backend.azurewebsites.net';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Make authenticated API request
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      // Use token service for authenticated requests
      return await tokenService.makeAuthenticatedRequest(url, options);
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Submit encrypted survey data
  async submitSurvey(surveyData) {
    try {
      // Encrypt survey data
      const encryptedData = await tokenService.encryptData(surveyData);
      
      const response = await this.makeRequest('/api/surveys', {
        method: 'POST',
        body: JSON.stringify(encryptedData)
      });

      if (!response.ok) {
        throw new Error(`Survey submission failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Survey submission error:', error);
      throw error;
    }
  }

  // Get encrypted survey data
  async getSurveys() {
    try {
      const response = await this.makeRequest('/api/surveys');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch surveys: ${response.status}`);
      }

      const encryptedSurveys = await response.json();
      
      // Note: Decryption should be handled on the server side
      // Client only receives decrypted data that user is authorized to see
      return encryptedSurveys;
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  }

  // Submit encrypted event data
  async submitEvent(eventData) {
    try {
      const encryptedData = await tokenService.encryptData(eventData);
      
      const response = await this.makeRequest('/api/events', {
        method: 'POST',
        body: JSON.stringify(encryptedData)
      });

      if (!response.ok) {
        throw new Error(`Event submission failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Event submission error:', error);
      throw error;
    }
  }

  // Get user profile with token verification
  async getUserProfile() {
    try {
      const response = await this.makeRequest('/api/user/profile');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  // Update user settings
  async updateUserSettings(settings) {
    try {
      const encryptedSettings = await tokenService.encryptData(settings);
      
      const response = await this.makeRequest('/api/user/settings', {
        method: 'PUT',
        body: JSON.stringify(encryptedSettings)
      });

      if (!response.ok) {
        throw new Error(`Settings update failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Settings update error:', error);
      throw error;
    }
  }

  // Login with credentials
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
      }

      const loginResponse = await response.json();
      
      // Expected response format:
      // {
      //   token: "jwt_token_here",
      //   publicKey: "rsa_public_key_pem",
      //   sessionId: "unique_session_id",
      //   user: { id, email, role, ... }
      // }
      
      return loginResponse;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout and invalidate session
  async logout() {
    try {
      // Notify server about logout
      await this.makeRequest('/api/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      console.error('Logout notification failed:', error);
      // Don't throw - still proceed with client-side logout
    } finally {
      // Always clear local session
      tokenService.clearSession();
    }
  }

  // Refresh authentication token
  async refreshToken() {
    try {
      const response = await this.makeRequest('/api/auth/refresh', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }

      const refreshResponse = await response.json();
      
      // Update token service with new token data
      tokenService.initializeSession(refreshResponse);
      
      return refreshResponse;
    } catch (error) {
      console.error('Token refresh error:', error);
      throw error;
    }
  }

  // Get session info
  getSessionInfo() {
    if (!tokenService.isTokenValid()) {
      return null;
    }

    return {
      isValid: true,
      userInfo: tokenService.getUserInfo(),
      sessionId: tokenService.getSessionId(),
      token: tokenService.getToken()
    };
  }
}

export default new ApiService();
