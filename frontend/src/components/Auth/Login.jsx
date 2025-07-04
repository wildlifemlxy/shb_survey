import React, { Component } from 'react';
import './Login.css';

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      username: '',
      password: '',
      isLoading: false,
      error: ''
    };
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: '' });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { username, password } = this.state;
    
    if (!username || !password) {
      this.setState({ error: 'Please enter both username and password' });
      return;
    }

    this.setState({ isLoading: true, error: '' });

    try {
      // Simulate authentication - you can replace this with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, accept any non-empty credentials
      // In production, validate against your backend
      if (username.trim() && password.trim()) {
        // Create a user object to pass to the context
        const userData = {
          email: username,
          role: 'user',
          userId: '12345'
        };
        
        // Call the login success callback with the user data
        if (this.props.onLoginSuccess) {
          this.props.onLoginSuccess(userData);
        }
      } else {
        this.setState({ error: 'Invalid credentials' });
      }
    } catch (error) {
      this.setState({ error: 'Login failed. Please try again.' });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  render() {
    const { username, password, isLoading, error } = this.state;

    return (
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src="/shb.png" alt="SHB Logo" className="login-logo" />
            <h1>SHB Survey System</h1>
            <p>Please sign in to continue</p>
          </div>
          
          <form className="login-form" onSubmit={this.handleSubmit}>
            {error && (
              <div className="login-error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                value={username}
                onChange={this.handleInputChange}
                placeholder="Enter your username"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={this.handleInputChange}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            
            <button 
              type="submit" 
              className="login-button"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="loading-spinner">
                  <div className="spinner"></div>
                  Signing In...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
          
          <div className="login-footer">
            <p>Demo: Use any username and password to login</p>
          </div>
        </div>
      </div>
    );
  }
}

export default Login;
