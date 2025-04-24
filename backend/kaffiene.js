// kaffeine.js - You can run this from another server or from your local machine
const axios = require('axios');
const cron = require('node-cron');

const pingUrl = 'https://your-azure-app-name.azurewebsites.net/ping';

const pingApp = async () => {
  try {
    console.log(`Pinging ${pingUrl} at ${new Date().toISOString()}`);
    const response = await axios.get(pingUrl);
    console.log(`Ping successful: ${response.status}`);
  } catch (error) {
    console.error(`Ping failed: ${error.message}`);
  }
};

// Ping every 15 minutes
cron.schedule('*/15 * * * *', pingApp);
console.log('Kaffeine-style ping service started');

// Run first ping immediately
pingApp();