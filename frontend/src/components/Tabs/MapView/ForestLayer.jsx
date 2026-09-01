import React, { Component } from 'react';
import ForestOffBridgePaws from './ForestOffBridgePaws';

class ForestSideStrip extends Component {
  render() {
    const { side = 'left', pawCount = 0, observations = [], onPawClick } = this.props;
    const isRightSide = side === 'right';

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          minWidth: '20%',
          minHeight: 340,
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'stretch',
          background: 'radial-gradient(circle at 50% 14%, rgba(255, 214, 148, 0.28), rgba(127, 62, 18, 0.18) 18%, rgba(54, 27, 14, 1) 70%), linear-gradient(180deg, rgba(165, 102, 46, 1) 0%, rgba(75, 43, 23, 1) 100%)',
          borderRadius: 0,
          overflow: 'visible',
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.48)',
          position: 'relative',
          filter: 'saturate(1.08) contrast(1.05)',
          borderRight: 'none',
          borderLeft: 'none',
          backgroundBlendMode: 'screen'
        }}
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            flex: '1 1 auto',
            minHeight: '100%'
          }}
        >
          <defs>
            <linearGradient id="forestGround" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#d98b3d" />
              <stop offset="26%" stopColor="#b96a2a" />
              <stop offset="58%" stopColor="#7f431c" />
              <stop offset="100%" stopColor="#2d190d" />
            </linearGradient>
            <linearGradient id={isRightSide ? 'forestToRoadBlendRight' : 'forestToRoadBlendLeft'} x1={isRightSide ? '1' : '0'} x2={isRightSide ? '0' : '1'} y1="0" y2="0">
              <stop offset="0%" stopColor={isRightSide ? 'rgba(216, 139, 61, 0.0)' : 'rgba(255, 223, 160, 0.32)'} />
              <stop offset="28%" stopColor={isRightSide ? 'rgba(185, 106, 42, 0.32)' : 'rgba(185, 106, 42, 0.38)'} />
              <stop offset="62%" stopColor={isRightSide ? 'rgba(62, 45, 33, 0.42)' : 'rgba(62, 45, 33, 0.32)'} />
              <stop offset="100%" stopColor={isRightSide ? 'rgba(26, 26, 26, 0.96)' : 'rgba(255, 223, 160, 0.0)'} />
            </linearGradient>
            <radialGradient id="dryLeafGlow" cx="50%" cy="30%" r="65%">
              <stop offset="0%" stopColor="rgba(255, 219, 160, 0.38)" />
              <stop offset="100%" stopColor="rgba(255, 219, 160, 0)" />
            </radialGradient>
          </defs>

          <rect x="0" y="0" width="100" height="100" fill="url(#forestGround)" opacity="0.96" />
          <rect x="0" y="0" width="100" height="100" fill="url(#dryLeafGlow)" opacity="0.9" />
          <rect x="0" y="0" width="100" height="100" fill={`url(#${isRightSide ? 'forestToRoadBlendRight' : 'forestToRoadBlendLeft'})`} opacity="1" />
        </svg>

        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
          <ForestOffBridgePaws
            pawCount={pawCount}
            observations={observations}
            onPawClick={onPawClick}
            side={side}
          />
        </div>
      </div>
    );
  }
}

export default ForestSideStrip;
