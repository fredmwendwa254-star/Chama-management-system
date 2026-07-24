const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

router.post('/', auth, async (req, res) => {
    const { amount } = req.body;
    if (!amount) return res.status(400).json({ msg: 'Please provide withdrawal amount' });

    try {
        const newWithdrawal = await pool.query(
            `INSERT INTO withdrawals (user_id, amount, status) 
            VALUES ($1, $2, $3)
            RETURNING *`,
            [req.user.id, amount, 'pending']
        );

        const desc = `User requested withdrawal of ${amount}`;
        await pool.query(
            'INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)',
            ['WITHDRAWAL_REQUEST', req.user.id, desc]
        );

        res.json(newWithdrawal.rows[0]);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

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

router.get('/', auth, async (req, res) => {
    try {
        let results;
        if (req.user.role === 'admin') {
            results = await pool.query('SELECT * FROM withdrawals ORDER BY created_at DESC');
        } else {
            results = await pool.query(
                'SELECT * FROM withdrawals WHERE user_id = $1 ORDER BY created_at DESC',
                [req.user.id]
            );
        }
        res.json(results.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
