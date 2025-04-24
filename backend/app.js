// Add these error handling mechanisms near the top of your app.js

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    
    // Save important state
    try {
      saveSurveyData();
      saveTelegramConfig();
      console.log('State saved after exception');
    } catch (saveErr) {
      console.error('Error saving state during exception:', saveErr);
    }
    
    // Don't exit the process - let Forever handle the restart
  });
  
  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    
    // Save important state
    try {
      saveSurveyData();
      saveTelegramConfig();
      console.log('State saved after rejection');
    } catch (saveErr) {
      console.error('Error saving state during rejection:', saveErr);
    }
  });
  
  // Handle termination signals
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, saving state and shutting down...');
    saveSurveyData();
    saveTelegramConfig();
    process.exit(0);
  });
  
  process.on('SIGINT', () => {
    console.log('SIGINT received, saving state and shutting down...');
    saveSurveyData();
    saveTelegramConfig();
    process.exit(0);
  });
  
  // Add a /ping endpoint to help with monitoring
  app.get('/ping', (req, res) => {
    res.status(200).send('OK');
  });

  // Import self-ping module
const { startSelfPing } = require('./selfPing');

// Start the self-ping service 
if (process.env.NODE_ENV === 'production') {
  startSelfPing();
}
