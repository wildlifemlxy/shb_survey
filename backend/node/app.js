var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");

var app = express(); // Initialize the Express app

var surveyRoutes = require('./routes/surveyRoutes'); // Import MongoDB survey routes
var eventsRoutes = require('./routes/eventsRoutes'); // Import MongoDB events routes
var telegramRoutes = require('./routes/telegramRoutes'); // Import MongoDB telegram routes
var userRoutes = require('./routes/usersRoutes'); // Import MongoDB user routes
var galleryRoutes = require('./routes/galleryRoutes'); // Import MongoDB gallery routes 

app.use(cors()); // Enable CORS
app.use(logger('dev')); // HTTP request logger
app.use(express.json()); // For parsing JSON
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded data
app.use(cookieParser()); // For parsing cookies

// Set up views (if you're using templates)okok
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug'); // You can change to 'ejs' or others if needed

app.use(logger('dev'));
app.use(cors({
  origin: ['http://localhost:3000', 'https://gentle-dune-0405ec500.1.azurestaticapps.net'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Add any other methods you want to support
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'], 
  exposedHeaders: ['Content-Disposition'], // Add this line to expose the header
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Serve uploaded files from backend uploads directory
// Serve email assets (logos, etc.) from Others/Email directory
app.use('/Others/Email', express.static(path.join(__dirname, 'Others/Email')));

app.use('/surveys', surveyRoutes); // Register MongoDB survey routes
app.use('/events', eventsRoutes); // Register MongoDB events routes
app.use('/telegram', telegramRoutes); // Register MongoDB telegram routes
app.use('/users', userRoutes); // Register MongoDB user routes
app.use('/gallery', galleryRoutes); // Register MongoDB gallery routes

// Increase payload limits for Azure App Service
app.use(express.json({ 
  limit: '10mb',
  extended: true 
}));

app.use(express.urlencoded({ 
  limit: '10mb',
  extended: true,
  parameterLimit: 50000
}));

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler (API style)
app.use(function(err, req, res, next) {
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

// Remove cron job registration from here. It should be registered in the server entry point where io is available.

module.exports = app;
