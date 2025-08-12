import React, { Component } from 'react';
import SessionCountdown from './SessionCountdown';

class SessionCountdownDemo extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      showCountdown: false,
      demoTime: 10
    };
  }

  startDemo = (seconds = 10) => {
    this.setState({ 
      showCountdown: true,
      demoTime: seconds 
    });
  };

  handleExpire = () => {
    alert('Session has expired! This is where you would handle logout.');
    this.setState({ showCountdown: false });
  };

  handleExtend = () => {
    alert('Session extended! This is where you would refresh the token.');
    this.setState({ showCountdown: false });
  };

  handleDismiss = () => {
    this.setState({ showCountdown: false });
  };

  render() {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Session Countdown Demo</h2>
        <p>Click the buttons below to test the countdown functionality:</p>
        
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', margin: '20px 0' }}>
          <button 
            onClick={() => this.startDemo(10)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start 10s Countdown
          </button>
          
          <button 
            onClick={() => this.startDemo(5)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start 5s Countdown (Critical)
          </button>
          
          <button 
            onClick={() => this.startDemo(30)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f59e0b',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Start 30s Countdown
          </button>
        </div>

        {this.state.showCountdown && (
          <SessionCountdown
            initialTime={this.state.demoTime}
            onExpire={this.handleExpire}
            onExtendSession={this.handleExtend}
            onDismiss={this.handleDismiss}
            position="top-right"
            showExtendButton={true}
          />
        )}
        
        <div style={{ 
          marginTop: '40px', 
          padding: '20px', 
          backgroundColor: '#f3f4f6', 
          borderRadius: '8px',
          textAlign: 'left'
        }}>
          <h3>Features:</h3>
          <ul>
            <li>✅ Real-time countdown updates every second</li>
            <li>✅ Color changes to red when ≤ 5 seconds remain</li>
            <li>✅ Pulsing animation for critical countdown</li>
            <li>✅ Extend Session button to refresh token</li>
            <li>✅ Dismiss button to hide countdown</li>
            <li>✅ Automatic expiry handling</li>
            <li>✅ Configurable position and styling</li>
          </ul>
        </div>
      </div>
    );
  }
}

export default SessionCountdownDemo;
