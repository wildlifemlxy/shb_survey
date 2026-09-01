import React from 'react';

const Bollard = ({
  side = 'left',
  standPositions = [14, 30, 46, 62, 78],
  lineWidth = 7,
  standWidth = 8,
  standHeight = 15,
  lineColor = 'linear-gradient(180deg, rgba(244,244,244,0.96) 0%, rgba(195,195,195,0.9) 45%, rgba(128,128,128,0.92) 100%)',
  standColor = 'linear-gradient(180deg, #f3f3f3 0%, #d5d5d5 50%, #7e7e7e 100%)',
  borderColor = 'rgba(0,0,0,0.28)'
}) => {
  const isRightSide = side === 'right';

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: isRightSide ? '0%' : '100%',
          top: 0,
          width: `${lineWidth}px`,
          height: '100%',
          background: lineColor,
          border: `1px solid ${borderColor}`,
          borderRadius: '2px',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08)',
          transform: 'translateX(-50%)'
        }}
      />

      {standPositions.map((top) => (
        <div
          key={`forest-stand-${side}-${top}`}
          style={{
            position: 'absolute',
            left: isRightSide ? '4%' : '96%',
            top: `${top}%`,
            width: `${standWidth}px`,
            height: `${standHeight}px`,
            borderRadius: '2px',
            background: standColor,
            border: `1px solid ${borderColor}`,
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 0 1px rgba(255,255,255,0.12)'
          }}
        />
      ))}
    </div>
  );
};

export default Bollard;
