const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// @route   POST /api/deposits
// @desc    Submit a deposit (starts as pending)
router.post('/', auth, async (req, res) => {
    const { amount, transaction_ref } = req.body;

    if (!amount || !transaction_ref) {
        return res.status(400).json({ msg: 'Please include amount and transaction_ref' });
    }

    try {
        // Validate amount
        const parsedAmount = parseFloat(amount);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            return res.status(400).json({ msg: 'Please enter a valid deposit amount greater than zero.' });
        }

        const existingDeposit = await pool.query(
            'SELECT * FROM deposits WHERE UPPER(transaction_ref) = UPPER($1)',
            [transaction_ref]
        );

        if (existingDeposit.rows.length > 0) {
            const deposit = existingDeposit.rows[0];
            if (deposit.user_id !== req.user.id) {
                return res.status(409).json({ msg: 'This transaction reference belongs to another member.' });
            }
            return res.json(deposit);
        }

        // Create the deposit (starts as pending)
        const newDeposit = await pool.query(
            `INSERT INTO deposits (user_id, amount, transaction_ref, status) 
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [req.user.id, parsedAmount, transaction_ref, 'pending']
        );

        // Fetch creator's full name
        const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [req.user.id]);
        const creatorName = userRes.rows[0]?.full_name || 'Member';

        // Audit log
        const desc = `User ${creatorName} initiated deposit of ${parsedAmount} with ref ${transaction_ref} (status: pending)`;
        await pool.query(
            'INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)',
            ['DEPOSIT_INITIATED', req.user.id, desc]
        );

        // Broadcast to all members that a deposit has been made
        req.io.emit('new_deposit', {
            msg: `${creatorName} made a deposit of KSh ${Number(parsedAmount).toFixed(2)} (Ref: ${transaction_ref}). Awaiting admin verification.`,
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

// @route   PUT /api/deposits/:id/approve
// @desc    Approve a deposit (Admin only)
router.put('/:id/approve', [auth, admin], async (req, res) => {
    try {
        const depositResult = await pool.query(
            `UPDATE deposits SET status = 'approved' WHERE id = $1 RETURNING *`,
            [req.params.id]
        );

        if (depositResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Deposit not found' });
        }

        const deposit = depositResult.rows[0];

        const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [deposit.user_id]);
        const memberName = userRes.rows[0]?.full_name || 'Member';

        // Audit log
        await pool.query(
            'INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)',
            ['DEPOSIT_APPROVED', req.user.id, `Admin approved deposit of ${deposit.amount} (Ref: ${deposit.transaction_ref}) for member ${memberName}`]
        );

        // Broadcast approved notification
        req.io.emit('new_deposit', {
            msg: `Deposit of KSh ${Number(deposit.amount).toFixed(2)} by ${memberName} has been APPROVED!`,
            deposit
        });

        res.json(deposit);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   PUT /api/deposits/:id/reject
// @desc    Reject a deposit (Admin only)
router.put('/:id/reject', [auth, admin], async (req, res) => {
    try {
        const depositResult = await pool.query(
            `UPDATE deposits SET status = 'rejected' WHERE id = $1 RETURNING *`,
            [req.params.id]
        );

        if (depositResult.rows.length === 0) {
            return res.status(404).json({ msg: 'Deposit not found' });
        }

        const deposit = depositResult.rows[0];

        const userRes = await pool.query('SELECT full_name FROM users WHERE id = $1', [deposit.user_id]);
        const memberName = userRes.rows[0]?.full_name || 'Member';

        // Audit log
        await pool.query(
            'INSERT INTO audit_logs (action, user_id, description) VALUES ($1, $2, $3)',
            ['DEPOSIT_REJECTED', req.user.id, `Admin rejected deposit of ${deposit.amount} (Ref: ${deposit.transaction_ref}) for member ${memberName}`]
        );

        // Broadcast rejected notification
        req.io.emit('new_deposit', {
            msg: `Deposit of KSh ${Number(deposit.amount).toFixed(2)} by ${memberName} was REJECTED by admin.`,
            deposit
        });

        res.json(deposit);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   GET /api/deposits
// @desc    Get deposits (all for admin, individual for member)
router.get('/', auth, async (req, res) => {
    try {
        let results;
        if (req.user.role === 'admin') {
            results = await pool.query(`
                SELECT d.*, u.full_name, u.email 
                FROM deposits d 
                JOIN users u ON d.user_id = u.id 
                ORDER BY d.created_at DESC
            `);
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
