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
                
                // Send congratulations email for first-time login
                if (isFirstTimeLogin) {
                    try {
                        // Include user information in the welcome email
                        const emailResult = await this.emailService.sendFirstLoginCongratulationsEmail(email, {
                            email: email,
                            password: password, // Include the password for first-time users
                            name: user.name || 'User'
                        });
                        console.log('First login congratulations email sent:', emailResult.success);
                    } catch (emailError) {
                        console.error('Failed to send congratulations email:', emailError);
                        // Don't fail the login if email fails
                    }
                }
                
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

    async sendWelcomeEmail(email) {
        try {
            console.log('Sending welcome email to:', email);
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

            // Send welcome/congratulations email
            const emailResult = await this.emailService.sendFirstLoginCongratulationsEmail(email);
            
            if (emailResult.success) {
                return { 
                    success: true, 
                    message: 'Welcome email sent successfully' 
                };
            } else {
                console.error('Failed to send welcome email:', emailResult.error);
                return { 
                    success: false, 
                    message: 'Failed to send welcome email' 
                };
            }
        } catch (error) {
            console.error('Error sending welcome email:', error);
            return { 
                success: false, 
                message: 'Welcome email error occurred' 
            };
        }
    }

    // Keep the old method for backward compatibility, but update functionality
    async resetPassword(email) {
        try {
            console.log('Processing welcome email for:', email);
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
                    message: 'If this email exists in our system, a welcome message will be sent.' 
                };
            }

            // Send welcome/congratulations email (updated functionality)
            const emailResult = await this.emailService.sendFirstLoginCongratulationsEmail(email);
            
            if (emailResult.success) {
                return { 
                    success: true, 
                    message: 'Welcome email sent successfully' 
                };
            } else {
                console.error('Failed to send welcome email:', emailResult.error);
                return { 
                    success: false, 
                    message: 'Failed to send welcome email' 
                };
            }
        } catch (error) {
            console.error('Error processing welcome email:', error);
            return { 
                success: false, 
                message: 'Welcome email error occurred' 
            };
        }
    }

    async sendMFACode(email, mfaCode, expirationMinutes = 10) {
        try {
            console.log('Sending MFA code to:', email);
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

            // Send MFA email
            const emailResult = await this.emailService.sendMFAEmail(email, mfaCode, expirationMinutes);
            
            if (emailResult.success) {
                return { 
                    success: true, 
                    message: 'MFA code sent successfully' 
                };
            } else {
                console.error('Failed to send MFA email:', emailResult.error);
                return { 
                    success: false, 
                    message: 'Failed to send MFA code' 
                };
            }
        } catch (error) {
            console.error('Error sending MFA code:', error);
            return { 
                success: false, 
                message: 'MFA code error occurred' 
            };
        }
    }

    async sendMFANotification(email, mfaCode, expirationMinutes = 10) {
        try {
            console.log('Sending MFA notification to:', email);
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

            // Send MFA notification email with both HTML and text
            const emailResult = await this.emailService.sendMFANotificationEmail(email, mfaCode, expirationMinutes);
            
            if (emailResult.success) {
                return { 
                    success: true, 
                    message: 'MFA notification sent successfully' 
                };
            } else {
                console.error('Failed to send MFA notification:', emailResult.error);
                return { 
                    success: false, 
                    message: 'Failed to send MFA notification' 
                };
            }
        } catch (error) {
            console.error('Error sending MFA notification:', error);
            return { 
                success: false, 
                message: 'MFA notification error occurred' 
            };
        }
    }

    // Helper method to generate MFA codes
    generateMFACode(length = 6) {
        const digits = '0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return result;
    }
}

module.exports = UsersController;
