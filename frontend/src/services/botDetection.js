// Advanced Bot Detection and Spam Prevention Service
class BotDetectionService {
  constructor() {
    this.suspiciousActivities = [];
    this.userBehaviorMetrics = {
      mouseMovements: [],
      keystrokes: [],
      timings: [],
      interactions: [],
      deviceInfo: {}
    };
    this.loginAttempts = new Map();
    this.isInitialized = false;
    this.botScore = 0;
  }

  // Initialize bot detection when component mounts
  initialize() {
    if (this.isInitialized) return;
    
    this.setupMouseTracking();
    this.setupKeyboardTracking();
    this.setupAutofillDetection();
    this.setupTimingAnalysis();
    this.setupDeviceFingerprinting();
    this.setupVisibilityTracking();
    
    // Load reCAPTCHA script early
    this.loadRecaptchaScript().catch(error => {
      console.error('Failed to load reCAPTCHA during initialization:', error);
    });
    
    this.isInitialized = true;
    
    console.log('Bot detection initialized');
  }

  // Clean up event listeners
  cleanup() {
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    document.removeEventListener('click', this.handleClick);
    document.removeEventListener('input', this.handleInputEvent);
    document.removeEventListener('animationstart', this.handleAnimationStart);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.isInitialized = false;
  }

  // Mouse movement tracking for human behavior detection
  setupMouseTracking() {
    let lastMouseTime = Date.now();
    let mouseMovements = 0;
    
    this.handleMouseMove = (e) => {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastMouseTime;
      
      // Note: Removed mouse_too_frequent check as it was causing false positives
      // Modern browsers and high-refresh monitors can generate very frequent mouse events
      // This is normal behavior, not bot behavior
      
      const movement = {
        x: e.clientX,
        y: e.clientY,
        timestamp: currentTime,
        timeDiff: timeDiff,
        velocity: this.calculateVelocity(e.clientX, e.clientY, timeDiff)
      };
      
      this.userBehaviorMetrics.mouseMovements.push(movement);
      mouseMovements++;
      lastMouseTime = currentTime;
      
      // Analyze mouse patterns
      this.analyzeMouseBehavior(movement);
      
      // Keep only last 100 movements for performance
      if (this.userBehaviorMetrics.mouseMovements.length > 100) {
        this.userBehaviorMetrics.mouseMovements.shift();
      }
    };
    
    document.addEventListener('mousemove', this.handleMouseMove);
  }

  // Keyboard timing analysis
  setupKeyboardTracking() {
    let keyDownTime = {};
    let lastInputTime = 0;
    let isAutofillDetected = false;
    
    this.handleKeyDown = (e) => {
      const currentTime = Date.now();
      keyDownTime[e.key] = currentTime;
      
      // Detect potential autofill behavior
      const timeSinceLastInput = currentTime - lastInputTime;
      if (timeSinceLastInput > 0 && timeSinceLastInput < 5) {
        // Very rapid sequential inputs might indicate autofill
        isAutofillDetected = true;
      }
      
      this.userBehaviorMetrics.keystrokes.push({
        key: e.key,
        type: 'keydown',
        timestamp: currentTime,
        isAutofillCandidate: isAutofillDetected
      });
      
      lastInputTime = currentTime;
    };
    
    this.handleKeyUp = (e) => {
      const currentTime = Date.now();
      const downTime = keyDownTime[e.key];
      
      if (downTime) {
        const holdTime = currentTime - downTime;
        
        this.userBehaviorMetrics.keystrokes.push({
          key: e.key,
          type: 'keyup',
          timestamp: currentTime,
          holdTime: holdTime,
          isAutofillCandidate: isAutofillDetected
        });
        
        // Reset autofill detection after a pause
        if (currentTime - lastInputTime > 100) {
          isAutofillDetected = false;
        }
        
        // Analyze keystroke patterns - exclude autofill candidates and when autofill is globally detected
        if (!isAutofillDetected && !this.autofillDetected) {
          this.analyzeKeystrokePattern(e.key, holdTime);
        }
        
        delete keyDownTime[e.key];
      }
    };
    
    this.handleClick = (e) => {
      this.userBehaviorMetrics.interactions.push({
        type: 'click',
        x: e.clientX,
        y: e.clientY,
        timestamp: Date.now()
      });
    };
    
    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    document.addEventListener('click', this.handleClick);
  }

