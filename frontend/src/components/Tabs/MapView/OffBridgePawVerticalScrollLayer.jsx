import React, { Component } from 'react';
import PawPrint from './PawPrint';

class OffBridgePawVerticalScrollLayer extends Component {
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

    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 0);
    const trackHeight = scrollbar.clientHeight || 0;

    scrollbar.style.display = maxScroll === 0 ? 'none' : 'block';

    if (maxScroll === 0 || trackHeight === 0) {
      thumb.style.height = '100%';
      thumb.style.top = '0px';
      return;
    }

    const thumbHeight = Math.max(26, (container.clientHeight / container.scrollHeight) * trackHeight);
    const thumbTop = (container.scrollTop / maxScroll) * (trackHeight - thumbHeight);

    thumb.style.height = `${thumbHeight}px`;
    thumb.style.top = `${thumbTop}px`;
  };

  updateScrollFromPointer = (clientY) => {
    const container = this.scrollRef.current;
    const scrollbar = this.scrollbarRef.current;

    if (!container || !scrollbar) return;

    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 0);
    const trackHeight = scrollbar.clientHeight || 0;

    if (maxScroll === 0 || trackHeight === 0) return;

    const relativeY = Math.min(Math.max(clientY - scrollbar.getBoundingClientRect().top, 0), trackHeight);
    container.scrollTop = (relativeY / trackHeight) * maxScroll;
    this.syncScrollbar();
  };

  handleScrollbarPointerDown = (event) => {
    if (event.button !== 0) return;

    event.preventDefault();
    this.isDraggingScrollbar = true;

    if (event.currentTarget.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }

    this.updateScrollFromPointer(event.clientY);
  };

  handleScrollbarPointerMove = (event) => {
    if (this.isDraggingScrollbar) {
      this.updateScrollFromPointer(event.clientY);
    }
  };

  handleScrollbarPointerUp = (event) => {
    this.isDraggingScrollbar = false;

    if (event.currentTarget.hasPointerCapture && event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  handleWheel = (event) => {
    const container = this.scrollRef.current;
    if (!container) return;

    container.scrollTop += event.deltaY;
  };

  render() {
    const { pawCount = 0, observations = [], onPawClick, side = 'road' } = this.props;

    if (!pawCount || pawCount <= 0) return null;

    const pawCanvasHeight = Math.max(720, pawCount * 110 + 80);
    const laneCenter = side === 'left' ? 28 : side === 'right' ? 72 : 50;
    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
    const seeded = (value) => {
      const x = Math.sin(value * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    const pawPositions = Array.from({ length: pawCount }, (_, index) => {
      const xSeed = seeded(index + 3.14);
      const ySeed = seeded(index + 9.81);
      const xSpread = side === 'road' ? 18 : 14;

      let x = clamp(laneCenter + ((xSeed - 0.5) * xSpread * 2) + (index % 2 === 0 ? 2 : -3), 12, 88);

      if (side === 'road') {
        const bridgeExclusionMin = 38;
        const bridgeExclusionMax = 62;

        if (x > bridgeExclusionMin && x < bridgeExclusionMax) {
          const direction = index % 2 === 0 ? -1 : 1;
          const offset = ((bridgeExclusionMax - bridgeExclusionMin) / 2) + 8;
          x = clamp(x + (direction * offset), 12, 88);
        }
      }

      if (side === 'left') {
        x = clamp(18 + (xSeed * 18), 8, 34);
      }

      if (side === 'right') {
        x = clamp(82 - (xSeed * 18), 66, 92);
      }

      const bridgeBands = [
        { start: 110, end: 280 },
        { start: 440, end: 610 }
      ];

      let y = 70 + (ySeed * (pawCanvasHeight - 180));

      if (side === 'road') {
        let attempts = 0;
        while (bridgeBands.some(band => y >= band.start && y <= band.end) && attempts < 20) {
          const alternateSeed = seeded(index + 21.7 + attempts * 1.13);
          const direction = attempts % 2 === 0 ? 1 : -1;
          const shiftAmount = 120 + (alternateSeed * 160);
          y = clamp(y + (direction * shiftAmount), 80, pawCanvasHeight - 80);
          attempts += 1;
        }
      }

      return { x, y };
    });

    return (
      <>
        <div
          ref={this.scrollRef}
          onScroll={this.syncScrollbar}
          onWheel={this.handleWheel}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 12,
            bottom: 0,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: '16px 12px 18px',
            boxSizing: 'border-box',
            scrollbarWidth: 'none',
            WebkitOverflowScrolling: 'touch',
            zIndex: 4,
            pointerEvents: 'auto',
            background: 'transparent',
          }}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: `${pawCanvasHeight}px`,
              minHeight: '100%',
            }}
          >
            {pawPositions.map((position, index) => (
              <svg
                key={`off-bridge-paw-${side}-${index}`}
                viewBox="-4 -7 11 13"
                role="button"
                tabIndex={0}
                aria-label={`View details for off-bridge sighting ${index + 1}`}
                onClick={() => onPawClick?.(observations[index])}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onPawClick?.(observations[index]);
                  }
                }}
                style={{
                  position: 'absolute',
                  left: `${position.x}%`,
                  top: `${position.y}px`,
                  width: '42px',
                  height: '42px',
                  transform: 'translate(-50%, -50%)',
                  overflow: 'visible',
                  cursor: onPawClick ? 'pointer' : 'default',
                  filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.18))',
                }}
              >
                <PawPrint pawIndex={index} x={0} y={0} scale={1} skew={0} />
              </svg>
            ))}
          </div>
        </div>

        <div
          ref={this.scrollbarRef}
          onPointerDown={this.handleScrollbarPointerDown}
          onPointerMove={this.handleScrollbarPointerMove}
          onPointerUp={this.handleScrollbarPointerUp}
          onPointerCancel={this.handleScrollbarPointerUp}
          aria-label="Scroll off-bridge observations vertically"
          role="scrollbar"
          style={{
            position: 'absolute',
            top: 10,
            right: 5,
            bottom: 10,
            width: 14,
            zIndex: 5,
            borderRadius: 8,
            background: 'rgba(173, 216, 230, 0.36)',
            border: '2px solid rgba(255,255,255,0.8)',
            boxShadow: 'inset 0 0 0 1px rgba(94, 160, 196, 0.5)',
            cursor: 'ns-resize',
            touchAction: 'none',
          }}
        >
          <div
            ref={this.thumbRef}
            onPointerDown={this.handleScrollbarPointerDown}
            style={{
              position: 'absolute',
              left: 2,
              top: 0,
              width: 8,
              height: '100%',
              borderRadius: 6,
              background: 'linear-gradient(180deg, #dff6ff 0%, #9ad9f7 45%, #6bb9e7 100%)',
              border: '2px solid rgba(255,255,255,0.9)',
              boxShadow: '0 0 0 1px rgba(90, 160, 215, 0.55)',
              pointerEvents: 'auto',
              touchAction: 'none',
            }}
          />
        </div>
      </>
    );
  }
}

export default OffBridgePawVerticalScrollLayer;
