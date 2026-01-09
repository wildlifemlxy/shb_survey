// API Configuration - Single source of truth for backend URL
/*export const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';*/

export const BASE_URL = 'https://shb-backend.azurewebsites.net';

// All backend API endpoints
export const API_ENDPOINTS = {
  // Gallery endpoints
  GALLERY: `${BASE_URL}/gallery`,
  GALLERY_STREAM: `${BASE_URL}/images/stream`,
  GALLERY_LIST: `${BASE_URL}/images`,
  GALLERY_AUTH_URL: `${BASE_URL}/images/auth-url`,
  
  // Survey endpoints
  SURVEYS: `${BASE_URL}/surveys`,
  
  // Events endpoints
  EVENTS: `${BASE_URL}/events`,
  
  // Users endpoints
  USERS: `${BASE_URL}/users`,
  
  // Telegram bot endpoints
  TELEGRAM: `${BASE_URL}/telegram`,
  
  // MFA endpoints
  MFA: `${BASE_URL}/mfa`,
  
  // Animal identification endpoints
  ANIMAL_IDENTIFICATION: `${BASE_URL}/animal-identification`
};

export default API_ENDPOINTS;
