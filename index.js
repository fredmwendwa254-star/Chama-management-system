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

const port = process.env.PORT || 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Attach socket to requests
app.use((req, res, next) => {
    req.io = io;
    next();
});

// DB
require('./src/config/db');

// Routes
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/deposits', require('./src/routes/deposits'));
app.use('/api/withdrawals', require('./src/routes/withdrawals'));
app.use('/api/users', require('./src/routes/users'));
app.use('/api/audit', require('./src/routes/audit'));
app.use('/api/dashboard', require('./src/routes/dashboard'));

// Socket
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => {
        console.log('Socket disconnected:', socket.id);
    });
});

// Static frontend
const path = require('path');

if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'frontend', 'dist')));

    // ✅ FIXED (Express v5 safe wildcard)
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, 'frontend', 'dist', 'index.html'));
    });

} else {
    app.get('/', (req, res) => {
        res.json({ message: 'API running...' });
    });
}

// Start server
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});