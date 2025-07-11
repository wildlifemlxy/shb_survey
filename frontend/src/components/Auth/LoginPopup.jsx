import React, { Component } from 'react';
import './LoginPopupUpdated.css'; // Import the updated styles
import { fetchLoginData, changePassword, resetPassword } from '../../data/loginData';
// Note: Since we're using a class component, we can't directly use the useAuth hook
// We'll pass the login function as a prop from a parent component that uses the hook

class LoginPopup extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: '',
      password: '',
      isLoading: false,
      error: '',
      showPassword: false,
      showPasswordChange: false,
      newPassword: '',
      confirmPassword: '',
      showNewPassword: false,
      showConfirmPassword: false,
      passwordChangeError: '',
      isChangingPassword: false,
      userData: null,
      showResetPassword: false,
      resetEmail: '',
      isResettingPassword: false,
      resetPasswordError: '',
      resetPasswordSuccess: false
    };
  }

  componentDidMount() {
    console.log('LoginPopup mounted with props:', this.props);
  }

  handleInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, error: '' });
  };

  clearForm = () => {
    this.setState({
      email: '',
      password: '',
      error: '',
      showPassword: false,
      showPasswordChange: false,
      newPassword: '',
      confirmPassword: '',
      showNewPassword: false,
      showConfirmPassword: false,
      passwordChangeError: '',
      isChangingPassword: false,
      userData: null,
      showResetPassword: false,
      resetEmail: '',
      isResettingPassword: false,
      resetPasswordError: '',
      resetPasswordSuccess: false
    });
  };

  handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = this.state;
    
    if (!email || !password) {
      this.setState({ error: 'Please enter both email and password' });
      return;
    }
    
    try {
      this.setState({ isLoading: true, error: '' });
      
      const result = await fetchLoginData(email, password);
      console.log('Login result:', result);
      if (result.success) {
        // Check if this is first time login
        if (result.data && result.data.firstTimeLogin) {
          console.log('First time login detected, showing password change dialog');
          console.log('User data structure:', result.data);
          this.setState({ 
            showPasswordChange: true,
            userData: result.data,
            isLoading: false 
          });
        } else {
          // Normal login flow
          this.props.onLoginSuccess(result.data);
        }
      } else {
        this.setState({ 
          error: result?.message || 'Invalid email or password. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      this.setState({ 
        error: 'An error occurred during login. Please try again later.' 
      });
    } finally {
      this.setState({ isLoading: false });
    }
  };

  handleCloseButton = () => {
    this.clearForm();
    this.props.onClose();
  };

  handlePasswordChange = async (e) => {
    e.preventDefault();
    const { newPassword, confirmPassword, userData } = this.state;
    
    // Validation
    if (!newPassword || !confirmPassword) {
      this.setState({ passwordChangeError: 'Please fill in both password fields' });
      return;
    }
    
    if (newPassword.length < 8) {
      this.setState({ passwordChangeError: 'Password must be at least 8 characters long' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      this.setState({ passwordChangeError: 'Passwords do not match' });
      return;
    }
    
    try {
      this.setState({ isChangingPassword: true, passwordChangeError: '' });
      
      // Extract user ID (could be 'id' or '_id' depending on database)
      const userId = userData._id || userData.id;
      const userEmail = userData.email;
      
      console.log('Password change attempt with:', {
        userId: userId,
        email: userEmail,
        userData: userData
      });
      
      // Validate required data
      if (!userId) {
        this.setState({ 
          passwordChangeError: 'User ID not found. Please login again.' 
        });
        return;
      }
      
      if (!userEmail) {
        this.setState({ 
          passwordChangeError: 'User email not found. Please login again.' 
        });
        return;
      }
      
      // Call API to change password using the helper function
      const result = await changePassword(userId, userEmail, newPassword);
      
      if (result.success) {
        console.log('Password changed successfully');
        // Update userData to remove firstTimeLogin flag
        const updatedUserData = { ...userData, firstTimeLogin: false };
        // Complete the login process
        this.props.onLoginSuccess(updatedUserData);
      } else {
        this.setState({ 
          passwordChangeError: result?.message || 'Failed to change password. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Password change error:', error);
      this.setState({ 
        passwordChangeError: 'An error occurred while changing password. Please try again.' 
      });
    } finally {
      this.setState({ isChangingPassword: false });
    }
  };

  handlePasswordInputChange = (e) => {
    const { name, value } = e.target;
    this.setState({ [name]: value, passwordChangeError: '' });
  };

  handleResetPasswordClick = () => {
    this.setState({ 
      showResetPassword: true,
      resetEmail: this.state.email, // Pre-fill with entered email
      error: '' 
    });
  };

  handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    const { resetEmail } = this.state;
    
    if (!resetEmail) {
      this.setState({ resetPasswordError: 'Please enter your email address' });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      this.setState({ resetPasswordError: 'Please enter a valid email address' });
      return;
    }
    
    try {
      this.setState({ isResettingPassword: true, resetPasswordError: '' });
      
      // Call reset password API using the helper function
      const result = await resetPassword(resetEmail);
      
      if (result.success) {
        this.setState({ 
          resetPasswordSuccess: true,
          resetPasswordError: ''
        });
      } else {
        this.setState({ 
          resetPasswordError: result?.message || 'Failed to send reset email. Please try again.' 
        });
      }
    } catch (error) {
      console.error('Reset password error:', error);
      this.setState({ 
        resetPasswordError: 'An error occurred while sending reset email. Please try again.' 
      });
    } finally {
      this.setState({ isResettingPassword: false });
    }
  };

  handleResetPasswordInputChange = (e) => {
    this.setState({ resetEmail: e.target.value, resetPasswordError: '' });
  };

  handleBackToLogin = () => {
    this.setState({ 
      showResetPassword: false,
      resetEmail: '',
      resetPasswordError: '',
      resetPasswordSuccess: false
    });
  };

  render() {
    const { email, password, isLoading, error, showPasswordChange, newPassword, confirmPassword, showNewPassword, showConfirmPassword, passwordChangeError, isChangingPassword, showResetPassword, resetEmail, isResettingPassword, resetPasswordError, resetPasswordSuccess } = this.state;
    const { isOpen } = this.props;

    if (!isOpen) return null;

    // Show password change dialog if first time login
    if (showPasswordChange) {
      return (
        <div className="login-popup-overlay">
          <div className="login-card">
            <button className="login-close-button" onClick={this.handleCloseButton}>
              x
            </button>
            
            <div className="login-header">
              <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="login-logo" />
              <h1>Change Your Password</h1>
              <p>Please set a new password for your account</p>
            </div>
            
            <form className="login-form" onSubmit={this.handlePasswordChange}>
              {passwordChangeError && (
                <div className="login-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {passwordChangeError}
                </div>
              )}
              
              <div className="form-group">
                <label htmlFor="newPassword">New Password</label>
                <div className="password-input-container" style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    id="newPassword"
                    name="newPassword"
                    value={newPassword}
                    onChange={this.handlePasswordInputChange}
                    placeholder="Enter new password (min 8 characters)"
                    disabled={isChangingPassword}
                    style={{width: '100%'}}
                  />
                  <button
                    type="button"
                    onClick={() => this.setState(prevState => ({ showNewPassword: !prevState.showNewPassword }))}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#555',
                    }}
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
                <div className="password-input-container" style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={this.handlePasswordInputChange}
                    placeholder="Confirm new password"
                    disabled={isChangingPassword}
                    style={{width: '100%'}}
                  />
                  <button
                    type="button"
                    onClick={() => this.setState(prevState => ({ showConfirmPassword: !prevState.showConfirmPassword }))}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: '#555',
                    }}
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
              
              <div className="login-button-group">
                <button 
                  type="submit" 
                  className="login-button"
                  style={{
                    background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)',
                    boxShadow: '0 4px 15px rgba(0, 184, 234, 0.3)',
                    width: '100%'
                  }}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? (
                    <div className="loading-spinner">
                      <div className="spinner"></div>
                      Changing Password...
                    </div>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

    // Show reset password form
    if (showResetPassword) {
      return (
        <div className="login-popup-overlay">
          <div className="login-card">
            <button className="login-close-button" onClick={this.handleCloseButton}>
              x
            </button>
            
            <div className="login-header">
              <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="login-logo" />
              <h1>Reset Password</h1>
              <p>Enter your email to receive password reset instructions</p>
            </div>
            
            <form className="login-form" onSubmit={this.handleResetPasswordSubmit}>
              {resetPasswordError && (
                <div className="login-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {resetPasswordError}
                </div>
              )}
              
              {resetPasswordSuccess ? (
                <div className="login-success">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  Password reset email sent successfully! Please check your inbox.
                </div>
              ) : (
                <>
                  <div className="form-group">
                    <label htmlFor="resetEmail">Email</label>
                    <input
                      type="text"
                      id="resetEmail"
                      name="resetEmail"
                      value={resetEmail}
                      onChange={this.handleResetPasswordInputChange}
                      placeholder="Enter your email"
                      disabled={isResettingPassword}
                    />
                  </div>
                  
                  <div className="login-button-group">
                    <button 
                      type="button" 
                      className="login-button"
                      style={{
                        background: '#22c55e', // Green color
                        color: 'white',
                        boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)'
                      }}
                      onClick={this.handleBackToLogin}
                      disabled={isResettingPassword}
                    >
                      Back to Login
                    </button>
                    
                    <button 
                      type="submit" 
                      className="login-button"
                      style={{
                        background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)', // Blue gradient
                        boxShadow: '0 4px 15px rgba(0, 184, 234, 0.3)'
                      }}
                      disabled={isResettingPassword}
                    >
                      {isResettingPassword ? (
                        <div className="loading-spinner">
                          <div className="spinner"></div>
                          Sending Reset Email...
                        </div>
                      ) : (
                        'Send Reset Email'
                      )}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      );
    }

    // Regular login form
    return (
      <div className="login-popup-overlay">
        <div className="login-card">
          <button className="login-close-button" onClick={this.handleCloseButton}>
            x
          </button>
          
          <div className="login-header">
            <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="login-logo" />
            <h1>WWF SHB Survey System</h1>
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
              <label htmlFor="email">Email</label>
              <input
                type="text"
                id="email"
                name="email"
                value={email}
                onChange={this.handleInputChange}
                placeholder="Enter your email"
                disabled={isLoading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container" style={{ position: 'relative' }}>
                <input
                  type={this.state.showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={password}
                  onChange={this.handleInputChange}
                  placeholder="Enter your password"
                  disabled={isLoading}
                  style={{width: '100%'}}
                />
                <button
                  type="button"
                  onClick={() => this.setState(prevState => ({ showPassword: !prevState.showPassword }))}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    color: '#555',
                  }}
                >
                  {this.state.showPassword ? (
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
            
            {/* Reset Password Link */}
            <div style={{ textAlign: 'right', marginBottom: '1rem' }}>
              <button
                type="button"
                onClick={this.handleResetPasswordClick}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#22c55e',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textDecoration: 'underline',
                  padding: '0',
                  fontWeight: '500'
                }}
                disabled={isLoading}
              >
                Forgot Password?
              </button>
            </div>
            
            <div className="login-button-group">
              <button 
                type="button" 
                className="login-button"
                style={{
                  background: '#22c55e', // Green color
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(34, 197, 94, 0.2)'
                }}
                onClick={this.clearForm}
                disabled={isLoading}
              >
                Clear
              </button>
              
              <button 
                type="submit" 
                className="login-button"
                style={{
                  background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)', // Blue gradient
                  boxShadow: '0 4px 15px rgba(0, 184, 234, 0.3)'
                }}
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
            </div>
          </form>
        </div>
      </div>
    );
  }
}

export default LoginPopup;
