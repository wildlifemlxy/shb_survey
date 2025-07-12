import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Main login function (encrypted only)
export async function fetchLoginData(email, password) {
  try {
    console.log('Starting encrypted login process...');
    
    // First, get the public key from the server
    const publicKeyResponse = await axios.post(`${BASE_URL}/users`, {
      purpose: 'getPublicKey'
    });
    
    if (!publicKeyResponse.data.success) {
      throw new Error('Failed to get public key from server');
    }
    
    console.log('Public key received from server');
    
    // Set the public key in tokenService for encryption
    tokenService.publicKey = publicKeyResponse.data.publicKey; 
    
    // Encrypt the login credentials (await the async function)
    const loginDetails = await tokenService.encryptData({ email, password });

    console.log('Sending encrypted login request...');
    const response = await axios.post(`${BASE_URL}/users`, { loginDetails, purpose: 'login' });

    console.log('Encrypted login response received:', response.data);

    if (response.data.success) {
      // Store token data if available
      if (response.data.token && response.data.publicKey && response.data.sessionId) {
        // Add user data to the response object for initializeSession
        const sessionData = {
          token: response.data.token,
          publicKey: response.data.publicKey,
          sessionId: response.data.sessionId,
          user: response.data.data || {} // Ensure user is at least an empty object
        };
        
        console.log('Initializing session with data:', sessionData);
        
        // Only initialize session if we have valid user data
        if (sessionData.user) {
          tokenService.initializeSession(sessionData);
        } else {
          console.warn('User data is missing, skipping tokenService initialization');
        }
      }
      
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
        // Pass through token data
        token: response.data.token,
        publicKey: response.data.publicKey,
        sessionId: response.data.sessionId
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Invalid credentials',
      };
    }
  } catch (error) {
    console.error('Encrypted login error:', error);

    // Handle specific error types
    if (error.response) {
      // The server responded with a status code outside the 2xx range
      return {
        success: false,
        message: error.response.data.message || 'Authentication failed',
      };
    } else if (error.request) {
      // The request was made but no response was received
      return {
        success: false,
        message: 'No response from server. Please try again later.',
      };
    } else {
      // Something else caused the error
      return {
        success: false,
        message: 'Login failed. Please try again.',
      };
    }
  }
}

// Main change password function (encrypted only)
export async function changePassword(userId, email, newPassword) {
  try {
    console.log("Starting encrypted password change for user:", email, "with ID:", userId);
    
    // Validate parameters before sending
    if (!userId) {
      console.error("Missing userId parameter");
      return {
        success: false,
        message: 'User ID is required for password change',
      };
    }
    
    if (!email) {
      console.error("Missing email parameter");
      return {
        success: false,
        message: 'Email is required for password change',
      };
    }
    
    if (!newPassword) {
      console.error("Missing newPassword parameter");
      return {
        success: false,
        message: 'New password is required',
      };
    }
    
    // Get public key if not already available
    if (!tokenService.publicKey) {
      const publicKeyResponse = await axios.post(`${BASE_URL}/users`, {
        purpose: 'getPublicKey'
      });
      
      if (!publicKeyResponse.data.success) {
        throw new Error('Failed to get public key from server');
      }
      
      tokenService.publicKey = publicKeyResponse.data.publicKey;
    }
    
    const changePasswordData = {
      purpose: 'changePassword',
      loginDetails: await tokenService.encryptData({
        userId: userId,
        email: email,
        newPassword: newPassword
      })
    };
    
    console.log('Sending encrypted password change request...');
    const response = await axios.post(`${BASE_URL}/users`, changePasswordData);

    console.log('Encrypted password change response:', response.data);

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Password changed successfully',
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to change password',
      };
    }
  } catch (error) {
    console.error('Encrypted password change error:', error);

    // Handle specific error types
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Password change failed',
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'No response from server. Please try again later.',
      };
    } else {
      return {
        success: false,
        message: 'Password change failed. Please try again.',
      };
    }
  }
}

// Main reset password function (encrypted only)
export async function resetPassword(email) {
  try {
    console.log("Starting encrypted password reset for email:", email);
    
    // Validate parameters before sending
    if (!email) {
      console.error("Missing email parameter");
      return {
        success: false,
        message: 'Email is required for password reset',
      };
    }
    
    // Get public key if not already available
    if (!tokenService.publicKey) {
      const publicKeyResponse = await axios.post(`${BASE_URL}/users`, {
        purpose: 'getPublicKey'
      });
      
      if (!publicKeyResponse.data.success) {
        throw new Error('Failed to get public key from server');
      }
      
      tokenService.publicKey = publicKeyResponse.data.publicKey;
    }
    
    const resetData = {
      purpose: 'resetPassword',
      loginDetails: await tokenService.encryptData({
        email: email
      })
    };
    
    console.log('Sending encrypted password reset request...');
    const response = await axios.post(`${BASE_URL}/users`, resetData);

    console.log('Encrypted password reset response:', response.data);

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Password reset email sent successfully',
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to send password reset email',
      };
    }
  } catch (error) {
    console.error('Encrypted password reset error:', error);

    // Handle specific error types
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Password reset failed',
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'No response from server. Please try again later.',
      };
    } else {
      return {
        success: false,
        message: 'Password reset failed. Please try again.',
      };
    }
  }
}

// Reset password with token (kept as is since it uses a different endpoint)
export async function resetPasswordWithToken(token, newPassword) {
  try {
    const response = await axios.post(
      `${BASE_URL}/users/reset-password-confirm`,
      {
        token,
        newPassword,
      }
    );

    console.log('Reset password with token response:', response.data);

    if (response.data.success) {
      return {
        success: true,
        message: response.data.message || 'Password reset successfully',
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to reset password',
      };
    }
  } catch (error) {
    console.error('Reset password with token error:', error);

    // Handle specific error types
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Password reset failed',
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'No response from server. Please try again later.',
      };
    } else {
      return {
        success: false,
        message: 'Password reset failed. Please try again.',
      };
    }
  }
}

// Generate MFA PIN after successful login (kept as is since it's a simple operation)
export async function generateMFAPin(email) {
  try {
    console.log("Generating MFA PIN for email:", email);
    
    // Validate parameters before sending
    if (!email) {
      console.error("Missing email parameter");
      return {
        success: false,
        message: 'Email is required for MFA PIN generation',
      };
    }
    
    const response = await axios.post(
      `${BASE_URL}/users`,
      {
        purpose: 'generateMFAPin',
        email: email
      }
    );

    console.log('MFA PIN generation response:', response.data);

    if (response.data.success) {
      return {
        success: true,
        pin: response.data.pin,
        message: response.data.message || 'MFA PIN generated successfully',
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Failed to generate MFA PIN',
      };
    }
  } catch (error) {
    console.error('MFA PIN generation error:', error);

    // Handle specific error types
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'MFA PIN generation failed',
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'No response from server. Please try again later.',
      };
    } else {
      return {
        success: false,
        message: 'MFA PIN generation failed. Please try again.',
      };
    }
  }
}