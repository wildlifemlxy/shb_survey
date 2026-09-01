import React from 'react';

const RoadsideGuard = () => (
  <>
    <div
      style={{
        position: 'absolute',
        left: '14.8%',
        top: 0,
        width: '8px',
        height: '100%',
        background: 'linear-gradient(180deg, rgba(244,244,244,0.96) 0%, rgba(195,195,195,0.9) 45%, rgba(128,128,128,0.92) 100%)',
        border: '1px solid rgba(0,0,0,0.22)',
        borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08)'
      }}
    />

    <div
      style={{
        position: 'absolute',
        right: '14.8%',
        top: 0,
        width: '8px',
        height: '100%',
        background: 'linear-gradient(180deg, rgba(244,244,244,0.96) 0%, rgba(195,195,195,0.9) 45%, rgba(128,128,128,0.92) 100%)',
        border: '1px solid rgba(0,0,0,0.22)',
        borderRadius: '2px',
        boxShadow: '0 0 0 1px rgba(255,255,255,0.08)'
      }}
    />

    {[14, 30, 46, 62, 78].map((top) => (
      <div
        key={`map-bollard-left-${top}`}
        style={{
          position: 'absolute',
          left: '14.5%',
          top: `${top}%`,
          width: '12px',
          height: '18px',
          borderRadius: '2px',
          background: 'linear-gradient(180deg, #f3f3f3 0%, #d5d5d5 50%, #7e7e7e 100%)',
          border: '1px solid rgba(0,0,0,0.28)',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.12)'
        }}
      />
    ))}

    {[14, 30, 46, 62, 78].map((top) => (
      <div
        key={`map-bollard-right-${top}`}
        style={{
          position: 'absolute',
          right: '14.5%',
          top: `${top}%`,
          width: '12px',
          height: '18px',
          borderRadius: '2px',
          background: 'linear-gradient(180deg, #f3f3f3 0%, #d5d5d5 50%, #7e7e7e 100%)',
          border: '1px solid rgba(0,0,0,0.28)',
          transform: 'translate(50%, -50%)',
          boxShadow: '0 0 0 1px rgba(255,255,255,0.12)'
        }}
      />
    ))}
  </>
);

export default RoadsideGuard;
