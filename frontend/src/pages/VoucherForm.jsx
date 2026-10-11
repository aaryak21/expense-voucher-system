import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import { DEPARTMENTS, CATEGORIES, FILE_URL, toInputDate } from '../utils';

const empty = {
  department: '',
  expense_title: '',
  expense_category: '',
  expense_date: '',
  expense_description: '',
  amount: '',
};

const inputClass =
  'w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function VoucherForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(empty);
  const [file, setFile] = useState(null);
  const [existingSig, setExistingSig] = useState(null);
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const today = toInputDate(new Date());

  // when editing, load the existing draft
  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/vouchers/${id}`)
      .then(({ data }) => {
        if (data.status !== 'draft') {
          navigate(`/vouchers/${id}`, { replace: true });
          return;
        }
        setForm({
          department: data.department || '',
          expense_title: data.expense_title || '',
          expense_category: data.expense_category || '',
          expense_date: toInputDate(data.expense_date),
          expense_description: data.expense_description || '',
          amount: data.amount ?? '',
        });
        setExistingSig(data.employee_signature);
      })
      .catch(() => navigate('/employee/vouchers', { replace: true }))
      .finally(() => setLoading(false));
  }, [id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleFile(e) {
    const f = e.target.files[0];
    if (!f) return;
    if (!['image/png', 'image/jpeg'].includes(f.type)) {
      setErrors(['Signature must be a PNG or JPG image']);
      e.target.value = '';
      return;
    }
    if (f.size > 2 * 1024 * 1024) {
      setErrors(['Signature must be smaller than 2 MB']);
      e.target.value = '';
      return;
    }
    setErrors([]);
    setFile(f);
  }

  // a draft may be incomplete; submitting needs everything
  function validate(forSubmit) {
    const e = [];
    if (forSubmit) {
      if (!form.department) e.push('Department is required');
      if (!form.expense_title.trim()) e.push('Expense title is required');
      if (!form.expense_date) e.push('Expense date is required');
      if (form.amount === '') e.push('Amount is required');
      if (!file && !existingSig) e.push('Employee signature is required before submission');
    }
    if (form.amount !== '' && !(Number(form.amount) > 0)) {
      e.push('Amount must be greater than zero');
    }
    return e;
  }

  async function save(forSubmit) {
    const found = validate(forSubmit);
    setErrors(found);
    if (found.length) return;

    setSaving(true);
    const fd = new FormData();
    Object.entries(form).forEach(([key, value]) => fd.append(key, value));
    if (file) fd.append('employee_signature', file);

    let voucherId = id;
    try {
      if (isEdit) {
        await api.put(`/vouchers/${id}`, fd);
      } else {
        const { data } = await api.post('/vouchers', fd);
        voucherId = data.id;
      }
    } catch (err) {
      setErrors([err.response?.data?.message || 'Could not save the voucher']);
      setSaving(false);
      return;
    }

    if (forSubmit) {
      try {
        await api.post(`/vouchers/${voucherId}/submit`);
      } catch (err) {
        // the draft is saved, so continue from the edit page
        alert(err.response?.data?.errors?.join('\n') || err.response?.data?.message || 'Submit failed');
        navigate(`/employee/vouchers/${voucherId}/edit`, { replace: true });
        setSaving(false);
        return;
      }
    }

    navigate(`/vouchers/${voucherId}`);
  }

  if (loading) {
    return <Layout><p className="text-gray-600">Loading...</p></Layout>;
  }

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-4">
        {isEdit ? 'Edit Draft Voucher' : 'Create Voucher'}
      </h1>

      <form onSubmit={(e) => e.preventDefault()} className="bg-white p-6 rounded-lg shadow max-w-3xl">
        {errors.length > 0 && (
          <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">
            <ul className="list-disc ml-5">
              {errors.map((er) => <li key={er}>{er}</li>)}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
            <select name="department" value={form.department} onChange={handleChange} className={inputClass}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Category</label>
            <select name="expense_category" value={form.expense_category} onChange={handleChange} className={inputClass}>
              <option value="">Select category</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Title *</label>
            <input name="expense_title" value={form.expense_title} onChange={handleChange}
              className={inputClass} placeholder="e.g. Client lunch" maxLength={200} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date *</label>
            <input type="date" name="expense_date" value={form.expense_date} max={today}
              onChange={handleChange} className={inputClass} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
            <input type="number" name="amount" value={form.amount} onChange={handleChange}
              className={inputClass} min="0" step="0.01" placeholder="0.00" />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea name="expense_description" value={form.expense_description}
              onChange={handleChange} rows={4} className={inputClass} />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Signature * (PNG or JPG, max 2 MB)
            </label>
            <input type="file" accept="image/png,image/jpeg" onChange={handleFile} className="text-sm" />
            {(preview || existingSig) && (
              <img
                src={preview || FILE_URL + existingSig}
                alt="Signature preview"
                className="mt-3 h-20 border rounded bg-white p-1"
              />
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <button type="button" disabled={saving} onClick={() => save(false)}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-60">
            Save as Draft
          </button>
          <button type="button" disabled={saving} onClick={() => save(true)}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
            {saving ? 'Saving...' : 'Submit for Approval'}
          </button>
        </div>
      </form>
    </Layout>
  );
}