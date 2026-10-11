import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { formatAmount, formatDate } from '../utils';

const TABS = ['all', 'draft', 'pending', 'approved', 'rejected'];

export default function MyVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/vouchers')
      .then(({ data }) => setVouchers(data))
      .catch(() => setError('Could not load vouchers'))
      .finally(() => setLoading(false));
  }, []);

  async function handleDelete(v) {
    if (!window.confirm(`Delete draft ${v.voucher_number}?`)) return;
    try {
      await api.delete(`/vouchers/${v.id}`);
      setVouchers((list) => list.filter((x) => x.id !== v.id));
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete');
    }
  }

  const shown = tab === 'all' ? vouchers : vouchers.filter((v) => v.status === tab);

  return (
    <Layout>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-bold text-gray-800">My Vouchers</h1>
        <Link to="/employee/vouchers/new" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
          + New Voucher
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-full text-sm capitalize ${
              tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50 border'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{error}</div>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3">Voucher No.</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Expense Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && shown.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500">No vouchers found</td></tr>
            )}
            {shown.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-3 font-medium">{v.voucher_number}</td>
                <td className="px-4 py-3">{v.expense_title || <span className="text-gray-400">(untitled)</span>}</td>
                <td className="px-4 py-3">{formatDate(v.expense_date)}</td>
                <td className="px-4 py-3">{formatAmount(v.amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Link to={`/vouchers/${v.id}`} className="text-blue-600 hover:underline mr-3">View</Link>
                  {v.status === 'draft' && (
                    <>
                      <Link to={`/employee/vouchers/${v.id}/edit`} className="text-blue-600 hover:underline mr-3">Edit</Link>
                      <button onClick={() => handleDelete(v)} className="text-red-600 hover:underline">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}