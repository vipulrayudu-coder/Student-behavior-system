const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';

// Pre-computed hash cache for default passwords to save CPU cycles
let cachedStudentHash = null;
let cachedEduHash = null;

const getStudentHash = async () => {
    if (!cachedStudentHash) {
        cachedStudentHash = await bcrypt.hash('Student@123', 10);
    }
    return cachedStudentHash;
};

const getEduHash = async () => {
    if (!cachedEduHash) {
        cachedEduHash = await bcrypt.hash('Edu@123', 10);
    }
    return cachedEduHash;
};

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

// Email validation regex (standard format)
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// Login with Auto-Student Creation
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate email format
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        let user = await db.users.findOne({ email });

        // Special Case: New Student Login
        if (!user) {
            // Only allow auto-creation if it looks like an email (not the special admin login)
            if (email.includes('@')) {
                const defaultStudentPassword = await getStudentHash();
                const emailPrefix = email.split('@')[0];
                user = await db.users.create({
                    name: emailPrefix, // Use email prefix as name
                    email,
                    password: defaultStudentPassword,
                    role: 'student',
                    studentId: emailPrefix // Use prefix as studentId instead of random
                });
            } else {
                return res.status(400).json({ message: 'User not found' });
            }
        }

        // Check Password
        if (!(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, studentId: user.studentId, name: user.name },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({ token, user: { name: user.name, role: user.role, email: user.email, studentId: user.studentId } });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Update Profile
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { name, email } = req.body;
        
        const updatedUser = await db.users.findByIdAndUpdate(req.user.id, {
            ...(name && { name }),
            ...(email && { email })
        });
        
        if (!updatedUser) return res.status(404).json({ message: 'User not found' });
        
        res.json({ message: 'Profile updated', user: updatedUser });
    } catch (err) {
        console.error('Update profile error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Get Staff Directory (Admin only)
router.get('/users', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(401).json({ message: 'Unauthorized' });
        const users = await db.users.find();
        res.json(users);
    } catch (err) {
        console.error('Get users error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Add New User (Admin only)
router.post('/users', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(401).json({ message: 'Unauthorized' });
        
        const { name, email, role, password, department } = req.body;
        
        const existing = await db.users.findOne({ email });
        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const hashedPassword = password ? await bcrypt.hash(password, 10) : await getEduHash();
        const studentId = role === 'student' ? 'ST-' + Math.floor(1000 + Math.random() * 9000) : null;
        
        const newUser = await db.users.create({
            name,
            email,
            password: hashedPassword,
            role: role || 'staff',
            department: department || 'General',
            studentId
        });
        
        res.status(201).json(newUser);
    } catch (err) {
        console.error('Create user error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete User (Admin only)
router.delete('/users/:id', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(401).json({ message: 'Unauthorized' });
        
        const deleted = await db.users.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(204).send();
    } catch (err) {
        console.error('Delete user error:', err);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

module.exports = router;
