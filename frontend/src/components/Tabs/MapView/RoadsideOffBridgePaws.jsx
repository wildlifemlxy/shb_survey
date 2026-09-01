import React, { Component } from 'react';
import OffBridgePawVerticalScrollLayer from './OffBridgePawVerticalScrollLayer';

class RoadsideOffBridgePaws extends Component {
  render() {
    const { pawCount = 0, observations = [], onPawClick } = this.props;

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
          side="road"
        />
      </div>
    );
  }
}

export default RoadsideOffBridgePaws;
