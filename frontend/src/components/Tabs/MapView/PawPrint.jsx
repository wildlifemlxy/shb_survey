import React from 'react';

const PawPrint = ({ pawIndex, x, y, scale, skew }) => (
  <g
    key={`paw-${pawIndex}`}
    transform={`translate(${x} ${y}) rotate(${skew}) scale(${scale})`}
    fill="#87ceeb"
    stroke="#7a7f87"
    strokeWidth="2.0"
    strokeLinejoin="round"
    paintOrder="stroke fill"
  >
    <ellipse cx={-2.9} cy={-4.0} rx={1.15} ry={1.75} transform="rotate(-34 -2.9 -4.0)" />
    <ellipse cx={-0.8} cy={-5.5} rx={1.2} ry={1.85} transform="rotate(-10 -0.8 -5.5)" />
    <ellipse cx={1.7} cy={-5.2} rx={1.2} ry={1.8} transform="rotate(13 1.7 -5.2)" />
    <ellipse cx={3.6} cy={-3.6} rx={1.05} ry={1.65} transform="rotate(34 3.6 -3.6)" />
    <path d="M-2.5 0.8 C-2.7 -1.2 -1.5 -2.2 0.2 -2.0 C1.7 -1.9 3.7 -0.9 4.2 0.8 C4.7 2.3 3.5 3.9 1.8 4.5 C0.7 4.9 -0.5 4.8 -1.4 4.2 C-2.3 3.6 -2.7 2.4 -2.5 0.8 Z" />
  </g>
);

export default PawPrint;
