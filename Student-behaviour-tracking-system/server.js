const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const { initWhatsApp, getWhatsAppStatus } = require('./server/services/whatsapp');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Initialize WhatsApp
initWhatsApp();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
}

// Unified Response Middleware (Optional but makes it smoother)
app.use((req, res, next) => {
    res.smoothJson = (data, message = 'Success', status = 200) => {
        res.status(status).json({ success: status < 400, message, data });
    };
    next();
});

// Routes
const authRoutes = require('./server/routes/auth');
const incidentRoutes = require('./server/routes/incidents');
const notificationRoutes = require('./server/routes/notifications');

app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/notifications', notificationRoutes);

// Health Check Endpoint to verify connections
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server connections are healthy and verified.',
        timestamp: new Date().toISOString()
    });
});

// WhatsApp Status Endpoint
app.get('/api/whatsapp/status', (req, res) => {
    const connected = getWhatsAppStatus();
    res.json({
        connected,
        message: connected
            ? 'WhatsApp is connected and ready to send messages.'
            : 'WhatsApp is not connected. Scan the QR code shown in the server console.'
    });
});

// Fallback to Dashboard if authenticated, else Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

const db = require('./server/db');

// Initialize database connection, then start server
let server;
db.connect()
    .then(() => {
        server = app.listen(PORT, () => {
            console.log(`\x1b[36m%s\x1b[0m`, `-----------------------------------------`);
            console.log(`\x1b[32m%s\x1b[0m`, `🚀 Server running on http://localhost:${PORT}`);
            console.log(`\x1b[36m%s\x1b[0m`, `-----------------------------------------`);
        });
    })
    .catch((err) => {
        console.error('❌ Database connection failed. Cannot start server:', err);
        process.exit(1);
    });

// Global Error Handler
app.use((err, req, res, next) => {
    console.error(`[Error] ${req.method} ${req.url}:`, err.message);
    res.status(500).json({ success: false, message: 'Internal Server Error', error: err.message });
});

process.on('SIGINT', async () => {
    console.log('\n\x1b[33m%s\x1b[0m', '🛑 Shutting down gracefully...');
    const { getClient } = require('./server/services/whatsapp');
    const client = getClient();
    if (client) {
        try {
            await client.destroy();
            console.log('\x1b[32m%s\x1b[0m', '✅ WhatsApp client destroyed.');
        } catch (err) {
            console.error('Error destroying client:', err);
        }
    }
    server.close(() => {
        console.log('\x1b[32m%s\x1b[0m', '✅ Server closed. Goodbye!');
        process.exit(0);
    });
});
