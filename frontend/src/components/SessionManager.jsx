import React, { Component } from 'react';
import SessionCountdown from './SessionCountdown';

class SessionManager extends Component {
  constructor(props) {
    super(props);
    
    this.state = {
      showCountdown: false,
      sessionStartTime: Date.now(),
      lastActivity: Date.now()
    };
    
    // Default session duration: 30 minutes
    this.sessionDuration = props.sessionDuration || 30 * 60 * 1000;
    // Show countdown when 10 seconds left
    this.countdownWarning = props.countdownWarning || 10 * 1000;
    
    this.activityTimer = null;
    this.checkTimer = null;
  }

  componentDidMount() {
    this.setupActivityListeners();
    this.startSessionCheck();
  }

  componentWillUnmount() {
    this.cleanup();
  }

  setupActivityListeners = () => {
    // Listen for user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    this.activityHandler = () => {
      this.setState({ lastActivity: Date.now() });
    };
    
    events.forEach(event => {
      document.addEventListener(event, this.activityHandler, true);
    });
  };

  cleanup = () => {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }
    
    if (this.activityHandler) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      events.forEach(event => {
        document.removeEventListener(event, this.activityHandler, true);
      });
    }
  };

  startSessionCheck = () => {
    this.checkTimer = setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - this.state.lastActivity;
      const timeUntilExpiry = this.sessionDuration - timeSinceActivity;
      
      // Show countdown when warning time is reached
      if (timeUntilExpiry <= this.countdownWarning && timeUntilExpiry > 0) {
        if (!this.state.showCountdown) {
          this.setState({ showCountdown: true });
        }
      }
      
      // Session expired
      if (timeUntilExpiry <= 0) {
        this.handleSessionExpire();
      }
    }, 1000);
  };

  handleSessionExpire = () => {
    this.cleanup();
    
    // Clear user data
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('token');
    
    // Call custom expiry handler if provided
    if (this.props.onSessionExpire) {
      this.props.onSessionExpire();
    } else {
      // Default behavior: reload page to login
      alert('Your session has expired. Please log in again.');
      window.location.reload();
    }
  };

  handleExtendSession = () => {
    // Reset activity time to extend session
    this.setState({ 
      lastActivity: Date.now(),
      showCountdown: false 
    });
    
    // Call custom extend handler if provided
    if (this.props.onExtendSession) {
      this.props.onExtendSession();
    }
  };

  handleDismissCountdown = () => {
    this.setState({ showCountdown: false });
  };

  getTimeLeft = () => {
    const now = Date.now();
    const timeSinceActivity = now - this.state.lastActivity;
    const timeUntilExpiry = this.sessionDuration - timeSinceActivity;
    return Math.max(0, Math.ceil(timeUntilExpiry / 1000));
  };

  render() {
    const { showCountdown } = this.state;
    const { children, position = 'top-right' } = this.props;
    
    return (
      <>
        {children}
        {showCountdown && (
          <SessionCountdown
            initialTime={this.getTimeLeft()}
            onExpire={this.handleSessionExpire}
            onExtendSession={this.handleExtendSession}
            onDismiss={this.handleDismissCountdown}
            position={position}
            showExtendButton={true}
          />
        )}
      </>
    );
  }
}

export default SessionManager;
