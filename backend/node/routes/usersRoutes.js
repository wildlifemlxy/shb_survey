var express = require('express');
var router = express.Router();
var UsersController = require('../Controller/Users/usersController');

// Unified login endpoint - handles all user operations based on purpose
router.post('/', async function(req, res, next) {
    try {        
        const { purpose } = req.body;
        
        if (!purpose) {
            return res.status(400).json({
                success: false,
                message: 'Purpose is required'
            });
        }

        switch (purpose) {
            case 'login':
                return await handleLogin(req, res);
            case 'change-password':
                return await handleChangePassword(req, res);
            case 'reset-password':
                return await handleResetPassword(req, res);
            case 'verify-recaptcha':
                return await handleVerifyRecaptcha(req, res);
            case 'update-user':
                return await handleUpdateUser(req, res);
            case 'googleSignIn':
                return await handleGoogleSignIn(req, res);
            default:
                return res.status(400).json({
                    success: false,
                    message: 'Invalid purpose. Supported purposes: login, change-password, reset-password, verify-recaptcha, update-user, googleSignIn'
                });
        }
    } catch (error) {
        console.error('Unified endpoint error:', error);
        return res.status(500).json({ 
            success: false,
            error: 'Operation failed',
            message: error.message 
        });
    }
});

// Login handler function
async function handleLogin(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    const controller = new UsersController();
    const result = await controller.verifyUser(email, password);
    console.log('Login attempt result for', email, ':', result);
    
    if (result.success && result.user) {
        console.log('Login successful for:', email);
        return res.json({
            success: true,
            data: {
                id: result.user._id || result.user.id,
                email: result.user.email || email,
                role: result.user.role || 'user',
                name: result.user.name,
                password: result.user.password,
                firstTimeLogin: result.user.firstTimeLogin,
                firstLoggedInApp: result.user.firstLoggedInApp
            },
            message: 'Login successful'
        });
    } else {
        return res.json({
            success: false,
            message: 'Invalid email or password'
        });
    }
}

// Change password handler function
async function handleChangePassword(req, res) {
    const { email, newPassword } = req.body;
    
    if (!email || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Email and new password are required'
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long'
        });
    }

    const controller = new UsersController();
    const result = await controller.changePasswordByEmail(email, newPassword);
    
    return res.json({
        success: result.success,
        message: result.message || (result.success ? 'Password changed successfully' : 'Failed to change password')
    });
}

// Reset password handler function
async function handleResetPassword(req, res) {
    console.log('Password reset request received:', req.body);
    const { email, newPassword } = req.body;
    
    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid email address'
        });
    }

    const controller = new UsersController();
    const result = await controller.resetPassword(email, newPassword);
    console.log('Password reset request result for', email, ':', result);
    
    return res.json({
        success: result.success,
        message: result.message || (result.success ? 'Password reset email sent' : 'Failed to send reset email')
    });
}

// Update user handler function
async function handleUpdateUser(req, res) {
    const { email, updateData } = req.body;
    
    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }

    if (!updateData || Object.keys(updateData).length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Update data is required'
        });
    }

    try {
        const controller = new UsersController();
        const result = await controller.updateUserByEmail(email, updateData);
        console.log('Update user result for', email, ':', result);
        
        // Emit Socket.IO event for user update
        const io = req.app.get('io');
        if (io) {
            io.emit('userUpdated', {
                action: 'update',
                email: email,
                updateData: updateData,
                result: result,
                timestamp: new Date().toISOString()
            });
            console.log('Socket.IO: User update event emitted');
        }
        
        return res.json({
            success: result.success,
            message: result.message || 'User updated successfully',
            result: result
        });
    } catch (error) {
        console.error('Error updating user:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update user',
            error: error.message
        });
    }
}

// reCAPTCHA verification handler function
async function handleVerifyRecaptcha(req, res) {
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
}

// Google Sign-In handler function
async function handleGoogleSignIn(req, res) {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required for Google sign-in'
        });
    }

    try {
        // Find user by email
        const controller = new UsersController();
        const user = await controller.findUserByEmail(email.toLowerCase());

        if (!user) {
            return res.status(200).json({
                success: false,
                message: 'No account found for this email. Please contact your administrator.',
                error: 'Account not found'
            });
        }

        // User found - return user data (no password verification needed)
        // Google has already verified the user's identity
        return res.status(200).json({
            success: true,
            message: 'Google sign-in successful',
            data: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                telegram: user.telegram,
                firstLoggedInApp: user.firstLoggedInApp || false
            }
        });

    } catch (error) {
        console.error('Google sign-in error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during Google sign-in',
            error: error.message
        });
    }
}

module.exports = router;
