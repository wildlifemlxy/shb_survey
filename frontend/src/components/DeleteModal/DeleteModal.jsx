import React, { Component } from 'react';
import axios from 'axios';
import '../../css/components/DeleteModal/DeleteModal.css';

class DeleteModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDeleting: false,
      currentFileIndex: 0,
      totalFiles: 0,
      deleteProgress: {},
      deleteStatus: {},
      videoThumbnails: {} // Store generated video thumbnails
    };
  }

  componentDidMount() {
    this.resetModal();
    this.generateVideoThumbnails();
  }

  componentDidUpdate(prevProps) {
    // Reset state when fileIds change (new deletion started)
    if (prevProps.fileIds !== this.props.fileIds) {
      this.resetModal();
      this.generateVideoThumbnails();
    }
  }

  generateVideoThumbnails = () => {
    const { fileIds } = this.props;
    if (!fileIds || fileIds.length === 0) return;

    fileIds.forEach((file, index) => {
      const mimeType = file.mimeType || '';
      
      // Only generate thumbnails for videos
      if (mimeType.startsWith('video/') && file.src) {
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
          const thumbnailUrl = canvas.toDataURL('image/jpeg');
          
          // Store thumbnail in state with file index as key
          this.setState(prevState => ({
            videoThumbnails: {
              ...prevState.videoThumbnails,
              [index]: thumbnailUrl
            }
          }));
          
          console.log(`✅ Generated middle frame thumbnail for video ${index + 1}`);
        };
        video.src = file.src;
      }
    });
  };

  resetModal = () => {
    this.setState({
      isDeleting: false,
      currentFileIndex: 0,
      totalFiles: 0,
      deleteProgress: {},
      deleteStatus: {}
    });
  };

  handleDelete = async () => {
    const { fileIds } = this.props;
    
    if (!fileIds || fileIds.length === 0) {
      alert('No files to delete');
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${fileIds.length} item(s)? This action cannot be undone.`
    );

    if (!confirmDelete) return;

    this.setState({ isDeleting: true, totalFiles: fileIds.length, currentFileIndex: 0 });

    try {
      const baseUrl = window.location.hostname === 'localhost'
        ? 'http://localhost:3001'
        : 'https://shb-backend.azurewebsites.net';

      console.log('📤 Sending bulk delete request with fileIds:', fileIds.map(f => f.id || f));

      const deleteProgress = {};
      const deleteStatus = {};
      
      // Initialize all files
      for (let i = 0; i < fileIds.length; i++) {
        deleteProgress[i] = 0;
        deleteStatus[i] = 'deleting';
      }
      
      this.setState({ deleteProgress, deleteStatus, currentFileIndex: fileIds.length });

      // Create all delete promises simultaneously
      const deletePromises = fileIds.map(async (file, index) => {
        const fileId = file.id || file;
        
        try {
          // Simulate progress animation
          for (let progress = 0; progress <= 90; progress += 15) {
            deleteProgress[index] = progress;
            this.setState({ deleteProgress: { ...this.state.deleteProgress, ...deleteProgress } });
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Make the actual delete request
          const response = await axios.post(`${baseUrl}/gallery`, {
            purpose: 'delete',
            fileId: fileId
          });

          if (response.data.success) {
            deleteProgress[index] = 100;
            deleteStatus[index] = 'success';
            console.log(`✅ File ${index + 1} deleted successfully`);
          } else {
            deleteStatus[index] = 'failed';
            console.error(`❌ File ${index + 1} delete failed:`, response.data.message);
          }
        } catch (error) {
          deleteStatus[index] = 'failed';
          console.error(`❌ File ${index + 1} error:`, error.message);
        }

        this.setState({ 
          deleteProgress: { ...this.state.deleteProgress, ...deleteProgress }, 
          deleteStatus: { ...this.state.deleteStatus, ...deleteStatus } 
        });
      });

      // Wait for all delete operations to complete
      await Promise.all(deletePromises);

      // Wait a moment then close
      setTimeout(() => {
        this.setState({ isDeleting: false });
        if (this.props.onDeleteComplete) {
          this.props.onDeleteComplete();
        }
        if (this.props.onClose) {
          this.props.onClose();
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Error during bulk delete:', error);
      alert(`Error deleting items: ${error.message}`);
      this.setState({ isDeleting: false });
    }
  };

  render() {
    const { isOpen, onClose, fileIds, onCancel } = this.props;
    const { isDeleting, currentFileIndex, totalFiles, deleteProgress, deleteStatus, videoThumbnails } = this.state;

    const handleCancelClick = () => {
      if (onCancel) {
        onCancel();
      }
    };

    const handleCloseClick = () => {
      if (onClose) {
        onClose();
      }
    };

    if (!isOpen) return null;

    return (
      <div 
        className="delete-modal-overlay" 
        onClick={handleCloseClick}
      >
        <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="delete-modal-header">
            <h2>Delete Media</h2>
            <button
              className="delete-modal-close"
              onClick={handleCloseClick}
              title="Close"
              style={{ cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div className="delete-modal-content">
            {/* File Progress List */}
            {fileIds && (
              <div className="delete-files-list">
                {fileIds.map((file, index) => {
                  const fileId = file.id || file;
                  const fileName = file.title || file.name || `File ${index + 1}`;
                  const mimeType = file.mimeType || '';
                  // Use generated video thumbnail if available, otherwise use file thumbnail/src
                  const thumbnail = videoThumbnails[index] || file.src || file.thumbnail || null;
                  
                  return (
                    <div key={index} className="delete-file-item">
                      {thumbnail && (
                        <img 
                          src={thumbnail} 
                          alt={fileName}
                          className="delete-file-thumbnail"
                          style={{
                            width: '48px',
                            height: '48px',
                            borderRadius: '4px',
                            objectFit: 'contain',
                            marginRight: '12px',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ flex: 1 }}>
                        <div className="delete-file-name">{fileName}</div>
                        <div className="delete-file-progress">
                          <div style={{
                            height: '4px',
                            background: '#e5e7eb',
                            borderRadius: '2px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              height: '100%',
                              background: deleteStatus[index] === 'success' ? '#10b981' : deleteStatus[index] === 'failed' ? '#ef4444' : '#ef4444',
                              width: `${deleteProgress[index] || 0}%`,
                              transition: 'width 0.3s ease'
                            }}></div>
                          </div>
                          <div style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', marginTop: '4px' }}>
                            {deleteStatus[index] === 'success' ? '✅ Done' : deleteStatus[index] === 'failed' ? '❌ Failed' : `${deleteProgress[index] || 0}%`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="delete-modal-footer">
            <button
              className="delete-button-cancel"
              onClick={handleCancelClick}
              style={{ cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              className="delete-button-submit"
              onClick={this.handleDelete}
              style={{ cursor: 'pointer' }}
            >
              {isDeleting ? '⏳ Deleting...' : '🗑️ Delete'}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default DeleteModal;
