const express = require('express');
const pool = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const num = (v) => Number(v) || 0;

router.get('/', async (req, res) => {
  try {
    const { role, id } = req.user;

    if (role === 'employee') {
      const [[s]] = await pool.query(
        `SELECT
           COUNT(*) AS total,
           COALESCE(SUM(status = 'draft'), 0) AS draft,
           COALESCE(SUM(status = 'pending'), 0) AS pending,
           COALESCE(SUM(status = 'approved'), 0) AS approved,
           COALESCE(SUM(status = 'rejected'), 0) AS rejected,
           COALESCE(SUM(CASE WHEN status <> 'draft' THEN amount END), 0) AS totalClaimed
         FROM vouchers WHERE user_id = ?`,
        [id]
      );
      return res.json({
        role,
        stats: {
          total: num(s.total), draft: num(s.draft), pending: num(s.pending),
          approved: num(s.approved), rejected: num(s.rejected), totalClaimed: num(s.totalClaimed),
        },
        recent: [],
      });
    }

    if (role === 'director') {
      const [[s]] = await pool.query(
        `SELECT
           COALESCE(SUM(status = 'pending'), 0) AS pendingCount,
           COALESCE(SUM(status = 'approved' AND DATE(approval_date) = CURDATE()), 0) AS approvedToday,
           COALESCE(SUM(status = 'rejected' AND DATE(approval_date) = CURDATE()), 0) AS rejectedToday,
           COALESCE(SUM(CASE WHEN status = 'pending' THEN amount END), 0) AS pendingAmount
         FROM vouchers`
      );
      const [recent] = await pool.query(
        `SELECT v.id, v.voucher_number, v.expense_title, v.amount, v.status, v.updated_at,
                u.name AS employee_name
         FROM vouchers v JOIN users u ON u.id = v.user_id
         WHERE v.status <> 'draft'
         ORDER BY v.updated_at DESC LIMIT 5`
      );
      return res.json({
        role,
        stats: {
          pendingCount: num(s.pendingCount), approvedToday: num(s.approvedToday),
          rejectedToday: num(s.rejectedToday), pendingAmount: num(s.pendingAmount),
        },
        recent,
      });
    }

    // accounts
    const [[s]] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         COALESCE(SUM(status = 'pending'), 0) AS pending,
         COALESCE(SUM(status = 'approved'), 0) AS approved,
         COALESCE(SUM(status = 'rejected'), 0) AS rejected,
         COALESCE(SUM(CASE WHEN status = 'approved' THEN amount END), 0) AS approvedAmount
       FROM vouchers WHERE status <> 'draft'`
    );
    const [recent] = await pool.query(
      `SELECT v.id, v.voucher_number, v.expense_title, v.amount, v.status, v.approval_date,
              u.name AS employee_name
       FROM vouchers v JOIN users u ON u.id = v.user_id
       WHERE v.status = 'approved'
       ORDER BY v.approval_date DESC LIMIT 5`
    );
    res.json({
      role,
      stats: {
        total: num(s.total), pending: num(s.pending), approved: num(s.approved),
        rejected: num(s.rejected), approvedAmount: num(s.approvedAmount),
      },
      recent,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;