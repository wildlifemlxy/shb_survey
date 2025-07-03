import React from 'react';

const LastMaintenanceInfo = ({ lastMaintenance }) => (
  lastMaintenance ? (
    <div style={{ fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
      Last maintenance: {new Date(lastMaintenance).toLocaleString()}
    </div>
  ) : null
);

export default LastMaintenanceInfo;
