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
    else {
        return res.status(400).json({ error: 'Invalid purpose.' });
    }
});

module.exports = router;
