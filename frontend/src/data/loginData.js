import simpleApiService from '../utils/simpleApiService';

// Simple login function - no encryption
export async function fetchLoginData(email, password) {
  try {
    console.log('Starting plain login process...');
    
    const result = await simpleApiService.login({ email, password });
    console.log('Login response:', result);
    
    if (result.success) {
      // Store user info in localStorage for persistence - use consistent keys
      localStorage.setItem('currentUser', JSON.stringify(result.data));
      localStorage.setItem('user', JSON.stringify(result.data)); // Fallback compatibility
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('isAuthenticated', 'true'); // Consistency with other parts
      localStorage.setItem('userRole', result.data.role || 'user');
      localStorage.setItem('loginTimestamp', Date.now().toString());
      
      return {
        success: true,
        data: result.data,
        message: result.message || 'Login successful'
      };
    } else {
      return {
        success: false,
        message: result.message || 'Login failed'
      };
    }
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.message || 'Network error. Please try again.'
    };
  }
}

// Simple logout function
export async function logout() {
  try {
    console.log('Starting logout process...');
    
    await simpleApiService.logout();
    
    return { 
      success: true,
      message: 'Logout successful'
    };
  } catch (error) {
    console.error('Logout error:', error);
    return { 
      success: false,
      message: error.message || 'Logout failed'
    };
  }
}

// Check if user is logged in
export function isLoggedIn() {
  // Check both possible authentication flags for consistency
  const isLoggedInFlag = localStorage.getItem('isLoggedIn') === 'true';
  const isAuthenticatedFlag = localStorage.getItem('isAuthenticated') === 'true';
  const hasUserData = localStorage.getItem('user') || localStorage.getItem('currentUser');
  
  // Check if login hasn't expired (optional - 24 hour session)
  const loginTimestamp = localStorage.getItem('loginTimestamp');
  let isNotExpired = true;
  
  if (loginTimestamp) {
    const now = Date.now();
    const loginTime = parseInt(loginTimestamp);
    const sessionDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    isNotExpired = (now - loginTime) < sessionDuration;
    
    if (!isNotExpired) {
      console.log('Session expired after 24 hours, clearing login data');
      clearSession();
      return false;
    }
  }
  
  // User is logged in if any authentication flag is true AND user data exists AND not expired
  const loggedIn = (isLoggedInFlag || isAuthenticatedFlag) && hasUserData && isNotExpired;
  
  if (loggedIn) {
    console.log('User is authenticated - session valid');
  }
  
  return loggedIn;
}

// Get current user
export function getCurrentUser() {
  // Check both possible user data keys
  let userStr = localStorage.getItem('user') || localStorage.getItem('currentUser');
  
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  }
  return null;
}

// Clear user data
export function clearSession() {
  // Clear all possible authentication-related localStorage keys
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('user');
  localStorage.removeItem('userRole');
  localStorage.removeItem('loginTimestamp');
  
  // Clear any token-related data if present
  localStorage.removeItem('token');
  localStorage.removeItem('sessionId');
  localStorage.removeItem('tokenTimestamp');
  
  console.log('All user authentication data cleared from localStorage');
}

// Password reset function - plain
export async function resetPassword(email) {
  try {
    console.log('Requesting password reset for:', email);
    
    const response = await simpleApiService.resetPassword({ email });
    
    return {
      success: true,
      message: response.message || 'Password reset email sent'
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: error.message || 'Failed to send reset email'
    };
  }
}

// Change password function - plain
export async function changePassword(userId, userEmail, newPassword) {
  try {
    console.log('Requesting password change for:', { userId, userEmail });
    
    const response = await simpleApiService.changePassword({
      email: userEmail,
      newPassword
    });
    
    return {
      success: true,
      message: response.message || 'Password changed successfully'
    };
  } catch (error) {
    console.error('Password change error:', error);
    return {
      success: false,
      message: error.message || 'Failed to change password'
    };
  }
}
