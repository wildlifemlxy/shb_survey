# Google reCAPTCHA v3 Configuration - PRODUCTION SETUP

## ✅ Production Keys Configured for reCAPTCHA v3

Your Google reCAPTCHA v3 integration is now configured for production use with the following keys:

### Frontend Configuration
- **Site Key**: `6Le9xoArAAAAAOpWRHrEbCPp01_CIghL5e5MzVKa`
- **Version**: reCAPTCHA v3 (Invisible, Score-based)
- **Location**: `frontend/src/services/botDetection.js`

### Backend Configuration  
- **Secret Key**: `6Le9xoArAAAAAMO03WNLplXfg2pFy3lroivlc4pn`
- **Location**: `backend/node/routes/usersRoutes.js`
- **Endpoint**: `/users/verify-recaptcha`
- **Minimum Score**: 0.5 (configurable)

## reCAPTCHA v3 Overview

### Key Differences from v2:
- **Invisible**: No checkbox or visual challenge
- **Score-based**: Returns a score (0.0-1.0) indicating likelihood of being human
- **Action-based**: Associates verification with specific actions (e.g., 'login')
- **Always runs**: Continuously analyzes user behavior in the background

### How it Works:
1. **Background Analysis**: reCAPTCHA v3 analyzes user behavior throughout the session
2. **Action Execution**: When verification is needed, it executes with a specific action
3. **Score Assessment**: Returns a score where 1.0 = very likely human, 0.0 = very likely bot
4. **Threshold Decision**: Your backend determines if the score meets the minimum threshold

## Architecture Overview

### Frontend Integration
1. **Bot Detection Service** (`botDetection.js`):
   - `loadRecaptchaScript()`: Loads Google reCAPTCHA v3 script
   - `executeRecaptcha(action)`: Executes reCAPTCHA with specific action
   - `validateRecaptcha(response)`: Sends response to backend for verification

2. **Login Component** (`LoginPopup.jsx`):
   - Triggers reCAPTCHA v3 execution for high-risk users
   - Shows invisible verification process
   - Handles score-based responses

### Backend Verification
1. **Verification Endpoint** (`/users/verify-recaptcha`):
   - Receives reCAPTCHA response token
   - Verifies with Google's servers using secret key
   - Evaluates score against minimum threshold (0.5)
   - Returns detailed verification result

2. **Score-based Security Flow**:
   ```
   User triggers action → reCAPTCHA v3 executes → Score generated → Backend validates → Decision based on score
   ```

## Score Interpretation

### Score Ranges:
- **0.9 - 1.0**: Very likely human (LOW RISK)
- **0.7 - 0.8**: Likely human (LOW RISK) 
- **0.5 - 0.6**: Uncertain (MEDIUM RISK)
- **0.3 - 0.4**: Likely bot (HIGH RISK)
- **0.0 - 0.2**: Very likely bot (HIGH RISK)

### Current Configuration:
- **Minimum Score**: 0.5
- **Action**: 'login'
- **Risk Levels**: LOW, MEDIUM, HIGH based on score

## Security Features

### Multi-Layer Protection
1. **Behavioral Analysis**: Mouse movements, typing patterns, interaction timing
2. **Device Fingerprinting**: Screen resolution, timezone, user agent analysis  
3. **Rate Limiting**: Login attempt tracking and suspicious activity detection
4. **reCAPTCHA v3**: Invisible, score-based bot detection with continuous monitoring

### Risk Assessment
- **Score ≥ 0.8**: Normal login flow (LOW RISK)
- **Score 0.5-0.7**: Proceed with monitoring (MEDIUM RISK)  
- **Score < 0.5**: Challenge required or block (HIGH RISK)

## Testing Instructions

### 1. Start Backend Server
```bash
cd backend/node
npm start
```

### 2. Start Frontend Development
```bash
cd frontend  
npm run dev
```

### 3. Test reCAPTCHA v3 Flow
1. Access login page
2. Enter credentials that trigger high-risk detection
3. Click "Verify Human & Continue" button
4. Monitor console for score and verification logs
5. Verify successful/failed login based on score

### 4. Monitor Console Logs
- **Frontend Console**: reCAPTCHA execution and score display
- **Backend Console**: Detailed verification logs with scores and risk levels

## Production Deployment

### Environment Setup
1. **Domain Registration**: Ensure your domain is registered with Google reCAPTCHA Console
2. **SSL Certificate**: reCAPTCHA requires HTTPS in production
3. **CORS Configuration**: Update backend CORS settings for production domain

### Score Threshold Tuning
```javascript
// In backend/node/routes/usersRoutes.js
const minimumScore = 0.5; // Adjust based on your requirements

// Stricter (fewer false positives, more false negatives):
const minimumScore = 0.7;

// More lenient (more false positives, fewer false negatives):
const minimumScore = 0.3;
```

### Security Considerations
1. **Secret Key Protection**: 
   - Store secret key in environment variables
   - Never expose in client-side code
   - Use secure key management in production

2. **Score Monitoring**:
   - Monitor score distributions to optimize threshold
   - Log all scores for analysis and tuning
   - Set up alerts for unusual score patterns

3. **Action Specificity**:
   - Use specific actions for different operations
   - Monitor action-specific score patterns
   - Implement action-based thresholds if needed

## Troubleshooting

### Common Issues
1. **Low Scores for Legitimate Users**:
   - Lower the minimum score threshold
   - Check for aggressive ad blockers or privacy tools
   - Monitor score patterns over time

2. **High Scores for Bots**:
   - Increase the minimum score threshold
   - Implement additional behavioral checks
   - Consider supplementary security measures

3. **Verification Failures**:
   - Check secret key configuration
   - Verify domain registration in Google Console
   - Monitor network connectivity and API responses

### Debug Mode
Enable detailed logging in both frontend and backend:

**Frontend (`botDetection.js`)**:
```javascript
console.log('reCAPTCHA v3 executed with score:', score);
console.log('Action:', action);
```

**Backend (`usersRoutes.js`)**:
```javascript
console.log('reCAPTCHA v3 verification:', {
  score: score,
  action: action,
  hostname: verificationResult.hostname
});
```

## Customization Options

### Frontend Customization
- Adjust score display in UI
- Customize error messages for different score ranges
- Implement retry mechanisms for failed verifications

### Backend Customization
- Implement action-specific score thresholds
- Add score-based rate limiting
- Create detailed analytics and reporting

## Performance Considerations

### reCAPTCHA v3 Benefits:
- **Better UX**: Invisible to users, no interaction required
- **Continuous Protection**: Always analyzing user behavior
- **Granular Control**: Score-based decisions vs binary pass/fail

### Monitoring Metrics:
- Average scores for legitimate users
- Score distribution patterns
- False positive/negative rates
- Performance impact on login flow

---

**Status**: ✅ Production Ready (reCAPTCHA v3)  
**Last Updated**: July 12, 2025  
**Configuration**: Complete with production keys and score-based validation  
**Minimum Score**: 0.5 (configurable)
