
// selfPing.js - Add this file to your project
const axios = require('axios');
const cron = require('node-cron');

const appUrl = process.env.APP_URL || 'https://your-azure-app-name.azurewebsites.net';

const selfPing = async () => {
  try {
    console.log(`Self-pinging application at ${appUrl}/ping`);
    const response = await axios.get(`${appUrl}/ping`);
    console.log(`Self-ping response: ${response.status} ${response.statusText}`);
  } catch (error) {
    console.error('Self-ping failed:', error.message);
  }
};

// Schedule a ping every 15 minutes
const startSelfPing = () => {
  console.log('Starting self-ping service');
  cron.schedule('*/15 * * * *', selfPing);
  
  // Also run immediately on startup
  selfPing();
};

module.exports = { startSelfPing };