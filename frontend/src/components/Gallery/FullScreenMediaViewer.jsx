import React from 'react';
import './FullScreenMediaViewer.css';

const FullScreenMediaViewer = ({ isOpen, imageData, onClose, galleryFiles = [] }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [displayedMedia, setDisplayedMedia] = React.useState(imageData);
  const [videoThumbnails, setVideoThumbnails] = React.useState({});
  const [freshVideoSource, setFreshVideoSource] = React.useState(null);
  const [freshImageSource, setFreshImageSource] = React.useState(null);
  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [imageError, setImageError] = React.useState(false);
  const [filmstripThumbnails, setFilmstripThumbnails] = React.useState({});
  const [allMediaLoaded, setAllMediaLoaded] = React.useState(false);
  const videoRef = React.useRef(null);

  const currentMedia = displayedMedia || imageData;
  const isVideo = currentMedia?.isVideo || currentMedia?.mimeType?.startsWith('video/');
  const videoSource = freshVideoSource || currentMedia?.src || currentMedia?.blobUrl;
  const imageSource = freshImageSource || currentMedia?.src || currentMedia?.blobUrl;

  // Reset all states when viewer opens and fetch everything at once
  React.useEffect(() => {
    if (!isOpen || !galleryFiles.length) return;
    
    console.log('🔄 Viewer opened - loading all media at once');
    setFilmstripThumbnails({});
    setVideoThumbnails({});
    setFreshVideoSource(null);
    setFreshImageSource(null);
    setAllMediaLoaded(false);
    setIsLoading(true);
    
    const fetchBlob = async (fileId) => {
      const response = await fetch(
        window.location.hostname === 'localhost' 
          ? 'http://localhost:3001/gallery'
          : 'https://shb-backend.azurewebsites.net/gallery',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ purpose: 'stream', fileId })
        }
      );
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      return null;
    };
    
    const generateVideoThumbnail = (videoSrc, fileId) => {
      return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        video.muted = true;
        
        const timeoutId = setTimeout(() => resolve(null), 10000);
        
        video.onloadedmetadata = () => {
          video.currentTime = video.duration / 2;
        };
        
        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 320;
            canvas.height = video.videoHeight || 180;
            const ctx = canvas.getContext('2d');
            if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              clearTimeout(timeoutId);
              resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
              clearTimeout(timeoutId);
              resolve(null);
            }
          } catch (err) {
            clearTimeout(timeoutId);
            resolve(null);
          }
        };
        
        video.onerror = () => {
          clearTimeout(timeoutId);
          resolve(null);
        };
        
        video.src = videoSrc;
      });
    };
    
    const loadAllMedia = async () => {
      const currentFileId = imageData?.fileId;
      const newFilmstripThumbnails = {};
      const newVideoThumbnails = {};
      let mainMediaBlobUrl = null;
      
      // Fetch all blobs in parallel
      const fetchPromises = galleryFiles.map(async (file) => {
        const fileId = file.id || file.fileId;
        const isFileVideo = file.isVideo || file.mimeType?.startsWith('video/');
        
        try {
          const blobUrl = await fetchBlob(fileId);
          if (!blobUrl) return;
          
          // Store for filmstrip
          if (isFileVideo) {
            // Generate video thumbnail from middle frame
            const thumbnail = await generateVideoThumbnail(blobUrl, fileId);
            if (thumbnail) {
              newVideoThumbnails[fileId] = thumbnail;
            }
          } else {
            newFilmstripThumbnails[fileId] = blobUrl;
          }
          
          // If this is the current media, store it for main display
          if (fileId === currentFileId) {
            mainMediaBlobUrl = blobUrl;
          }
        } catch (error) {
          console.error(`Error loading ${file.title}:`, error);
        }
      });
      
      await Promise.all(fetchPromises);
      
      // Update all states at once
      setFilmstripThumbnails(newFilmstripThumbnails);
      setVideoThumbnails(newVideoThumbnails);
      
      if (mainMediaBlobUrl) {
        if (isVideo) {
          setFreshVideoSource(mainMediaBlobUrl);
        } else {
          setFreshImageSource(mainMediaBlobUrl);
        }
      }
      
      setAllMediaLoaded(true);
      setIsLoading(false);
      console.log('✅ All media loaded');
    };
    
    loadAllMedia();
  }, [isOpen, galleryFiles, imageData?.fileId]);

  // Force video ready after timeout if events don't fire
  React.useEffect(() => {
    let forceReadyTimeout;
    
    if (isOpen && isVideo && !isVideoReady && videoSource) {
      forceReadyTimeout = setTimeout(() => {
        setIsVideoReady(true);
        setIsLoading(false);
        
        if (videoRef.current) {
          videoRef.current.play().catch(err => {
            console.log('Auto-play failed:', err.message);
          });
        }
      }, 3000);
    }
    
    return () => {
      if (forceReadyTimeout) {
        clearTimeout(forceReadyTimeout);
      }
    };
  }, [isOpen, isVideo, isVideoReady, videoSource]);

  // Update video source when videoSource changes
  React.useEffect(() => {
    if (videoRef.current && isVideo && videoSource) {
      try {
        const sources = videoRef.current.querySelectorAll('source');
        sources.forEach(source => source.remove());
        
        const sourceElement = document.createElement('source');
        sourceElement.src = videoSource;
        sourceElement.type = currentMedia?.mimeType || 'video/mp4';
        
        videoRef.current.appendChild(sourceElement);
        videoRef.current.load();
        
        const playTimeout = setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(() => {});
          }
        }, 500);
        
        return () => clearTimeout(playTimeout);
      } catch (error) {
        console.error('Error setting video source:', error);
      }
    }
  }, [videoSource, isVideo, currentMedia?.mimeType]);

  // Fetch fresh blob if video fails
  const handleVideoError = async () => {
    if (!freshVideoSource && currentMedia?.fileId && isOpen) {
      try {
        const response = await fetch(
          window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/gallery'
            : 'https://shb-backend.azurewebsites.net/gallery',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              purpose: 'stream',
              fileId: currentMedia.fileId 
            })
          }
        );
        
        if (response.ok) {
          const blob = await response.blob();
          const newBlobUrl = URL.createObjectURL(blob);
          setFreshVideoSource(newBlobUrl);
        }
      } catch (error) {
        console.error('Failed to fetch fresh blob:', error);
      }
    }
  };

  // Handle image load error
  const handleImageError = () => {
    setImageError(true);
  };

  // Update current index when imageData changes
  React.useEffect(() => {
    if (imageData && galleryFiles.length > 0) {
      const index = galleryFiles.findIndex(file => file.fileId === imageData.fileId || file.id === imageData.fileId);
      setCurrentIndex(index >= 0 ? index : 0);
      setDisplayedMedia(imageData);
    }
  }, [imageData, galleryFiles]);

  // Handle thumbnail click - use cached blob from filmstripThumbnails
  const handleThumbnailClick = (file, index) => {
    const fileId = file.fileId || file.id;
    const isFileVideo = file.isVideo || file.mimeType?.startsWith('video/');
    
    setCurrentIndex(index);
    
    // Use the already-fetched blob URL from our cache
    const cachedBlobUrl = isFileVideo ? null : filmstripThumbnails[fileId];
    
    const updatedImageData = {
      ...file,
      fileId: fileId,
      title: file.title,
      src: cachedBlobUrl || file.blobUrl || file.src,
      mimeType: file.mimeType,
      isVideo: isFileVideo
    };
    setDisplayedMedia(updatedImageData);
    
    // Set the fresh source directly from cache
    if (isFileVideo) {
      // For videos, we need to fetch fresh - the thumbnail is just an image
      setFreshVideoSource(null);
      setFreshImageSource(null);
    } else if (cachedBlobUrl) {
      setFreshImageSource(cachedBlobUrl);
      setFreshVideoSource(null);
    }
  };

  const handleOpenInNewTab = async () => {
    try {
      console.log(`📺 Opening full screen in new tab:`, currentMedia.fileId, isVideo ? 'VIDEO' : 'IMAGE');
      
      onClose(); // Close the modal first
      
      // Fetch the blob
      let blobUrl = currentMedia.src;
      let mimeType = currentMedia.mimeType;
      
      // If we don't have a blob URL, fetch it from the backend
      if (!currentMedia.src || !currentMedia.src.startsWith('blob:')) {
        console.log('📥 Fetching blob from backend for:', currentMedia.fileId);
        const response = await fetch(
          window.location.hostname === 'localhost' 
            ? 'http://localhost:3001/gallery'
            : 'https://shb-backend.azurewebsites.net/gallery',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              purpose: 'stream',
              fileId: currentMedia.fileId 
            })
          }
        );
        
        if (!response.ok) throw new Error('Failed to fetch media');
        
        const blob = await response.blob();
        blobUrl = URL.createObjectURL(blob);
        mimeType = blob.type;
      }
      
      if (isVideo) {
        // For videos, create an HTML wrapper with autoplay support
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <title>${currentMedia.title || 'Video'}</title>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                background-color: #000;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: Arial, sans-serif;
              }
              .container {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
              }
              video {
                max-width: 100%;
                max-height: calc(100vh - 40px);
                width: auto;
                height: auto;
              }
              .title {
                color: #fff;
                padding: 10px;
                text-align: center;
                font-size: 14px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="title">${currentMedia.title || 'Video'}</div>
              <video 
                id="mediaVideo"
                controls 
                playsinline
              >
                <source src="${blobUrl}" type="${mimeType || 'video/mp4'}">
                Your browser does not support the video tag.
              </video>
            </div>
            <script>
              // Ensure video controls work
              const video = document.getElementById('mediaVideo');
              
              // Video will only play when user clicks play button
            </script>
          </body>
          </html>
        `;
        
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const htmlBlobUrl = URL.createObjectURL(htmlBlob);
        console.log('🌐 Opening new tab with video player:', htmlBlobUrl);
        window.open(htmlBlobUrl, '_blank');
      } else {
        // For images, open blob URL directly
        console.log('🌐 Opening new tab with blob URL:', blobUrl);
        window.open(blobUrl, '_blank');
      }
      
    } catch (error) {
      console.error('Failed to open full screen:', error);
      alert('Failed to open full screen: ' + error.message);
    }
  };

  // Check if still loading
  const isContentLoading = !allMediaLoaded || isLoading;

  if (!isOpen || !imageData) return null;

  return (
    <div className="fullscreen-media-overlay" onClick={onClose}>
      <div className="fullscreen-media-container" onClick={(e) => e.stopPropagation()}>
        <div className="fullscreen-media-modal">
          <div className="fullscreen-media-header">
            <div style={{ flex: 1 }}></div>
            <button 
              className="fullscreen-media-close-btn"
              onClick={onClose}
              title="Close"
              aria-label="Close fullscreen"
            >
              ✕
            </button>
          </div>
          
          <div className="fullscreen-media-content">
            {isContentLoading ? (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                gap: '16px'
              }}>
                <div className="gallery-spinner" style={{ width: '48px', height: '48px' }}></div>
                <span>Loading...</span>
              </div>
            ) : isVideo ? (        
              <video 
                ref={videoRef}
                controls 
                playsinline
                preload="auto"
                className="fullscreen-media-video"
                controlsList="nodownload"
                onLoadedMetadata={() => {
                  setIsVideoReady(true);
                }}
                onCanPlay={() => {
                  setIsVideoReady(true);
                }}
                onError={(e) => {
                  const errorCode = e.target.error?.code;
                  if (errorCode === 4 || errorCode === 2) {
                    handleVideoError();
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <img 
                src={imageSource} 
                alt={currentMedia?.title}
                className="fullscreen-media-image"
                draggable={false}
                key={`${currentMedia?.fileId}-${imageSource}`}
                onError={handleImageError}
                onLoad={() => {
                  setImageError(false);
                }}
              />
            )}
          </div>
          
          {/* Only show filmstrip when all media is loaded */}
          {allMediaLoaded && (
            <div className="fullscreen-media-footer">
              {galleryFiles.length > 0 && (
                <div className="fullscreen-media-filmstrip">
                  {galleryFiles.map((file, index) => {
                    const fileId = file.id || file.fileId;
                    const videoThumbnail = videoThumbnails[fileId];
                    const imageThumbnail = filmstripThumbnails[fileId];
                    const isFileVideo = file.isVideo || file.mimeType?.startsWith('video/');
                    
                    return (
                      <div 
                        key={fileId || index}
                        className={`filmstrip-thumbnail ${index === currentIndex ? 'active' : ''}`}
                        onClick={() => handleThumbnailClick(file, index)}
                        title={file.title}
                      >
                        {isFileVideo ? (
                          videoThumbnail ? (
                            <img 
                              src={videoThumbnail} 
                              alt={file.title}
                              className="filmstrip-thumbnail-img"
                            />
                          ) : (
                            <div className="filmstrip-thumbnail-video">
                              <span className="video-icon">🎬</span>
                          </div>
                        )
                      ) : imageThumbnail ? (
                        <img 
                          src={imageThumbnail} 
                          alt={file.title}
                          className="filmstrip-thumbnail-img"
                        />
                      ) : (
                        <div className="filmstrip-thumbnail-loading">
                          <span className="loading-icon">⏳</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FullScreenMediaViewer;
