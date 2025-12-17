import React, { Component } from 'react';
import axios from 'axios';
import '../../css/components/UploadModal/UploadModal.css';

class UploadModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDragOver: false,
      selectedFiles: [],
      filePreviews: [], // Store preview URLs
      isUploading: false,
      uploadProgress: {},
      uploadStatus: {},
      currentFileIndex: 0, // Track which file is uploading
      totalFiles: 0 // Track total files to upload
    };
  }

  handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: true });
  };

  handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: false });
  };

  handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    this.setState({ isDragOver: false });

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      this.handleFileSelect(files);
    }
  };

  handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      this.handleFileSelect(files);
    }
  };

  handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    // Filter to images and videos only
    const validFiles = fileArray.filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    // Generate previews for each file
    const newPreviews = validFiles.map(file => {
      return new Promise((resolve) => {
        if (file.type.startsWith('video/')) {
          // For videos, extract thumbnail from middle frame
          const video = document.createElement('video');
          video.onloadedmetadata = () => {
            // Seek to middle of video
            const middleTime = video.duration / 2;
            video.currentTime = middleTime;
          };
          video.onseeked = () => {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
          };
          
          video.onerror = () => {
            // Fallback if video thumbnail extraction fails
            const reader = new FileReader();
            reader.onload = (e) => {
              resolve(e.target.result);
            };
            reader.readAsDataURL(file);
          };
          
          video.src = URL.createObjectURL(file);
        } else {
          // For images, use regular preview
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    });

    Promise.all(newPreviews).then(previews => {
      this.setState(prevState => ({
        selectedFiles: [...prevState.selectedFiles, ...validFiles],
        filePreviews: [...prevState.filePreviews, ...previews]
      }));
    });
  };

  removeFile = (index) => {
    this.setState(prevState => ({
      selectedFiles: prevState.selectedFiles.filter((_, i) => i !== index),
      filePreviews: prevState.filePreviews.filter((_, i) => i !== index)
    }));
  };

  handleModalClose = () => {
    // Reset state to default values
    this.setState({
      isDragOver: false,
      selectedFiles: [],
      filePreviews: [],
      isUploading: false,
      uploadProgress: {},
      uploadStatus: {},
      currentFileIndex: 0,
      totalFiles: 0
    });
    
    // Call parent's onClose callback
    if (this.props.onClose) {
      this.props.onClose();
    }
  };

  handleUpload = async () => {
    const { selectedFiles } = this.state;
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    this.setState({ isUploading: true, totalFiles: selectedFiles.length, currentFileIndex: selectedFiles.length });

    const baseUrl = window.location.hostname === 'localhost'
      ? 'http://localhost:3001'
      : 'https://shb-backend.azurewebsites.net';

    const uploadProgress = {};
    const uploadStatus = {};
    const errors = [];

    // Initialize all files
    for (let i = 0; i < selectedFiles.length; i++) {
      uploadProgress[i] = 0;
      uploadStatus[i] = 'uploading';
    }
    
    this.setState({ uploadProgress, uploadStatus });

    // Create all upload promises simultaneously
    const uploadPromises = selectedFiles.map((file, i) => {
      return new Promise((resolve) => {
        try {
          const formData = new FormData();
          formData.append('image', file);
          formData.append('purpose', 'upload');

          axios.post(`${baseUrl}/gallery`, formData, {
            onUploadProgress: (progressEvent) => {
              if (progressEvent.lengthComputable) {
                const percentComplete = (progressEvent.loaded / progressEvent.total) * 100;
                uploadProgress[i] = Math.round(percentComplete);
                this.setState({ uploadProgress: { ...this.state.uploadProgress, ...uploadProgress } });
              }
            },
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          })
            .then((response) => {
              if (response.data.success) {
                uploadStatus[i] = 'success';
                console.log(`✅ File ${i + 1} uploaded successfully`);
              } else {
                uploadStatus[i] = 'failed';
                errors.push(`${file.name}: ${response.data.error}`);
                console.error(`❌ File ${i + 1} upload failed:`, response.data.error);
              }
              this.setState({ uploadStatus: { ...this.state.uploadStatus, ...uploadStatus } });
              resolve();
            })
            .catch((error) => {
              uploadStatus[i] = 'failed';
              errors.push(`${file.name}: ${error.message}`);
              console.error(`❌ File ${i + 1} error:`, error);
              this.setState({ uploadStatus: { ...this.state.uploadStatus, ...uploadStatus } });
              resolve();
            });
        } catch (error) {
          uploadStatus[i] = 'failed';
          errors.push(`${file.name}: ${error.message}`);
          console.error(`❌ File ${i + 1} error:`, error);
          this.setState({ uploadStatus: { ...this.state.uploadStatus, ...uploadStatus } });
          resolve();
        }
      });
    });

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Wait a moment then close
    setTimeout(() => {
      this.setState({ isUploading: false, currentFileIndex: 0 });

      // Close modal and refresh
      this.setState({ selectedFiles: [], uploadProgress: {}, uploadStatus: {}, filePreviews: [] });
      if (this.props.onUploadComplete) {
        this.props.onUploadComplete();
      }
      // Call handleModalClose to ensure state is properly reset
      this.handleModalClose();
    }, 1000);
  };

  formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  render() {
    const { isOpen, onClose } = this.props;
    const { isDragOver, selectedFiles, filePreviews, isUploading, currentFileIndex, totalFiles, uploadProgress, uploadStatus } = this.state;

    if (!isOpen) return null;

    return (
      <div className="upload-modal-overlay" onClick={this.handleModalClose}>
        <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="upload-modal-header">
            <h2>Upload Media</h2>
            <button
              className="upload-modal-close"
              onClick={this.handleModalClose}
              disabled={isUploading}
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="upload-modal-content">
            {/* Drag and Drop Zone */}
            <div
              className={`upload-drop-zone ${isDragOver ? 'drag-over' : ''}`}
              onDragOver={this.handleDragOver}
              onDragLeave={this.handleDragLeave}
              onDrop={this.handleDrop}
              onClick={() => document.getElementById('upload-file-input').click()}
              style={{ cursor: 'pointer', opacity: isUploading ? 0.5 : 1, pointerEvents: isUploading ? 'none' : 'auto' }}
            >
              <div className="drop-icon">📁</div>
              <div className="drop-text">
                {isDragOver ? 'Drop files here' : 'Drag & Drop or click to select files'}
              </div>
            </div>

            {/* File Input Button */}
            <input
              type="file"
              id="upload-file-input"
              multiple
              accept="image/*,video/*"
              onChange={this.handleFileInput}
              style={{ display: 'none' }}
              disabled={isUploading}
            />

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="upload-files-list">
                <div className="files-header">
                  <span>{selectedFiles.length} file(s) selected</span>
                </div>
                <div className="files-container">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="file-item">
                      <div className="file-info">
                        <div className="file-icon">
                          {filePreviews[index] && (
                            <img 
                              src={filePreviews[index]} 
                              alt={file.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                borderRadius: '4px'
                              }}
                            />
                          )}
                        </div>
                        <div className="file-details">
                          <div className="file-name">{file.name}</div>
                          <div className="file-size">{this.formatFileSize(file.size)}</div>
                          {isUploading && uploadProgress[index] !== undefined && (
                            <div style={{ marginTop: '8px' }}>
                              <div style={{
                                height: '4px',
                                background: '#e5e7eb',
                                borderRadius: '2px',
                                overflow: 'hidden',
                                marginBottom: '4px'
                              }}>
                                <div style={{
                                  height: '100%',
                                  background: uploadStatus[index] === 'success' ? '#10b981' : uploadStatus[index] === 'failed' ? '#ef4444' : 'linear-gradient(90deg, #4f46e5, #7c3aed)',
                                  width: `${uploadProgress[index]}%`,
                                  transition: 'width 0.3s ease'
                                }}></div>
                              </div>
                              <div style={{ fontSize: '11px', fontWeight: '600', color: '#4f46e5' }}>
                                {uploadStatus[index] === 'success' ? '✅ Done' : uploadStatus[index] === 'failed' ? '❌ Failed' : `${uploadProgress[index]}%`}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Remove Button */}
                      {!isUploading && (
                        <button
                          className="file-remove"
                          onClick={() => this.removeFile(index)}
                          title="Remove file"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="upload-modal-footer">
            <button
              className="upload-button-cancel"
              onClick={this.handleModalClose}
              disabled={isUploading}
            >
              Cancel
            </button>
            <button
              className="upload-button-submit"
              onClick={this.handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
            >
              {isUploading ? '⏳ Uploading...' : '⬆️ Upload'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default UploadModal;
