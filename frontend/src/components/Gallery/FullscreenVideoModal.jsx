// FullscreenVideoModal overlays poster image until video plays, mimicking React Native poster/cover
import React from 'react';

class FullscreenVideoModal extends React.Component {
  constructor(props) {
    super(props);
    this.state = { showPoster: true };
    this.videoRef = React.createRef();
    this.handlePlay = this.handlePlay.bind(this);
    this.handlePause = this.handlePause.bind(this);
  }

  handlePlay() {
    this.setState({ showPoster: false });
  }

  handlePause() {
    this.setState({ showPoster: true });
  }

  render() {
    const { media, onClose } = this.props;
    const { showPoster } = this.state;
    const isVideo = media.type === 'video';
    const posterUrl = media.thumbnailUrl || media.url;
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(30,41,59,0.12)',
        }}
        onClick={onClose}
      >
        <div
          id="gallery-popup-media"
          style={{
            position: 'relative',
            background: '#fff',
            borderRadius: 18,
            boxShadow: '0 8px 32px 0 rgba(30,41,59,0.18)',
            padding: 0,
            maxWidth: isVideo ? 640 : 520,
            width: '90vw',
            maxHeight: '70vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: -32,
              right: 0,
              background: 'none',
              border: 'none',
              fontSize: '2.2rem',
              color: '#222',
              cursor: 'pointer',
              zIndex: 10,
              width: 40,
              height: 40,
              lineHeight: '40px',
              textAlign: 'center',
              boxShadow: 'none',
              borderRadius: 0,
              padding: 0,
            }}
            aria-label="Close"
          >×</button>

          {/* WWF logo */}
          <div style={{
            width: 80,
            height: 80,
            margin: '0 auto 10px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <img
              src="/WWF Logo/WWF Logo Large.jpg"
              alt="WWF Logo"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 0,
                background: 'none',
                boxShadow: 'none',
              }}
            />
          </div>

          {/* Media area */}
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isVideo ? '#000' : '#fff',
            borderRadius: 0,
            boxShadow: 'none',
            padding: 0,
            position: 'relative',
          }}>
            {isVideo ? (
              <div style={{width: '100%', height: '56vh', position: 'relative'}}>
                <video
                  ref={this.videoRef}
                  src={media.url}
                  poster={posterUrl}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: 0,
                    background: '#fff',
                    boxShadow: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'block',
                  }}
                  controls
                  onPlay={this.handlePlay}
                  onPause={this.handlePause}
                  id="gallery-popup-video"
                />
                {showPoster && (
                  <img
                    src={posterUrl}
                    alt="Video poster"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: 0,
                      background: '#000',
                      zIndex: 2,
                      pointerEvents: 'none',
                      transition: 'opacity 0.3s',
                      opacity: showPoster ? 1 : 0,
                    }}
                  />
                )}
              </div>
            ) : (
              <img
                src={media.url}
                alt="Gallery media"
                style={{
                  width: '100%',
                  height: '56vh',
                  objectFit: 'contain',
                  borderRadius: 0,
                  background: '#fff',
                  boxShadow: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'block',
                }}
                id="gallery-popup-img"
              />
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default FullscreenVideoModal;
