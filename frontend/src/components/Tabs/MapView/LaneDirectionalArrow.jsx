import React from 'react';

const LaneDirectionalArrow = ({ left, top, rotate = 0 }) => {
  const arrows = [
    { left: '23.75%', top: '72%', rotate: 0 },
    { left: '41.25%', top: '28%', rotate: 0 },
    { left: '58.75%', top: '72%', rotate: 180 },
    { left: '76.25%', top: '28%', rotate: 180 }
  ];

  const positions = left !== undefined && top !== undefined
    ? [{ left, top, rotate }]
    : arrows;

  return (
    <>
      {positions.map((arrow, index) => (
        <div
          key={`lane-arrow-${index}`}
          style={{
            position: 'absolute',
            left: arrow.left,
            top: arrow.top,
            width: '52px',
            height: '150px',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,245,245,0.96) 100%)',
            clipPath: 'polygon(50% 0%, 100% 42%, 68% 42%, 68% 100%, 32% 100%, 32% 42%, 0% 42%)',
            transform: `translate(-50%, -50%) rotate(${arrow.rotate}deg)`,
            boxShadow: '0 1px 0 rgba(0,0,0,0.06)',
            opacity: 1,
            borderRadius: '2px'
          }}
        />
      ))}
    </>
  );
};

export default LaneDirectionalArrow;
