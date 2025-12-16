// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

const API_ENDPOINTS = {
  GALLERY_STREAM: `${API_BASE_URL}/images/stream`,
  GALLERY_LIST: `${API_BASE_URL}/images`,
  GALLERY_AUTH_URL: `${API_BASE_URL}/images/auth-url`
};

export default API_ENDPOINTS;
