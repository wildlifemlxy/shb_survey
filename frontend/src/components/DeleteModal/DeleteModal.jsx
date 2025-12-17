import React, { Component } from 'react';
import '../../css/components/DeleteModal/DeleteModal.css';

class DeleteModal extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isDeleting: false,
      currentFileIndex: 0,
      totalFiles: 0,
      deleteProgress: {},
      deleteStatus: {}
    };
  }

  componentDidMount() {
    this.resetModal();
  }

  componentDidUpdate(prevProps) {
    // Reset state when fileIds change (new deletion started)
    if (prevProps.fileIds !== this.props.fileIds) {
      this.resetModal();
    }
  }

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
      let successCount = 0;
      let failureCount = 0;

      for (let i = 0; i < fileIds.length; i++) {
        const file = fileIds[i];
        const fileId = file.id || file;
        deleteProgress[i] = 0;
        deleteStatus[i] = 'deleting';
        this.setState({ 
          currentFileIndex: i + 1,
          deleteProgress,
          deleteStatus
        });

        try {
          // Simulate progress
          for (let progress = 0; progress <= 100; progress += 20) {
            deleteProgress[i] = progress;
            this.setState({ deleteProgress: { ...this.state.deleteProgress, ...deleteProgress } });
            await new Promise(resolve => setTimeout(resolve, 50));
          }

          // Make the actual delete request
          const response = await fetch(`${baseUrl}/gallery`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              purpose: 'delete',
              fileId: fileId
            })
          });

          const result = await response.json();

          if (result.success) {
            deleteProgress[i] = 100;
            deleteStatus[i] = 'success';
            successCount++;
            console.log(`✅ File ${i + 1} deleted successfully`);
          } else {
            deleteStatus[i] = 'failed';
            failureCount++;
            console.error(`❌ File ${i + 1} delete failed:`, result.message);
          }
        } catch (error) {
          deleteStatus[i] = 'failed';
          failureCount++;
          console.error(`❌ File ${i + 1} error:`, error.message);
        }

        this.setState({ deleteProgress: { ...this.state.deleteProgress, ...deleteProgress }, deleteStatus: { ...this.state.deleteStatus, ...deleteStatus } });
      }

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
    const { isOpen, onClose, fileIds } = this.props;
    const { isDeleting, currentFileIndex, totalFiles, deleteProgress, deleteStatus } = this.state;

    if (!isOpen) return null;

    return (
      <div className="delete-modal-overlay" onClick={onClose}>
        <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="delete-modal-header">
            <h2>Delete Media</h2>
            <button
              className="delete-modal-close"
              onClick={onClose}
              disabled={isDeleting}
              title="Close"
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
                  const thumbnail = file.src || file.thumbnail || null;
                  
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
                            objectFit: 'cover',
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
              onClick={onClose}
              disabled={isDeleting}
            >
              Cancel
            </button>
            <button
              className="delete-button-submit"
              onClick={this.handleDelete}
              disabled={isDeleting}
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
