import React, { Component } from 'react';
import OffBridgePawVerticalScrollLayer from './OffBridgePawVerticalScrollLayer';

class ForestOffBridgePaws extends Component {
  render() {
    const { pawCount = 0, observations = [], onPawClick, side = 'left' } = this.props;

    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          pointerEvents: 'none',
        }}
      >
        <OffBridgePawVerticalScrollLayer
          pawCount={pawCount}
          observations={observations}
          onPawClick={onPawClick}
          side={side}
        />
      </div>
    );
  }
}

export default ForestOffBridgePaws;
