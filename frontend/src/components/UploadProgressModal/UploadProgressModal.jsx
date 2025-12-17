import React from 'react';
import './UploadProgressModal.css';

const UploadProgressModal = ({ isUploading, uploadFileName }) => {
  if (!isUploading) {
    return null;
  }

  return (
    <div className="shb-upload-overlay">
      <div className="shb-upload-container">
        <div className="shb-upload-title">
          Uploading In Progresss
        </div>

        <div className="shb-upload-loader">
          <div className="shb-upload-dot shb-upload-dot-1" />
          <div className="shb-upload-dot shb-upload-dot-2" />
          <div className="shb-upload-dot shb-upload-dot-3" />
        </div>
      </div>
    </div>
  );
};

export default UploadProgressModal;
