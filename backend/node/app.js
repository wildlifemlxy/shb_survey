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
var mfaRoutes = require('./routes/mfaRoutes'); // Import MFA routes
var galleryRoutes = require('./routes/galleryRoutes'); // Import images routes

app.use(cors()); // Enable CORS
app.use(logger('dev')); // HTTP request logger

// Increase payload limits BEFORE parsing middleware
app.use(express.json({ 
  limit: '200mb'
}));
app.use(express.urlencoded({ 
  limit: '200mb',
  extended: true,
  parameterLimit: 50000
}));
app.use(cookieParser());

// Set up views (if you're using templates)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors({
  origin: ['http://localhost:3000', 'https://gentle-dune-0405ec500.1.azurestaticapps.net', "android-app://"],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Content-Disposition'],
  exposedHeaders: ['Content-Disposition'],
}));

app.use(express.static(path.join(__dirname, 'public')));

// Register routes
app.use('/surveys', surveyRoutes);
app.use('/events', eventsRoutes);
app.use('/telegram', telegramRoutes);
app.use('/users', userRoutes);
app.use('/mfa', mfaRoutes);
app.use('/gallery', galleryRoutes);


//
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler (API style)
app.use(function(err, req, res, next) {
  console.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    message: err.message,
    error: req.app.get('env') === 'development' ? err : {}
  });
});

// Remove cron job registration from here. It should be registered in the server entry point where io is available.

module.exports = app;
