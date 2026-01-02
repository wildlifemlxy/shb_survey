import React from 'react';
import './FullScreenMediaViewer.css';

const FullScreenMediaViewer = ({ isOpen, imageData, onClose, galleryFiles = [] }) => {
  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [displayedMedia, setDisplayedMedia] = React.useState(imageData);
  const [videoThumbnails, setVideoThumbnails] = React.useState({});
  const [freshVideoSource, setFreshVideoSource] = React.useState(null);
  const [freshImageSource, setFreshImageSource] = React.useState(null);
  const [isVideoReady, setIsVideoReady] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const videoRef = React.useRef(null);

  const currentMedia = displayedMedia || imageData;
  const isVideo = currentMedia?.isVideo || currentMedia?.mimeType?.startsWith('video/');
  const videoSource = freshVideoSource || currentMedia?.src || currentMedia?.blobUrl;
  const imageSource = freshImageSource || currentMedia?.src || currentMedia?.blobUrl;

  // Reset video ready state when media changes
  React.useEffect(() => {
    setIsVideoReady(false);
    setFreshVideoSource(null);
    setFreshImageSource(null);
    setImageError(false);
    if (isOpen && isVideo) {
      setIsLoading(true);
    }
  }, [currentMedia?.fileId, isOpen, isVideo]);

  // Force video ready after timeout if events don't fire
  React.useEffect(() => {
    let forceReadyTimeout;
    
    if (isOpen && isVideo && !isVideoReady && videoSource) {
      console.log('⏰ Starting force-ready timeout for video:', currentMedia?.fileId);
      
      forceReadyTimeout = setTimeout(() => {
        console.log('⏰ Force-ready timeout triggered - forcing video ready state');
        setIsVideoReady(true);
        setIsLoading(false);
        
        // Try to play if video element exists and has source
        if (videoRef.current) {
          console.log('⏰ Attempting play after force-ready');
          videoRef.current.play().catch(err => {
            console.log('⏰ Auto-play after force-ready failed (user interaction required):', err.message);
          });
        }
      }, 3000); // Force ready after 3 seconds
    }
    
    return () => {
      if (forceReadyTimeout) {
        clearTimeout(forceReadyTimeout);
      }
    };
  }, [isOpen, isVideo, isVideoReady, videoSource, currentMedia?.fileId]);

  // Update video source when videoSource changes
  React.useEffect(() => {
    if (videoRef.current && isVideo && videoSource) {
      console.log('🎥 Setting video source:', videoSource.substring(0, 80), 'Type:', currentMedia?.mimeType);
      
      try {
        // Remove only source elements, not all children (which would remove text nodes)
        const sources = videoRef.current.querySelectorAll('source');
        sources.forEach(source => source.remove());
        
        // Create and append source element
        const sourceElement = document.createElement('source');
        sourceElement.src = videoSource;
        sourceElement.type = currentMedia?.mimeType || 'video/mp4';
        
        videoRef.current.appendChild(sourceElement);
        console.log('🎥 Source element added, calling load()');
        videoRef.current.load();
        console.log('🎥 Video load() called');
        
        // Try to play after a short delay to ensure video is loaded
        const playTimeout = setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            console.log('🎥 Attempting to play video');
            videoRef.current.play().catch(err => {
              console.log('⏸️ Play attempt failed:', err.message);
            });
          }
        }, 500);
        
        return () => clearTimeout(playTimeout);
      } catch (error) {
        console.error('❌ Error setting video source:', error);
      }
    }
  }, [videoSource, isVideo, currentMedia?.mimeType]);

  React.useEffect(() => {
    if (isVideo && !videoSource) {
      console.warn('⚠️ Video selected but no video source available:', {
        currentMediaFileId: currentMedia?.fileId,
        hasSrc: !!currentMedia?.src,
        hasBlobUrl: !!currentMedia?.blobUrl,
        allProperties: Object.keys(currentMedia || {})
      });
    }
  }, [isVideo, videoSource, currentMedia]);

  // Fetch fresh blob if video fails
  const handleVideoError = async () => {
    if (!freshVideoSource && currentMedia?.fileId && isOpen) {
      console.log('🔄 Video source failed, attempting to fetch fresh blob for:', currentMedia.fileId);
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
          console.log('✅ Fresh blob created:', newBlobUrl.substring(0, 80), 'MimeType:', blob.type);
          setFreshVideoSource(newBlobUrl);
        }
      } catch (error) {
        console.error('❌ Failed to fetch fresh blob:', error);
      }
    }
  };

  // Pre-fetch fresh blob on component mount or when video changes
  React.useEffect(() => {
    if (isOpen && isVideo && currentMedia?.fileId && !freshVideoSource) {
      console.log('📥 Pre-fetching fresh blob for video:', currentMedia.fileId);
      (async () => {
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
            console.log('✅ Fresh blob created successfully:', newBlobUrl.substring(0, 80));
            console.log('✅ Blob type:', blob.type, 'Size:', blob.size);
            setFreshVideoSource(newBlobUrl);
          } else {
            console.error('❌ Failed to fetch blob, status:', response.status);
          }
        } catch (error) {
          console.error('❌ Error fetching fresh blob:', error.message);
        }
      })();
    }
  }, [currentMedia?.fileId, isOpen, isVideo]);

  // Pre-fetch fresh blob for images when source is not available or on error
  React.useEffect(() => {
    const shouldFetchImage = isOpen && !isVideo && currentMedia?.fileId && 
      (!imageSource || imageError);
    
    if (shouldFetchImage) {
      console.log('📥 Pre-fetching fresh blob for image:', currentMedia.fileId);
      (async () => {
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
            console.log('✅ Fresh image blob created:', newBlobUrl.substring(0, 80));
            console.log('✅ Image blob type:', blob.type, 'Size:', blob.size);
            setFreshImageSource(newBlobUrl);
            setImageError(false);
          } else {
            console.error('❌ Failed to fetch image blob, status:', response.status);
          }
        } catch (error) {
          console.error('❌ Error fetching image blob:', error.message);
        }
      })();
    }
  }, [currentMedia?.fileId, isOpen, isVideo, imageSource, imageError]);

  // Handle image load error - trigger fresh blob fetch
  const handleImageError = () => {
    console.log('❌ Image failed to load, will fetch fresh blob:', currentMedia?.fileId);
    setImageError(true);
  };

  React.useEffect(() => {
    if (isOpen) {
      console.log('📽️ FullScreenMediaViewer opened with:', {
        currentMediaFileId: currentMedia?.fileId,
        currentMediaTitle: currentMedia?.title,
        originalVideoSource: currentMedia?.src?.substring(0, 80),
        usingFreshBlob: !!freshVideoSource,
        finalVideoSource: videoSource?.substring(0, 80),
        isVideo,
        mimeType: currentMedia?.mimeType,
        galleryFilesCount: galleryFiles.length
      });
    }
  }, [isOpen, currentMedia, galleryFiles, freshVideoSource]);

  // Generate video thumbnails from middle frame
  React.useEffect(() => {
    const generateThumbnails = () => {
      for (const file of galleryFiles) {
        const fileId = file.id || file.fileId;
        // Use blobUrl first, then src as fallback
        const videoSrc = file.blobUrl || file.src;
        
        if (file.isVideo && videoSrc && !videoThumbnails[fileId]) {
          try {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.src = videoSrc;
            
            console.log(`🎬 Generating thumbnail for: ${file.title}, src: ${videoSrc?.substring(0, 50)}...`);
            
            let timeoutId;
            let seekAttempts = 0;
            
            video.onloadedmetadata = () => {
              clearTimeout(timeoutId);
              try {
                console.log(`✅ Video metadata loaded for: ${file.title}, duration: ${video.duration}s`);
                // Seek to 1 second or middle, whichever is available
                const seekTime = Math.min(1, video.duration / 2);
                video.currentTime = seekTime;
              } catch (err) {
                console.error('Error seeking video:', err);
              }
            };
            
            video.onseeked = () => {
              try {
                console.log(`✅ Video seeked for: ${file.title}`);
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 120;
                canvas.height = video.videoHeight || 70;
                const ctx = canvas.getContext('2d');
                if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
                  ctx.drawImage(video, 0, 0);
                  const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
                  
                  console.log(`✅ Thumbnail generated for: ${file.title}`);
                  setVideoThumbnails(prev => ({
                    ...prev,
                    [fileId]: thumbnailUrl
                  }));
                }
              } catch (err) {
                console.error('Error drawing video frame:', err);
              }
            };
            
            video.onerror = (e) => {
              clearTimeout(timeoutId);
              console.error('Error loading video for thumbnail:', file.title, videoSrc, e);
            };
            
            // Timeout after 5 seconds
            timeoutId = setTimeout(() => {
              console.warn('Video thumbnail generation timeout for:', file.title);
            }, 5000);
            
          } catch (error) {
            console.error('Error generating thumbnail:', error);
          }
        }
      }
    };
    
    if (isOpen && galleryFiles.length > 0) {
      console.log('🎬 Generating thumbnails for', galleryFiles.length, 'files');
      generateThumbnails();
    }
  }, [isOpen, galleryFiles]);

  // Update current index when imageData changes
  React.useEffect(() => {
    if (imageData && galleryFiles.length > 0) {
      const index = galleryFiles.findIndex(file => file.fileId === imageData.fileId || file.id === imageData.fileId);
      setCurrentIndex(index >= 0 ? index : 0);
      setDisplayedMedia(imageData);
    }
  }, [imageData, galleryFiles]);

  const handleThumbnailClick = (file, index) => {
    setCurrentIndex(index);
    // Update the displayed media
    const updatedImageData = {
      ...file,
      fileId: file.fileId || file.id,
      title: file.title,
      src: file.blobUrl || file.src,
      mimeType: file.mimeType,
      isVideo: file.isVideo
    };
    setDisplayedMedia(updatedImageData);
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

  // Check if image is loading (no source yet or error occurred and fetching new one)
  const isImageLoading = !isVideo && (!imageSource || (imageError && !freshImageSource));

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
            {isImageLoading && (
              <div style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'white',
                gap: '16px'
              }}>
                <div className="gallery-spinner" style={{ width: '48px', height: '48px' }}></div>
                <span>Loading image...</span>
              </div>
            )}
            {isVideo ? (        
              <video 
                ref={videoRef}
                controls 
                playsinline
                preload="auto"
                className="fullscreen-media-video"
                controlsList="nodownload"
                onLoadStart={() => {
                  console.log('📺 Video loading started');
                  setIsLoading(true);
                }}
                onLoadedMetadata={() => {
                  console.log('📺✅ Video metadata loaded! Duration:', videoRef.current?.duration);
                  setIsLoading(false);
                  setIsVideoReady(true);
                }}
                onCanPlay={() => {
                  console.log('✅ Video CAN NOW PLAY - play button is now enabled!');
                  setIsVideoReady(true);
                  setIsLoading(false);
                }}
                onPlay={() => {
                  console.log('🎉 VIDEO IS NOW PLAYING!');
                  setIsLoading(false);
                }}
                onError={(e) => {
                  const errorCode = e.target.error?.code;
                  const errorMessage = e.target.error?.message;
                  console.error('❌ VIDEO ERROR:', { errorCode, errorMessage, media: currentMedia?.fileId });
                  
                  // Error codes: 1=MEDIA_ERR_ABORTED, 2=MEDIA_ERR_NETWORK, 3=MEDIA_ERR_DECODE, 4=MEDIA_ERR_SRC_NOT_SUPPORTED
                  if (errorCode === 4) {
                    console.error('❌ Source not supported - trying fresh blob');
                    handleVideoError();
                  } else if (errorCode === 2) {
                    console.error('❌ Network error - retrying fresh blob');
                    handleVideoError();
                  } else if (errorCode === 3) {
                    console.error('❌ Decode error - video format may be unsupported');
                  }
                }}
                onDurationChange={() => {
                  console.log('⏱️ Duration:', videoRef.current?.duration);
                }}
                onProgress={() => {
                  if (videoRef.current?.buffered.length > 0) {
                    const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
                    const duration = videoRef.current.duration;
                    if (duration > 0) {
                      const percentBuffered = (bufferedEnd / duration) * 100;
                      if (percentBuffered === 100) {
                        console.log('✅ Video fully buffered');
                      }
                    }
                  }
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : !isImageLoading && imageSource ? (
              <img 
                src={imageSource} 
                alt={currentMedia?.title}
                className="fullscreen-media-image"
                draggable={false}
                key={`${currentMedia?.fileId}-${imageSource}`}
                onError={handleImageError}
                onLoad={() => {
                  console.log('✅ Image loaded successfully:', currentMedia?.title);
                  setImageError(false);
                }}
              />
            ) : null}
          </div>
          
          <div className="fullscreen-media-footer">
            {galleryFiles.length > 0 && (
              <div className="fullscreen-media-filmstrip">
                {galleryFiles.map((file, index) => {
                  const fileId = file.id || file.fileId;
                  const videoThumbnail = videoThumbnails[fileId];
                  
                  return (
                    <div 
                      key={fileId || index}
                      className={`filmstrip-thumbnail ${index === currentIndex ? 'active' : ''}`}
                      onClick={() => handleThumbnailClick(file, index)}
                      title={file.title}
                    >
                      {file.isVideo ? (
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
                      ) : (
                        <img 
                          src={file.blobUrl || file.src} 
                          alt={file.title}
                          className="filmstrip-thumbnail-img"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FullScreenMediaViewer;
