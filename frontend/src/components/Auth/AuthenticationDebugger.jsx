import React, { Component } from 'react';
import { isLoggedIn, getCurrentUser, clearSession } from '../../data/loginData';

class AuthenticationDebugger extends Component {
  constructor(props) {
    super(props);
    this.state = {
      authStatus: false,
      currentUser: null,
      storageData: {}
    };
  }

  componentDidMount() {
    this.updateAuthStatus();
  }

  updateAuthStatus = () => {
    const authStatus = isLoggedIn();
    const currentUser = getCurrentUser();
    
    // Get all localStorage data related to authentication
    const storageData = {
      isLoggedIn: localStorage.getItem('isLoggedIn'),
      isAuthenticated: localStorage.getItem('isAuthenticated'),
      currentUser: localStorage.getItem('currentUser'),
      user: localStorage.getItem('user'),
      userRole: localStorage.getItem('userRole'),
      loginTimestamp: localStorage.getItem('loginTimestamp'),
      sessionAge: localStorage.getItem('loginTimestamp') ? 
        Math.round((Date.now() - parseInt(localStorage.getItem('loginTimestamp'))) / 1000 / 60) : 'N/A'
    };

    this.setState({
      authStatus,
      currentUser,
      storageData
    });
  };

  handleClearSession = () => {
    clearSession();
    this.updateAuthStatus();
    // Force app to check authentication status
    if (this.props.onAuthChange) {
      this.props.onAuthChange();
    }
  };

  render() {
    const { authStatus, currentUser, storageData } = this.state;

    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: 'white',
        border: '2px solid #ccc',
        padding: '15px',
        borderRadius: '5px',
        maxWidth: '400px',
        fontSize: '12px',
        zIndex: 9999,
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>Authentication Debugger</h4>
        
        <div style={{ marginBottom: '10px' }}>
          <strong>Status: </strong>
          <span style={{ color: authStatus ? 'green' : 'red' }}>
            {authStatus ? 'LOGGED IN' : 'NOT LOGGED IN'}
          </span>
        </div>

        {currentUser && (
          <div style={{ marginBottom: '10px' }}>
            <strong>Current User:</strong>
            <div style={{ fontSize: '11px', marginLeft: '10px' }}>
              Email: {currentUser.email}<br/>
              Role: {currentUser.role}<br/>
              ID: {currentUser.id || currentUser._id}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '10px' }}>
          <strong>localStorage Data:</strong>
          <div style={{ fontSize: '10px', marginLeft: '10px' }}>
            {Object.entries(storageData).map(([key, value]) => (
              <div key={key}>
                {key}: {value || 'null'}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '10px' }}>
          <button 
            onClick={this.updateAuthStatus}
            style={{ 
              marginRight: '5px', 
              padding: '3px 8px', 
              fontSize: '11px',
              background: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Refresh
          </button>
          
          <button 
            onClick={this.handleClearSession}
            style={{ 
              padding: '3px 8px', 
              fontSize: '11px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer'
            }}
          >
            Clear Session
          </button>
        </div>

        <div style={{ 
          marginTop: '10px', 
          fontSize: '10px', 
          color: '#666',
          borderTop: '1px solid #eee',
          paddingTop: '5px'
        }}>
          <strong>Instructions:</strong><br/>
          1. Login to see data populate<br/>
          2. Refresh page - should stay logged in<br/>
          3. Use "Clear Session" to test logout
        </div>
      </div>
    );
  }
}

export default AuthenticationDebugger;
