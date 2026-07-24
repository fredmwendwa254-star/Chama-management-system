const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   GET /api/dashboard/stats
// @desc    Get financial stats (total deposits, total withdrawals, current balance)
router.get('/stats', auth, async (req, res) => {
    try {
        let totalDeposits = 0;
        let totalWithdrawals = 0;

        if (req.user.role === 'admin') {
            const depResult = await pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total_deposits FROM deposits WHERE status = \'completed\''
            );
            const withResult = await pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total_withdrawals FROM withdrawals WHERE status = \'approved\''
            );
            totalDeposits = parseFloat(depResult.rows[0].total_deposits);
            totalWithdrawals = parseFloat(withResult.rows[0].total_withdrawals);
        } else {
            const depResult = await pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total_deposits FROM deposits WHERE status = \'completed\' AND user_id = $1',
                [req.user.id]
            );
            const withResult = await pool.query(
                'SELECT COALESCE(SUM(amount), 0) as total_withdrawals FROM withdrawals WHERE status = \'approved\' AND user_id = $1',
                [req.user.id]
            );
            totalDeposits = parseFloat(depResult.rows[0].total_deposits);
            totalWithdrawals = parseFloat(withResult.rows[0].total_withdrawals);
        }

        const currentBalance = totalDeposits - totalWithdrawals;

        res.json({
            totalDeposits,
            totalWithdrawals,
            currentBalance
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/dashboard/monthly
// @desc    Get the current year's monthly contribution progress
router.get('/monthly', auth, async (req, res) => {
    try {
        const userFilter = req.user.role === 'admin' ? '' : 'AND user_id = $1';
        const params = req.user.role === 'admin' ? [] : [req.user.id];
        const result = await pool.query(
            `WITH months AS (
                SELECT generate_series(1, 12) AS month
            ), deposits AS (
                SELECT EXTRACT(MONTH FROM created_at)::int AS month, COALESCE(SUM(amount), 0) AS amount
                FROM deposits
                WHERE status = 'completed' AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) ${userFilter}
                GROUP BY 1
            ), withdrawals AS (
                SELECT EXTRACT(MONTH FROM created_at)::int AS month, COALESCE(SUM(amount), 0) AS amount
                FROM withdrawals
                WHERE status = 'approved' AND EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM CURRENT_DATE) ${userFilter}
                GROUP BY 1
            )
            SELECT months.month,
                COALESCE(deposits.amount, 0) AS contributions,
                COALESCE(withdrawals.amount, 0) AS withdrawals
            FROM months
            LEFT JOIN deposits ON deposits.month = months.month
            LEFT JOIN withdrawals ON withdrawals.month = months.month
            ORDER BY months.month` ,
            req.user.role === 'admin' ? [] : [req.user.id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/dashboard/reset
// @desc    Reset all deposit and withdrawal amounts in the system (Admin only)
router.post('/reset', [auth, admin], async (req, res) => {
    try {
        await pool.query('UPDATE deposits SET amount = 0');
        await pool.query('UPDATE withdrawals SET amount = 0');

        const desc = 'Admin reset all system deposit and withdrawal amounts to zero';
        await pool.query('INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)', [
            'SYSTEM_RESET',
            req.user.id,
            desc
        ]);

        res.json({ msg: 'System amounts reset successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
