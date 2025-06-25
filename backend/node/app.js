var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors");

var app = express(); // Initialize the Express app

var surveyRoutes = require('./routes/surveyRoutes'); // Import MongoDB survey routes

// Set up CORS for both local dev and Azure Static Web App
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://ashy-glacier-0df38a400.6.azurestaticapps.net'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Content-Disposition'],
  exposedHeaders: ['Content-Disposition'],
  credentials: true
}));

app.use(logger('dev')); // HTTP request logger
app.use(express.json()); // For parsing JSON
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded data
app.use(cookieParser()); // For parsing cookies

// Set up views (if you're using templates)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug'); // You can change to 'ejs' or others if needed

app.use(express.static(path.join(__dirname, 'public')));

app.use('/surveys', surveyRoutes); // Register MongoDB survey routes under /api

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

module.exports = app;
