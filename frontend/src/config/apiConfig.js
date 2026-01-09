// API Configuration - Single source of truth for backend URL
export const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

const API_ENDPOINTS = {
  GALLERY_STREAM: `${BASE_URL}/images/stream`,
  GALLERY_LIST: `${BASE_URL}/images`,
  GALLERY_AUTH_URL: `${BASE_URL}/images/auth-url`
};

export default API_ENDPOINTS;
