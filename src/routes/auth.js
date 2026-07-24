const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, password, role, fullName } = req.body;

    try {
        const userCheck = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (userCheck.rows.length > 0) return res.status(400).json({ msg: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const userRole = role === 'admin' ? 'admin' : 'member';

        const newUser = await pool.query(
            `INSERT INTO users (username, password, role, full_name) 
            VALUES ($1, $2, $3, $4)
            RETURNING id, username, role, full_name`,
            [username, hashedPassword, userRole, fullName || null]
        );

        res.json({ msg: 'User registered successfully', user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
    const { username, password, fullName } = req.body;

    try {
        const userResult = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (userResult.rows.length === 0) return res.status(400).json({ msg: 'Invalid Credentials' });

        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Invalid Credentials' });

        // Update full_name in database if provided during login and currently empty/different
        let finalFullName = user.full_name;
        if (fullName && fullName !== user.full_name) {
            await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [fullName, user.id]);
            finalFullName = fullName;
        }

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
                res.json({ token, user: { id: user.id, username: user.username, role: user.role, full_name: finalFullName } });
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
            'SELECT id, username, role, created_at, full_name FROM users WHERE id = $1',
            [req.user.id]
        );

        res.json(user.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error: ' + err.message });
    }
});

module.exports = router;
