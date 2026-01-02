import React from 'react';
import apiService from '../../services/apiServices';
import './ImageViewerPopup.css';

const ImageViewerPopup = ({ isOpen, imageData, onClose, onDelete, onOpenDeleteModal, onDeleteModalOpen, onOpenFullScreenModal, onOpenFullScreenMediaViewer, galleryFiles = [], isAuthenticated = false }) => {
  const isVideo = imageData?.isVideo || imageData?.mimeType?.startsWith('video/');

  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('📺 ImageViewerPopup is OPEN with imageData:', imageData);
    }
  }, [isOpen, imageData]);

  const handleDelete = () => {
    if (onOpenDeleteModal && imageData?.fileId) {
      onOpenDeleteModal([{
        id: imageData.fileId,
        title: imageData.title,
        src: imageData.src
      }]);
      onClose(); // Close the ImageViewerPopup - it will reopen on cancel if needed
    }
  };

  const handleViewFullScreen = () => {
    if (onOpenFullScreenMediaViewer && imageData) {
      onOpenFullScreenMediaViewer(imageData);
      onClose(); // Close this popup when opening fullscreen
    }
  };

  if (!isOpen || !imageData) return null;

  return (
    <>
      <div className="image-viewer-overlay" onClick={onClose}>
        <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
          <div className="image-viewer-modal">
            <div className="image-viewer-header">
              <h2 className="image-viewer-title">{isVideo ? '🎬 Video Options' : 'Image Options'}</h2>
              <button 
                className="image-viewer-close-btn"
                onClick={onClose}
                title="Close"
                aria-label="Close popup"
              >
                ✕
              </button>
            </div>
            
            <div className="image-viewer-buttons">
              <button 
                className="image-viewer-btn fullscreen-btn"
                onClick={handleViewFullScreen}
              >
                View Full Screen
              </button>

              {isAuthenticated && (
                <button 
                  className="image-viewer-btn delete-btn"
                  onClick={handleDelete}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ImageViewerPopup;
