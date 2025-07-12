import axios from 'axios';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Fetch login data and return the result
export async function fetchLoginData(email, password) {
  try {
    const response = await axios.post(
      `${BASE_URL}/users`,
      {
        loginDetails: { email, password },
        purpose: 'login',
      }
    );

    console.log('Response from server:', response.data);

    if (response.data.success) {
      return {
        success: true,
        data: response.data.data,
        message: response.data.message,
      };
    } else {
      return {
        success: false,
        message: response.data.message || 'Invalid credentials',
      };
    }
  } catch (error) {
    console.error('Login error:', error);

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

// Change password for first-time login users
export async function changePassword(userId, email, newPassword) {
  try {
    console.log("Changing password for user:", email, "with ID:", userId);
    console.log("Parameters received - userId:", userId, "email:", email, "newPassword length:", newPassword?.length);
    
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
    
    const response = await axios.post(
      `${BASE_URL}/users`,
      {
        purpose: 'changePassword',
        userId: userId,
        email: email,
        newPassword: newPassword
      }
    );

    console.log('Password change response:', response.data);

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
    console.error('Password change error:', error);

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

// Reset password - send reset email
export async function resetPassword(email) {
  try {
    console.log("Requesting password reset for email:", email);
    
    // Validate parameters before sending
    if (!email) {
      console.error("Missing email parameter");
      return {
        success: false,
        message: 'Email is required for password reset',
      };
    }
    
    const response = await axios.post(
      `${BASE_URL}/users`,
      {
        purpose: 'resetPassword',
        email: email
      }
    );

    console.log('Password reset response:', response.data);

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
    console.error('Password reset error:', error);

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

// Reset password with token
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

// Generate MFA PIN after successful login
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
