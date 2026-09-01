import React, { Component } from 'react';
import RoadsideOffBridgePaws from './RoadsideOffBridgePaws';

class RoadLayer extends Component {
  render() {
    const { pawCount = 0, observations = [], onPawClick } = this.props;

    return (
      <div
        style={{
          display: 'flex',
          flex: 1,
          minHeight: '100%',
          background: '#1a1a1a',
          border: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06), inset 0 12px 18px rgba(255,255,255,0.08), inset 0 -12px 18px rgba(0,0,0,0.18)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', display: 'block' }}>
          <defs>
            <linearGradient id="asphaltGloss" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#3a3a3a" />
              <stop offset="20%" stopColor="#2a2a2a" />
              <stop offset="55%" stopColor="#1d1d1d" />
              <stop offset="100%" stopColor="#131313" />
            </linearGradient>
            <linearGradient id="roadShine" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0%" stopColor="rgba(255,255,255,0.32)" />
              <stop offset="20%" stopColor="rgba(255,255,255,0.14)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
            <radialGradient id="roadBloom" cx="35%" cy="18%" r="70%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
              <stop offset="35%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="100" height="100" fill="url(#asphaltGloss)" />
          <rect x="0" y="0" width="100" height="100" fill="url(#roadBloom)" />
          <rect x="0" y="0" width="100" height="100" fill="url(#roadShine)" opacity="0.95" />
          <rect x="0" y="0" width="100" height="100" fill="rgba(255,255,255,0.02)" />
          <rect x="0" y="0" width="100" height="100" fill="rgba(0,0,0,0.06)" />

          <g>
            {(() => {
              const segments = [];
              let cursor = 0;
              const segmentHeight = 8;
              const gapHeight = 5;

              while (cursor < 100) {
                const whiteSize = Math.min(segmentHeight, 100 - cursor);
                segments.push(
                  <rect key={`white-${cursor}`} x="25" y={cursor} width="0.9" height={whiteSize} fill="#f8f8f8" />
                );
                cursor += whiteSize;

                if (cursor >= 100) break;
                cursor += Math.min(gapHeight, 100 - cursor);
              }

              return segments;
            })()}

            <rect x="50" y="0" width="0.9" height="100" fill="#f8f8f8" />

            {(() => {
              const segments = [];
              let cursor = 0;
              const segmentHeight = 8;
              const gapHeight = 5;

              while (cursor < 100) {
                const whiteSize = Math.min(segmentHeight, 100 - cursor);
                segments.push(
                  <rect key={`white-right-${cursor}`} x="75" y={cursor} width="0.9" height={whiteSize} fill="#f8f8f8" />
                );
                cursor += whiteSize;

                if (cursor >= 100) break;
                cursor += Math.min(gapHeight, 100 - cursor);
              }

              return segments;
            })()}
          </g>
        </svg>

        <div style={{ position: 'absolute', inset: 0, zIndex: 8, pointerEvents: 'none' }}>
          <RoadsideOffBridgePaws
            pawCount={pawCount}
            observations={observations}
            onPawClick={onPawClick}
          />
        </div>
      </div>
    );
  }
}

export default RoadLayer;
