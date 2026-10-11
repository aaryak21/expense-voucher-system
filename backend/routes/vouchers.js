const express = require('express');
const fs = require('fs');
const path = require('path');
const pool = require('../db');
const upload = require('../middleware/upload');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate); // every voucher route needs a login

const SELECT_VOUCHER = `
  SELECT v.*, u.name AS employee_name, u.employee_code, d.name AS director_name
  FROM vouchers v
  JOIN users u ON u.id = v.user_id
  LEFT JOIN users d ON d.id = v.approved_by`;

// ---------- helpers ----------
const clean = (val) => (val === undefined || val === null || String(val).trim() === '' ? null : String(val).trim());

function removeFile(filePath) {
  if (filePath) fs.unlink(path.join(__dirname, '..', filePath), () => {});
}

// send an error and delete any file that was uploaded with this failed request
function fail(req, res, status, message) {
  if (req.file) removeFile(`uploads/${req.file.filename}`);
  return res.status(status).json({ message });
}

function badAmount(amount) {
  return amount !== null && !(Number(amount) > 0);
}

// ---------- CREATE (draft) ----------
router.post('/', authorize('employee'), upload.single('employee_signature'), async (req, res) => {
  try {
    const b = req.body;
    const amount = clean(b.amount);
    if (badAmount(amount)) return fail(req, res, 400, 'Amount must be greater than zero');

    const signature = req.file ? `uploads/${req.file.filename}` : null;

    const [result] = await pool.query(
      `INSERT INTO vouchers
       (user_id, voucher_date, expense_date, department, expense_title,
        expense_category, expense_description, amount, employee_signature)
       VALUES (?, CURDATE(), ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, clean(b.expense_date), clean(b.department), clean(b.expense_title),
       clean(b.expense_category), clean(b.expense_description), amount, signature]
    );

    const number = `EV-${new Date().getFullYear()}-${String(result.insertId).padStart(4, '0')}`;
    await pool.query('UPDATE vouchers SET voucher_number = ? WHERE id = ?', [number, result.insertId]);

    const [rows] = await pool.query(`${SELECT_VOUCHER} WHERE v.id = ?`, [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error(err);
    fail(req, res, 500, 'Server error');
  }
});

// ---------- LIST ----------
router.get('/', async (req, res) => {
  try {
    const q = req.query;
    const where = [];
    const params = [];

    if (req.user.role === 'employee') {
      where.push('v.user_id = ?');
      params.push(req.user.id);
    } else {
      where.push("v.status <> 'draft'"); // drafts are private until submitted
    }

    if (q.status) { where.push('v.status = ?'); params.push(q.status); }
    if (q.department) { where.push('v.department = ?'); params.push(q.department); }
    if (q.category) { where.push('v.expense_category = ?'); params.push(q.category); }
    if (q.search) {
      where.push('(v.voucher_number LIKE ? OR u.name LIKE ?)');
      params.push(`%${q.search}%`, `%${q.search}%`);
    }
    if (q.from) { where.push('v.expense_date >= ?'); params.push(q.from); }
    if (q.to) { where.push('v.expense_date <= ?'); params.push(q.to); }
    if (q.minAmount !== undefined && q.minAmount !== '' && !isNaN(q.minAmount)) {
      where.push('v.amount >= ?'); params.push(Number(q.minAmount));
    }
    if (q.maxAmount !== undefined && q.maxAmount !== '' && !isNaN(q.maxAmount)) {
      where.push('v.amount <= ?'); params.push(Number(q.maxAmount));
    }

    // column names cannot use ? placeholders, so only allow a fixed list
    const sortable = {
      created_at: 'v.created_at',
      expense_date: 'v.expense_date',
      amount: 'v.amount',
      voucher_number: 'v.voucher_number',
      status: 'v.status',
      employee_name: 'u.name',
    };
    const sortCol = sortable[q.sortBy] || 'v.created_at';
    const dir = q.order === 'asc' ? 'ASC' : 'DESC';

    const sql = `${SELECT_VOUCHER} WHERE ${where.join(' AND ')} ORDER BY ${sortCol} ${dir}`;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- GET ONE ----------
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(`${SELECT_VOUCHER} WHERE v.id = ?`, [req.params.id]);
    const voucher = rows[0];

    if (
      !voucher ||
      (req.user.role === 'employee' && voucher.user_id !== req.user.id) ||
      (req.user.role !== 'employee' && voucher.status === 'draft')
    ) {
      return res.status(404).json({ message: 'Voucher not found' });
    }
    res.json(voucher);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- EDIT (draft only) ----------
router.put('/:id', authorize('employee'), upload.single('employee_signature'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vouchers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const v = rows[0];
    if (!v) return fail(req, res, 404, 'Voucher not found');
    if (v.status !== 'draft') return fail(req, res, 400, 'Only draft vouchers can be edited');

    const b = req.body;
    const amount = clean(b.amount);
    if (badAmount(amount)) return fail(req, res, 400, 'Amount must be greater than zero');

    const signature = req.file ? `uploads/${req.file.filename}` : v.employee_signature;

    await pool.query(
      `UPDATE vouchers SET expense_date = ?, department = ?, expense_title = ?,
       expense_category = ?, expense_description = ?, amount = ?, employee_signature = ?
       WHERE id = ?`,
      [clean(b.expense_date), clean(b.department), clean(b.expense_title),
       clean(b.expense_category), clean(b.expense_description), amount, signature, v.id]
    );

    if (req.file) removeFile(v.employee_signature); // delete the replaced signature

    const [updated] = await pool.query(`${SELECT_VOUCHER} WHERE v.id = ?`, [v.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    fail(req, res, 500, 'Server error');
  }
});

// ---------- DELETE (draft only) ----------
router.delete('/:id', authorize('employee'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vouchers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const v = rows[0];
    if (!v) return res.status(404).json({ message: 'Voucher not found' });
    if (v.status !== 'draft') return res.status(400).json({ message: 'Only draft vouchers can be deleted' });

    await pool.query('DELETE FROM vouchers WHERE id = ?', [v.id]);
    removeFile(v.employee_signature);
    res.json({ message: 'Voucher deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- SUBMIT ----------
router.post('/:id/submit', authorize('employee'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vouchers WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    const v = rows[0];
    if (!v) return res.status(404).json({ message: 'Voucher not found' });
    if (v.status !== 'draft') return res.status(400).json({ message: 'Only draft vouchers can be submitted' });

    const errors = [];
    if (!v.department) errors.push('Department is required');
    if (!v.expense_title) errors.push('Expense title is required');
    if (!v.expense_date) errors.push('Expense date is required');
    if (!(Number(v.amount) > 0)) errors.push('Amount must be greater than zero');
    if (!v.employee_signature) errors.push('Employee signature is required');

    if (errors.length) return res.status(400).json({ message: 'Cannot submit voucher', errors });

    await pool.query("UPDATE vouchers SET status = 'pending' WHERE id = ?", [v.id]);
    const [updated] = await pool.query(`${SELECT_VOUCHER} WHERE v.id = ?`, [v.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ---------- APPROVE ----------
router.post('/:id/approve', authorize('director'), upload.single('director_signature'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    const v = rows[0];
    if (!v) return fail(req, res, 404, 'Voucher not found');
    if (v.status !== 'pending') return fail(req, res, 400, 'Only pending vouchers can be approved');
    if (!req.file) return fail(req, res, 400, 'Director signature is required to approve');

    await pool.query(
      `UPDATE vouchers SET status = 'approved', director_signature = ?, approved_by = ?,
       approval_date = NOW(), rejection_reason = NULL WHERE id = ?`,
      [`uploads/${req.file.filename}`, req.user.id, v.id]
    );

    const [updated] = await pool.query(`${SELECT_VOUCHER} WHERE v.id = ?`, [v.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    fail(req, res, 500, 'Server error');
  }
});

// ---------- REJECT ----------
router.post('/:id/reject', authorize('director'), async (req, res) => {
  try {
    const reason = clean(req.body.reason);
    if (!reason) return res.status(400).json({ message: 'Rejection reason is required' });

    const [rows] = await pool.query('SELECT * FROM vouchers WHERE id = ?', [req.params.id]);
    const v = rows[0];
    if (!v) return res.status(404).json({ message: 'Voucher not found' });
    if (v.status !== 'pending') return res.status(400).json({ message: 'Only pending vouchers can be rejected' });

    await pool.query(
      `UPDATE vouchers SET status = 'rejected', rejection_reason = ?, approved_by = ?,
       approval_date = NOW() WHERE id = ?`,
      [reason, req.user.id, v.id]
    );

    const [updated] = await pool.query(`${SELECT_VOUCHER} WHERE v.id = ?`, [v.id]);
    res.json(updated[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;