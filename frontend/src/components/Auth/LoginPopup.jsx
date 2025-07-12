import React, { Component } from 'react';
import './LoginPopupUpdated.css'; // Import the updated styles
import { fetchLoginData, changePassword, resetPassword } from '../../data/loginData';
import QRCode from 'qrcode';
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
      resetPasswordSuccess: false,
      showMFAPin: false,
      mfaPin: '',
      qrCodeDataUrl: '',
      isGeneratingMFA: false,
      mfaError: '',
      userInputPin: ['', '', '', '', '', '', '', ''], // 8 digit input array
      currentInputIndex: 0
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
      resetPasswordSuccess: false,
      showMFAPin: false,
      mfaPin: '',
      qrCodeDataUrl: '',
      isGeneratingMFA: false,
      mfaError: '',
      userInputPin: ['', '', '', '', '', '', '', ''],
      currentInputIndex: 0
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
          // Normal login flow - generate MFA PIN
          console.log('Normal login successful, generating MFA PIN');
          await this.generateMFAPinAndQR(email, result.data);
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

  generateMFAPinAndQR = async (email, userData) => {
    try {
      this.setState({ isGeneratingMFA: true, mfaError: '' });
      
      // Generate 8-digit PIN locally (frontend only)
      const pin = this.generateLocalMFAPin(8);
      console.log('Generated 8-digit PIN locally:', pin);
      
      // Generate QR code from the PIN
      const qrCodeDataUrl = await QRCode.toDataURL(pin, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      
      this.setState({
        showMFAPin: true,
        mfaPin: pin,
        qrCodeDataUrl: qrCodeDataUrl,
        userData: userData,
        isGeneratingMFA: false
      });
    } catch (error) {
      console.error('Error generating MFA PIN and QR code:', error);
      this.setState({
        mfaError: 'Failed to generate MFA PIN and QR code',
        isGeneratingMFA: false
      });
    }
  };

  // Generate MFA PIN locally without backend
  generateLocalMFAPin = (length = 8) => {
    const digits = '0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += digits.charAt(Math.floor(Math.random() * digits.length));
    }
    return result;
  };

  // Handle PIN input for the 8-square grid
  handlePinInputChange = (index, value) => {
    // Only allow single digits
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newUserInputPin = [...this.state.userInputPin];
    newUserInputPin[index] = value;

    this.setState({
      userInputPin: newUserInputPin,
      mfaError: '' // Clear any previous error
    });

    // Auto-focus next input if digit entered
    if (value && index < 7) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle backspace and navigation in PIN inputs
  handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!this.state.userInputPin[index] && index > 0) {
        // If current input is empty and backspace pressed, go to previous
        const prevInput = document.getElementById(`pin-input-${index - 1}`);
        if (prevInput) {
          prevInput.focus();
          // Clear the previous input
          const newUserInputPin = [...this.state.userInputPin];
          newUserInputPin[index - 1] = '';
          this.setState({ userInputPin: newUserInputPin });
        }
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.getElementById(`pin-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    } else if (e.key === 'ArrowRight' && index < 7) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Verify the entered PIN against the generated PIN
  handleVerifyPin = () => {
    const enteredPin = this.state.userInputPin.join('');
    const generatedPin = this.state.mfaPin;

    if (enteredPin.length !== 8) {
      this.setState({ mfaError: 'Please enter all 8 digits' });
      return;
    }

    if (enteredPin === generatedPin) {
      // PIN matches, proceed with login
      this.handleMFAComplete();
    } else {
      this.setState({ 
        mfaError: 'PIN does not match. Please try again.',
        userInputPin: ['', '', '', '', '', '', '', ''] // Clear the input
      });
      // Focus first input
      const firstInput = document.getElementById('pin-input-0');
      if (firstInput) firstInput.focus();
    }
  };

  handleMFAComplete = () => {
    // Complete the login process after MFA
    const { userData } = this.state;
    this.props.onLoginSuccess(userData);
  };

  handleMFASkip = () => {
    // Allow skipping MFA for now (optional)
    const { userData } = this.state;
    this.props.onLoginSuccess(userData);
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
        // Generate MFA PIN after password change
        await this.generateMFAPinAndQR(userEmail, updatedUserData);
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
    const { email, password, isLoading, error, showPasswordChange, newPassword, confirmPassword, showNewPassword, showConfirmPassword, passwordChangeError, isChangingPassword, showResetPassword, resetEmail, isResettingPassword, resetPasswordError, resetPasswordSuccess, showMFAPin, mfaPin, qrCodeDataUrl, isGeneratingMFA, mfaError, userInputPin } = this.state;
    const { isOpen } = this.props;

    if (!isOpen) return null;

    // Show MFA PIN and QR Code dialog
    if (showMFAPin) {
      return (
        <div className="login-popup-overlay">
          <div className="login-card">
            <button className="login-close-button" onClick={this.handleCloseButton}>
              x
            </button>
            
            <div className="login-header">
              <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="login-logo" />
              <h1>Multi-Factor Authentication</h1>
              <p>Scan the QR code and enter the 8-digit PIN</p>
            </div>
            
            <form className="login-form">
              {mfaError && (
                <div className="login-error" style={{ marginBottom: '0.8rem' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {mfaError}
                </div>
              )}
              
              {qrCodeDataUrl && (
                <div className="form-group" style={{ textAlign: 'center' }}>
                  <label style={{ color: '#333', marginBottom: '0.5rem', fontSize: '14px' }}>Scan QR Code:</label>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.5rem',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid #e9ecef'
                  }}>
                    <img 
                      src={qrCodeDataUrl} 
                      alt="MFA Authentication QR Code" 
                      style={{ display: 'block', width: '140px', height: '140px' }}
                    />
                  </div>
                  <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.7rem' }}>
                    Scan this QR code with your authenticator app
                  </p>
                </div>
              )}
              
              {/* 8-square PIN input grid */}
              <div className="form-group">
                <label style={{ color: '#333', marginBottom: '0.5rem', fontSize: '14px' }}>Enter 8-Digit PIN:</label>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '6px',
                  flexWrap: 'nowrap', // Prevent wrapping
                  maxWidth: '360px',
                  margin: '0 auto',
                  alignItems: 'center'
                }}>
                  {userInputPin.map((digit, index) => (
                    <input
                      key={index}
                      id={`pin-input-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => this.handlePinInputChange(index, e.target.value)}
                      onKeyDown={(e) => this.handlePinKeyDown(index, e)}
                      style={{
                        width: '35px',
                        height: '35px',
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        backgroundColor: 'white',
                        color: '#333',
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        flexShrink: 0, // Prevent shrinking
                        ...(digit && {
                          borderColor: '#00B8EA',
                          backgroundColor: '#f0f9ff'
                        })
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = '#00B8EA';
                        e.target.style.boxShadow = '0 0 0 2px rgba(0, 184, 234, 0.1)';
                      }}
                      onBlur={(e) => {
                        if (!digit) {
                          e.target.style.borderColor = '#e9ecef';
                          e.target.style.boxShadow = 'none';
                        }
                      }}
                      disabled={isGeneratingMFA}
                    />
                  ))}
                </div>
                <p style={{ marginTop: '0.3rem', color: '#666', fontSize: '0.7rem' }}>
                  Enter the 8-digit PIN from the QR code
                </p>
              </div>
              
              <div className="login-button-group">
                <button 
                  type="button" 
                  className="login-button"
                  style={{
                    background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)',
                    boxShadow: '0 4px 15px rgba(0, 184, 234, 0.3)',
                    width: '100%'
                  }}
                  onClick={this.handleVerifyPin}
                  disabled={isGeneratingMFA}
                >
                  {isGeneratingMFA ? (
                    <div className="loading-spinner">
                      <div className="spinner"></div>
                      Generating QR Code...
                    </div>
                  ) : (
                    'Verify PIN'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      );
    }

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