  // Setup autofill detection
  setupAutofillDetection() {
    this.autofillDetected = false;
    
    // Listen for input events that might indicate autofill
    this.handleInputEvent = (e) => {
      const target = e.target;
      
      // Check if this looks like autofill (rapid value changes without keystrokes)
      if (target.value && target.value.length > 5) {
        const recentKeystrokes = this.userBehaviorMetrics.keystrokes.filter(
          k => Date.now() - k.timestamp < 1000
        );
        
        // If we have a long value but very few recent keystrokes, it's likely autofill
        if (recentKeystrokes.length < target.value.length / 3) {
          this.autofillDetected = true;
          console.log('Autofill detected on field:', target.name || target.id);
          
          // Don't penalize autofill - it's normal user behavior
          this.userBehaviorMetrics.interactions.push({
            type: 'autofill_detected',
            field: target.name || target.id,
            valueLength: target.value.length,
            keystrokeCount: recentKeystrokes.length,
            timestamp: Date.now()
          });
        }
      }
    };
    
    // Listen for animationstart events (often triggered by autofill)
    this.handleAnimationStart = (e) => {
      if (e.animationName === 'autofill' || e.animationName.includes('autofill')) {
        this.autofillDetected = true;
        console.log('Browser autofill animation detected');
      }
    };
    
    document.addEventListener('input', this.handleInputEvent);
    document.addEventListener('animationstart', this.handleAnimationStart);
  }

  // Timing analysis for detecting automated behavior
  setupTimingAnalysis() {
    this.formStartTime = Date.now();
    this.fieldFocusTimes = {};
    this.fieldCompletionTimes = {};
  }

