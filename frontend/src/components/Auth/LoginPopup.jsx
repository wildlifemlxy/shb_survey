import React, { Component } from 'react';
import '../../css/components/Auth/LoginPopup.css'; // Import the updated styles
import { fetchLoginData, changePassword, resetPassword } from '../../data/loginData';
import simpleApiService from '../../utils/simpleApiService';
import QRCode from 'qrcode';
import botDetectionService from '../../services/botDetection';
import io from 'socket.io-client';
// Note: Since we're using a class component, we can't directly use the useAuth hook
// We'll pass the login function as a prop from a parent component that uses the hook

class LoginPopup extends Component {
  componentDidUpdate(prevProps, prevState) {
    // Auto-close the popup after reset password success
    if (this.state.resetPasswordSuccess && !prevState.resetPasswordSuccess) {
      // First, show success message for 2 seconds
        // Then clear form and close popup
        this.setState({ 
          showResetPassword: false,
          resetPasswordSuccess: false,
          resetEmail: ''
        }, () => {
          this.clearForm();
          if (this.props.onClose) {
            this.props.onClose();
          }
        });
    }
  }
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
      isRecaptchaLoaded: false,
      // Mobile verification choice states
      showMobileVerification: false,
      loginMethod: null, // 'qr-mobile' or 'mobile-approval' - set to null initially
      // Mobile authentication states
      showQRLogin: false,
      qrLoginCode: '',
      showMobileApproval: false,
      mobileApprovalSessionId: '',
      mobileApprovalStatus: 'pending', // 'pending', 'approved', 'denied', 'timeout'
      isWaitingForMobileApproval: false,
      socket: null,
      mobileApprovalTimeout: null
    };
  }

  componentDidMount() {
    console.log('LoginPopup mounted with props:', this.props);
    // Add event listener for keypad input when component mounts
    document.addEventListener('keydown', this.handleGlobalKeyDown);
    
    // Initialize bot detection
    botDetectionService.initialize();
    
    // Initialize Socket.IO for real-time mobile approval
    this.initializeSocket();
    
    // Start with login form - QR code comes after successful login
  }

  componentWillUnmount() {
    // Clean up event listener when component unmounts
    document.removeEventListener('keydown', this.handleGlobalKeyDown);
    
    // Clean up bot detection
    botDetectionService.cleanup();
    
    // Clean up socket connection and timeouts
    if (this.state.socket) {
      this.state.socket.disconnect();
    }
    if (this.state.mobileApprovalTimeout) {
      clearTimeout(this.state.mobileApprovalTimeout);
    }
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
      // Reset QR code states - back to login form
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
      isRecaptchaLoaded: false,
      // Reset mobile auth states
      showMobileVerification: false, // Reset mobile verification choice
      loginMethod: null, // Reset to no method selected
      showQRLogin: false,
      qrLoginCode: '',
      showMobileApproval: false,
      mobileApprovalSessionId: '',
      mobileApprovalStatus: 'pending',
      isWaitingForMobileApproval: false
    });
    
    // Clear timeouts
    if (this.state.mobileApprovalTimeout) {
      clearTimeout(this.state.mobileApprovalTimeout);
    }
    
    // No session data to clear
    
    // Reset bot detection service
    botDetectionService.reset();
    
    console.log('Form and authentication tokens cleared');
  };

  handleSubmit = async (e) => {
    if (e) e.preventDefault();
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
        // Login credentials validated successfully - show mobile verification choice
        console.log('Login successful - credentials validated, showing mobile verification choice');
        
        this.setState({
          userData: result.data,
          isLoading: false,
          error: '', // Clear any previous errors
          showMobileVerification: true, // Show mobile verification choice screen
          loginMethod: null // Don't set method until user makes choice
        });
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

  // Complete login flow - validates credentials and PIN in one step
  handleCompleteLogin = async () => {
    const { email, password, userInputPin, mfaPin, userData } = this.state;
    
    // Step 1: Validate email and password are provided
    if (!email || !password) {
      this.setState({ error: 'Please enter both email and password' });
      return;
    }
    
    // Step 2: Validate PIN is complete
    const enteredPin = userInputPin.join('');
    if (enteredPin.length !== 8) {
      this.setState({ mfaError: 'Please enter all 8 digits of the PIN' });
      return;
    }
    
    // Step 3: Validate PIN matches QR code
    if (enteredPin !== mfaPin) {
      this.setState({ 
        mfaError: 'PIN does not match. Please try again.',
        userInputPin: ['', '', '', '', '', '', '', ''], // Clear the input
        pinInputStartTimes: new Array(8).fill(null) // Reset timing
      });
      // Focus first input
      const firstInput = document.getElementById('pin-input-0');
      if (firstInput) firstInput.focus();
      return;
    }
    
    // Step 4: If we don't have user data yet, validate credentials first
    if (!userData) {
      try {
        this.setState({ isLoading: true, error: '', mfaError: '' });
        
        const result = await fetchLoginData(email, password);
        console.log('Login result:', result);
        
        if (result.success) {
          if (result.data && result.data.firstTimeLogin === true) {
            console.log('First time login detected, showing password change dialog');
            this.setState({ 
              showPasswordChange: true,
              userData: result.data,
              isLoading: false 
            });
            return;
          } else {
            // Credentials valid and PIN matches - complete login
            console.log('Login successful - credentials and PIN verified');
            this.setState({
              userData: result.data,
              isLoading: false
            });
            this.handleMFAComplete();
          }
        } else {
          this.setState({ 
            error: result?.message || 'Invalid email or password. Please try again.',
            isLoading: false 
          });
        }
      } catch (error) {
        console.error('Login error:', error);
        this.setState({ 
          error: 'An error occurred during login. Please try again later.',
          isLoading: false 
        });
      }
    } else {
      // We already have user data and PIN is valid - complete login
      console.log('PIN verified successfully - completing login');
      this.handleMFAComplete();
    }
  };

  // Verify the entered PIN against the generated PIN (Frontend-only verification)
  handleVerifyPin = async () => {
    const { userInputPin, mfaPin, userData, email, password } = this.state;
    
    // Check if user has logged in first
    if (!userData) {
      this.setState({ 
        mfaError: 'Please log in first using the login form below before verifying the PIN.',
        error: 'Please enter your email and password first.'
      });
      return;
    }
    
    const enteredPin = userInputPin.join('');

    if (enteredPin.length !== 8) {
      this.setState({ mfaError: 'Please enter all 8 digits' });
      return;
    }

    if (enteredPin === mfaPin) {
      // PIN matches - complete login immediately (frontend-only verification)
      console.log('PIN verified successfully - completing login');
      this.handleMFAComplete();
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
    const { userData, email } = this.state;
    
    // Validate userData exists
    if (!userData) {
      console.error('userData is undefined in handleMFAComplete');
      console.log('Current state:', this.state);
      
      // Try to recover by checking if we have email and can reconstruct basic user data
      if (email) {
        console.log('Attempting to recover with email:', email);
        // Create minimal user data with available information
        const recoveredUserData = {
          email: email,
          isAuthenticated: true,
          loginTime: new Date().toISOString()
        };
        
        console.log('MFA Complete - using recovered user data:', recoveredUserData);
        this.props.onLoginSuccess(recoveredUserData);
        return;
      }
      
      // If no recovery possible, reset to login form
      this.setState({ 
        showMFAPin: false,
        mfaPin: '',
        qrCodeDataUrl: '',
        mfaError: '',
        error: 'Session expired. Please login again.'
      });
      return;
    }
    
    // Check if this is a first-time login that needs password change
    if (userData.firstTimeLogin === true) {
      console.log('First-time login detected after PIN verification - showing password change dialog');
      this.setState({ 
        showMFAPin: false,
        showPasswordChange: true,
        mfaError: ''
        // Keep mfaPin and qrCodeDataUrl preserved for potential return to MFA
      });
      return;
    }
    
    // Prepare user data for parent component (normal login flow)
    const enhancedUserData = {
      ...userData,
      isAuthenticated: true,
      loginTime: new Date().toISOString()
    };
    
    console.log('MFA Complete - sending user data:', {
      userData: enhancedUserData
    });
    
    // Close the popup first to avoid showing login form during clearForm
    if (this.props.onClose) {
      this.props.onClose();
    }
    
    // Send user data to parent component
    this.props.onLoginSuccess(enhancedUserData);
    
    // Clear the form after closing popup
    setTimeout(() => {
      this.clearForm();
    }, 100);
  };

  // Initialize Socket.IO connection for real-time mobile communication
  initializeSocket = () => {
    const backendUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001' 
      : 'https://shb-backend.azurewebsites.net';
    
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    socket.on('connect', () => {
      console.log('Socket connected for mobile authentication');
    });

    socket.on('mobile-auth-response', (data) => {
      console.log('Socket received mobile-auth-response:', data);
      this.handleMobileAuthResponse(data);
    });

    socket.on('qr-login-response', (data) => {
      console.log('Socket received qr-login-response:', data);
      this.handleQRLoginResponse(data);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    this.setState({ socket });
  };

  // Handle mobile authentication response
  handleMobileAuthResponse = (data) => {
    console.log('Received mobile auth response:', data);
    console.log('Current session ID:', this.state.mobileApprovalSessionId);
    
    const { sessionId, approved, userData } = data;
    
    // Check if sessionId matches or if no sessionId is provided (for backward compatibility)
    const sessionMatches = !sessionId || sessionId === this.state.mobileApprovalSessionId;
    
    console.log('Mobile auth response validation:', {
      sessionMatches,
      showMobileApproval: this.state.showMobileApproval,
      approved,
      sessionId,
      expectedSessionId: this.state.mobileApprovalSessionId
    });
    
    if (sessionMatches && this.state.showMobileApproval) {
      if (approved) {
        console.log('✅ Mobile approval APPROVED - updating state and closing popup');
        this.setState({ 
          mobileApprovalStatus: 'approved',
          isWaitingForMobileApproval: false,
          userData: userData || this.state.userData
        });
        
        // Clear timeout
        if (this.state.mobileApprovalTimeout) {
          clearTimeout(this.state.mobileApprovalTimeout);
        }
        
        // Immediately complete login and close popup for mobile approval
        console.log('Mobile approval confirmed - completing login immediately');
        this.handleMFAComplete();
        
        // Force close the popup immediately
        if (this.props.onClose) {
          console.log('Force closing popup after mobile approval');
          this.props.onClose();
        }
      } else {
        this.setState({ 
          mobileApprovalStatus: 'denied',
          isWaitingForMobileApproval: false,
          error: 'Login denied on mobile device'
        });
        
        // Clear timeout
        if (this.state.mobileApprovalTimeout) {
          clearTimeout(this.state.mobileApprovalTimeout);
        }
        
        // Close popup and return to home page (before login state)
        console.log('Mobile approval denied - closing popup and returning to home page');
        this.clearForm();
        if (this.props.onClose) {
          this.props.onClose();
        }
      }
    } else {
      console.log('Session ID mismatch or not in mobile approval state:', { 
        received: sessionId, 
        expected: this.state.mobileApprovalSessionId,
        showMobileApproval: this.state.showMobileApproval 
      });
    }
  };

  // Handle QR login response from mobile app
  handleQRLoginResponse = (data) => {
    const { sessionId, success, userData, error } = data;
    
    if (sessionId === this.state.qrLoginCode) {
      if (success && userData) {
        this.setState({ 
          userData: userData,
          showQRLogin: false,
          isLoading: false
        }, () => {
          // Complete login immediately for QR code - no additional steps needed
          // Use callback to ensure state is updated before calling handleMFAComplete
          console.log('QR Code scan successful - completing login and closing popup');
          this.handleMFAComplete();
        });
      } else {
        this.setState({ 
          mfaError: error || 'QR login failed',
          showQRLogin: false,
          isLoading: false
        });
      }
    }
  };

  // Generate QR code for mobile login
  generateMobileLoginQR = async () => {
    try {
      this.setState({ isGeneratingMFA: true, mfaError: '' });
      
      // Generate 8-digit PIN locally (frontend only)
      const pin = this.generateLocalMFAPin(8);
      
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
        showMobileVerification: false, // Hide choice modal
        showMFAPin: true, // Show QR code and PIN input modal
        mfaPin: pin,
        qrCodeDataUrl: qrCodeDataUrl,
        isGeneratingMFA: false,
        loginMethod: 'qr-mobile'
      });
      
    } catch (error) {
      console.error('Error generating MFA PIN and QR code:', error);
      this.setState({
        mfaError: 'Failed to generate MFA PIN and QR code',
        isGeneratingMFA: false
      });
    }
  };

  // Generate unique device ID
  generateDeviceId = () => {
    return 'web_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Generate unique session ID
  generateSessionId = () => {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  // Request mobile approval for login
  requestMobileApproval = async () => {
    const { email, password } = this.state;
    
    if (!email || !password) {
      this.setState({ error: 'Please enter both email and password' });
      return;
    }
    
    try {
      this.setState({ isLoading: true, error: '' });
      
      // First validate credentials
      const result = await fetchLoginData(email, password);
      
      if (result.success) {
        // Generate simple approval code
        const approvalCode = this.generateLocalMFAPin(8);
        
        // Send mobile approval request to backend (which will notify Android app)
        try {
          const notificationResult = await simpleApiService.requestMobileApproval({
            id: result.data.id || result.data.userId,
            email: email,
            sessionId: approvalCode
          });
          
          console.log('Mobile approval notification sent:', notificationResult);
        } catch (notificationError) {
          console.error('Failed to send mobile notification:', notificationError);
          // Continue with the flow even if notification fails
        }
        
        this.setState({
          showMobileVerification: false, // Hide choice modal
          showMobileApproval: true, // Show mobile approval modal
          mobileApprovalSessionId: approvalCode,
          mobileApprovalStatus: 'pending',
          isWaitingForMobileApproval: true,
          loginMethod: 'mobile-approval',
          userData: result.data,
          isLoading: false
        });
        
        // Set timeout for mobile approval (2 minutes)
        const timeout = setTimeout(() => {
          this.setState({
            mobileApprovalStatus: 'timeout',
            isWaitingForMobileApproval: false,
            error: 'Mobile approval request timed out. Please try again.'
          });
        }, 2 * 60 * 1000);
        
        this.setState({ mobileApprovalTimeout: timeout });
        
      } else {
        this.setState({ 
          error: result?.message || 'Invalid email or password',
          isLoading: false 
        });
      }
    } catch (error) {
      console.error('Mobile approval request error:', error);
      this.setState({ 
        error: 'An error occurred while requesting mobile approval',
        isLoading: false 
      });
    }
  };

  // Switch between login methods
  switchLoginMethod = (method) => {
    this.setState({ 
      loginMethod: method,
      showQRLogin: false,
      showMobileApproval: false,
      showMFAPin: false,
      qrLoginCode: '',
      mobileApprovalSessionId: '',
      mobileApprovalStatus: 'pending',
      isWaitingForMobileApproval: false,
      error: '',
      mfaError: ''
    });
    
    // Clear any existing timeouts
    if (this.state.mobileApprovalTimeout) {
      clearTimeout(this.state.mobileApprovalTimeout);
    }
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
      
      // Validate userData exists
      if (!userData) {
        this.setState({ 
          passwordChangeError: 'User data not found. Please login again.' 
        });
        return;
      }
      
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
        
        // Complete the login process and store consistent authentication data
        localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
        localStorage.setItem('user', JSON.stringify(updatedUserData)); // Fallback compatibility
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userRole', updatedUserData.role || 'user');
        localStorage.setItem('loginTimestamp', Date.now().toString());
        
        // Clear the form and close popup
        this.clearForm();
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
    const { 
      email, password, isLoading, error, showPasswordChange, newPassword, confirmPassword, 
      showNewPassword, showConfirmPassword, passwordChangeError, isChangingPassword, 
      showResetPassword, resetEmail, isResettingPassword, resetPasswordError, resetPasswordSuccess, 
      showMFAPin, mfaPin, qrCodeDataUrl, isGeneratingMFA, mfaError, userInputPin, userData,
      showBotChallenge, botChallenge, challengeAnswer, isPerformingBotDetection,
      // Mobile authentication states
      loginMethod, showMobileVerification, showQRLogin, showMobileApproval, mobileApprovalStatus, isWaitingForMobileApproval
    } = this.state;
    const { isOpen } = this.props;

    if (!isOpen) return null;

    // Show Mobile Verification Choice (after successful email/password login)
    if (showMobileVerification) {
      return (
        <div className="login-popup-overlay">
          <div className="login-card">
            <button className="login-close-button" onClick={this.handleCloseButton}>
              x
            </button>
            
            <div className="login-header">
              <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="login-logo" />
              <h1>Choose Verification Method</h1>
              <p>Complete your login using your mobile device</p>
            </div>

            {/* Mobile Verification Choice */}
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
                <button
                  type="button"
                  onClick={() => this.switchLoginMethod('qr-mobile')}
                  style={{
                    padding: '20px',
                    border: '2px solid #d1d5db',
                    borderRadius: '12px',
                    background: loginMethod === 'qr-mobile' ? '#22c55e' : 'white',
                    color: loginMethod === 'qr-mobile' ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    minWidth: '160px',
                    boxShadow: loginMethod === 'qr-mobile' ? '0 4px 15px rgba(34, 197, 94, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>📱</div>
                  <div>Scan QR Code</div>
                  <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>Quick & Easy</div>
                </button>
                
                <button
                  type="button"
                  onClick={() => this.switchLoginMethod('mobile-approval')}
                  style={{
                    padding: '20px',
                    border: '2px solid #d1d5db',
                    borderRadius: '12px',
                    background: loginMethod === 'mobile-approval' ? '#22c55e' : 'white',
                    color: loginMethod === 'mobile-approval' ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    minWidth: '160px',
                    boxShadow: loginMethod === 'mobile-approval' ? '0 4px 15px rgba(34, 197, 94, 0.3)' : '0 2px 8px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>✅</div>
                  <div>App Notification</div>
                  <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.8 }}>Push Approval</div>
                </button>
              </div>

              {/* Show selected method content */}
              {loginMethod === 'qr-mobile' && (
                <div>
                  <button
                    type="button"
                    onClick={this.generateMobileLoginQR}
                    disabled={isGeneratingMFA}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    {isGeneratingMFA ? 'Generating QR Code...' : 'Generate QR Code'}
                  </button>
                </div>
              )}

              {loginMethod === 'mobile-approval' && (
                <div>
                  <button
                    type="button"
                    onClick={this.requestMobileApproval}
                    disabled={isLoading}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)'
                    }}
                  >
                    {isLoading ? 'Sending Request...' : 'Send App Notification'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // Show Mobile Approval Modal (separate modal)
    if (showMobileApproval) {
      return (
        <div className="login-popup-overlay">
          <div className="login-card">
            <button className="login-close-button" onClick={() => this.setState({ showMobileApproval: false, mobileApprovalStatus: 'pending' })}>
              x
            </button>
            
            <div className="login-header">
              <img src="/WWF Logo/WWF Logo Medium.jpg" alt="WWF Logo" className="login-logo" />
              <h1>Mobile Approval</h1>
              <p>Check your mobile device for the approval request</p>
            </div>

            <div style={{ textAlign: 'center', padding: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#374151' }}>Waiting for Mobile Approval</h3>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '3px solid #f3f4f6',
                  borderTop: '3px solid #22c55e',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
              
              <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '15px' }}>
                {mobileApprovalStatus === 'pending' && 'Check your mobile device for the approval request'}
                {mobileApprovalStatus === 'approved' && 'Approved! Logging you in...'}
                {mobileApprovalStatus === 'denied' && 'Login request was denied'}
                {mobileApprovalStatus === 'timeout' && 'Request timed out'}
              </p>
              
              <button
                type="button"
                onClick={() => this.setState({ showMobileApproval: false, mobileApprovalStatus: 'pending' })}
                style={{
                  padding: '8px 16px',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Show MFA PIN and QR Code dialog (old flow - keep for fallback)
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
            
            <form className="login-form" onSubmit={(e) => { 
              e.preventDefault(); 
              this.handleVerifyPin();
            }}>
              {/* Show MFA errors */}
              {mfaError && (
                <div className="login-error">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  {mfaError}
                </div>
              )}
              
              {/* QR Code Section */}
              {qrCodeDataUrl && (
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
                    width: '100%',
                    marginBottom: '0.5rem'
                  }}
                  disabled={isGeneratingMFA || isPerformingBotDetection || (!userData && (!email || !password)) || (userData && this.state.userInputPin.join('').length !== 8) || showBotChallenge}
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
                  ) : isLoading ? (
                    <div className="loading-spinner">
                      <div className="spinner"></div>
                      Signing In...
                    </div>
                  ) : (
                    userData ? 'Verify PIN' : 'Sign In'
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
                    width: '100%',
                    marginBottom: '0.5rem'
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
                  Password reset email sent successfully! Please check your inbox.<br/>
                  <span style={{ fontSize: '12px', color: '#888' }}>(This window will close automatically.)</span>
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
                  type="submit" 
                  className="login-button"
                  style={{
                    background: 'linear-gradient(135deg, #00ECFA 0%, #00B8EA 100%)',
                    boxShadow: '0 4px 15px rgba(0, 184, 234, 0.3)',
                    width: '100%'
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

          {/* QR Login Screen */}
          {loginMethod === 'qr-mobile' && (
            <div className="qr-login-section" style={{ textAlign: 'center', padding: '20px' }}>
              {!showQRLogin ? (
                <div>
                  <h3 style={{ marginBottom: '15px', color: '#374151' }}>Login with Mobile App</h3>
                  <p style={{ marginBottom: '20px', color: '#6b7280', fontSize: '14px' }}>
                    Scan the QR code with your mobile app to login instantly
                  </p>
                  <button
                    type="button"
                    onClick={this.generateMobileLoginQR}
                    disabled={isGeneratingMFA}
                    style={{
                      padding: '12px 24px',
                      background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)'
                    }}
                  >
                    {isGeneratingMFA ? 'Generating QR Code...' : 'Generate QR Code'}
                  </button>
                </div>
              ) : (
                <div>
                  <h3 style={{ marginBottom: '15px', color: '#374151' }}>Scan QR Code</h3>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    marginBottom: '15px'
                  }}>
                    <img 
                      src={qrCodeDataUrl} 
                      alt="Login QR Code" 
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        padding: '10px',
                        background: 'white'
                      }}
                    />
                  </div>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '15px' }}>
                    Open your mobile app and scan this QR code to login
                  </p>
                  <button
                    type="button"
                    onClick={() => this.setState({ showQRLogin: false })}
                    style={{
                      padding: '8px 16px',
                      background: '#6b7280',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '14px',
                      cursor: 'pointer'
                    }}
                  >
                    Generate New QR Code
                  </button>
                </div>
              )}
              
              {mfaError && (
                <div style={{
                  marginTop: '15px',
                  padding: '10px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#dc2626',
                  fontSize: '14px'
                }}>
                  {mfaError}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }
}

export default LoginPopup;
