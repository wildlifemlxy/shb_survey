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

    async changePasswordByEmail(email, newPassword) {
        try {
            console.log('Changing password for user with email:', email);
            await this.dbConnection.initialize();
            
            // First, check if the user exists
            const user = await this.dbConnection.findDocument(
                'Straw-Headed-Bulbul', // database name
                'Accounts', // collection name
                { email: email }
            );

            if (!user) {
                return { 
                    success: false, 
                    message: 'User not found with this email address' 
                };
            }
            
            // Update the password and clear first-time login flag
            const result = await this.dbConnection.updateDocument(
                'Straw-Headed-Bulbul', // database name
                'Accounts', // collection name
                { email: email }, // filter by email
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
            console.error('Error changing password by email:', error);
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
                // Don't reveal whether user exists or not for security
                return { 
                    success: true, 
                    message: 'If this email exists in our system, a password reset link will be sent.' 
                };
            }

            // Send password reset email
            const emailResult = await this.emailService.sendResetPasswordEmail(email, user.name || 'User');
            
            if (emailResult.success) {
                return { 
                    success: true, 
                    message: 'Password reset email sent successfully' 
                };
            } else {
                console.error('Failed to send reset email:', emailResult.error);
                return { 
                    success: false, 
                    message: 'Failed to send password reset email' 
                };
            }
        } catch (error) {
            console.error('Error processing password reset:', error);
            return { 
                success: false, 
                message: 'Password reset error occurred' 
            };
        }
    }
}

module.exports = UsersController;