  // Device fingerprinting
  setupDeviceFingerprinting() {
    this.userBehaviorMetrics.deviceInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      touchSupport: 'ontouchstart' in window,
      webGL: this.getWebGLRenderer(),
      canvas: this.getCanvasFingerprint()
    };
  }

  // Track visibility changes (tab switching detection)
  setupVisibilityTracking() {
    this.handleVisibilityChange = () => {
      if (document.hidden) {
        this.addSuspiciousActivity('tab_hidden', { timestamp: Date.now() });
      }
    };
    
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  // Calculate mouse velocity
  calculateVelocity(x, y, timeDiff) {
    const movements = this.userBehaviorMetrics.mouseMovements;
    if (movements.length === 0) return 0;
    
    const lastMovement = movements[movements.length - 1];
    const distance = Math.sqrt(
      Math.pow(x - lastMovement.x, 2) + Math.pow(y - lastMovement.y, 2)
    );
    
    return timeDiff > 0 ? distance / timeDiff : 0;
  }

  // Analyze mouse behavior patterns
  analyzeMouseBehavior(movement) {
    // Check for perfectly straight lines (bot behavior) - made much more lenient
    const movements = this.userBehaviorMetrics.mouseMovements;
    
    // Skip linear movement detection if disabled
    if (!this.linearMouseDetectionDisabled && movements.length >= 20) { // Significantly increased from 5 to 20 - need lots of data
      const recent = movements.slice(-10); // Look at last 10 movements
      const isStraightLine = this.isLinearMovement(recent);
      
      // Only flag if we have sustained linear movements over a long period AND high velocity
      if (isStraightLine && movements.length >= 50 && movement.velocity > 200) {
        this.addSuspiciousActivity('linear_mouse_movement', { movements: recent });
      }
    }
    
    // Check for extremely high velocity (bot behavior) - increased threshold significantly
    if (movement.velocity > 500) { // Increased from 100 to 500 - much more lenient
      this.addSuspiciousActivity('high_velocity_mouse', { velocity: movement.velocity });
    }
    
    // Check for no mouse movement (potential headless browser) - increased time threshold
    if (movements.length === 0 && Date.now() - this.formStartTime > 60000) { // Increased from 30s to 60s
      this.addSuspiciousActivity('no_mouse_movement', { timeElapsed: Date.now() - this.formStartTime });
    }
  }

  // Analyze keystroke patterns
  analyzeKeystrokePattern(key, holdTime) {
    // Skip all keystroke analysis if autofill is detected
    if (this.autofillDetected) {
      console.debug('Skipping keystroke analysis - autofill detected');
      return;
    }
    
    // Extremely fast typing (bot behavior) - made much less sensitive
    if (holdTime < 5) { // Reduced from 10ms to 5ms - very fast typing is still human
      this.addSuspiciousActivity('rapid_typing', { key, holdTime });
    }
    
    // Perfectly consistent timing (bot behavior) - made less sensitive
    const recent = this.userBehaviorMetrics.keystrokes.slice(-10);
    const holdTimes = recent.filter(k => k.holdTime).map(k => k.holdTime);
    
    if (holdTimes.length >= 8) { // Increased from 5 to 8 for better accuracy
      const variance = this.calculateVariance(holdTimes);
      if (variance < 2) { // Reduced from 5 to 2 - only flag extremely consistent timing
        this.addSuspiciousActivity('consistent_typing_timing', { variance, holdTimes });
      }
    }
  }

  // Check for linear mouse movement (bot behavior) - made extremely lenient
  isLinearMovement(movements) {
    if (movements.length < 8) return false; // Increased minimum movements from 5 to 8
    
    const slopes = [];
    let validMovements = 0;
    
    for (let i = 1; i < movements.length; i++) {
      const prev = movements[i - 1];
      const curr = movements[i];
      const deltaX = curr.x - prev.x;
      const deltaY = curr.y - prev.y;
      
      // Skip tiny movements to avoid false positives - increased threshold
      if (Math.abs(deltaX) < 5 && Math.abs(deltaY) < 5) continue;
      
      const slope = deltaX !== 0 ? deltaY / deltaX : Infinity;
      slopes.push(slope);
      validMovements++;
    }
    
    if (slopes.length < 5) return false; // Need at least 5 valid slopes
    
    // Check if slopes are nearly identical - made extremely strict
    const variance = this.calculateVariance(slopes);
    
    // Only flag if variance is essentially zero (perfect line) AND movements are very fast
    return variance < 0.001 && validMovements >= 8; // Much stricter - essentially only perfect lines
  }

  // Calculate variance for detecting patterns
  calculateVariance(numbers) {
    if (numbers.length === 0) return 0;
    
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }

  // Get WebGL renderer for fingerprinting
  getWebGLRenderer() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        return debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      }
    } catch (e) {
      // Ignore errors
    }
    return 'unavailable';
  }

  // Get canvas fingerprint
  getCanvasFingerprint() {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Bot detection test', 2, 2);
      return canvas.toDataURL().slice(-50);
    } catch (e) {
      return 'unavailable';
    }
  }

  // Add suspicious activity
  addSuspiciousActivity(type, data) {
    // Skip if this type of detection is disabled
    if (type === 'linear_mouse_movement' && this.linearMouseDetectionDisabled) {
      console.debug('Linear mouse movement detection skipped (disabled)');
      return;
    }
    
    this.suspiciousActivities.push({
      type,
      data,
      timestamp: Date.now()
    });
    
    // Less intrusive logging - only warn for genuinely suspicious patterns
    if (type === 'linear_mouse_movement') {
      console.debug('Linear mouse movement detected (may be false positive):', type, data);
    } else if (type === 'consistent_typing_timing') {
      console.debug('Consistent typing timing detected:', type, data);
    } else {
      console.warn('Suspicious activity detected:', type, data);
    }
  }

  // Track login attempts for rate limiting
  trackLoginAttempt(identifier) {
    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier) || [];
    
    // Remove attempts older than 15 minutes
    const recentAttempts = attempts.filter(time => now - time < 15 * 60 * 1000);
    recentAttempts.push(now);
    
    this.loginAttempts.set(identifier, recentAttempts);
    
    return recentAttempts.length;
  }

  // Calculate comprehensive bot score
  calculateBotScore() {
    let score = 0;
    
    // If autofill was detected, be extremely lenient
    if (this.autofillDetected) {
      console.log('Autofill detected - applying lenient scoring');
      
      // Only check for the most obvious bot behaviors
      const reallyBadActivities = this.suspiciousActivities.filter(activity => {
        return activity.type === 'high_velocity_mouse' && activity.data.velocity > 1000;
      });
      
      score = reallyBadActivities.length * 5; // Very minimal penalty
      
      // Don't penalize for fast completion or lack of interactions when autofill is used
      this.botScore = Math.max(0, Math.min(score, 20)); // Cap at 20 for autofill scenarios
      return this.botScore;
    }
    
    // Normal scoring for non-autofill scenarios
    // Check suspicious activities - reduced weight further
    const suspiciousActivities = this.suspiciousActivities.filter(activity => {
      // Don't count linear mouse movement unless it's extremely obvious
      return activity.type !== 'linear_mouse_movement' || activity.data.variance < 0.0001;
    });
    score += suspiciousActivities.length * 3; // Reduced from 5 to 3
    
    // Check mouse behavior - made less penalizing
    if (this.userBehaviorMetrics.mouseMovements.length === 0) {
      score += 10; // Reduced from 15 to 10 - No mouse movement is less suspicious
    } else if (this.userBehaviorMetrics.mouseMovements.length < 3) {
      score += 3; // Reduced from 5 to 3 - Very little mouse movement is much less suspicious
    }
    
    // Check timing patterns - made more lenient
    const formCompletionTime = Date.now() - this.formStartTime;
    if (formCompletionTime < 1000) { // Reduced from 2000ms to 1000ms
      score += 10; // Reduced from 15 to 10 - Fast completion is less suspicious
    } else if (formCompletionTime > 900000) { // Increased from 600000ms to 900000ms (15 minutes)
      score += 3; // Reduced from 5 to 3 - Slow completion is less suspicious
    }
    
    // Check device info - reduced penalties further
    if (!this.userBehaviorMetrics.deviceInfo.cookieEnabled) {
      score += 5; // Reduced from 8 to 5
    }
    
    if (this.userBehaviorMetrics.deviceInfo.webGL === 'unavailable') {
      score += 3; // Reduced from 5 to 3
    }
    
    // Check interaction patterns - made more lenient
    if (this.userBehaviorMetrics.interactions.length === 0) {
      score += 5; // Reduced from 10 to 5 - No interactions is less suspicious
    }
    
    this.botScore = Math.max(0, Math.min(score, 100)); // Ensure score is between 0 and 100
    return this.botScore;
  }

  // Main bot detection check - made more lenient
  async performBotDetection(email, userAgent) {
    const score = this.calculateBotScore();
    const attemptCount = this.trackLoginAttempt(email);
    
    // If autofill was detected, be extremely lenient with bot detection
    const autofillLeniency = this.autofillDetected;
    
    const results = {
      botScore: score,
      attemptCount: attemptCount,
      suspiciousActivities: this.suspiciousActivities,
      deviceFingerprint: this.userBehaviorMetrics.deviceInfo,
      isBot: autofillLeniency ? 
        (score > 80 || attemptCount > 25) : // Much higher thresholds for autofill
        (score > 80 || attemptCount > 15), // Normal thresholds
      riskLevel: this.getRiskLevel(score, attemptCount),
      timestamp: Date.now(),
      autofillDetected: autofillLeniency
    };
    
    // Log detection results
    console.log('Bot detection results:', results);
    
    return results;
  }

  // Get risk level - made much more lenient
  getRiskLevel(score, attemptCount) {
    // If autofill was detected, be extremely lenient
    if (this.autofillDetected) {
      console.log('Autofill detected - applying lenient risk assessment');
      if (score > 50 || attemptCount > 20) return 'MEDIUM'; // Very high thresholds for autofill
      return 'SAFE'; // Default to safe for autofill scenarios
    }
    
    // Normal risk assessment for non-autofill scenarios
    if (score > 90 || attemptCount > 15) return 'HIGH'; // Increased thresholds significantly
    if (score > 70 || attemptCount > 10) return 'MEDIUM'; // Increased thresholds
    if (score > 50 || attemptCount > 7) return 'LOW'; // Increased thresholds
    return 'SAFE';
  }

  // Reset for new session
  reset() {
    this.suspiciousActivities = [];
    this.userBehaviorMetrics.mouseMovements = [];
    this.userBehaviorMetrics.keystrokes = [];
    this.userBehaviorMetrics.interactions = [];
    this.botScore = 0;
    this.formStartTime = Date.now();
    this.autofillDetected = false;
  }

  // Add method to track PIN input behavior - made less sensitive
  trackPinInputBehavior(index, timeTaken, inputMethod) {
    this.userBehaviorMetrics.interactions.push({
      type: 'pin_input',
      index: index,
      timeTaken: timeTaken,
      inputMethod: inputMethod, // 'keyboard', 'click', etc.
      timestamp: Date.now()
    });
    
    // Analyze PIN input patterns - made much less sensitive
    if (timeTaken < 50) { // Increased from 100ms to 50ms - very fast PIN input
      this.addSuspiciousActivity('rapid_pin_input', { index, timeTaken });
    }
  }

  // Get human verification challenge
  getVerificationChallenge() {
    return {
      type: 'google_recaptcha',
      challenge: this.initializeGoogleRecaptcha(),
      timestamp: Date.now()
    };
  }

  // Initialize Google reCAPTCHA
  initializeGoogleRecaptcha() {
    // Load Google reCAPTCHA script if not already loaded
    if (!window.grecaptcha) {
      this.loadRecaptchaScript();
    }
    
    return {
      siteKey: '6Le9xoArAAAAAOpWRHrEbCPp01_CIghL5e5MzVKa', // Production site key for reCAPTCHA v3
      widgetId: null,
      response: null
    };
  }

  // Load Google reCAPTCHA script
  loadRecaptchaScript() {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (window.grecaptcha && window.grecaptcha.execute) {
        resolve(window.grecaptcha);
        return;
      }

      // Create script element for reCAPTCHA v3
      const script = document.createElement('script');
      script.src = 'https://www.google.com/recaptcha/api.js?render=6Le9xoArAAAAAOpWRHrEbCPp01_CIghL5e5MzVKa';
      script.async = true;
      script.defer = true;

      script.onload = () => {
        // Wait for grecaptcha to be ready
        const checkReady = () => {
          if (window.grecaptcha && window.grecaptcha.execute) {
            console.log('reCAPTCHA v3 script loaded successfully');
            resolve(window.grecaptcha);
          } else {
            setTimeout(checkReady, 100);
          }
        };
        checkReady();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google reCAPTCHA script'));
      };

      document.head.appendChild(script);
    });
  }

  // Render Google reCAPTCHA widget
  // Execute reCAPTCHA v3 verification
  async executeRecaptcha(action = 'login') {
    try {
      // Ensure reCAPTCHA script is loaded
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        console.log('reCAPTCHA script not loaded, loading now...');
        await this.loadRecaptchaScript();
      }

      // Execute reCAPTCHA v3
      console.log('Executing reCAPTCHA v3 with action:', action);
      const response = await window.grecaptcha.execute('6Le9xoArAAAAAOpWRHrEbCPp01_CIghL5e5MzVKa', {
        action: action
      });

      console.log('reCAPTCHA v3 response received:', response);
      
      if (!response) {
        throw new Error('No response received from reCAPTCHA');
      }

      return response;
    } catch (error) {
      console.error('Error executing reCAPTCHA v3:', error);
      throw error; // Re-throw to handle in calling code
    }
  }

  // Legacy method kept for compatibility - now delegates to executeRecaptcha
  renderRecaptcha(containerId, callback, expiredCallback) {
    console.log('renderRecaptcha called - delegating to reCAPTCHA v3 execution');
    
    // For v3, we execute immediately and call the callback
    this.executeRecaptcha('login').then(response => {
      if (response && callback) {
        callback(response);
      }
    }).catch(error => {
      console.error('reCAPTCHA v3 execution failed:', error);
      if (expiredCallback) {
        expiredCallback();
      }
    });
    
    // Return a dummy widget ID for compatibility
    return 1;
  }

  // Get reCAPTCHA response - for v3, we execute on demand
  async getRecaptchaResponse(action = 'login') {
    return await this.executeRecaptcha(action);
  }

  // Reset reCAPTCHA widget - for v3, this is not applicable but kept for compatibility
  resetRecaptcha(widgetId) {
    console.log('resetRecaptcha called - not applicable for reCAPTCHA v3');
    // For v3, we don't need to reset widgets as there are none
  }

  // Validate Google reCAPTCHA response
  async validateRecaptcha(recaptchaResponse) {
    if (!recaptchaResponse) {
      return {
        success: false,
        error: 'No reCAPTCHA response provided'
      };
    }

    try {
      console.log('Sending reCAPTCHA response to backend for validation:', recaptchaResponse.substring(0, 20) + '...');
      
      // Send reCAPTCHA response to backend for verification
      const response = await fetch('/users/verify-recaptcha', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ recaptchaResponse })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Backend verification result:', result);
      
      if (result.success) {
        console.log('reCAPTCHA verification successful:', {
          score: result.score,
          risk_level: result.risk_level,
          action: result.action
        });
        return {
          success: true,
          score: result.score || 1.0,
          risk_level: result.risk_level,
          action: result.action,
          message: result.message,
          reason: result.reason
        };
      } else {
        console.warn('reCAPTCHA verification failed:', result);
        return {
          success: false,
          error: result.message || 'reCAPTCHA verification failed',
          errors: result.errors,
          score: result.score,
          reason: result.reason
        };
      }
    } catch (error) {
      console.error('Error validating reCAPTCHA:', error);
      return {
        success: false,
        error: `Failed to validate reCAPTCHA: ${error.message}`,
        networkError: true
      };
    }
  }

  // Development/testing helper methods
  
  // Temporarily disable bot detection (for development/testing)
  disableBotDetection() {
    this.botDetectionDisabled = true;
    console.log('Bot detection temporarily disabled');
  }

  // Re-enable bot detection
  enableBotDetection() {
    this.botDetectionDisabled = false;
    console.log('Bot detection re-enabled');
  }

  // Disable specific checks (for troubleshooting)
  disableLinearMouseDetection() {
    this.linearMouseDetectionDisabled = true;
    console.log('Linear mouse movement detection disabled');
  }

  enableLinearMouseDetection() {
    this.linearMouseDetectionDisabled = false;
    console.log('Linear mouse movement detection re-enabled');
  }

  // Disable mouse frequency detection (for high refresh rate monitors)
  disableMouseFrequencyDetection() {
    this.mouseFrequencyDetectionDisabled = true;
    console.log('Mouse frequency detection disabled');
  }

  enableMouseFrequencyDetection() {
    this.mouseFrequencyDetectionDisabled = false;
    console.log('Mouse frequency detection re-enabled');
  }

  // Clear all suspicious activities (for testing)
  clearSuspiciousActivities() {
    this.suspiciousActivities = [];
    console.log('Suspicious activities cleared');
  }

  // Override the main bot detection check for disabled state
  async performBotDetectionWithOverride(email, userAgent) {
    if (this.botDetectionDisabled) {
      console.log('Bot detection is disabled, returning safe result');
      return {
        botScore: 0,
        attemptCount: 0,
        suspiciousActivities: [],
        deviceFingerprint: this.userBehaviorMetrics.deviceInfo,
        isBot: false,
        riskLevel: 'SAFE',
        timestamp: Date.now(),
        disabled: true
      };
    }
    
    return this.performBotDetection(email, userAgent);
  }
}

