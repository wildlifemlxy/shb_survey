import React from 'react';
import io from 'socket.io-client';
import apiService from '../../services/apiServices';
import '../../css/components/Gallery/Gallery.css';

// Component to stream and display images and videos
const StreamImage = ({ fileId, title, alt, mimeType, onImageClick, onItemReady, onMediaSourceReady, onSelectToggle, isSelectMode, isVisible = true }) => {
  const [mediaSrc, setMediaSrc] = React.useState(null);
  const [error, setError] = React.useState(false);
  const [mediaType, setMediaType] = React.useState(null);
  const [isReady, setIsReady] = React.useState(false);
  const [hasStartedLoading, setHasStartedLoading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [canDisplay, setCanDisplay] = React.useState(false);
  const [videoThumbnail, setVideoThumbnail] = React.useState(null);
  const readyTimeoutRef = React.useRef(null);
  const delayTimeoutRef = React.useRef(null);
  const containerRef = React.useRef(null);
  
  console.log(`🎬 StreamImage: ${title}`, { fileId, mimeType, mediaType, mediaSrc: !!mediaSrc, isReady, canDisplay });
  
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
      // Load all files simultaneously - don't wait for visibility
      if (hasStartedLoading) {
        console.log(`📍 [${fileId}] Already loading. hasStartedLoading: ${hasStartedLoading}`);
        return;
      }
      
      console.log(`📥 [${fileId}] Streaming ${mediaType}...`);
      
      if (!fileId || !mediaType) {
        console.warn(`❌ [${fileId}] Missing fileId or mediaType`);
        return;
      }
      
      // Reset progress to 0% when starting
      setDownloadProgress(0);
      setHasStartedLoading(true); // Mark that we've started loading
      
      try {
        console.log(`📥 [${fileId}] Calling apiService.streamImage...`);
        const blob = await apiService.streamImage(fileId, (progress) => {
          console.log(`📊 [${fileId}] Progress update: ${progress}%`);
          setDownloadProgress(progress);
        });
        console.log(`📥 [${fileId}] Got blob response:`, { blob, blobType: typeof blob, blobConstructor: blob?.constructor?.name, blobSize: blob?.size });
        
        if (!blob) {
          console.error(`❌ [${fileId}] Blob is null/undefined`);
          setError(true);
          if (onItemReady) onItemReady(fileId, false);
          return;
        }
        
        if (blob.size === 0) {
          console.error(`❌ [${fileId}] Empty blob, size is 0`);
          setError(true);
          if (onItemReady) onItemReady(fileId, false);
          return;
        }
        
        console.log(`✅ [${fileId}] Creating object URL from blob (${blob.size} bytes)...`);
        const url = URL.createObjectURL(blob);
        console.log(`✅ [${fileId}] Object URL created: ${url}`);
        console.log(`✅ [${fileId}] Setting mediaSrc to URL...`);
        
        setMediaSrc(url);
        
        // Notify parent component of media source
        if (onMediaSourceReady) {
          onMediaSourceReady(fileId, url);
        }
        
        console.log(`✅ [${fileId}] mediaSrc state updated`);
        
        // Generate video thumbnail if it's a video
        if (mediaType === 'video' || mimeType?.startsWith('video/')) {
          console.log(`📹 [${fileId}] Generating video thumbnail from middle frame...`);
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
            setVideoThumbnail(thumbnailUrl);
            console.log(`✅ [${fileId}] Video thumbnail (middle frame) generated`);
          };
          video.src = url;
        }
        
        // Mark ready immediately after blob is ready, or after short timeout
        const timeoutDuration = 5000; // Increased to 5 seconds for videos
        console.log(`⏰ [${fileId}] Setting timeout of ${timeoutDuration}ms...`);
        readyTimeoutRef.current = setTimeout(() => {
          console.warn(`⏰ [${fileId}] Timeout - forcing ready`);
          setIsReady(true);
          if (onItemReady) onItemReady(fileId, true);
        }, timeoutDuration);
        
      } catch (err) {
        console.error(`❌ [${fileId}] Stream error:`, err.message);
        console.error(`❌ [${fileId}] Full error:`, err);
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
  }, [fileId, mediaType, onItemReady, isVisible, hasStartedLoading]);

  // Handle 0.25-second delay when download reaches 100%
  React.useEffect(() => {
    if (downloadProgress === 100 && mediaSrc && !canDisplay) {
      console.log(`⏱️ [${fileId}] Download complete (100%) - starting 0.25 second delay before display`);
      delayTimeoutRef.current = setTimeout(() => {
        console.log(`✅ [${fileId}] 0.25 second delay complete - allowing display`);
        setCanDisplay(true);
      }, 250);
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
    };
  }, [downloadProgress, mediaSrc, canDisplay, fileId]);

  if (error) {
    return (
      <div className="gallery-img-unavailable">
        <span className="gallery-text-muted">⚠ Failed</span>
      </div>
    );
  }

  // Show media only when mediaSrc exists AND download is 100% complete AND 2 second delay passed
  if (mediaSrc && downloadProgress === 100 && canDisplay) {
    console.log(`🎨 [${fileId}] RENDERING ${mediaType?.toUpperCase()}: ${title} (Progress: ${downloadProgress}%, Delay Complete: ${canDisplay})`);
    
    return mediaType === 'video' ? (
      <img 
        src={videoThumbnail || mediaSrc} 
        alt={alt || title || 'Video thumbnail'} 
        className="gallery-img"
        onClick={() => {
          if (isSelectMode) {
            if (onSelectToggle) onSelectToggle();
          } else {
            if (onImageClick) {
              onImageClick({ fileId, title, src: mediaSrc, isVideo: true, mimeType });
            }
          }
        }}
        onError={() => {
          console.error(`❌ [${fileId}] Thumbnail error`);
          setError(true);
        }}
        onLoad={() => {
          console.log(`✅ [${fileId}] THUMBNAIL loaded - marking as ready`);
          clearTimeout(readyTimeoutRef.current);
          setIsReady(true);
          if (onItemReady) onItemReady(fileId, true);
        }}
        title="Click to view video"
        style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }}
      />
    ) : (
      <img 
        src={mediaSrc} 
        alt={alt || title || 'Gallery item'} 
        className="gallery-img"
        onClick={() => {
          if (isSelectMode) {
            if (onSelectToggle) onSelectToggle();
          } else {
            if (onImageClick) {
              onImageClick({ fileId, title, src: mediaSrc, mimeType });
            }
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

  // Still loading/waiting - show spinner as progress indicator
  console.log(`⏳ [${fileId}] Loading state - mediaSrc: ${!!mediaSrc}, isReady: ${isReady}, progress: ${downloadProgress}%`);
  
  // Determine loading message based on progress
  let loadingMessage = 'Loading';
  if (downloadProgress === 0) {
    loadingMessage = 'Starting...';
  } else if (downloadProgress < 100) {
    loadingMessage = `Loading... ${downloadProgress}%`;
  }
  
  return (
    <div className="gallery-img-loading">
      <span className="gallery-loading-label">{loadingMessage}</span>
      <div className="gallery-spinner-progress" style={{ '--progress': downloadProgress }}>
        <div className="gallery-spinner-small"></div>
      </div>
      <span className="gallery-progress-text">{downloadProgress}%</span>
    </div>
  );
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
      itemsPerPage: 12,
      visibleItems: new Set(), // Track which items are visible
      selectedItems: new Set(), // Track selected items for bulk delete
      isSelectMode: false, // Toggle between select and normal mode
      isDeleting: false, // Track if deletion is in progress
      mediaSrcMap: {}, // Map of fileId -> mediaSrc (blob URL)
      mediaFilter: 'All' // Filter: 'All', 'Videos', 'Photos'
    };
    this.intersectionObserver = null;
  }

  componentDidMount() {
    this.setupSocketListener();
    
    // Setup Intersection Observer for lazy loading
    this.intersectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const fileId = entry.target.dataset.fileId;
          if (entry.isIntersecting) {
            this.setState((prevState) => ({
              visibleItems: new Set([...prevState.visibleItems, fileId])
            }));
            console.log(`👁️ Item visible: ${fileId}`);
          } else {
            this.setState((prevState) => {
              const newVisible = new Set(prevState.visibleItems);
              newVisible.delete(fileId);
              return { visibleItems: newVisible };
            });
          }
        });
      },
      { threshold: 0.1 } // Start loading when 10% visible
    );
    
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

    this.socket.on('image_uploaded', (newImageData) => {
      console.log('🎉 New image uploaded event received:', newImageData);
      
      // Add new image to the beginning of gallery
      this.setState(prevState => ({
        galleryItems: [newImageData, ...prevState.galleryItems]
      }));
      
      console.log('✓ Gallery updated with new image');
    });

    this.socket.on('image_deleted', (data) => {
      const fileId = data?.fileId || data;
      console.log('🗑️ Image deleted event received:', fileId);
      
      // Remove image from gallery and clean up readyItems
      this.setState(prevState => {
        const newReadyItems = new Set(prevState.readyItems);
        newReadyItems.delete(fileId);
        
        return {
          galleryItems: prevState.galleryItems.filter(item => item.id !== fileId),
          readyItems: newReadyItems
        };
      });
      
      console.log('✓ Gallery updated - image removed');
    });

    this.socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

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

  handleMediaSourceReady = (fileId, mediaSrc) => {
    console.log(`📸 Media source ready for ${fileId}:`, mediaSrc);
    
    this.setState(prevState => ({
      mediaSrcMap: {
        ...prevState.mediaSrcMap,
        [fileId]: mediaSrc
      }
    }));
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
          error: null
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
      // Get all gallery items with their blob URLs from mediaSrcMap
      const galleryWithSrc = this.state.galleryItems.map(item => ({
        ...item,
        blobUrl: this.state.mediaSrcMap[item.id] || item.src,
        isVideo: item.mimeType?.startsWith('video/')
      }));
      console.log('📸 handleImageClick called with:', {
        clickedFileId: imageData.fileId,
        clickedTitle: imageData.title,
        galleryLength: galleryWithSrc.length,
        galleryIds: galleryWithSrc.map((g, i) => ({ index: i, id: g.id, title: g.title }))
      });
      this.props.onImageClick(imageData, galleryWithSrc);
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
    const { currentPage, itemsPerPage } = this.state;
    const filteredItems = this.getFilteredItems();
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    if (currentPage < totalPages) {
      this.setState({ currentPage: currentPage + 1 });
    }
  };
  toggleSelectMode = () => {
    this.setState(prevState => ({
      isSelectMode: !prevState.isSelectMode,
      selectedItems: new Set() // Clear selection when toggling mode
    }));
  };

  toggleItemSelection = (fileId) => {
    this.setState(prevState => {
      const newSelectedItems = new Set(prevState.selectedItems);
      if (newSelectedItems.has(fileId)) {
        newSelectedItems.delete(fileId);
      } else {
        newSelectedItems.add(fileId);
      }
      return { selectedItems: newSelectedItems };
    });
  };

  selectAll = () => {
    const { galleryItems } = this.state;
    
    this.setState(prevState => {
      const newSelectedItems = new Set(prevState.selectedItems);
      galleryItems.forEach(item => newSelectedItems.add(item.id));
      return { 
        selectedItems: newSelectedItems,
        isSelectMode: true
      };
    });
  };

  deselectAll = () => {
    this.setState({ selectedItems: new Set() });
  };

  setMediaFilter = (filter) => {
    // Just change the filter and reset page, don't reload media
    this.setState({ 
      mediaFilter: filter, 
      currentPage: 1 
    });
  };

  getFilteredItems = () => {
    const { galleryItems, mediaFilter } = this.state;
    
    if (mediaFilter === 'Videos') {
      return galleryItems.filter(item => item.mimeType && item.mimeType.startsWith('video/'));
    } else if (mediaFilter === 'Photos') {
      return galleryItems.filter(item => item.mimeType && item.mimeType.startsWith('image/'));
    }
    return galleryItems;
  };

  bulkDelete = () => {
    const { selectedItems, galleryItems, mediaSrcMap } = this.state;
    
    if (selectedItems.size === 0) {
      alert('Please select at least one item to delete');
      return;
    }

    // Map selected IDs to full item objects with mediaSrc
    const filesToDelete = galleryItems
      .filter(item => selectedItems.has(item.id))
      .map(item => ({
        ...item,
        src: mediaSrcMap[item.id] || item.src // Use blob URL from map if available
      }));

    if (this.props.onOpenDeleteModal) {
      this.props.onOpenDeleteModal(filesToDelete);
      
      // Exit selection mode and clear selections after initiating delete
      this.setState({
        isSelectMode: false,
        selectedItems: new Set()
      });
    }
  };
  render() {
    const { galleryItems, readyItems, isLoading, error, currentPage, itemsPerPage, isSelectMode, selectedItems, isDeleting, mediaFilter } = this.state;
    
    // Get filtered items
    const filteredItems = this.getFilteredItems();
    
    console.log('🎨 GALLERY RENDER:', {
      itemsCount: galleryItems.length,
      filteredCount: filteredItems.length,
      filter: mediaFilter,
      readyCount: readyItems.size,
      isLoading,
      error,
      currentPage
    });
    
    // Calculate pagination based on filtered items
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    // Filter to show only ready items
    return (
      <>
        <section className="gallery-wrapper">
        <div className="gallery-header-section">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', flexDirection: 'column', position: 'relative' }}>
            <div style={{ textAlign: 'center' }}>
              <h2 className="gallery-main-title">Gallery</h2>
              <p className="gallery-main-subtitle">Explore conservation efforts and captured moments</p>
            </div>
            {/* Buttons hidden before login */}
            {localStorage.getItem('userRole') && (
              <div style={{ display: 'flex', gap: '8px', position: 'absolute', right: '0', top: '0' }}>
                <button
                  onClick={this.selectAll}
                  style={{
                    padding: '8px 16px',
                    background: '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  title="Select all items in gallery"
                >
                  ✓ Select All
                </button>
                <button
                  onClick={this.deselectAll}
                  style={{
                    padding: '8px 16px',
                    background: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  title="Deselect all items in gallery"
                >
                  ✗ Deselect All
                </button>
                <button
                  onClick={this.bulkDelete}
                  disabled={selectedItems.size === 0 || isDeleting}
                  style={{
                    padding: '8px 16px',
                    background: selectedItems.size === 0 ? '#d1d5db' : '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: selectedItems.size === 0 ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  title="Delete selected items"
                >
                  {isDeleting ? '⏳ Deleting...' : '🗑️ Delete Selected'}
                </button>
                <button
                  onClick={this.toggleSelectMode}
                  style={{
                    padding: '8px 16px',
                    background: isSelectMode ? '#ef4444' : '#4f46e5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap'
                  }}
                  title="Toggle selection mode for bulk delete"
                >
                  {isSelectMode ? '✕ Cancel' : '📋 Select'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px', flexWrap: 'wrap' }}>
          {['All', 'Photos', 'Videos'].map((filter) => (
            <button
              key={filter}
              onClick={() => this.setMediaFilter(filter)}
              style={{
                padding: '10px 20px',
                background: mediaFilter === filter ? '#4f46e5' : '#e5e7eb',
                color: mediaFilter === filter ? 'white' : '#374151',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                minWidth: '80px'
              }}
              onMouseEnter={(e) => {
                if (mediaFilter !== filter) {
                  e.target.style.background = '#d1d5db';
                }
              }}
              onMouseLeave={(e) => {
                if (mediaFilter !== filter) {
                  e.target.style.background = '#e5e7eb';
                }
              }}
              title={`Show ${filter === 'All' ? 'all media' : filter.toLowerCase()}`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Selection toolbar */}

        <div>
          <div className="gallery-items-grid">
              {paginatedItems.map((item, index) => {
                const isVisible = this.state.visibleItems.has(item.id);
                const isSelected = selectedItems.has(item.id);
                return (
                  <div 
                    key={item.id || index} 
                    className={`gallery-card-item ${isSelectMode ? 'select-mode' : ''} ${isSelected ? 'selected' : ''}`}
                    data-file-id={item.id}
                    ref={(el) => {
                      if (el && this.intersectionObserver) {
                        this.intersectionObserver.observe(el);
                      }
                    }}
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      borderRadius: '8px'
                    }}
                  >
                    {isSelectMode && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          this.toggleItemSelection(item.id);
                        }}
                        style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        background: isSelected ? '#4f46e5' : 'white',
                        border: '2px solid #4f46e5',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        zIndex: 10,
                        cursor: 'pointer'
                      }}>
                        {isSelected ? '✓' : ''}
                      </div>
                    )}
                    {!isSelectMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (this.props.onOpenDeleteModal) {
                            const { mediaSrcMap } = this.state;
                            const itemWithSrc = {
                              ...item,
                              src: mediaSrcMap[item.id] || item.src
                            };
                            this.props.onOpenDeleteModal([itemWithSrc]);
                          }
                        }}
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '32px',
                          height: '32px',
                          background: 'rgba(239, 68, 68, 0.9)',
                          border: 'none',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          cursor: 'pointer',
                          zIndex: 10,
                          fontSize: '16px',
                          transition: 'all 0.2s ease',
                          opacity: 0,
                          pointerEvents: 'none'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.pointerEvents = 'auto';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0';
                          e.currentTarget.style.pointerEvents = 'none';
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)';
                        }}
                        title="Delete this item"
                      >
                        🗑️
                      </button>
                    )}
                    <StreamImage 
                      fileId={item.id} 
                      title={item.title} 
                      alt={item.alt}
                      mimeType={item.mimeType}
                      onImageClick={this.handleImageClick}
                      onItemReady={this.handleItemReady}
                      onMediaSourceReady={this.handleMediaSourceReady}
                      onSelectToggle={() => this.toggleItemSelection(item.id)}
                      isSelectMode={isSelectMode}
                      isVisible={isVisible}
                    />
                  </div>
                );
              })}
              {galleryItems.length === 0 && isLoading && (
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
            {!isLoading && filteredItems.length > 0 && totalPages > 1 && (
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
      </>
      );
    }
  }
  
  export default Gallery;
