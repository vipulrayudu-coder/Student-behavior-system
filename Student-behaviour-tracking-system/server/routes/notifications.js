const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const NOTIFICATIONS_FILE = path.join(__dirname, '../../data/notifications.json');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Middleware to verify token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(403).json({ message: 'No token provided' });

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.status(401).json({ message: 'Unauthorized' });
        req.user = decoded;
        next();
    });
};

let notificationsCache = null;

// Helper to read notifications
const getNotifications = () => {
    if (notificationsCache) return notificationsCache;
    if (!fs.existsSync(NOTIFICATIONS_FILE)) {
        // Seed with some default notifications if empty
        const defaults = [
            { id: '1', title: 'Critical Incident: Building 4 Entry Breach', message: 'Unauthorized keycard access detected at East Gate entrance at 08:42 AM.', type: 'critical', timestamp: new Date().toISOString(), read: false },
            { id: '2', title: 'Parent Notification Pending', message: 'Review draft for Case #4922 regarding student behavior report.', type: 'info', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
            { id: '3', title: 'New Counselor Feedback', message: 'Dr. Aris Thorne added comments to the follow-up strategy for Incident #883.', type: 'info', timestamp: new Date(Date.now() - 7200000).toISOString(), read: false }
        ];
        try {
            fs.writeFileSync(NOTIFICATIONS_FILE, JSON.stringify(defaults, null, 2));
        } catch (err) {
            console.error('Error seeding notifications file:', err);
        }
        notificationsCache = defaults;
        return defaults;
    }
    try {
        const data = fs.readFileSync(NOTIFICATIONS_FILE);
        notificationsCache = JSON.parse(data);
        return notificationsCache;
    } catch (err) {
        console.error('Error reading notifications file:', err);
        return [];
    }
};

// Helper to save notifications
const saveNotifications = (notifications) => {
    notificationsCache = notifications;
    fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2), (err) => {
        if (err) {
            console.error('Error saving notifications file asynchronously:', err);
        }
    });
};

// Get all notifications
router.get('/', verifyToken, (req, res) => {
    const notifications = getNotifications();
    res.json(notifications);
});

// Mark all as read
router.post('/mark-all-read', verifyToken, (req, res) => {
    let notifications = getNotifications();
    notifications = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(notifications);
    res.json({ message: 'All marked as read' });
});

// Dismiss notification
router.delete('/:id', verifyToken, (req, res) => {
    let notifications = getNotifications();
    notifications = notifications.filter(n => n.id !== req.params.id);
    saveNotifications(notifications);
    res.status(204).send();
});

module.exports = router;
