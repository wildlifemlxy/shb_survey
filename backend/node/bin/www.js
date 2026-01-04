/**
 * Module dependencies. ok
 */

require('dotenv').config(); // Load local .env file
require('dotenv').config({ path: '../../azure-webapp-config.env' });

var app = require('../app');
var debug = require('debug')('backend:server');
var http = require('http');

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3001');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

// --- Add Socket.IO setup ---
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: [
      'http://localhost:3000',
0%      'http://localhost:3002',
      'https://gentle-dune-0405ec500.1.azurestaticapps.net',
      'android-app://'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
    credentials: true 
  }
});
app.set('io', io); // Make io available in routes

// Register Telegram scheduler/webhook and event type updater concurrently, both robust to errors
try {
  const setupTelegramFeatures = require('../cron/telegramBotService');
  setupTelegramFeatures(app, io); // node-schedule is non-blocking, no await needed
} catch (err) {
  console.error('Error in telegramBotService:', err && (err.stack || err));
}

try {
  const startEventTypeUpdater = require('../cron/eventTypeUpdater');
  startEventTypeUpdater(io); // node-schedule is non-blocking, no await needed
} catch (err) {
  console.error('Error in eventTypeUpdater:', err && (err.stack || err));
}

io.on('connection', (socket) => {
  console.log('✓ Socket client connected:', socket.id);

  socket.on('message', (data) => {
    console.log('📨 Received from client:', data);
    // Echo back or broadcast
    socket.emit('message', 'Hello from Node.js backend!');
  });

  // Listen for gallery request from frontend
  socket.on('request_gallery', () => {
    console.log('📥 Gallery request received from client:', socket.id);
    
    // Query Google Drive immediately for this client
    queryGalleryAndRespond(socket);
  });

  socket.on('disconnect', () => {
    console.log('✗ Socket client disconnected:', socket.id);
  });
});

/**
 * Event listener for HTTP server "listening" event.
 */
//Please
function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}