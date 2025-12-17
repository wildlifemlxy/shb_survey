import React from 'react';
import io from 'socket.io-client';
import apiService from '../../services/apiServices';
import '../../css/components/Gallery/Gallery.css';

// Component to stream and display images and videos
const StreamImage = ({ fileId, title, alt, mimeType, onImageClick, onItemReady }) => {
  const [mediaSrc, setMediaSrc] = React.useState(null);
  const [error, setError] = React.useState(false);
  const [mediaType, setMediaType] = React.useState(null);
  const [isReady, setIsReady] = React.useState(false);
  const readyTimeoutRef = React.useRef(null);
  
  console.log(`🎬 StreamImage: ${title}`, { fileId, mimeType, mediaType, mediaSrc: !!mediaSrc, isReady });
  
  // Detect media type
  React.useEffect(() => {
    console.log(`📋 [${fileId}] Checking MIME type: ${mimeType}`);
    if (mimeType) {
      if (mimeType.startsWith('video/')) {
        console.log(`✅ [${fileId}] VIDEO detected`);
        setMediaType('video');
      } else if (mimeType.startsWith('image/')) {
        console.log(`✅ [${fileId}] IMAGE detected`);
        setMediaType('image');
      } else {
        console.warn(`⚠️ [${fileId}] Unknown type: ${mimeType}`);
        setMediaType('image');
      }
    }
  }, [mimeType, fileId]);

  React.useEffect(() => {
    const streamMedia = async () => {
      console.log(`📥 [${fileId}] Streaming ${mediaType}...`);
      
      if (!fileId || !mediaType) {
        console.warn(`❌ [${fileId}] Missing fileId or mediaType`);
        return;
      }
      
      try {
        const blob = await apiService.streamImage(fileId);
        
        if (!blob || blob.size === 0) {
          console.error(`❌ [${fileId}] Empty blob`);
          setError(true);
          if (onItemReady) onItemReady(fileId, false);
          return;
        }
        
        const url = URL.createObjectURL(blob);
        console.log(`✅ [${fileId}] Blob URL created, size: ${blob.size} bytes`);
        
        setMediaSrc(url);
        
        // Mark ready immediately after blob is ready, or after short timeout
        const timeoutDuration = 1000;
        readyTimeoutRef.current = setTimeout(() => {
          console.warn(`⏰ [${fileId}] Timeout - forcing ready`);
          setIsReady(true);
          if (onItemReady) onItemReady(fileId, true);
        }, timeoutDuration);
        
      } catch (err) {
        console.error(`❌ [${fileId}] Stream error:`, err.message);
        setError(true);
        if (onItemReady) onItemReady(fileId, false);
      }
    };

    streamMedia();

    return () => {
      if (readyTimeoutRef.current) {
        clearTimeout(readyTimeoutRef.current);
      }
      if (mediaSrc) {
        URL.revokeObjectURL(mediaSrc);
        console.log(`🧹 [${fileId}] Cleaned up`);
      }
    };
  }, [fileId, mediaType, onItemReady]);

  if (error) {
    return (
      <div className="gallery-img-unavailable">
        <span className="gallery-text-muted">⚠ Failed</span>
      </div>
    );
  }

  // Show media when mediaSrc exists (blob is ready to render)
  // Media will be displayed, but onLoad/onCanPlay will trigger onItemReady
  if (mediaSrc) {
    console.log(`🎨 [${fileId}] RENDERING ${mediaType?.toUpperCase()}: ${title}`);
    
    return mediaType === 'video' ? (
      <video 
        src={mediaSrc} 
        className="gallery-img gallery-video"
        onClick={() => {
          if (onImageClick) {
            onImageClick({ fileId, title, src: mediaSrc, isVideo: true });
          }
        }}
        onError={(e) => {
          console.error(`❌ [${fileId}] Video error:`, e);
          setError(true);
        }}
        onCanPlay={() => {
          console.log(`✅ [${fileId}] VIDEO canPlay - marking as ready`);
          clearTimeout(readyTimeoutRef.current);
          setIsReady(true);
          if (onItemReady) onItemReady(fileId, true);
        }}
        title="Click to view and manage"
        controls
        controlsList="nodownload"
        preload="auto"
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
      />
    ) : (
      <img 
        src={mediaSrc} 
        alt={alt || title || 'Gallery item'} 
        className="gallery-img"
        onClick={() => {
          if (onImageClick) {
            onImageClick({ fileId, title, src: mediaSrc, mimeType });
          }
        }}
        onError={() => {
          console.error(`❌ [${fileId}] Image error`);
          setError(true);
        }}
        onLoad={() => {
          console.log(`✅ [${fileId}] IMAGE loaded - marking as ready`);
          clearTimeout(readyTimeoutRef.current);
          setIsReady(true);
          if (onItemReady) onItemReady(fileId, true);
        }}
        title="Click to view and manage"
      />
    );
  }

  // Still loading/waiting
  if (mediaSrc && !isReady) {
    console.log(`⏳ [${fileId}] Waiting for ${mediaType}...`);
  } else if (!mediaSrc) {
    console.log(`📥 [${fileId}] Streaming...`);
  }
  
  return null;
};

