var express = require('express');
var router = express.Router();
var UsersController = require('../Controller/Users/usersController');
var tokenEncryption = require('../middleware/tokenEncryption'); // Import token encryption middleware

router.post('/', async function(req, res, next) 
{
    console.log('Login request received:', req.body);

    if(req.body.purpose === "login")
    {
        //await new UsersController().deleteUser("68678679046b34941f40582f");
        // Use token encryption login system
       return await tokenEncryption.login(req, res, next);
    }
    else if(req.body.purpose === "changePassword")
    {
        // Use token encryption change password system
        return tokenEncryption.changePassword(req, res, next);
    }
    else if(req.body.purpose === "resetPassword")
    {
        // Use token encryption reset password system
        return tokenEncryption.resetPassword(req, res, next);
    }
    else if(req.body.purpose === "refreshToken")
    {
        // Refresh token (requires authentication)
        return tokenEncryption.authenticateToken(req, res, () => {
            return tokenEncryption.refreshToken(req, res, next);
        });
    }
    else if(req.body.purpose === "tokenLogout")
    {
        // Token-based logout (requires authentication)
        return tokenEncryption.authenticateToken(req, res, () => {
            return tokenEncryption.logout(req, res, next);
        });
    }
    else if(req.body.purpose === "getPublicKey")
    {
        // Get public key for client-side encryption
        return res.json({ 
            success: true,
            publicKey: tokenEncryption.publicKey,
            algorithm: 'RSA-OAEP',
            keySize: 2048
        });
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
