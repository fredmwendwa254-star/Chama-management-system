const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
    const { amount, transaction_ref } = req.body;

    if (!amount || !transaction_ref) {
        return res.status(400).json({ msg: 'Please include amount and transaction_ref' });
    }

    try {
        const existingDeposit = await pool.query(
            'SELECT * FROM deposits WHERE transaction_ref = $1',
            [transaction_ref]
        );

        if (existingDeposit.rows.length > 0) {
            const deposit = existingDeposit.rows[0];
            if (deposit.user_id !== req.user.id) {
                return res.status(409).json({ msg: 'This transaction reference belongs to another member.' });
            }

            return res.json(deposit);
        }

        // Create the deposit
        const newDeposit = await pool.query(
            `INSERT INTO deposits (user_id, amount, transaction_ref, status) 
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [req.user.id, amount, transaction_ref, 'completed']
        );

        // Audit log
        const desc = `User deposited ${amount} with ref ${transaction_ref}`;
        await pool.query(
            'INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)',
            ['DEPOSIT', req.user.id, desc]
        );

        // Emit real-time WebSocket notification
        req.io.emit('new_deposit', {
            msg: `A new deposit of KSh ${Number(amount).toFixed(2)} was received!`,
            deposit: newDeposit.rows[0]
        });

        res.json(newDeposit.rows[0]);
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(409).json({ msg: 'This transaction reference has already been processed.' });
        }
        res.status(500).send('Server Error');
    }
});

router.get('/', auth, async (req, res) => {
    try {
        let results;
        if (req.user.role === 'admin') {
            results = await pool.query('SELECT * FROM deposits ORDER BY created_at DESC');
        } else {
            results = await pool.query(
                'SELECT * FROM deposits WHERE user_id = $1 ORDER BY created_at DESC',
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