class Gallery extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      galleryItems: [],
      readyItems: new Set(),
      isLoading: true,
      error: null,
      retryCount: 0,
      currentPage: 1,
      itemsPerPage: 12
    };
  }

  componentDidMount() {
    this.setupSocketListener();
    // Small delay to ensure socket is ready before API call
    setTimeout(() => {
      this.fetchGalleryImages();
    }, 500);
  }

  componentWillUnmount() {
    if (this.socketTimeoutId) {
      clearTimeout(this.socketTimeoutId);
    }
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  setupSocketListener = () => {
    console.log('🔌 Setting up socket listener...');
    
    const socketURL = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001'
      : 'https://shb-backend.azurewebsites.net';
    
    console.log('📍 Socket URL:', socketURL);
    
    this.socket = io(socketURL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('✓ Connected to socket server:', this.socket.id);
      console.log('📡 Socket ready to receive updates');
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('✗ Disconnected from socket server:', reason);
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

    this.socket.on('gallery_update', (data) => {
      console.log('📡 🎉 GALLERY UPDATE RECEIVED! 🎉');
      console.log('Data structure:', data);
      console.log('Images array:', data.images);
      console.log('Count:', data.count);
      console.log('Full data:', JSON.stringify(data, null, 2));
      
      // Clear timeout if socket event arrived
      if (this.socketTimeoutId) {
        clearTimeout(this.socketTimeoutId);
        this.socketTimeoutId = null;
        console.log('✅ Socket timeout cleared - event arrived in time');
      }
      
      if (!data.images || data.images.length === 0) {
        console.warn('⚠️ No images in gallery_update data');
        return;
      }
      
      console.log('✅ Setting gallery items:', data.images.length);
      
      // Reset ready items when new items arrive
      this.setState({
        galleryItems: data.images,
        readyItems: new Set(),
        isLoading: true,
        error: null
      }, () => {
        console.log('✅ Gallery state updated with', data.count, 'items');
        console.log('Current gallery items:', this.state.galleryItems);
      });
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    // Log all events for debugging
    const originalOn = this.socket.on.bind(this.socket);
    this.socket.on = function(event, handler) {
      if (!['connect', 'disconnect', 'error'].includes(event)) {
        console.log(`📢 Socket listener attached for event: ${event}`);
      }
      return originalOn(event, handler);
    };

    console.log('✅ Socket listener setup complete');
  };

  handleItemReady = (fileId, isReady) => {
    console.log(`📦 Item ready status - fileId: ${fileId}, ready: ${isReady}`);
    
    this.setState(prevState => {
      const newReadyItems = new Set(prevState.readyItems);
      
      if (isReady) {
        newReadyItems.add(fileId);
      } else {
        newReadyItems.delete(fileId);
      }
      
      // Show spinner until ALL items are ready
      const allReady = newReadyItems.size === prevState.galleryItems.length && prevState.galleryItems.length > 0;
      
      console.log(`✅ Ready items: ${newReadyItems.size}/${prevState.galleryItems.length} - All ready: ${allReady}`);
      
      return {
        readyItems: newReadyItems,
        isLoading: !allReady
      };
    });
  };

  fetchGalleryImages = async () => {
    try {
      this.setState({ isLoading: true, error: null });
      
      console.log('📸 Fetching gallery images and videos...');
      
      const images = await apiService.getGalleryImages();
      
      console.log('✅ Gallery fetch response received');
      console.log('Items type:', typeof images);
      console.log('Items count:', images ? images.length : 0);
      
      if (images && images.length > 0) {
        console.log(`✓ Found ${images.length} media items`);
        images.forEach((img, idx) => {
          console.log(`Item ${idx + 1}:`, { 
            id: img.id, 
            title: img.title, 
            mimeType: img.mimeType,
            hasMimeType: !!img.mimeType,
            isVideo: img.mimeType?.startsWith('video/')
          });
        });
        
        this.setState({ 
          galleryItems: images,
          readyItems: new Set(),
          isLoading: true,
          error: null
        });
      } else {
        console.warn('⚠️ No media found in gallery');
        this.setState({ 
          galleryItems: [],
          isLoading: false,
          error: 'No media found'
        });
      }
    } catch (error) {
      console.error('❌ Error fetching gallery images:', error);
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
    const { galleryItems, readyItems, isLoading, error, currentPage, itemsPerPage } = this.state;
    
    console.log('🎨 GALLERY RENDER:', {
      itemsCount: galleryItems.length,
      readyCount: readyItems.size,
      isLoading,
      error,
      currentPage
    });
    
    // Calculate pagination
    const totalPages = Math.ceil(galleryItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = galleryItems.slice(startIndex, endIndex);
    
    // Filter to show only ready items
    const readyItems_list = paginatedItems.filter(item => readyItems.has(item.id));
    
    console.log('📊 PAGINATION:', { totalPages, startIndex, endIndex, paginatedItems: paginatedItems.length, readyItems: readyItems_list.length });

    return (
      <section className="gallery-wrapper">
        <div className="gallery-header-section">
          <h2 className="gallery-main-title">Gallery</h2>
          <p className="gallery-main-subtitle">Explore conservation efforts and captured moments</p>
        </div>

        <div>
          <div className="gallery-items-grid">
              {paginatedItems.map((item, index) => {
                return (
                  <div 
                    key={item.id || index} 
                    className="gallery-card-item"
                  >
                    <StreamImage 
                      fileId={item.id} 
                      title={item.title} 
                      alt={item.alt}
                      mimeType={item.mimeType}
                      onImageClick={this.handleImageClick}
                      onItemReady={this.handleItemReady}
                    />
                  </div>
                );
              })}
              {readyItems_list.length === 0 && isLoading && (
                <div className="gallery-loading-state">
                  <div className="gallery-spinner"></div>
                  <p>Loading gallery</p>
                </div>
              )}
              {!isLoading && galleryItems.length === 0 && !error && (
                <div className="gallery-empty-state">
                  <p>No media is found in gallery</p>
                </div>
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
