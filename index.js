require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Make Socket.io accessible to routes
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Import Database Configuration
require('./src/config/db');

// Define Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/deposits', require('./src/routes/deposits'));
app.use('/api/withdrawals', require('./src/routes/withdrawals'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/audit', require('./src/routes/audit'));
app.use('/api/dashboard', require('./src/routes/dashboard'));

// Socket.io Real-time Connections
io.on('connection', (socket) => {
    console.log('New client connected via WebSocket:', socket.id);

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the Chama Financial Platform API (Real-time Enabled)!' });
});

// Start the server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
