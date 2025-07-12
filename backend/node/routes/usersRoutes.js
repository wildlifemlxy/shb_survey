var express = require('express');
var router = express.Router();
var UsersController = require('../Controller/Users/usersController'); 

router.post('/', async function(req, res, next) 
{
    if(req.body.purpose === "login")
    {
        try {
            const { email, password } = req.body.loginDetails;
            console.log('Login attempt for:', email, password);
            var controller = new UsersController();
            var result = await controller.verifyUser(email, password);
            console.log('Authentication result:', result);
            
            if (result.success) {
                console.log('User authenticated successfully:', email);
                return res.json({
                    success: true,
                    data: result.user,
                    message: 'Login successful'
                });
            } else {
                console.log('Authentication failed for:', email);
                return res.json({
                    success: false,
                    message: result.message || 'Invalid email or password'
                });
            }
        } catch (error) {
            console.error('Error during authentication:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Authentication failed due to server error.' 
            });
        }
    }
    else if(req.body.purpose === "changePassword")
    {
        try {
            const { email, newPassword } = req.body;
            console.log('Password change request body:', req.body);
            console.log('Extracted values - email:', email, 'newPassword length:', newPassword?.length);
            
            // Validate required fields
            if (!email || !newPassword) {
                console.log('Validation failed:', {
                    email: !!email,
                    newPassword: !!newPassword
                });
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: email and newPassword are required'
                });
            }
            
            // Validate password length
            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Password must be at least 8 characters long'
                });
            }
            
            var controller = new UsersController();
            var result = await controller.changePasswordByEmail(email, newPassword);
            console.log('Password change result:', result);
            
            if (result.success) {
                console.log('Password changed successfully for:', email);
                return res.json({
                    success: true,
                    message: result.message || 'Password changed successfully'
                });
            } else {
                console.log('Password change failed for:', email);
                return res.json({
                    success: false,
                    message: result.message || 'Failed to change password'
                });
            }
        } catch (error) {
            console.error('Error during password change:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Password change failed due to server error.' 
            });
        }
    }
    else if(req.body.purpose === "resetPassword")
    {
        try {
            const { email } = req.body;
            console.log('Password reset request for email:', email);
            
            // Validate required fields
            if (!email) {
                console.log('Validation failed: email is required');
                return res.status(400).json({
                    success: false,
                    message: 'Email is required for password reset'
                });
            }
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({
                    success: false,
                    message: 'Please enter a valid email address'
                });
            }
            
            var controller = new UsersController();
            var result = await controller.resetPassword(email);
            console.log('Password reset result:', result);
            
            if (result.success) {
                console.log('Password reset email sent successfully for:', email);
                return res.json({
                    success: true,
                    message: result.message || 'Password reset email sent successfully'
                });
            } else {
                console.log('Password reset failed for:', email);
                return res.json({
                    success: false,
                    message: result.message || 'Failed to send password reset email'
                });
            }
        } catch (error) {
            console.error('Error during password reset:', error);
            return res.status(500).json({ 
                success: false,
                error: 'Password reset failed due to server error.' 
            });
        }
    }
    else {
        return res.status(400).json({ error: 'Invalid purpose.' });
    }
});

// reCAPTCHA verification endpoint
router.post('/verify-recaptcha', async function(req, res, next) {
    try {
        const { recaptchaResponse } = req.body;
        
        console.log('reCAPTCHA verification request received:', {
            hasResponse: !!recaptchaResponse,
            responseLength: recaptchaResponse ? recaptchaResponse.length : 0
        });
        
        if (!recaptchaResponse) {
            return res.status(400).json({
                success: false,
                message: 'reCAPTCHA response is required'
            });
        }

        // Google reCAPTCHA v3 secret key for server-side verification
        const RECAPTCHA_SECRET_KEY = '6Le9xoArAAAAAMO03WNLplXfg2pFy3lroivlc4pn';
        
        // Verify reCAPTCHA with Google's servers
        const axios = require('axios');
        const verificationUrl = 'https://www.google.com/recaptcha/api/siteverify';
        
        console.log('Sending verification request to Google...');
        
        const response = await axios.post(verificationUrl, 
            `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                timeout: 10000 // 10 second timeout
            }
        );
        
        const verificationResult = response.data;
        console.log('Google reCAPTCHA verification result:', verificationResult);
        
        if (verificationResult.success) {
            const score = verificationResult.score || 0;
            const action = verificationResult.action || 'unknown';
            
            console.log('reCAPTCHA v3 verification successful:', {
                score: score,
                action: action,
                hostname: verificationResult.hostname,
                challenge_ts: verificationResult.challenge_ts
            });
            
            // reCAPTCHA v3 provides a score from 0.0 (likely bot) to 1.0 (likely human)
            // You can adjust this threshold based on your security requirements
            const minimumScore = 0.5;
            
            if (score >= minimumScore) {
                return res.json({
                    success: true,
                    message: 'reCAPTCHA v3 verification successful',
                    score: score,
                    action: action,
                    risk_level: score >= 0.8 ? 'LOW' : score >= 0.5 ? 'MEDIUM' : 'HIGH'
                });
            } else {
                console.log('reCAPTCHA v3 score too low:', score);
                return res.json({
                    success: false,
                    message: 'Security verification failed - suspicious activity detected',
                    score: score,
                    reason: 'score_too_low'
                });
            }
        } else {
            const errorCodes = verificationResult['error-codes'] || ['unknown-error'];
            console.log('reCAPTCHA v3 verification failed:', {
                success: verificationResult.success,
                errorCodes: errorCodes,
                hostname: verificationResult.hostname,
                fullResult: verificationResult
            });
            
            // Provide more specific error messages
            let errorMessage = 'reCAPTCHA v3 verification failed';
            if (errorCodes.includes('missing-input-secret')) {
                errorMessage = 'Server configuration error: missing secret key';
            } else if (errorCodes.includes('invalid-input-secret')) {
                errorMessage = 'Server configuration error: invalid secret key';
            } else if (errorCodes.includes('missing-input-response')) {
                errorMessage = 'Missing reCAPTCHA response';
            } else if (errorCodes.includes('invalid-input-response')) {
                errorMessage = 'Invalid reCAPTCHA response';
            } else if (errorCodes.includes('timeout-or-duplicate')) {
                errorMessage = 'reCAPTCHA timeout or duplicate submission';
            }
            
            return res.json({
                success: false,
                message: errorMessage,
                errors: errorCodes,
                debug: verificationResult
            });
        }
        
    } catch (error) {
        console.error('Error during reCAPTCHA verification:', error);
        return res.status(500).json({
            success: false,
            message: 'reCAPTCHA verification failed due to server error',
            error: error.message
        });
    }
});

module.exports = router;
