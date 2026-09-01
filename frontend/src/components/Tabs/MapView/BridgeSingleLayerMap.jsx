import React, { Component } from 'react';
import ForestLayer from './ForestLayer';
import RoadLayer from './RoadLayer';
import RoadsideGuard from './RoadsideGuard';
import LaneDirectionalArrow from './LaneDirectionalArrow';
import RopeBridgeVisualization from './RopeBridgeVisualization';
import RainforestTree from './RainforestTree';
import OffBridgePawVerticalScrollLayer from './OffBridgePawVerticalScrollLayer';

class BridgeSingleLayerMap extends Component {
  render() {
    const {
      bridgeACount = 8,
      bridgeBCount = 15,
      bridgeAObservations = [],
      bridgeBObservations = [],
      offBridgeObservations = [],
      offBridgeCount = 0,
      onPawClick,
    } = this.props;
    const trees = [];
    const palette = ['#3d7a45', '#5caa63', '#66b36d', '#7ed07e', '#83d986'];

    for (let row = 0; row < 12; row += 1) {
      for (let col = 0; col < 18; col += 1) {
        const x = 2 + col * 5.4 + ((row % 2) * 1.5);
        const y = 5 + row * 7.8 + (col % 3) * 0.9;
        const scale = 1.4 + ((row + col) % 4) * 0.28 + (col % 2 === 0 ? 0.12 : 0);
        const hue = palette[(row + col) % palette.length];

        trees.push({
          x: Math.min(x, 98),
          y: Math.min(y, 94),
          scale,
          hue,
          delay: Number(((row * 0.08) + (col * 0.03)).toFixed(2))
        });
      }
    }

    const forestProps = { trees, RainforestTree };
    const edgeTrees = trees.filter((tree) => tree.x <= 18 || tree.x >= 82);

    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 420, overflow: 'visible', fontSize: 0 }}>
        <div style={{ position: 'absolute', left: '0%', top: 0, width: '15%', height: '100%', zIndex: 1 }}>
          <ForestLayer
            side="left"
            pawCount={0}
            observations={[]}
            onPawClick={onPawClick}
          />
        </div>

        <div style={{ position: 'absolute', left: '15%', top: 0, width: '70%', height: '100%', zIndex: 1 }}>
          <RoadLayer
            pawCount={0}
            observations={[]}
            onPawClick={onPawClick}
          />
        </div>

        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
          <RoadsideGuard />
          <LaneDirectionalArrow />
        </div>

        <div style={{ position: 'absolute', left: '5%', top: '15%', width: '90%', height: '15%', zIndex: 8 }}>
          <RopeBridgeVisualization
            pawCount={bridgeACount}
            observations={bridgeAObservations}
            onPawClick={onPawClick}
          />
        </div>

        <div style={{ position: 'absolute', left: '5%', bottom: '15%', width: '90%', height: '15%', zIndex: 8}}>
          <RopeBridgeVisualization
            pawCount={bridgeBCount}
            observations={bridgeBObservations}
            onPawClick={onPawClick}
          />
        </div>

        <div style={{ position: 'absolute', left: '85%', top: 0, width: '15%', height: '100%', zIndex: 1, marginLeft: 0 }}>
          <ForestLayer
            side="right"
            pawCount={0}
            observations={[]}
            onPawClick={onPawClick}
          />
        </div>

        <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none' }}>
          <OffBridgePawVerticalScrollLayer
            pawCount={offBridgeCount}
            observations={offBridgeObservations}
            onPawClick={onPawClick}
            side="road"
          />
        </div>
      </div>
    );
  }
}

export default BridgeSingleLayerMap;
