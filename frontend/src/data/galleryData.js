
import axios from 'axios';
import tokenService from '../utils/tokenService';

const BASE_URL =
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://shb-backend.azurewebsites.net';

//const BASE_URL = 'https://shb-backend.azurewebsites.net';

// Upload gallery files (images/videos)
// Insert new gallery data with encryption (requires authentication)
export async function uploadGalleryFiles(files, metadata) {
  try {
    const tokenValid = tokenService.isTokenValid();
    if (!tokenValid) {
      return { success: false, message: 'Authentication required for gallery upload' };
    }

    // Extract memberId and role from localStorage user JSON
    let memberId = null, role = null;
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        memberId = userData.memberId || userData.id || null;
        role = userData.role || null;
      } catch {}
    }
    const metadataWithUser = {
      ...metadata,
      memberId,
      role
    };
    // Encrypt only the metadata
    const requestPayload = {
      data: metadataWithUser,
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

export async function fetchGalleryFiles() {
  try {
    const formData = new FormData();
    formData.append('purpose', 'retrieve');
    // Get current user info
    let currentUserId = null, currentUserRole = null;
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        currentUserId = userData.memberId || userData.id || null;
        currentUserRole = userData.role || null;
      } catch {}
    }
    // Set headers
    const headers = { 'Content-Type': 'multipart/form-data' };
    if (currentUserRole) headers['x-user-role'] = currentUserRole;
    if (currentUserId) headers['x-user-id'] = currentUserId;

    const response = await axios.post(`${BASE_URL}/gallery`, formData, { headers });
    let files = response.data && response.data.files ? response.data.files : [];
    // ...existing code for debug and return...
    files.forEach(f => {
      if (f.name && f.name.toLowerCase().endsWith('.mov')) {
        const mime = 'video/quicktime';
        const url = `data:${mime};base64,${f.data}`;
        console.log('MOV video data URL (first 100 chars):', url.substring(0, 100));
      }
    });
    console.log('Fetched real gallery files:', files);
    return files;
  } catch (error) {
    console.error('Error fetching gallery files:', error);
    return [];
  }
}

// Approve a gallery file (admin/mod only)
export async function approveGalleryFile(fileId) {
  try {
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }
    // Extract memberId and role from localStorage user JSON
    let memberId = null, role = null;
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        memberId = userData.memberId || userData.id || null;
        role = userData.role || null;
      } catch {}
    }
    // Encrypt the fileId and user info as metadata
    const requestPayload = {
      data: { fileId, memberId, role },
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    const encryptedData = await tokenService.encryptData(requestPayload);

    // Prepare FormData
    const formData = new FormData();
    formData.append('purpose', 'approve');
    formData.append('encryptedData', JSON.stringify(encryptedData));

    // Send as multipart/form-data
    const response = await axios.post(`${BASE_URL}/gallery`, formData, {
      headers: {
        Authorization: `Bearer ${tokenService.getToken()}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error approving gallery file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}

// Reject a gallery file (admin/mod only)
export async function rejectGalleryFile(fileId) {
  try {
    if (!tokenService.isTokenValid()) {
      return { success: false, error: 'Authentication required' };
    }
    // Extract memberId and role from localStorage user JSON
    let memberId = null, role = null;
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        memberId = userData.memberId || userData.id || null;
        role = userData.role || null;
      } catch {}
    }
    // Encrypt the fileId and user info as metadata
    const requestPayload = {
      data: { fileId, memberId, role },
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    const encryptedData = await tokenService.encryptData(requestPayload);

    // Prepare FormData
    const formData = new FormData();
    formData.append('purpose', 'reject');
    formData.append('encryptedData', JSON.stringify(encryptedData));

    // Send as multipart/form-data
    const response = await axios.post(`${BASE_URL}/gallery`, formData, {
      headers: {
        Authorization: `Bearer ${tokenService.getToken()}`,
        'Content-Type': 'multipart/form-data'
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

    // Extract memberId and role from localStorage user JSON
    let memberId = null, role = null;
    const userDataString = localStorage.getItem('user');
    if (userDataString) {
      try {
        const userData = JSON.parse(userDataString);
        memberId = userData.memberId || userData.id || null;
        role = userData.role || null;
      } catch {}
    }
    // Encrypt the fileId and user info as metadata
    const requestPayload = {
      data: { fileId, memberId, role },
      requiresEncryption: true,
      publicKey: await tokenService.getPublicKey(),
      sessionId: tokenService.getKeySessionId()
    };
    const encryptedData = await tokenService.encryptData(requestPayload);

    // Prepare FormData
    const formData = new FormData();
    formData.append('purpose', 'delete');
    formData.append('encryptedData', JSON.stringify(encryptedData));

    // Send as multipart/form-data
    const response = await axios.post(`${BASE_URL}/gallery`, formData, {
      headers: {
        Authorization: `Bearer ${tokenService.getToken()}`,
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting gallery file:', error);
    return { success: false, error: error.response?.data?.error || error.message };
  }
}
