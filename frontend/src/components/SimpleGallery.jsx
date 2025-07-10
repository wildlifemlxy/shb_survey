import React from 'react';

class SimpleGallery extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      pictures: [],
      videos: [],
      isUploading: false
    };
  }

  componentDidMount() {
    this.loadStoredFiles();
  }

  // Load files from permanent storage
  loadStoredFiles = () => {
    try {
      const pictures = JSON.parse(localStorage.getItem('galleryPictures') || '[]');
      const videos = JSON.parse(localStorage.getItem('galleryVideos') || '[]');
      this.setState({ pictures, videos });
    } catch (error) {
      console.error('Error loading stored files:', error);
    }
  };

  // Convert file to base64 for permanent storage
  fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Handle file upload with permanent storage
  handleFileUpload = async (event, type) => {
    const files = Array.from(event.target.files);
    this.setState({ isUploading: true });

    try {
      for (const file of files) {
        // Convert to base64 for permanent storage
        const base64Data = await this.fileToBase64(file);
        
        const fileData = {
          id: Date.now() + Math.random(),
          url: base64Data,
          fileName: file.name,
          type: file.type,
          uploadDate: new Date().toISOString(),
          fileSize: file.size
        };

        // Add to state and save to localStorage
        if (type === 'pictures') {
          this.setState(prevState => {
            const newPictures = [...prevState.pictures, fileData];
            localStorage.setItem('galleryPictures', JSON.stringify(newPictures));
            return { pictures: newPictures };
          });
        } else {
          this.setState(prevState => {
            const newVideos = [...prevState.videos, fileData];
            localStorage.setItem('galleryVideos', JSON.stringify(newVideos));
            return { videos: newVideos };
          });
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    }

    this.setState({ isUploading: false });
    event.target.value = ''; // Reset input
  };

  // Delete file from permanent storage
  deleteFile = (id, type) => {
    if (window.confirm('Delete this file permanently?')) {
      if (type === 'pictures') {
        this.setState(prevState => {
          const newPictures = prevState.pictures.filter(item => item.id !== id);
          localStorage.setItem('galleryPictures', JSON.stringify(newPictures));
          return { pictures: newPictures };
        });
      } else {
        this.setState(prevState => {
          const newVideos = prevState.videos.filter(item => item.id !== id);
          localStorage.setItem('galleryVideos', JSON.stringify(newVideos));
          return { videos: newVideos };
        });
      }
    }
  };

  render() {
    const { pictures, videos, isUploading } = this.state;
    const allItems = [...pictures, ...videos];

    return (
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Conservation Gallery - Permanent Storage</h1>
        
        {/* Upload Section */}
        <div style={{ marginBottom: '30px', padding: '20px', border: '2px dashed #ccc', borderRadius: '8px' }}>
          <h3>Upload Files (Permanent Storage)</h3>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
            <label style={{ cursor: 'pointer', padding: '10px 20px', background: '#4ade80', color: 'white', borderRadius: '5px' }}>
              📸 Upload Pictures
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={(e) => this.handleFileUpload(e, 'pictures')}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </label>
            <label style={{ cursor: 'pointer', padding: '10px 20px', background: '#3b82f6', color: 'white', borderRadius: '5px' }}>
              🎥 Upload Videos
              <input 
                type="file" 
                multiple 
                accept="video/*" 
                onChange={(e) => this.handleFileUpload(e, 'videos')}
                style={{ display: 'none' }}
                disabled={isUploading}
              />
            </label>
          </div>
          {isUploading && <p>⏳ Uploading and saving files permanently...</p>}
          <p style={{ fontSize: '14px', color: '#666' }}>
            ✅ Files are saved permanently in browser storage and persist between sessions.
          </p>
        </div>

        {/* Gallery Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
          {allItems.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px', background: '#f9f9f9', borderRadius: '8px' }}>
              <h3>No Files Yet</h3>
              <p>Upload pictures or videos to get started!</p>
            </div>
          ) : (
            allItems.map((item) => (
              <div key={item.id} style={{ border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
                {item.type.startsWith('image/') ? (
                  <img 
                    src={item.url} 
                    alt={item.fileName}
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                  />
                ) : (
                  <video 
                    src={item.url} 
                    style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                    controls
                  />
                )}
                <div style={{ padding: '10px' }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold', fontSize: '14px' }}>{item.fileName}</p>
                  <p style={{ margin: '0', fontSize: '12px', color: '#666' }}>
                    {new Date(item.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => this.deleteFile(item.id, item.type.startsWith('image/') ? 'pictures' : 'videos')}
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '5px',
                    background: 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '25px',
                    height: '25px',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  ×
                </button>
              </div>
            ))
          )}
        </div>

        {/* Statistics */}
        {allItems.length > 0 && (
          <div style={{ marginTop: '30px', padding: '20px', background: '#f0f9ff', borderRadius: '8px' }}>
            <h4>Storage Statistics</h4>
            <p>📸 Pictures: {pictures.length}</p>
            <p>🎥 Videos: {videos.length}</p>
            <p>💾 Total Files: {allItems.length}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              All files are permanently stored in your browser and will persist between sessions.
            </p>
          </div>
        )}
      </div>
    );
  }
}

export default SimpleGallery;
