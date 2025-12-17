// src/services/apiService.js
import axios from 'axios';

// dynamically choose between your local and prod backends
const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// create a single axios instance
const api = axios.create({
  baseURL: BASE_URL,
  // you can add headers, timeouts, interceptors, etc. here
});

const apiService = {
  // Survey related endpoints
  getSurveys: async () => {
    try {
      const { data } = await api.get('/surveys');
      return data;
    } catch (error) {
      console.error('Error fetching surveys:', error);
      throw error;
    }
  },

  refreshSurveys: async () => {
    try {
      const { data } = await api.post('/surveys/refresh');
      return data;
    } catch (error) {
      console.error('Error refreshing surveys:', error);
      throw error;
    }
  },

  updateWwfLedSurvey: async (index, survey) => {
    try {
      const { data } = await api.put(`/surveys/wwf-led/${index}`, survey);
      return data;
    } catch (error) {
      console.error('Error updating WWF-led survey:', error);
      throw error;
    }
  },

  updateVolunteerLedSurvey: async (index, survey) => {
    try {
      const { data } = await api.put(`/surveys/volunteer-led/${index}`, survey);
      return data;
    } catch (error) {
      console.error('Error updating volunteer-led survey:', error);
      throw error;
    }
  },

  // Telegram related endpoints
  getTelegramConfig: async () => {
    try {
      const { data } = await api.get('/telegram/config');
      return data;
    } catch (error) {
      console.error('Error fetching telegram config:', error);
      throw error;
    }
  },

  updateTelegramConfig: async (config) => {
    try {
      const { data } = await api.put('/telegram/config', config);
      return data;
    } catch (error) {
      console.error('Error updating telegram config:', error);
      throw error;
    }
  },

  addTelegramGroup: async (group) => {
    try {
      const { data } = await api.post('/telegram/groups', group);
      return data;
    } catch (error) {
      console.error('Error adding telegram group:', error);
      throw error;
    }
  },

  removeTelegramGroup: async (index) => {
    try {
      const { data } = await api.delete(`/telegram/groups/${index}`);
      return data;
    } catch (error) {
      console.error('Error removing telegram group:', error);
      throw error;
    }
  },

  // Send message to Telegram
  sendTelegramMessage: async (data) => {
    try {
      const resp = await api.post('/telegram/send', data);
      return resp.data;
    } catch (error) {
      console.error('Error sending telegram message:', error);
      throw error;
    }
  },

  // Event related endpoints
  updateEventParticipants: async (eventId, participants) => {
    try {
      const { data } = await api.post('/events', {
        purpose: 'updateParticipants',
        eventId,
        participants,
      });
      return data;
    } catch (error) {
      console.error('Error updating event participants:', error);
      throw error;
    }
  },

  // Gallery related endpoints
  getGalleryImages: async () => {
    try {
      console.log('📸 Requesting gallery images from /gallery with purpose: gallery');
      const { data } = await api.post('/gallery', {
        purpose: 'gallery'
      });
      console.log('✓ Full API response:', data);
      console.log('📷 Images array:', data.images);
      console.log('🔢 Total images:', data.images ? data.images.length : 0);
      
      if (data.images && data.images.length > 0) {
        data.images.forEach((img, idx) => {
          console.log(`  Image ${idx + 1}: ${img.title} (ID: ${img.id})`);
          console.log(`    - Stream URL: ${img.src}`);
          console.log(`    - MIME Type: ${img.mimeType}`);
        });
      }
      
      return data.images || [];
    } catch (error) {
      console.error('❌ Error fetching gallery images:', error);
      throw error;
    }
  },

  streamImage: async (fileId) => {
    try {
      console.log('🎬📸 Requesting file stream for:', fileId);
      const response = await api.post('/gallery', 
        { purpose: 'stream', fileId },
        { responseType: 'blob' }
      );
      
      const blob = response.data;
      const contentType = response.headers['content-type'] || 'unknown';
      const isVideo = contentType.startsWith('video/');
      const mediaLabel = isVideo ? '🎬 VIDEO' : '🖼️ IMAGE';
      
      console.log(`${mediaLabel} Stream received for:`, fileId);
      console.log('  - Content-Type:', contentType);
      console.log('  - Blob size:', blob.size, 'bytes');
      console.log('  - Blob type:', blob.type);
      
      if (blob.size === 0) {
        console.error('❌ EMPTY BLOB received! Content-Type:', contentType);
        throw new Error('Empty blob received from server');
      }
      
      return blob;
    } catch (error) {
      console.error('❌ Error streaming media:', fileId, error);
      console.error('Response status:', error.response?.status);
      console.error('Response data:', error.response?.data);
      throw error;
    }
  },

  deleteImage: async (fileId) => {
    try {
      console.log('🗑️ Deleting image:', fileId);
      const { data } = await api.post('/gallery', {
        purpose: 'delete',
        fileId
      });
      console.log('✓ Image deleted successfully:', fileId);
      return data;
    } catch (error) {
      console.error('❌ Error deleting image:', fileId, error);
      throw error;
    }
  },
};

export default apiService;
