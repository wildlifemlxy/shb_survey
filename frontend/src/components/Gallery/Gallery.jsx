import React from 'react';
import io from 'socket.io-client';
import apiService from '../../services/apiServices';
import '../../css/components/Gallery/Gallery.css';

// Component to stream and display images
const StreamImage = ({ fileId, title, alt, onImageLoad, onImageClick }) => {
  const [imageSrc, setImageSrc] = React.useState(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    const streamImage = async () => {
      try {
        console.log('Streaming image:', fileId);
        const blob = await apiService.streamImage(fileId);
        const url = URL.createObjectURL(blob);
        setImageSrc(url);
        console.log('✓ Image streamed successfully:', title);
        
        if (onImageLoad) {
          onImageLoad(url, title);
        }
      } catch (err) {
        console.error('❌ Failed to stream image:', fileId, err);
        setError(true);
      }
    };

    if (fileId) {
      streamImage();
    }

    return () => {
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [fileId, title, onImageLoad, imageSrc]);

  if (error) {
    return (
      <div className="gallery-img-unavailable">
        <span className="gallery-text-muted">⚠ Image unavailable</span>
      </div>
    );
  }

  return imageSrc ? (
    <img 
      src={imageSrc} 
      alt={alt || title || 'Gallery item'} 
      className="gallery-img"
      onClick={() => {
        if (onImageClick) {
          onImageClick({ fileId, title, src: imageSrc });
        }
      }}
      onError={() => console.error('Image failed to load')}
      title="Click to view and manage"
    />
  ) : (
    <div className="gallery-img gallery-img-loading">
      <span className="gallery-text-muted">Loading...</span>
    </div>
  );
};

class Gallery extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      galleryItems: [],
      isLoading: true,
      error: null,
      retryCount: 0,
      currentPage: 1,
      itemsPerPage: 12
    };
  }

  componentDidMount() {
    this.fetchGalleryImages();
    this.setupSocketListener();
  }

  componentWillUnmount() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  setupSocketListener = () => {
    const socketURL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001'
      : 'https://shb-backend.azurewebsites.net';
    
    this.socket = io(socketURL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✓ Connected to socket server:', this.socket.id);
    });

    this.socket.on('image_uploaded', (newImageData) => {
      console.log('🎉 New image uploaded event received:', newImageData);
      
      // Add new image to the beginning of gallery
      this.setState(prevState => ({
        galleryItems: [newImageData, ...prevState.galleryItems]
      }));
      
      console.log('✓ Gallery updated with new image');
    });

    this.socket.on('image_deleted', (data) => {
      console.log('🗑️ Image deleted event received:', data.fileId);
      
      // Remove deleted image from gallery
      this.setState(prevState => ({
        galleryItems: prevState.galleryItems.filter(item => item.id !== data.fileId)
      }));
      
      console.log('✓ Gallery updated - image removed');
    });

    this.socket.on('disconnect', () => {
      console.log('✗ Disconnected from socket server');
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  };

  fetchGalleryImages = async () => {
    try {
      this.setState({ isLoading: true, error: null });
      
      console.log('Fetching gallery images...');
      
      const images = await apiService.getGalleryImages();
      
      console.log('Gallery response status: success');
      console.log('Images received:', images);
      console.log('Images count:', images ? images.length : 0);
      
      if (images && images.length > 0) {
        console.log('✓ Images found:', images.length);
        images.forEach((img, idx) => {
          console.log(`Image ${idx + 1}:`, img.title);
        });
      }
      
      this.setState({ 
        galleryItems: images || [],
        isLoading: false,
        error: null
      });
    } catch (error) {
      console.error('Error fetching gallery images:', error);
      console.error('Error response:', error.response?.data);
      this.setState({ 
        error: error.response?.data?.message || error.message || 'Failed to load gallery',
        isLoading: false,
        galleryItems: []
      });
    }
  };

  handleRetry = () => {
    this.setState({ retryCount: this.state.retryCount + 1 });
    this.fetchGalleryImages();
  };

  handleImageClick = (imageData) => {
    if (this.props.onImageClick) {
      this.props.onImageClick(imageData);
    }
  };

  toggleViewMode = (mode) => {
    this.setState({ viewMode: mode, currentSwipeIndex: 0 });
  };

  goToPage = (pageNumber) => {
    this.setState({ currentPage: pageNumber });
  };

  goToPreviousPage = () => {
    const { currentPage } = this.state;
    if (currentPage > 1) {
      this.setState({ currentPage: currentPage - 1 });
    }
  };

  goToNextPage = () => {
    const { currentPage, galleryItems, itemsPerPage } = this.state;
    const totalPages = Math.ceil(galleryItems.length / itemsPerPage);
    if (currentPage < totalPages) {
      this.setState({ currentPage: currentPage + 1 });
    }
  };

  render() {
    const { galleryItems, isLoading, error, currentPage, itemsPerPage } = this.state;
    
    // Calculate pagination
    const totalPages = Math.ceil(galleryItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = galleryItems.slice(startIndex, endIndex);

    return (
      <section className="gallery-wrapper">
        <div className="gallery-header-section">
          <h2 className="gallery-main-title">Gallery</h2>
          <p className="gallery-main-subtitle">Explore conservation efforts and captured moments</p>
        </div>

        <div>
          <div className="gallery-items-grid">
              {isLoading && (
                <div className="gallery-loading-state">
                  <div className="gallery-spinner"></div>
                  <p>Loading gallery images...</p>
                </div>
              )}
              {!isLoading && galleryItems.length === 0 && !error && (
                <div className="gallery-empty-state">
                  <p>No gallery items available</p>
                </div>
              )}
              {!isLoading && paginatedItems.length > 0 && (
                paginatedItems.map((item, index) => (
                  <div key={item.id || index} className="gallery-card-item">
                      <StreamImage 
                        fileId={item.id} 
                        title={item.title} 
                        alt={item.alt}
                        onImageClick={this.handleImageClick}
                      />
                  </div>
                ))
              )}
            </div>

            {/* Pagination Controls */}
            {!isLoading && galleryItems.length > 0 && totalPages > 1 && (
              <div className="gallery-pagination">
                <button 
                  className="gallery-pagination-btn"
                  onClick={this.goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  ◀ Previous
                </button>
                
                <div className="gallery-pagination-info">
                  Page {currentPage} of {totalPages}
                </div>
                
                <button 
                  className="gallery-pagination-btn"
                  onClick={this.goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next ▶
                </button>
              </div>
            )}
          </div>
        </section>
      );
    }
  }
  
  export default Gallery;
