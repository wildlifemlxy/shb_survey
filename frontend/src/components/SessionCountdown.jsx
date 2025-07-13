import React, { Component } from 'react';

class SessionCountdown extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      timeLeft: props.initialTime || 10,
      isVisible: true
    };
    
    this.timer = null;
  }

  componentDidMount() {
    this.startCountdown();
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  startCountdown = () => {
    this.timer = setInterval(() => {
      this.setState(prevState => {
        const newTimeLeft = prevState.timeLeft - 1;
        
        if (newTimeLeft <= 0) {
          clearInterval(this.timer);
          // Call the onExpire callback if provided
          if (this.props.onExpire) {
            this.props.onExpire();
          }
          return { timeLeft: 0, isVisible: false };
        }
        
        return { timeLeft: newTimeLeft };
      });
    }, 1000);
  };

  handleDismiss = () => {
    this.setState({ isVisible: false });
    if (this.timer) {
      clearInterval(this.timer);
    }
    if (this.props.onDismiss) {
      this.props.onDismiss();
    }
  };

  handleExtendSession = () => {
    if (this.props.onExtendSession) {
      this.props.onExtendSession();
    }
    // Reset timer if session is extended
    this.setState({ timeLeft: this.props.initialTime || 10 });
  };

  render() {
    const { timeLeft, isVisible } = this.state;
    const { showExtendButton = true, position = 'top-right' } = this.props;

    if (!isVisible) return null;

    const positionStyles = {
      'top-right': { top: 20, right: 20 },
      'top-left': { top: 20, left: 20 },
      'top-center': { top: 20, left: '50%', transform: 'translateX(-50%)' },
      'bottom-right': { bottom: 20, right: 20 },
      'bottom-left': { bottom: 20, left: 20 },
      'bottom-center': { bottom: 20, left: '50%', transform: 'translateX(-50%)' }
    };

    return (
      <div
        style={{
          position: 'fixed',
          ...positionStyles[position],
          backgroundColor: timeLeft <= 5 ? '#dc2626' : '#f59e0b',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '280px',
          animation: timeLeft <= 5 ? 'pulse 1s infinite' : 'none',
          border: timeLeft <= 5 ? '2px solid #fca5a5' : 'none'
        }}
      >
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
          `}
        </style>
        
        {/* Warning icon */}
        <div style={{ fontSize: '18px' }}>
          {timeLeft <= 5 ? '⚠️' : '⏰'}
        </div>
        
        {/* Message and countdown */}
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '14px', marginBottom: '2px' }}>
            Session Expiring Soon
          </div>
          <div style={{ fontSize: '12px', opacity: 0.9 }}>
            Your session will expire in <strong>{timeLeft}</strong> second{timeLeft !== 1 ? 's' : ''}
          </div>
        </div>
        
        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {showExtendButton && (
            <button
              onClick={this.handleExtendSession}
              style={{
                backgroundColor: '#fff',
                color: timeLeft <= 5 ? '#dc2626' : '#f59e0b',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#fff';
              }}
            >
              Extend
            </button>
          )}
          
          <button
            onClick={this.handleDismiss}
            style={{
              backgroundColor: 'transparent',
              color: '#fff',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              padding: '6px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }
}

export default SessionCountdown;
