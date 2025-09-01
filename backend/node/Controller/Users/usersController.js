const mongoose = require('mongoose');
const DatabaseConnectivity = require('../../Database/databaseConnectivity');
const EmailService = require('../../Others/Email/General');

class UsersController {
    constructor() {
        // Use independent connection for complete isolation
        this.dbConnection = DatabaseConnectivity.createIndependentInstance();
        this.emailService = new EmailService();
        
        // Auto-start live updates for user-related collections
        this.initializeLiveUpdates();
    }

    // Initialize live updates for real-time user data sync
    async initializeLiveUpdates() {
        try {
            // Start live updates for user-related collections
            await this.dbConnection.startLiveUpdates(['Accounts', 'Survey', 'Events']);
        } catch (error) {
            // Silent initialization - live updates will retry automatically
        }
    }

    // Subscribe to live user updates (for real-time frontend sync)
    subscribeToUserUpdates(callback) {
        return this.dbConnection.subscribeToLiveUpdates('Accounts', callback);
    }

    // Subscribe to any collection updates
    subscribeToCollectionUpdates(collectionName, callback) {
        return this.dbConnection.subscribeToLiveUpdates(collectionName, callback);
    }

    async deleteUser(userId) {
        try {
            await this.dbConnection.initialize();
            const filter = { _id: userId };
            const result = await this.dbConnection.deleteDocument(
                'Straw-Headed-Bulbul',
                'Accounts',
                filter
            );
            console.log('User deletion result:', result);
            return result;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        }
    }
    
    async verifyUser(email, password) {
        try {
            console.log(`[${this.dbConnection.instanceId}] Verifying user with email:`, email);
            await this.dbConnection.initialize();

            // 1. Find user by email - with independent connection
            const user = await this.dbConnection.findDocument(
                'Straw-Headed-Bulbul',
                'Accounts',
                { email: email }
            );

            if (!user || !user.password) {
                return {
                    success: false,
                    message: 'Invalid email or password'
                };
            }

            // Direct password comparison (no hashing)
            if (password === user.password) 
            {
                console.log('User authenticated successfully:', user);
                const isFirstTimeLogin = user.firstTimeLogin;

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
            return {
                success: false,
                message: 'Authentication error occurred'
            };
        }
    }

    async getAllUsers() {
        try {
            await this.dbConnection.initialize();
            
            // Get all users from the database
            const users = await this.dbConnection.getAllDocuments(
                'Straw-Headed-Bulbul', // database name
                'Accounts' // collection name
            );

            if (users && Array.isArray(users)) {
                return { 
                    success: true, 
                    users: users,
                    message: 'Users retrieved successfully' 
                };
            } else {
                return { 
                    success: true, 
                    users: [],
                    message: 'No users found' 
                };
            }
        } catch (error) {
            console.error('Error retrieving all users:', error);
            return { 
                success: false, 
                users: [],
                message: 'Error retrieving users' 
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
    
    async changePassword(userId, email, newPassword) {
        try {
            console.log('Changing password for user:', email, 'with ID:', userId, 'password:', newPassword);
            await this.dbConnection.initialize();

            // Store password directly (no hashing)
            const updateFields = {
                password: newPassword,
                firstTimeLogin: false,
                lastPasswordChange: new Date()
            };

            // If userId is a string, convert to ObjectId for MongoDB
            let filter = { _id: userId };
            if (typeof userId === 'string' && userId.length === 24) {
                try {
                    const mongoose = require('mongoose');
                    filter = { _id: new mongoose.Types.ObjectId(userId) };
                } catch (e) {
                    console.warn('Could not convert userId to ObjectId:', e);
                }
            }

            console.log('Update filter:', filter);
            console.log('Update fields:', updateFields);

            const result = await this.dbConnection.updateDocument(
                'Straw-Headed-Bulbul',
                'Accounts',
                filter,
                { $set: updateFields }
            );

            console.log('Password update result:', result);

            if (result.modifiedCount > 0) {
                // If you have the newPassword available, pass it here. Otherwise, pass null or undefined.
                const emailResult = await this.emailService.sendFirstLoginCongratulationsEmail(email, {
                    email: email,
                    name: 'User',
                    password: newPassword// Pass the password used for login (if appropriate)
                });
                console.log('First login congratulations email sent:', emailResult.success);
                return {
                    success: true,
                    message: 'Password changed successfully'
                };
            } else {
                // Log the result for debugging
                console.error('Password update failed. Result:', result);
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

            // Store password directly (no hashing)
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
           
            await this.sendWelcomeEmail(user.name, mail, newPassword)

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

    async sendWelcomeEmail(name, email, newPassword) {
        try {
            console.log('Sending welcome email to:', email);
            await this.dbConnection.initialize();
            
            // Send welcome/congratulations email
            const emailResult = await this.emailService.sendFirstLoginCongratulationsEmail(email, { name: name, password: newPassword });

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
            const emailResult = await this.emailService.sendResetPasswordEmail(email);
            
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
