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
