import React, { Component } from 'react';
import './LoginPopup.css'; // Import the updated styles
import { fetchLoginData, changePassword, resetPassword } from '../../data/loginData';
import QRCode from 'qrcode';
import botDetectionService from '../../services/botDetection';
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
      currentInputIndex: 0,
      // Bot detection states
      showBotChallenge: false,
      botChallenge: null,
      challengeAnswer: '',
      botDetectionResult: null,
      isPerformingBotDetection: false,
      pinInputStartTimes: new Array(8).fill(null),
      // Google reCAPTCHA states
      recaptchaWidgetId: null,
      recaptchaResponse: null,
      isRecaptchaLoaded: false
    };
  }

  componentDidMount() {
    console.log('LoginPopup mounted with props:', this.props);
    // Add event listener for keypad input when component mounts
    document.addEventListener('keydown', this.handleGlobalKeyDown);
    
    // Initialize bot detection
    botDetectionService.initialize();
  }

  componentWillUnmount() {
    // Clean up event listener when component unmounts
    document.removeEventListener('keydown', this.handleGlobalKeyDown);
    
    // Clean up bot detection
    botDetectionService.cleanup();
  }

  // Global keydown handler for auto-filling PIN inputs
  handleGlobalKeyDown = (e) => {
    // Only handle keypad input when MFA dialog is open
    if (!this.state.showMFAPin) return;
    
    // Check if it's a number key (0-9) from either main keyboard or numpad
    const isNumberKey = (e.key >= '0' && e.key <= '9') || 
                       (e.keyCode >= 96 && e.keyCode <= 105); // Numpad keys
    
    if (isNumberKey) {
      e.preventDefault(); // Prevent default behavior
      
      // Find the first empty PIN input box
      const currentInputs = this.state.userInputPin;
      const firstEmptyIndex = currentInputs.findIndex(digit => digit === '');
      
      if (firstEmptyIndex !== -1) {
        // Auto-fill the number in the first empty box
        this.handlePinInputChange(firstEmptyIndex, e.key);
        
        // Focus the input box that was just filled
        setTimeout(() => {
          const targetInput = document.getElementById(`pin-input-${firstEmptyIndex}`);
          if (targetInput) targetInput.focus();
        }, 0);
      }
    }
  };

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
      currentInputIndex: 0,
      // Reset bot detection states
      showBotChallenge: false,
      botChallenge: null,
      challengeAnswer: '',
      botDetectionResult: null,
      isPerformingBotDetection: false,
      pinInputStartTimes: new Array(8).fill(null),
      // Reset reCAPTCHA states
      recaptchaWidgetId: null,
      recaptchaResponse: null,
      isRecaptchaLoaded: false
    });
    
    // Reset bot detection service
    botDetectionService.reset();
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
    const pinInputStartTimes = [...this.state.pinInputStartTimes];
    
    // Track timing for bot detection
    const currentTime = Date.now();
    if (pinInputStartTimes[index] === null) {
      pinInputStartTimes[index] = currentTime;
    }
    
    newUserInputPin[index] = value;

    this.setState({
      userInputPin: newUserInputPin,
      pinInputStartTimes: pinInputStartTimes,
      mfaError: '' // Clear any previous error
    });

    // Track PIN input behavior for bot detection
    if (value && pinInputStartTimes[index]) {
      const timeTaken = currentTime - pinInputStartTimes[index];
      botDetectionService.trackPinInputBehavior(index, timeTaken, 'keyboard');
    }

    // Auto-focus next input if digit entered
    if (value && index < 7) {
      const nextInput = document.getElementById(`pin-input-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  // Handle backspace and navigation in PIN inputs
  handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      e.preventDefault(); // Prevent default backspace behavior
      
      const currentInputs = [...this.state.userInputPin];
      
      if (currentInputs[index]) {
        // If current input has a value, clear it and stay in same box
        currentInputs[index] = '';
        this.setState({ userInputPin: currentInputs });
      } else if (index > 0) {
        // If current input is empty, move to previous box and clear it
        const prevInput = document.getElementById(`pin-input-${index - 1}`);
        if (prevInput) {
          currentInputs[index - 1] = '';
          this.setState({ userInputPin: currentInputs });
          prevInput.focus();
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
  handleVerifyPin = async () => {
    const enteredPin = this.state.userInputPin.join('');
    const generatedPin = this.state.mfaPin;

    if (enteredPin.length !== 8) {
      this.setState({ mfaError: 'Please enter all 8 digits' });
      return;
    }

    if (enteredPin === generatedPin) {
      // PIN matches, perform bot detection before completing login
      await this.performBotDetection();
    } else {
      this.setState({ 
        mfaError: 'PIN does not match. Please try again.',
        userInputPin: ['', '', '', '', '', '', '', ''], // Clear the input
        pinInputStartTimes: new Array(8).fill(null) // Reset timing
      });
      // Focus first input
      const firstInput = document.getElementById('pin-input-0');
      if (firstInput) firstInput.focus();
    }
  };

  // Perform comprehensive bot detection
  performBotDetection = async () => {
    try {
      this.setState({ isPerformingBotDetection: true, mfaError: '' });
      
      const { email } = this.state;
      const userAgent = navigator.userAgent;
      
      // Perform bot detection analysis
      const detectionResult = await botDetectionService.performBotDetectionWithOverride(email, userAgent);
      
      this.setState({ 
        botDetectionResult: detectionResult,
        isPerformingBotDetection: false 
      });
      
      console.log('Bot detection completed:', detectionResult);
      
      // If autofill was detected, be extremely lenient
      if (detectionResult.autofillDetected) {
        console.log('Autofill detected - proceeding with login (very lenient mode)');
        this.handleMFAComplete();
        return;
      }
      
      // Handle based on risk level - made more lenient
      if (detectionResult.isBot && detectionResult.riskLevel === 'HIGH' && detectionResult.botScore > 85) {
        // Only show challenge for very high risk users
        const challenge = botDetectionService.getVerificationChallenge();
        this.setState({ 
          showBotChallenge: true,
          botChallenge: challenge,
          mfaError: 'Additional verification required for security.' 
        });
        
        // Load and initialize reCAPTCHA
        setTimeout(() => {
          this.initializeRecaptcha();
        }, 100);
      } else if (detectionResult.riskLevel === 'HIGH' || detectionResult.riskLevel === 'MEDIUM') {
        // For medium/high risk - add small delay but proceed
        console.log('Medium/High risk detected, adding delay but allowing login');
        setTimeout(() => {
          this.handleMFAComplete();
        }, 500); // Reduced delay from 1000ms to 500ms
      } else {
        // Low risk or safe - proceed normally
        this.handleMFAComplete();
      }
      
    } catch (error) {
      console.error('Bot detection error:', error);
      // If bot detection fails, proceed with login anyway
      console.log('Bot detection failed, proceeding with login');
      this.handleMFAComplete();
    }
  };

  // Handle human verification challenge (reCAPTCHA v3)
  handleChallengeSubmit = async () => {
    try {
      this.setState({ mfaError: 'Initializing reCAPTCHA v3...' });
      
      // Execute reCAPTCHA v3 verification
      const recaptchaResponse = await botDetectionService.executeRecaptcha('login');
      
      if (!recaptchaResponse) {
        this.setState({ mfaError: 'Failed to get reCAPTCHA response. Please refresh the page and try again.' });
        return;
      }
      
      this.setState({ mfaError: 'Validating with server...' });
      
      // Validate reCAPTCHA response
      const validation = await botDetectionService.validateRecaptcha(recaptchaResponse);
      
      console.log('Full validation result:', validation);
      
      if (validation.success) {
        // Check the score (v3 provides a score from 0.0 to 1.0)
        const score = validation.score || 0;
        const riskLevel = validation.risk_level || 'UNKNOWN';
        
        console.log('reCAPTCHA v3 verification successful:', {
          score: score,
          riskLevel: riskLevel,
          action: validation.action
        });
        
        // Proceed with login regardless of score since backend already validated
        this.setState({ 
          showBotChallenge: false,
          botChallenge: null,
          recaptchaResponse: null,
          recaptchaWidgetId: null,
          mfaError: '' 
        });
        this.handleMFAComplete();
      } else {
        // Validation failed - provide detailed error information
        console.error('reCAPTCHA validation failed:', validation);
        
        let errorMessage = 'reCAPTCHA verification failed. Please try again.';
        
        if (validation.networkError) {
          errorMessage = 'Network error during verification. Please check your connection and try again.';
        } else if (validation.reason === 'score_too_low') {
          errorMessage = `Security verification failed. Your activity appears suspicious (score: ${validation.score?.toFixed(2) || 'unknown'}). Please contact support if this persists.`;
        } else if (validation.errors) {
          const errors = Array.isArray(validation.errors) ? validation.errors : [validation.errors];
          if (errors.includes('invalid-input-secret')) {
            errorMessage = 'Server configuration error. Please contact support.';
          } else if (errors.includes('invalid-input-response')) {
            errorMessage = 'Invalid verification response. Please refresh and try again.';
          } else if (errors.includes('timeout-or-duplicate')) {
            errorMessage = 'Verification expired. Please try again.';
          } else {
            errorMessage = `Verification failed: ${errors.join(', ')}`;
          }
        }
        
        this.setState({ 
          mfaError: errorMessage 
        });
      }
    } catch (error) {
      console.error('reCAPTCHA challenge error:', error);
      this.setState({ 
        mfaError: `Verification error: ${error.message}. Please refresh the page and try again.` 
      });
    }
  };

  // Handle reCAPTCHA callback
  handleRecaptchaCallback = (response) => {
    console.log('reCAPTCHA completed:', response);
    this.setState({ 
      recaptchaResponse: response,
      mfaError: '' 
    });
  };

  // Handle reCAPTCHA expired
  handleRecaptchaExpired = () => {
    console.log('reCAPTCHA expired');
    this.setState({ 
      recaptchaResponse: null,
      mfaError: 'reCAPTCHA expired. Please verify again.' 
    });
  };

  // Initialize reCAPTCHA widget
  initializeRecaptcha = () => {
    if (!this.state.isRecaptchaLoaded && window.grecaptcha) {
      try {
        const widgetId = botDetectionService.renderRecaptcha(
          'recaptcha-container',
          this.handleRecaptchaCallback,
          this.handleRecaptchaExpired
        );
        
        this.setState({ 
          recaptchaWidgetId: widgetId,
          isRecaptchaLoaded: true 
        });
      } catch (error) {
        console.error('Error initializing reCAPTCHA:', error);
        this.setState({ 
          mfaError: 'Failed to load security verification. Please refresh the page.' 
        });
      }
    }
  };

  // Handle challenge input
  handleChallengeInputChange = (e) => {
    // This method is no longer needed for Google reCAPTCHA
    // but kept for compatibility
    this.setState({ 
      challengeAnswer: e.target.value,
      mfaError: '' 
    });
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
    const { 
      email, password, isLoading, error, showPasswordChange, newPassword, confirmPassword, 
      showNewPassword, showConfirmPassword, passwordChangeError, isChangingPassword, 
      showResetPassword, resetEmail, isResettingPassword, resetPasswordError, resetPasswordSuccess, 
      showMFAPin, mfaPin, qrCodeDataUrl, isGeneratingMFA, mfaError, userInputPin,
      showBotChallenge, botChallenge, challengeAnswer, isPerformingBotDetection
    } = this.state;
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
            
            <form className="login-form" onSubmit={(e) => { e.preventDefault(); this.handleVerifyPin(); }}>
              {mfaError && (
                <div className="login-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {mfaError}
                </div>
              )}

              {qrCodeDataUrl && !showBotChallenge && !botChallenge && (
                <div className="form-group" style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <label style={{ color: '#333', marginBottom: '0.5rem', fontSize: '14px' }}>Scan QR Code:</label>
                  <div style={{
                    display: 'inline-block',
                    padding: '0.5rem',
                    background: 'white',
                    borderRadius: '6px',
                    border: '2px solid #e9ecef',
                    margin: '0 auto'
                  }}>
                    <img 
                      src={qrCodeDataUrl} 
                      alt="MFA Authentication QR Code" 
                      style={{ display: 'block', width: '140px', height: '140px', margin: '0 auto' }}
                    />
                  </div>
                  <p style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.7rem', textAlign: 'center' }}>
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
                  gap: '6px', // Increased gap between inputs
                  flexWrap: 'nowrap', // Prevent wrapping
                  maxWidth: '100%',
                  margin: '0 auto',
                  alignItems: 'center',
                  paddingBottom: '1.5rem', // Increased padding to ensure bottom border is visible
                  paddingTop: '0.5rem',
                  paddingLeft: '10px', // Add side padding
                  paddingRight: '10px' // Add side padding
                }}>
                  {userInputPin.map((digit, index) => (
                    <input
                      key={index}
                      id={`pin-input-${index}`}
                      type="text"
                      maxLength="1"
                      value={digit}
                      onChange={(e) => this.handlePinInputChange(index, e.target.value)}
                      className="pin-input-box"
                      onKeyDown={(e) => this.handlePinKeyDown(index, e)}
                      style={{
                        width: '35px',
                        height: '35px',
                        textAlign: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        border: '2px solid #e9ecef',
                        borderRadius: '6px',
                        backgroundColor: showBotChallenge ? '#f8f9fa' : 'white',
                        color: '#000000', // Pure black color for numbers
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        flexShrink: 0, // Prevent shrinking
                        padding: '0', // Override form-group input padding
                        margin: '0', // Ensure no margin interference
                        boxSizing: 'border-box', // Include border in width/height calculation
                        opacity: showBotChallenge ? 0.6 : 1,
                        cursor: showBotChallenge ? 'not-allowed' : 'text',
                        ...(digit && !showBotChallenge && {
                          borderColor: '#00B8EA',
                          backgroundColor: '#f0f9ff',
                          color: '#000000' // Ensure black color even when filled
                        })
                      }}
                      disabled={isGeneratingMFA || showBotChallenge}
                    />
                  ))}
                </div>
                <p style={{ marginTop: '0.3rem', color: '#666', fontSize: '0.7rem', textAlign: 'center' }}>
                  Enter the 8-digit PIN from the QR code
                </p>
              </div>
              
              {/* Human Verification Challenge */}
              {showBotChallenge && botChallenge && (
                <div className="form-group" style={{ 
                  background: '#fff3cd', 
                  border: '1px solid #ffeaa7', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  margin: '1rem 0' 
                }}>
                  <h4 style={{ color: '#856404', marginBottom: '0.5rem', fontSize: '14px' }}>
                    🛡️ Security Verification Required
                  </h4>
                  <p style={{ color: '#856404', fontSize: '13px', marginBottom: '1rem' }}>
                    Our security system has detected unusual activity. Please verify you are human:
                  </p>
                  
                  {/* reCAPTCHA v3 Information */}
                  <div style={{ 
                    textAlign: 'center', 
                    margin: '1rem 0',
                    padding: '1rem',
                    background: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{
                      color: '#495057',
                      fontSize: '14px',
                      marginBottom: '0.5rem'
                    }}>
                      🔒 Advanced Security Verification
                    </div>
                    <div style={{
                      color: '#6c757d',
                      fontSize: '12px',
                      lineHeight: '1.4'
                    }}>
                      This site is protected by reCAPTCHA v3 and the Google{' '}
                      <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                        Privacy Policy
                      </a>{' '}
                      and{' '}
                      <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#007bff' }}>
                        Terms of Service
                      </a>{' '}
                      apply.
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center',
                    marginTop: '1rem'
                  }}>
                    <button
                      type="button"
                      onClick={this.handleChallengeSubmit}
                      style={{
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.75rem 1.5rem',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        transition: 'background-color 0.2s ease'
                      }}
                    >
                      🔐 Verify Human & Continue
                    </button>
                  </div>
                  
                  <p style={{ 
                    fontSize: '11px', 
                    color: '#666', 
                    textAlign: 'center',
                    margin: '10px 0 0 0',
                    fontStyle: 'italic'
                  }}>
                    Protected by reCAPTCHA
                  </p>
                </div>
              )}
              
              <div className="login-button-group">
                <button 
                  type="submit" 
                  className="login-button"
                  style={{
                    background: isPerformingBotDetection 
                      ? 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                      : 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)',
                    boxShadow: '0 4px 15px rgba(0, 184, 234, 0.3)',
                    width: '100%'
                  }}
                  disabled={isGeneratingMFA || isPerformingBotDetection || this.state.userInputPin.join('').length !== 8 || showBotChallenge}
                >
                  {isPerformingBotDetection ? (
                    <div className="loading-spinner">
                      <div className="spinner"></div>
                      Verifying Security...
                    </div>
                  ) : isGeneratingMFA ? (
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
