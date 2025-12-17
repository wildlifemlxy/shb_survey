import React from 'react';
import './UploadSuccessModal.css';

const UploadSuccessModal = ({ isOpen, fileCount, onClose, onViewGallery }) => {
  if (!isOpen) {
    return null;
  }

  const handleViewGallery = () => {
    onClose();
    if (onViewGallery) {
      onViewGallery();
    }
  };

  return (
    <div className="upload-success-overlay">
      <div className="upload-success-modal">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="upload-success-close-btn"
          aria-label="Close modal"
        >
          ×
        </button>

        {/* Success icon and message */}
        <div className="upload-success-content">
          <div className="upload-success-icon">✓</div>
          <h2 className="upload-success-title">Upload Successful!</h2>
          <p className="upload-success-message">
            Your survey has been submitted successfully with{' '}
            <span className="file-count">{fileCount}</span>{' '}
            {fileCount === 1 ? 'file' : 'files'} uploaded to Google Drive.
          </p>
        </div>

        {/* Action buttons */}
        <div className="upload-success-buttons">
          <button
            type="button"
            onClick={handleViewGallery}
            className="btn-view-gallery"
          >
            View in Gallery
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-close-modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default UploadSuccessModal;
