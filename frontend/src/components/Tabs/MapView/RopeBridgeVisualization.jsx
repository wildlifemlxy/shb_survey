import React, { Component } from 'react';
import PawPrintScrollableLayer from './PawPrintScrollableLayer';

class RopeBridgeVisualization extends Component {
  render() {
    const { width = '100%', height = '100%', pawCount = 0, observations = [], onPawClick } = this.props;
    const viewBoxWidth = 100;
    const viewBoxHeight = 100;

    const leftPoleX = 6;
    const rightPoleX = viewBoxWidth - 6;
    const poleWidth = 1.4;
    const poleHeight = 76;
    const poleY = 12;

    return (
      <>
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          width={width}
          height={height}
          preserveAspectRatio="none"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            background: 'transparent',
            overflow: 'visible',
            position: 'absolute',
            inset: 0,
          }}
          aria-hidden="true"
        >
          <line
            x1={leftPoleX}
            y1={poleY}
            x2={leftPoleX}
            y2={poleY + poleHeight}
            stroke="#111111"
            strokeWidth={poleWidth}
            strokeLinecap="round"
          />

          <line
            x1={rightPoleX}
            y1={poleY}
            x2={rightPoleX}
            y2={poleY + poleHeight}
            stroke="#111111"
            strokeWidth={poleWidth}
            strokeLinecap="round"
          />

          <g opacity={1}>
            {Array.from({ length: 9 }).map((_, index) => {
              const x = leftPoleX + 5 + index * 9.5;
              return (
                <line
                  key={`net-column-${index}`}
                  x1={x}
                  y1={poleY + 4}
                  x2={x}
                  y2={poleY + poleHeight - 4}
                  stroke="#111111"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                />
              );
            })}

            {Array.from({ length: 8 }).map((_, index) => {
              const y = poleY + 8 + index * 8.8;
              return (
                <line
                  key={`net-row-${index}`}
                  x1={leftPoleX + 1}
                  y1={y}
                  x2={rightPoleX - 1}
                  y2={y}
                  stroke="#111111"
                  strokeWidth="0.9"
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        </svg>

        {pawCount > 0 && (
          <PawPrintScrollableLayer
            pawCount={pawCount}
            observations={observations}
            onPawClick={onPawClick}
          />
        )}
      </div>
     </>
    );
  }
}

export default RopeBridgeVisualization;
