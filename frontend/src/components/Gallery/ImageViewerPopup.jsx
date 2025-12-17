import React from 'react';
import apiService from '../../services/apiServices';
import './ImageViewerPopup.css';

const ImageViewerPopup = ({ isOpen, imageData, onClose, onDelete, onOpenDeleteModal }) => {
  const isVideo = imageData?.isVideo || imageData?.mimeType?.startsWith('video/');

  const handleDelete = () => {
    if (onOpenDeleteModal && imageData?.fileId) {
      onOpenDeleteModal([{
        id: imageData.fileId,
        title: imageData.title,
        src: imageData.src
      }]);
      onClose();
    }
  };

  const handleViewFullScreen = async () => {
    try {
      console.log(`📺 Opening full screen:`, imageData.fileId, isVideo ? 'VIDEO' : 'IMAGE');
      
      // If we already have the blob URL from the gallery, use it directly
      if (imageData.src && imageData.src.startsWith('blob:')) {
        window.open(imageData.src, '_blank');
        return;
      }
      
      // Otherwise, fetch the stream
      const response = await fetch(
        window.location.hostname === 'localhost' 
          ? 'http://localhost:3001/gallery'
          : 'https://shb-backend.azurewebsites.net/gallery',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            purpose: 'stream',
            fileId: imageData.fileId 
          })
        }
      );
      
      if (!response.ok) throw new Error('Failed to stream media');
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      if (isVideo) {
        // For videos, create an HTML page that plays the video
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${imageData.title}</title>
            <style>
              body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
              video { max-width: 100%; max-height: 100vh; }
            </style>
          </head>
          <body>
            <video controls autoplay style="max-width: 100%; max-height: 100vh;">
              <source src="${blobUrl}" type="${blob.type}">
              Your browser does not support the video tag.
            </video>
          </body>
          </html>
        `;
        const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
        window.open(dataUrl, '_blank');
      } else {
        window.open(blobUrl, '_blank');
      }
    } catch (error) {
      alert('Failed to open full screen: ' + error.message);
    }
  };

  if (!isOpen || !imageData) return null;

  return (
    <div className="image-viewer-overlay" onClick={onClose}>
      <div className="image-viewer-container" onClick={(e) => e.stopPropagation()}>
        <div className="image-viewer-modal">
          <h2 className="image-viewer-title">{isVideo ? '🎬 Video Options' : 'Image Options'}</h2>
          
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
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageViewerPopup;
