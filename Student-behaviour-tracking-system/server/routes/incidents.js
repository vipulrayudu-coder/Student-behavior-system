const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../db');
const { sendIncidentAlert } = require('../services/whatsapp');

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

// Get all incidents (Admin) or student incidents
router.get('/', verifyToken, async (req, res) => {
    try {
        const { type, severity, studentId, search } = req.query;

        if (req.user.role === 'admin') {
            const query = {};
            if (type) query.type = type;
            if (severity) query.severity = severity;
            if (studentId) query.studentId = studentId;
            if (search) query.search = search;

            const incidents = await db.incidents.find(query);
            res.json(incidents);
        } else {
            const incidents = await db.incidents.find({ studentId: req.user.studentId });
            res.json(incidents);
        }
    } catch (err) {
        console.error('Get incidents error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Create incident (Admin and Student)
router.post('/', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'student') {
            return res.status(403).json({ message: 'Unauthorized to report incidents' });
        }

        const { studentId, studentName, grade, type, location, description, date, severity, parentContact } = req.body;

        const newIncident = await db.incidents.create({
            studentId,
            studentName,
            grade,
            type,
            location: location || 'N/A',
            description,
            date: date || new Date().toISOString(),
            severity: severity || 'low',
            parentContact: parentContact || '',
            reportedBy: req.user.name,
            timestamp: new Date().toISOString()
        });

        // Fire-and-forget WhatsApp incident alert — never blocks the HTTP response
        if (parentContact) {
            sendIncidentAlert(parentContact, newIncident)
                .then(sent => {
                    if (!sent) {
                        console.warn(`[Incidents] WhatsApp alert NOT delivered for incident ${newIncident.id} (contact: ${parentContact}).`);
                    }
                })
                .catch(err => {
                    console.error('[Incidents] Unexpected error sending WhatsApp alert:', err.message);
                });
        } else {
            console.warn(`[Incidents] No parentContact provided for incident ${newIncident.id} — WhatsApp alert skipped.`);
        }

        res.status(201).json(newIncident);
    } catch (err) {
        console.error('Create incident error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update incident
router.put('/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
        
        const updated = await db.incidents.findByIdAndUpdate(req.params.id, req.body);
        if (!updated) return res.status(404).json({ message: 'Incident not found' });
        
        res.json(updated);
    } catch (err) {
        console.error('Update incident error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete incident
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ message: 'Unauthorized' });
        
        const deleted = await db.incidents.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ message: 'Incident not found' });
        
        res.status(204).send();
    } catch (err) {
        console.error('Delete incident error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