// Create singleton instance
const botDetectionService = new BotDetectionService();

// Expose to window for debugging/development (remove in production)
if (typeof window !== 'undefined') {
  window.botDetectionService = botDetectionService;
  console.log('Bot detection service available at window.botDetectionService');
  console.log('Available methods:');
  console.log('  - window.botDetectionService.disableBotDetection()');
  console.log('  - window.botDetectionService.enableBotDetection()');
  console.log('  - window.botDetectionService.disableLinearMouseDetection()');
  console.log('  - window.botDetectionService.enableLinearMouseDetection()');
  console.log('  - window.botDetectionService.disableMouseFrequencyDetection()');
  console.log('  - window.botDetectionService.enableMouseFrequencyDetection()');
  console.log('  - window.botDetectionService.clearSuspiciousActivities()');
  console.log('  - window.botDetectionService.forceAutofillDetection()');
  
  // Auto-disable problematic detections for now to prevent false positives
  botDetectionService.disableLinearMouseDetection();
  botDetectionService.disableMouseFrequencyDetection = function() {
    this.mouseFrequencyDetectionDisabled = true;
    console.log('Mouse frequency detection disabled');
  };
  
  // Add quick method to simulate autofill detection
  botDetectionService.forceAutofillDetection = function() {
    this.autofillDetected = true;
    console.log('Autofill detection forced to true');
  };
  
  // Add method to check current state
  botDetectionService.getState = function() {
    return {
      autofillDetected: this.autofillDetected,
      botDetectionDisabled: this.botDetectionDisabled,
      linearMouseDetectionDisabled: this.linearMouseDetectionDisabled,
      mouseFrequencyDetectionDisabled: this.mouseFrequencyDetectionDisabled,
      suspiciousActivities: this.suspiciousActivities.length,
      botScore: this.botScore,
      suspiciousActivityTypes: this.suspiciousActivities.map(a => a.type)
    };
  };
  
  console.log('Quick commands:');
  console.log('  - window.botDetectionService.disableBotDetection() // Completely disable');
  console.log('  - window.botDetectionService.forceAutofillDetection() // Force autofill mode');
  console.log('  - window.botDetectionService.clearSuspiciousActivities() // Clear flags');
  console.log('  - window.botDetectionService.getState() // Check current state');
}

export default botDetectionService;
