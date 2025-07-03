import React, { Component } from 'react';

class StatusMessages extends Component {
  render() {
    const { maintenanceStatus, exportStatus } = this.props;
    return (
      <>
        {maintenanceStatus !== 'idle' && (
          <div style={{
            padding: 12,
            borderRadius: 6,
            background: maintenanceStatus === 'completed' ? '#dcfce7' : 
                       maintenanceStatus === 'error' ? '#fef2f2' : '#fef3c7',
            color: maintenanceStatus === 'completed' ? '#166534' :
                   maintenanceStatus === 'error' ? '#991b1b' : '#92400e',
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 12
          }}>
            {maintenanceStatus === 'running' && '⚙️ Running maintenance task...'}
            {maintenanceStatus === 'completed' && '✅ Maintenance completed successfully!'}
            {maintenanceStatus === 'error' && '❌ Maintenance failed. Please try again.'}
          </div>
        )}
        {exportStatus !== 'idle' && (
          <div style={{
            padding: 12,
            borderRadius: 6,
            background: exportStatus === 'completed' ? '#dcfce7' : 
                       exportStatus === 'error' ? '#fef2f2' : '#fef3c7',
            color: exportStatus === 'completed' ? '#166534' :
                   exportStatus === 'error' ? '#991b1b' : '#92400e',
            fontSize: 12,
            textAlign: 'center',
            marginBottom: 12
          }}>
            {exportStatus === 'exporting' && '💾 Creating backup...'}
            {exportStatus === 'completed' && '✅ Backup completed successfully!'}
            {exportStatus === 'error' && '❌ Backup failed. Please try again.'}
          </div>
        )}
      </>
    );
  }
}

export default StatusMessages;
