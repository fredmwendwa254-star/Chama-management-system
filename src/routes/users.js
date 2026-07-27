const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET /api/users
// @desc    Get all users (Admin only)
router.get('/', [auth, admin], async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.phone,
                u.role,
                u.full_name,
                u.created_at,
                COALESCE((SELECT SUM(amount) FROM deposits WHERE user_id = u.id AND status = 'approved'), 0) AS total_deposits,
                COALESCE((SELECT SUM(amount) FROM withdrawals WHERE user_id = u.id AND status = 'approved'), 0) AS total_withdrawals
            FROM users u
            ORDER BY u.created_at DESC
        `);

        const enhancedUsers = users.rows.map((user) => {
            const totalDeposits = parseFloat(user.total_deposits) || 0;
            const totalWithdrawals = parseFloat(user.total_withdrawals) || 0;

            return {
                ...user,
                total_deposits: totalDeposits,
                total_withdrawals: totalWithdrawals,
                current_balance: totalDeposits - totalWithdrawals,
                has_paid: totalDeposits > 0
            };
        });

        res.json(enhancedUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

router.get('/status', [auth, admin], async (req, res) => {
    try {
        const users = await pool.query(`
            SELECT
                u.id,
                u.email,
                u.phone,
                u.role,
                u.full_name,
                u.created_at,
                COALESCE((SELECT SUM(amount) FROM deposits WHERE user_id = u.id AND status = 'approved'), 0) AS total_deposits,
                COALESCE((SELECT SUM(amount) FROM withdrawals WHERE user_id = u.id AND status = 'approved'), 0) AS total_withdrawals
            FROM users u
            ORDER BY u.created_at DESC
        `);

        const enhancedUsers = users.rows.map((user) => {
            const totalDeposits = parseFloat(user.total_deposits) || 0;
            const totalWithdrawals = parseFloat(user.total_withdrawals) || 0;

            return {
                ...user,
                total_deposits: totalDeposits,
                total_withdrawals: totalWithdrawals,
                current_balance: totalDeposits - totalWithdrawals,
                has_paid: totalDeposits > 0
            };
        });

        const paidMembers = enhancedUsers.filter((user) => user.role === 'member' && user.has_paid);
        const unpaidMembers = enhancedUsers.filter((user) => user.role === 'member' && !user.has_paid);

        res.json({ paidMembers, unpaidMembers });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
