import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { FILE_URL, formatAmount, formatDate, formatDateTime } from '../utils';
import DirectorActions from '../components/DirectorActions';
function Field({ label, children }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-gray-800 mt-0.5">{children || '-'}</div>
    </div>
  );
}

function Signature({ path, label }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-gray-500 mb-1">{label}</div>
      {path ? (
        <img src={FILE_URL + path} alt={label} className="h-20 border rounded bg-white p-1" />
      ) : (
        <div className="text-gray-400 text-sm">Not signed</div>
      )}
    </div>
  );
}

export default function VoucherDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [v, setV] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .get(`/vouchers/${id}`)
      .then(({ data }) => setV(data))
      .catch((err) => setError(err.response?.data?.message || 'Could not load voucher'));
  }, [id]);

  async function handleSubmit() {
    setBusy(true);
    try {
      const { data } = await api.post(`/vouchers/${id}/submit`);
      setV(data);
      setError('');
    } catch (err) {
      const d = err.response?.data;
      setError(d?.errors ? d.errors.join(', ') : d?.message || 'Submit failed');
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this draft?')) return;
    try {
      await api.delete(`/vouchers/${id}`);
      navigate('/employee/vouchers', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Could not delete');
    }
  }

  if (error && !v) {
    return (
      <Layout>
        <div className="bg-red-50 text-red-700 p-3 rounded mb-4">{error}</div>
        <button onClick={() => navigate(-1)} className="text-blue-600 hover:underline">← Back</button>
      </Layout>
    );
  }
  if (!v) return <Layout><p className="text-gray-600">Loading...</p></Layout>;

  const canEmployeeAct = user.role === 'employee' && v.status === 'draft';

  return (
    <Layout>
      <button onClick={() => navigate(-1)} className="text-sm text-blue-600 hover:underline mb-3 print:hidden">← Back</button>

      <div className="bg-white p-6 rounded-lg shadow max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{v.voucher_number}</h1>
            <p className="text-gray-600">{v.expense_title || '(untitled draft)'}</p>
          </div>
          <StatusBadge status={v.status} />
        </div>

        {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{error}</div>}

        {v.status === 'rejected' && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded mb-6">
            <div className="font-semibold mb-1">This voucher was rejected</div>
            <div>Reason: {v.rejection_reason}</div>
          </div>
        )}

        <h2 className="font-semibold text-gray-700 mb-3">Basic Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Field label="Voucher Date">{formatDate(v.voucher_date)}</Field>
          <Field label="Expense Date">{formatDate(v.expense_date)}</Field>
          <Field label="Amount">{formatAmount(v.amount)}</Field>
          <Field label="Department">{v.department}</Field>
          <Field label="Category">{v.expense_category}</Field>
          <div className="sm:col-span-3">
            <Field label="Description">{v.expense_description}</Field>
          </div>
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">Employee</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Field label="Name">{v.employee_name}</Field>
          <Field label="Employee ID">{v.employee_code}</Field>
          <Signature path={v.employee_signature} label="Employee Signature" />
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">Approval</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <Field label="Status"><StatusBadge status={v.status} /></Field>
          <Field label="Decided By">{v.director_name}</Field>
          <Field label="Decision Date">{v.approval_date ? formatDateTime(v.approval_date) : null}</Field>
          {v.status === 'approved' && <Signature path={v.director_signature} label="Director Signature" />}
        </div>

        <h2 className="font-semibold text-gray-700 mb-3">Audit</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Created">{formatDateTime(v.created_at)}</Field>
          <Field label="Last Updated">{formatDateTime(v.updated_at)}</Field>
        </div>

{user.role === 'director' && v.status === 'pending' && (
  <DirectorActions voucher={v} onDone={setV} />
)}

{user.role !== 'employee' && (
  <div className="mt-6 print:hidden">
    <button onClick={() => window.print()}
      className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
      Print Voucher
    </button>
  </div>
)}
        {canEmployeeAct && (
          <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t">
            <Link to={`/employee/vouchers/${v.id}/edit`} className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">
              Edit
            </Link>
            <button onClick={handleSubmit} disabled={busy} className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              Submit for Approval
            </button>
            <button onClick={handleDelete} className="px-4 py-2 rounded text-red-600 hover:bg-red-50">
              Delete
            </button>
          </div>
        )}
      </div>
    </Layout>
  );
}