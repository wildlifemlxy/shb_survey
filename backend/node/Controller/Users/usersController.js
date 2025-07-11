const mongoose = require('mongoose');
const DatabaseConnectivity = require('../../Database/databaseConnectivity');
const EmailService = require('../../Others/Email/General');

class UsersController {
    constructor() {
        this.dbConnection = new DatabaseConnectivity();
        this.emailService = new EmailService();
    }
    
    async verifyUser(email, password) {
        try {
            console.log('Verifying user with email:', email, password);
            // Initialize the database connection
            await this.dbConnection.initialize();
            
            // For production, passwords should be hashed
            // This is a simple implementation for demo purposes
            const user = await this.dbConnection.getDocument(
                'Straw-Headed-Bulbul', // database name
                'Accounts', // collection name
                email,
                password
            );

            if (user) {
                // Check if this is a first-time login
                // You can add logic here to determine first-time login based on your business rules
                // For example, check if user has a 'firstTimeLogin' field or if 'lastLoginDate' is null
                const isFirstTimeLogin = user.firstTimeLogin === true || user.firstTimeLogin === 'true';
                
                return { 
                    success: true, 
                    user: {
                        ...user,
                        firstTimeLogin: isFirstTimeLogin
                    }, 
                    message: 'Authentication successful' 
                };
            } else {
                return { 
                    success: false, 
                    message: 'Invalid email or password' 
                };
            }
        } catch (error) {
            console.error('Error verifying user:', error);
            return { 
                success: false, 
                message: 'Authentication error occurred' 
            };
        }
    }

    async createUser(userData) {
        try {
            await this.dbConnection.initialize();
            const result = await this.dbConnection.insertDocument(
                'StrawHeadedBulbul',
                'users',
                userData
            );
            return result;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    async updateUser(userId, updateData) {
        try {
            await this.dbConnection.initialize();
            const result = await this.dbConnection.updateDocument(
                'StrawHeadedBulbul',
                'users',
                { _id: userId },
                { $set: updateData }
            );
            return result;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }

    async deleteUser(userId) {
        try {
            await this.dbConnection.initialize();
            // This would need to be implemented in databaseConnectivity.js
            // For now, we'll leave this as a placeholder
            console.error('deleteUser not implemented');
            return { success: false, message: 'Method not implemented' };
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }

    async changePassword(userId, email, newPassword) {
        try {
            console.log('Changing password for user:', email, 'with ID:', userId);
            await this.dbConnection.initialize();
            
            // Update the password and clear first-time login flag
            const result = await this.dbConnection.updateDocument(
                'Straw-Headed-Bulbul', // database name (matching the one used in verifyUser)
                'Accounts', // collection name (matching the one used in verifyUser)
                { _id: userId }, // filter by user ID
                { 
                    $set: { 
                        password: newPassword,
                        firstTimeLogin: false, // Clear first-time login flag
                        lastPasswordChange: new Date() // Track when password was changed
                    } 
                }
            );

            console.log('Password update result:', result);

            if (result.modifiedCount > 0) {
                return { 
                    success: true, 
                    message: 'Password changed successfully' 
                };
            } else {
                return { 
                    success: false, 
                    message: 'Failed to update password' 
                };
            }
        } catch (error) {
            console.error('Error changing password:', error);
            return { 
                success: false, 
                message: 'Password change error occurred' 
            };
        }
    }

    async resetPassword(email) {
        try {
            console.log('Processing password reset for email:', email);
            await this.dbConnection.initialize();
            
            // First, check if the user exists
            const user = await this.dbConnection.findDocument(
                'Straw-Headed-Bulbul', // database name
                'Accounts', // collection name
                { email: email }
            );

            if (!user) {
                // For security reasons, we don't reveal if the email exists or not
                // We return success but don't actually send an email
                console.log('User not found for email:', email);
                return { 
                    success: true, 
                    message: 'If the email exists in our system, a password reset link will be sent.' 
                };
            }

            // For now, we'll just log and return success
            console.log('Password reset requested for existing user:', email);
            
            // Simple implementation without crypto - just log the request
            const result = await this.dbConnection.updateDocument(
                'Straw-Headed-Bulbul',
                'Accounts',
                { email: email },
                { 
                    $set: { 
                        resetRequestedAt: new Date()
                    } 
                }
            );

            if (result.modifiedCount > 0) {
                // Send reset password email
                try {
                    const emailResult = await this.emailService.sendResetPasswordEmail(email);
                    
                    if (emailResult.success) {
                        console.log('Reset password email sent successfully to:', email);
                        return { 
                            success: true, 
                            message: 'Password reset email sent successfully. Please check your inbox.' 
                        };
                    } else {
                        console.log('Failed to send reset email, but request logged:', emailResult.error);
                        // Still return success to not reveal if email exists
                        return { 
                            success: true, 
                            message: 'Password reset request processed. If the email exists, you will receive instructions.' 
                        };
                    }
                } catch (emailError) {
                    console.error('Email sending error:', emailError);
                    // Still return success to not reveal if email exists
                    return { 
                        success: true, 
                        message: 'Password reset request processed. If the email exists, you will receive instructions.' 
                    };
                }
            } else {
                return { 
                    success: false, 
                    message: 'Failed to process password reset request' 
                };
            }
        } catch (error) {
            console.error('Error during password reset:', error);
            return { 
                success: false, 
                message: 'Password reset error occurred' 
            };
        }
    }
}

module.exports = UsersController;
