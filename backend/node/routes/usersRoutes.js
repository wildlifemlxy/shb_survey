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

module.exports = router;
