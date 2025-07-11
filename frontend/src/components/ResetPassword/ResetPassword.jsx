import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import './ResetPassword.css';

class ResetPassword extends Component {
  constructor(props) {
    super(props);
    this.state = {
      token: '',
      newPassword: '',
      confirmPassword: '',
      isLoading: false,
      error: '',
      success: false,
      showNewPassword: false,
      showConfirmPassword: false
    };
  }

  componentDidMount() {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      this.setState({ token });
    } else {
      this.setState({ error: 'Invalid or missing reset token.' });
    }
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: '' });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { token, newPassword, confirmPassword } = this.state;
    
    // Validation
    if (!newPassword || !confirmPassword) {
      this.setState({ error: 'Please fill in both password fields' });
      return;
    }
    
    if (newPassword.length < 8) {
      this.setState({ error: 'Password must be at least 8 characters long' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      this.setState({ error: 'Passwords do not match' });
      return;
    }
    
    if (!token) {
      this.setState({ error: 'Invalid reset token' });
      return;
    }
    
    try {
      this.setState({ isLoading: true, error: '' });
      
      // TODO: Implement actual password reset API call
      // For now, just simulate success
      setTimeout(() => {
        this.setState({ 
          success: true,
          isLoading: false 
        });
      }, 1500);
      
    } catch (error) {
      console.error('Password reset error:', error);
      this.setState({ 
        error: 'An error occurred while resetting password. Please try again.',
        isLoading: false 
      });
    }
  };

  render() {
    const { newPassword, confirmPassword, isLoading, error, success, showNewPassword, showConfirmPassword } = this.state;
    
    if (success) {
      return (
        <div className="reset-password-container">
          <div className="reset-password-card">
            <div className="reset-password-header">
              <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="reset-password-logo" />
              <h1>Password Reset Successful</h1>
              <p>Your password has been successfully reset.</p>
            </div>
            
            <div className="success-message">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="success-icon">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              <p>You can now sign in with your new password.</p>
            </div>
            
            <div className="reset-password-actions">
              <Link to="/login" className="back-to-login-button">
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      );
    }
    
    return (
      <div className="reset-password-container">
        <div className="reset-password-card">
          <div className="reset-password-header">
            <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="reset-password-logo" />
            <h1>Reset Your Password</h1>
            <p>Enter your new password below</p>
          </div>
          
          <form className="reset-password-form" onSubmit={this.handleSubmit}>
            {error && (
              <div className="error-message">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
                {error}
              </div>
            )}
            
            <div className="form-group">
              <label htmlFor="newPassword">New Password</label>
              <div className="password-input-container">
                <input
                  type={showNewPassword ? "text" : "password"}
                  id="newPassword"
                  name="newPassword"
                  value={newPassword}
                  onChange={this.handleInputChange}
                  placeholder="Enter new password (min 8 characters)"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => this.setState(prevState => ({ showNewPassword: !prevState.showNewPassword }))}
                >
                  {showNewPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={this.handleInputChange}
                  placeholder="Confirm new password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => this.setState(prevState => ({ showConfirmPassword: !prevState.showConfirmPassword }))}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
            
            <div className="reset-password-actions">
              <Link to="/login" className="back-link">
                Back to Login
              </Link>
              
              <button 
                type="submit" 
                className="reset-button"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="loading-spinner">
                    <div className="spinner"></div>
                    Resetting Password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default ResetPassword;
