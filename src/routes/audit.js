const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET /api/audit
// @desc    Get all audit logs (Admin only)
router.get('/', [auth, admin], async (req, res) => {
    try {
        const logs = await pool.query(`
      SELECT a.id, a.action, a.description, a.created_at, u.username as actor 
      FROM audit_logs a 
      LEFT JOIN users u ON a.user_id = u.id 
      ORDER BY a.created_at DESC
    `);
        res.json(logs.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
