// Add this to your main app.js or server file for monitoring
const DatabaseConnectivity = require('./Database/databaseConnectivity');
const db = DatabaseConnectivity.getInstance();

// Monitor connection stats every 30 seconds
setInterval(() => {
  const stats = db.getConnectionStats();
  console.log('DB Connection Stats:', {
    connected: stats.connected,
    activeOperations: stats.activeOperations,
    idleTime: Math.round(stats.idleTime / 1000) + 's'
  });
}, 30000);

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, starting graceful shutdown...');
  await db.gracefulShutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, starting graceful shutdown...');
  await db.gracefulShutdown();
  process.exit(0);
});
