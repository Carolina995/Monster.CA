const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');

// Initialize the Express application
const app = express();
const server = require('http').createServer(app); // Create HTTP server
const wss = new WebSocket.Server({ server }); // Create WebSocket server

// Set up view engine and directory for templates
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates', 'views'));

// Middleware for parsing URL-encoded bodies and serving static files
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'static')));

// Import and use router for handling routes
const indexRouter = require('./routes/route');
app.use('/', indexRouter);
