const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/withdrawals
// @desc    Initiate a withdrawal (Admin only)
router.post('/', [auth, admin], async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ msg: 'Please provide withdrawal amount' });

    try {
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ msg: 'Please enter a valid withdrawal amount greater than zero.' });
        }

        // Fetch overall balance to ensure sufficient funds
        const depResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total_deposits FROM deposits WHERE status = 'approved'"
        );
        const withResult = await pool.query(
            "SELECT COALESCE(SUM(amount), 0) as total_withdrawals FROM withdrawals WHERE status = 'approved'"
        );
        const currentBalance = parseFloat(depResult.rows[0].total_deposits) - parseFloat(withResult.rows[0].total_withdrawals);

        if (parsedAmount > currentBalance) {
            return res.status(400).json({ msg: `Insufficient funds. Current platform balance is KSh ${Number(currentBalance).toFixed(2)}.` });
        }

        const newWithdrawal = await pool.query(
            `INSERT INTO withdrawals (user_id, amount, status, approved_by) 
            VALUES ($1, $2, 'approved', $1)
            RETURNING *`,
            [req.user.id, parsedAmount]
        );

        // Fetch admin name
        const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
        const adminName = userRes.rows[0]?.full_name || 'Admin';

        const desc = `Admin ${adminName} executed withdrawal of ${parsedAmount} directly (status: approved)`;
        await pool.query(
            'INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)',
            ['WITHDRAWAL_EXECUTED', req.user.id, desc]
        );

        // Emit real-time WebSocket notification for withdrawal
        req.io.emit('withdrawal_approved', {
            msg: `Withdrawal of KSh ${Number(parsedAmount).toFixed(2)} executed by Admin (${adminName})!`,
            withdrawal: newWithdrawal.rows[0]
        });

        res.json(newWithdrawal.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/withdrawals/:id/approve
// @desc    Legacy Approval route (Admin only)
router.put('/:id/approve', [auth, admin], async (req, res) => {
    try {
        const withdrawal = await pool.query(
            `UPDATE withdrawals SET status = $1, approved_by = $2 
            WHERE id = $3
            RETURNING *`,
            ['approved', req.user.id, req.params.id]
        );

        if (withdrawal.rows.length === 0) return res.status(404).json({ msg: 'Withdrawal not found' });

        const desc = `Admin approved withdrawal ID ${req.params.id}`;
        await pool.query(
            'INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)',
            ['WITHDRAWAL_APPROVED', req.user.id, desc]
        );

        // Emit real-time WebSocket notification for withdrawal approval
        req.io.emit('withdrawal_approved', {
            msg: `Withdrawal #${req.params.id} has been approved!`,
            withdrawal: withdrawal.rows[0]
        });

        res.json(withdrawal.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/withdrawals
// @desc    Get all withdrawals
router.get('/', auth, async (req, res) => {
    try {
        // Members see all approved withdrawals so they can track the balance & progress
        const queryStr = req.user.role === 'admin'
            ? `SELECT w.*, u.full_name, u.email FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC`
            : `SELECT w.*, u.full_name FROM withdrawals w JOIN users u ON w.user_id = u.id ORDER BY w.created_at DESC`;
        const results = await pool.query(queryStr);
        res.json(results.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
