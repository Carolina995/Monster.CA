const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const WebSocket = require('ws');

// Initialize the Express application
const app = express();
const server = require('http').createServer(app); // Create HTTP server
const wss = new WebSocket.Server({ server }); // Create WebSocket server
