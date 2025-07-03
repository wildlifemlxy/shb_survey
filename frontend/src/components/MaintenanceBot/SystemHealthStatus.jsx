import React, { Component } from 'react';
import dbIcon from '../../assets/db.png';
import storageIcon from '../../assets/storage.png';
import speedIcon from '../../assets/speed.png';

class SystemHealthStatus extends Component {
  render() {
    const { systemHealth } = this.props;
    return (
      <div style={{ marginBottom: 16 }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 500 }}>
          System Health
        </h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
          <div style={{ textAlign: 'center', padding: 8, background: '#f3f4f6', borderRadius: 6 }}>
            <img src={dbIcon} alt="Database" style={{ width: 20, height: 20, marginBottom: 4 }} />
            <div style={{ color: systemHealth.database === 'Healthy' ? '#166534' : '#b91c1c', fontWeight: 700 }}>
              {systemHealth.database}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: 8, background: '#f3f4f6', borderRadius: 6 }}>
            <img src={storageIcon} alt="Storage" style={{ width: 20, height: 20, marginBottom: 4 }} />
            <div style={{ color: systemHealth.storage === 'Healthy' ? '#166534' : '#b91c1c', fontWeight: 700 }}>
              {systemHealth.storage}
            </div>
          </div>
          <div style={{ textAlign: 'center', padding: 8, background: '#f3f4f6', borderRadius: 6 }}>
            <img src={speedIcon} alt="Speed" style={{ width: 20, height: 20, marginBottom: 4 }} />
            <div style={{ color: systemHealth.performance === 'Good' ? '#166534' : '#f59e0b', fontWeight: 700 }}>
              {systemHealth.performance}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default SystemHealthStatus;
