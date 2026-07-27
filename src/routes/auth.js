const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    const { email, phone, password, role, fullName } = req.body;

    try {
        if (!email || !phone || !password || !fullName) {
            return res.status(400).json({ msg: 'All registration fields are required' });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ msg: 'Please provide a valid email address' });
        }

        // Password strength rules
        if (password.length < 6) {
            return res.status(400).json({ msg: 'Password must be at least 6 characters' });
        }

        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1 OR phone = $2', [email, phone]);

        if (userCheck.rows.length > 0) {
            const existing = userCheck.rows[0];
            if (existing.email === email) {
                return res.status(400).json({ msg: 'Email is already registered' });
            } else {
                return res.status(400).json({ msg: 'Phone number is already registered' });
            }
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userRole = role === 'admin' ? 'admin' : 'member';

        const newUser = await pool.query(
            `INSERT INTO users (email, phone, password, role, full_name) 
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, email, phone, role, full_name`,
            [email, phone, hashedPassword, userRole, fullName]
        );

        res.json({ msg: 'User registered successfully', user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    const { emailOrPhone, password } = req.body;

    try {
        if (!emailOrPhone || !password) {
            return res.status(400).json({ msg: 'Please enter all fields' });
        }

        const userResult = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR phone = $2',
            [emailOrPhone, emailOrPhone]
        );

        if (userResult.rows.length === 0) return res.status(400).json({ msg: 'Invalid Credentials' });

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        const payload = {
            user: { id: user.id, role: user.role }
        };

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) {
                    console.error('JWT Sign Error:', err.message);
                    return res.status(500).json({ msg: 'Error generating security token' });
                }
                res.json({ token, user: { id: user.id, email: user.email, phone: user.phone, role: user.role, full_name: user.full_name } });
            }
        );
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

// @route   GET /api/auth/me
router.get('/me', auth, async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT id, email, phone, role, created_at, full_name FROM users WHERE id = $1',
            [req.user.id]
        );

        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

module.exports = router;
