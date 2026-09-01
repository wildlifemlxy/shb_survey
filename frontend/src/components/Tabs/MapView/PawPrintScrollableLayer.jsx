import React, { Component } from 'react';
import PawPrint from './PawPrint';

const PAW_PRINT_SIZE = 44;

class PawPrintScrollableLayer extends Component {
  scrollRef = React.createRef();
  scrollbarRef = React.createRef();
  thumbRef = React.createRef();
  isDraggingScrollbar = false;

  componentDidMount() {
    this.syncScrollbar();
  }

  componentDidUpdate() {
    this.syncScrollbar();
  }

  syncScrollbar = () => {
    const container = this.scrollRef.current;
    const scrollbar = this.scrollbarRef.current;
    const thumb = this.thumbRef.current;
    if (!container || !scrollbar || !thumb) return;

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const trackWidth = scrollbar.clientWidth;
    scrollbar.style.display = maxScroll === 0 ? 'none' : 'block';
    if (maxScroll === 0 || trackWidth === 0) {
      thumb.style.width = '100%';
      thumb.style.left = '0px';
      return;
    }

    const thumbWidth = Math.max(36, (container.clientWidth / container.scrollWidth) * trackWidth);
    const thumbLeft = (container.scrollLeft / maxScroll) * (trackWidth - thumbWidth);
    thumb.style.width = `${thumbWidth}px`;
    thumb.style.left = `${thumbLeft}px`;
  };

  updateScrollFromPointer = (clientX) => {
    const container = this.scrollRef.current;
    const scrollbar = this.scrollbarRef.current;
    if (!container || !scrollbar) return;

    const maxScroll = Math.max(container.scrollWidth - container.clientWidth, 0);
    const trackWidth = scrollbar.clientWidth;
    if (maxScroll === 0 || trackWidth === 0) return;

    const relativeX = Math.min(Math.max(clientX - scrollbar.getBoundingClientRect().left, 0), trackWidth);
    container.scrollLeft = (relativeX / trackWidth) * maxScroll;
    this.syncScrollbar();
  };

  handleScrollbarPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    this.isDraggingScrollbar = true;
    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    this.updateScrollFromPointer(event.clientX);
  };

  handleScrollbarPointerMove = (event) => {
    if (this.isDraggingScrollbar) this.updateScrollFromPointer(event.clientX);
  };

  handleScrollbarPointerUp = (event) => {
    this.isDraggingScrollbar = false;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  render() {
    const { pawCount = 0, observations = [], onPawClick } = this.props;

    if (!pawCount || pawCount <= 0) return null;

    const pawCanvasWidth = Math.max(100, pawCount * 80);

    const pawPrints = Array.from({ length: Math.max(0, pawCount) }).map((__, pawIndex) => {
      const spread = Math.max(1, pawCount - 1);
      const x = pawIndex * (100 / spread);
      const y = 58;

      return (
        <svg
          key={`paw-${pawIndex}`}
          viewBox="-4 -7 11 13"
          role="button"
          tabIndex={0}
          aria-label={`View details for paw ${pawIndex + 1}`}
          onClick={() => onPawClick?.(observations[pawIndex])}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onPawClick?.(observations[pawIndex]);
            }
          }}
          style={{
            position: 'absolute',
            left: `${x}%`,
            top: `${y}%`,
            width: `${PAW_PRINT_SIZE}px`,
            minWidth: `${PAW_PRINT_SIZE}px`,
            height: `${PAW_PRINT_SIZE}px`,
            minHeight: `${PAW_PRINT_SIZE}px`,
            overflow: 'visible',
            cursor: onPawClick ? 'pointer' : 'default',
            transform: `translate(${pawIndex === 0 ? '0%' : '-50%'}, -42%)`,
          }}
        >
          <PawPrint pawIndex={pawIndex} x={0} y={0} scale={1} skew={0} />
        </svg>
      );
    });

    return (
      <>
        <div
          ref={this.scrollRef}
          onScroll={this.syncScrollbar}
          style={{
          position: 'absolute',
          top: 0,
          right: '6%',
          bottom: 0,
          left: '6%',
          zIndex: 2,
          overflowY: 'hidden',
          overflowX: 'auto',
          pointerEvents: 'auto',
          paddingBottom: '16px',
          boxSizing: 'border-box',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ position: 'relative', width: `max(100%, ${pawCanvasWidth}px)`, height: '100%' }}>
            {pawPrints}
          </div>
        </div>
        <div
          ref={this.scrollbarRef}
          onPointerDown={this.handleScrollbarPointerDown}
          onPointerMove={this.handleScrollbarPointerMove}
          onPointerUp={this.handleScrollbarPointerUp}
          onPointerCancel={this.handleScrollbarPointerUp}
          aria-label="Scroll paw prints horizontally"
          role="scrollbar"
          style={{
            position: 'absolute',
            left: '6%',
            right: '6%',
            bottom: 3,
            height: 16,
            zIndex: 4,
            borderRadius: 8,
            background: 'rgba(173, 216, 230, 0.38)',
            border: '2px solid rgba(255, 255, 255, 0.8)',
            boxShadow: 'inset 0 0 0 1px rgba(94, 160, 196, 0.5)',
            cursor: 'ew-resize',
            touchAction: 'none',
          }}
        >
          <div
            ref={this.thumbRef}
            style={{
              position: 'absolute',
              top: 2,
              left: 0,
              width: '100%',
              height: 8,
              borderRadius: 5,
              background: 'linear-gradient(90deg, #dff6ff 0%, #9ad9f7 45%, #6bb9e7 100%)',
              border: '2px solid rgba(255, 255, 255, 0.9)',
              boxShadow: '0 0 0 1px rgba(90, 160, 215, 0.55)',
              pointerEvents: 'none',
            }}
          />
        </div>
      </>
    );
  }
}

export default PawPrintScrollableLayer;
