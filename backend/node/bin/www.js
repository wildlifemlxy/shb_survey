/**
 * Module dependencies. ok
 */

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
  const setupTelegramFeatures = require('../cron/telegramBot');
  setupTelegramFeatures(app, io); // node-schedule is non-blocking, no await needed
} catch (err) {
  console.error('Error in telegramBot:', err && (err.stack || err));
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

// Helper function to query Google Drive and send to a specific socket client
async function queryGalleryAndRespond(socket) {
  try {
    const { google } = require('googleapis');
    const GalleryController = require('../Controller/Gallery/GalleryControllers');
    
    console.log('📡 Querying Google Drive for client:', socket.id);
    
    if (!GalleryController.googleAuthClient) {
      console.error('❌ Google Drive client not initialized');
      socket.emit('gallery_update', {
        images: [],
        count: 0,
        error: 'Google Drive client not initialized'
      });
      return;
    }
    
    const drive = google.drive({
      version: 'v3',
      auth: GalleryController.googleAuthClient
    });

    const response = await drive.files.list({
      q: `'${GalleryController.GOOGLE_DRIVE_CONFIG.targetFolderId}' in parents and (mimeType contains 'image/' or mimeType contains 'video/') and trashed = false`,
      spaces: 'drive',
      fields: 'files(id, name, createdTime, mimeType)',
      pageSize: 100,
      orderBy: 'createdTime desc'
    });

    console.log(`✅ Found ${response.data.files.length} media files for client:`, socket.id);

    const images = response.data.files.map(file => ({
      src: `/images/stream/${file.id}`,
      alt: file.name,
      title: file.name.replace(/\.[^.]+$/, ''),
      id: file.id,
      mimeType: file.mimeType,
      createdTime: file.createdTime
    }));

    // Send gallery_update to THIS specific client
    socket.emit('gallery_update', {
      images: images,
      count: images.length,
      timestamp: new Date().toISOString()
    });
    
    console.log('📡 Sent gallery_update to client:', socket.id, 'with', images.length, 'items');
  } catch (error) {
    console.error('❌ Error querying gallery:', error.message);
    socket.emit('gallery_update', {
      images: [],
      count: 0,
      error: error.message
    });
  }
}


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