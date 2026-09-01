import React, { Component } from 'react';

class ForestEdgeTree extends Component {
  render() {
    const { x = 50, y = 50, scale = 1, hue = '#79c675', delay = 0 } = this.props;
    const treeScale = scale * 0.8;

    return (
      <g
        transform={`translate(${x} ${y}) scale(${treeScale})`}
        style={{ filter: 'drop-shadow(0 0 8px rgba(24, 58, 31, 0.2))' }}
      >
        <g>
          <circle cx="0" cy="1.2" r="9.5" fill={hue} opacity="0.98" stroke="#123f2c" strokeWidth="0.35" />
          <circle cx="-6.5" cy="-2" r="6.6" fill="#8ddf8b" opacity="0.82" />
          <circle cx="6.5" cy="-2" r="6.6" fill="#9fe59d" opacity="0.82" />
          <circle cx="0" cy="-7" r="6" fill="#d3ffd8" opacity="0.6" />
          <circle cx="-9.5" cy="4.2" r="4.4" fill="#5cab69" opacity="0.7" />
          <circle cx="9.5" cy="4.2" r="4.4" fill="#5cab69" opacity="0.7" />
          <circle cx="0" cy="7.2" r="3.8" fill="#caffca" opacity="0.42" />
          <rect x="-1.1" y="9.5" width="2.2" height="5.5" rx="0.7" fill="#2d1d17" opacity="0.12" />
        </g>
      </g>
    );
  }
}

export default ForestEdgeTree;
