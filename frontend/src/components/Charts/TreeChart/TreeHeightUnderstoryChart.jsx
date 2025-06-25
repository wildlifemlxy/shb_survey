import React, { Component } from 'react';

const UNDERSTORY_IMG = '/forest/understory.png';

class TreeHeightUnderstoryChart extends Component {
  render() {
    const data = this.props.data && this.props.data.length > 0 ? this.props.data : [
      { id: 1, height: 8 },
      { id: 2, height: 12 },
      { id: 3, height: 14 },
      { id: 4, height: 17 },
      { id: 5, height: 10 },
    ];
    const xBase = 50;
    const xStep = 60;
    const yBase = 180;
    const imgWidth = 40;
    const imgHeight = 60;

    return (
      <svg width={400} height={200}>
        {/* Y Axis */}
        <g>
          <line x1="50" y1="20" x2="50" y2="180" stroke="#2D4A22" strokeWidth="2" />
          {[0, 25, 50, 75, 100].map((val, i) => (
            <g key={i}>
              <line x1="45" y1={180 - val * 1.6} x2="50" y2={180 - val * 1.6} stroke="#2D4A22" strokeWidth="2" />
              <text x="35" y={184 - val * 1.6} fontSize="12" fill="#2D4A22" textAnchor="end">{val}</text>
            </g>
          ))}
          <text x="10" y="100" fontSize="14" fill="#2D4A22" textAnchor="middle" transform="rotate(-90 10,100)">Height (m)</text>
        </g>
        {/* X Axis */}
        <g>
          <line x1="50" y1="180" x2="370" y2="180" stroke="#2D4A22" strokeWidth="2" />
          {data.map((tree, i) => (
            <g key={`xaxis-${tree.id}`}>
              <line x1={xBase + (i + 1) * xStep} y1="180" x2={xBase + (i + 1) * xStep} y2="185" stroke="#2D4A22" strokeWidth="2" />
              <text x={xBase + (i + 1) * xStep} y="200" fontSize="12" fill="#2D4A22" textAnchor="middle" key={`xlabel-${tree.id}`}>Tree {i + 1}</text>
            </g>
          ))}
          <text x="210" y="215" fontSize="14" fill="#2D4A22" textAnchor="middle">Trees</text>
        </g>
        {/* Understory PNG for trees 1-15m */}
        {data.map((tree, i) => {
          if (tree.height >= 1 && tree.height <= 15) {
            console.log('Rendering understory image for:', tree, 'at index', i);
            return (
              <image
                key={tree.id}
                href={UNDERSTORY_IMG}
                x={xBase + (i + 1) * xStep - imgWidth / 2}
                y={yBase - imgHeight}
                width={imgWidth}
                height={imgHeight}
                style={{ pointerEvents: 'none' }}
              />
            );
          }
          return null;
        })}
      </svg>
    );
  }
}

export default TreeHeightUnderstoryChart;
