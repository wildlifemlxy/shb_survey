import React from 'react';
import apiService from '../../services/apiServices';
import './ImageViewerPopup.css';

const ImageViewerPopup = ({ isOpen, imageData, onClose, onDelete }) => {
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(`Delete "${imageData.title}"?`);
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      console.log('🗑️ Deleting image:', imageData.fileId);
      await apiService.deleteImage(imageData.fileId);
      
      console.log('✓ Image moved to trash:', imageData.title);
      
      if (onDelete) {
        onDelete(imageData.fileId);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Failed to delete image:', error);
      alert('Failed to delete image: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewFullScreen = async () => {
    try {
      // Call backend stream endpoint with purpose: "stream"
      const response = await fetch(
        window.location.hostname === 'localhost' 
          ? 'http://localhost:3001/images'
          : 'https://shb-backend.azurewebsites.net/images',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            purpose: 'stream',
            fileId: imageData.fileId 
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to stream image');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, '_blank');
    } catch (error) {
      alert('Failed to open full screen: ' + error.message);
    }
  };

  if (!isOpen || !imageData) return null;

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="image-viewer-modal">
          <h2 className="image-viewer-title">Image Options</h2>
          
          <div className="image-viewer-buttons">
            <button 
              className="image-viewer-btn fullscreen-btn"
              onClick={handleViewFullScreen}
            >
              View Full Screen
            </button>

            <button 
              className="image-viewer-btn delete-btn"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerPopup;
