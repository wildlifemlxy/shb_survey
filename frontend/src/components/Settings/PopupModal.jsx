import React from 'react';

class PopupModal extends React.Component {
  render() {
    const { status } = this.props;
    if (status !== 'success' && status !== 'error') return null;
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}>
        <div style={{
          background: '#fff',
          padding: 32,
          borderRadius: 12,
          boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          minWidth: 320,
          textAlign: 'center'
        }}>
          <h3 style={{ color: status === 'success' ? 'green' : 'red', marginBottom: 0 }}>
            {status === 'success' ? 'Bot registered!' : 'Error registering bot.'}
          </h3>
        </div>
      </div>
    );
  }
}

export default PopupModal;
