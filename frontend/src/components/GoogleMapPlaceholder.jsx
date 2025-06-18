import React from 'react';

const GoogleMapPlaceholder = ({ data }) => {
  return (
    <div style={{
      width: '100%',
      height: '400px',
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border: '2px dashed #0ea5e9',
      borderRadius: '12px',
      color: '#0c4a6e'
    }}>
      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗺️</div>
      <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Singapore Interactive Map</h3>
      <p style={{ margin: '8px 0 0 0', textAlign: 'center', opacity: 0.8 }}>
        Google Maps integration ready for API key
      </p>
      <div style={{ marginTop: '12px', fontSize: '14px', opacity: 0.6 }}>
        {data?.length || 0} observation points ready to display
      </div>
    </div>
  );
};

export default GoogleMapPlaceholder;
