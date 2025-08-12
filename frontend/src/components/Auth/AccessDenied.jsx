import React, { Component } from 'react';
import { Navigate, Link } from 'react-router-dom';

class AccessDenied extends Component {
  constructor(props) {
    super(props);
    this.state = {
      countdown: 8,
      shouldRedirect: false
    };
  }

  componentDidMount() {
    this.timer = setInterval(() => {
      this.setState(prevState => {
        if (prevState.countdown <= 1) {
          clearInterval(this.timer);
          return { countdown: 0, shouldRedirect: true };
        }
        return { countdown: prevState.countdown - 1 };
      });
    }, 1000);
  }

  componentWillUnmount() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  getUserRole = () => {
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        return userData.role;
      }
      return localStorage.getItem('userRole');
    } catch (error) {
      return 'Unknown';
    }
  };

  render() {
    const { countdown, shouldRedirect } = this.state;
    const userRole = this.getUserRole();

    if (shouldRedirect) {
      return <Navigate to="/dashboard" replace />;
    }

    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8f9fa',
        fontFamily: 'Arial, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          backgroundColor: 'white',
          padding: '3rem',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '4rem',
            color: '#dc3545',
            marginBottom: '1rem'
          }}>
            🚫
          </div>
          
          <h1 style={{
            color: '#dc3545',
            marginBottom: '1rem',
            fontSize: '2.5rem'
          }}>
            Access Denied
          </h1>
          
          <h2 style={{
            color: '#6c757d',
            marginBottom: '1.5rem',
            fontSize: '1.2rem',
            fontWeight: 'normal'
          }}>
            Restricted Area
          </h2>
          
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem',
            color: '#856404'
          }}>
            <p style={{ margin: '0', marginBottom: '0.5rem' }}>
              <strong>Your Role:</strong> {userRole}
            </p>
            <p style={{ margin: '0' }}>
              This page is restricted for your user role. Only administrators and researchers can access this area.
            </p>
          </div>
          
          <p style={{
            color: '#666',
            marginBottom: '1.5rem',
            lineHeight: '1.5'
          }}>
            You don't have permission to access this page. 
            You will be redirected to the dashboard in <strong>{countdown}</strong> seconds.
          </p>
          
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link 
              to="/dashboard" 
              style={{
                backgroundColor: '#007bff',
                color: 'white',
                textDecoration: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '5px',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#007bff'}
            >
              Go to Dashboard
            </Link>
            
            <Link 
              to="/" 
              style={{
                backgroundColor: '#6c757d',
                color: 'white',
                textDecoration: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '5px',
                fontSize: '1rem',
                fontWeight: '500',
                transition: 'background-color 0.3s'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#545b62'}
              onMouseOut={(e) => e.target.style.backgroundColor = '#6c757d'}
            >
              Go to Home
            </Link>
          </div>
          
          <div style={{
            marginTop: '2rem',
            padding: '1rem',
            backgroundColor: '#e7f3ff',
            borderRadius: '8px',
            color: '#004085'
          }}>
            <p style={{ margin: '0', fontSize: '0.9rem' }}>
              <strong>Need access?</strong> Contact your system administrator if you believe you should have access to this area.
            </p>
          </div>
        </div>
      </div>
    );
  }
}

export default AccessDenied;
