
import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

// Upload gallery files (images/videos)
// Insert new gallery data with encryption (requires authentication)
export async function uploadGalleryFiles(files, metadata) {
  try {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    const tokenValid = tokenService.isTokenValid();
    if (!tokenValid) {
      return { success: false, message: 'Authentication required for gallery upload' };
    }

    // Encrypt only the metadata
    const requestPayload = {
      data: metadata,
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    const encryptedData = await tokenService.encryptData(requestPayload);

    // Prepare FormData
    const formData = new FormData();
    formData.append('purpose', 'upload');
    formData.append('encryptedData', JSON.stringify(encryptedData));
    if (files && files.length) {
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
    }

    // Send as multipart/form-data
    const response = await axios.post(`${BASE_URL}/gallery`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.status === 200 && response.data.result && response.data.result.success) {
      return { success: true, message: response.data.result.message };
    } else {
      return { success: false, message: response.data.result?.message || 'Upload failed' };
    }
  } catch (error) {
    if (error.message === 'Authentication failed') {
      return { success: false, message: 'Session expired. Please login again.' };
    }
    return { success: false, message: error.message };
  }
}

// Retrieve gallery files (all or by filter)
export async function fetchGalleryFiles(params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/gallery`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching gallery files:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

// Approve a gallery file (admin/mod only)
export async function approveGalleryFile(fileId) {
  try {
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }
    const response = await axios.post(`${BASE_URL}/gallery/approve`, { fileId }, {
      headers: {
        Authorization: `Bearer ${tokenService.getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error approving gallery file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

// Reject a gallery file (admin/mod only)
export async function rejectGalleryFile(fileId, reason = '') {
  try {
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }
    const response = await axios.post(`${BASE_URL}/gallery/reject`, { fileId, reason }, {
      headers: {
        Authorization: `Bearer ${tokenService.getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error rejecting gallery file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

// Delete a gallery file (admin/mod or owner)
export async function deleteGalleryFile(fileId) {
  try {
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }
    const response = await axios.delete(`${BASE_URL}/gallery/${fileId}`, {
      headers: {
        Authorization: `Bearer ${tokenService.getToken()}`
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting gallery file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}
