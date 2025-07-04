const mongoose = require('mongoose');
const DatabaseConnectivity = require('../../Database/databaseConnectivity');

class UsersController {
    constructor() {
        this.dbConnection = new DatabaseConnectivity();
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
                return { 
                    success: true, 
                    user: user, 
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
}

module.exports = UsersController;
