import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { useAuth } from '../context/AuthContext';
import { formatAmount, formatDate } from '../utils';

const CARDS = {
  employee: [
    { key: 'total', label: 'Total Vouchers', color: 'text-gray-800' },
    { key: 'draft', label: 'Draft Vouchers', color: 'text-gray-600' },
    { key: 'pending', label: 'Pending Approval', color: 'text-yellow-600' },
    { key: 'approved', label: 'Approved Vouchers', color: 'text-green-600' },
    { key: 'rejected', label: 'Rejected Vouchers', color: 'text-red-600' },
    { key: 'totalClaimed', label: 'Total Amount Claimed', color: 'text-blue-600', money: true },
  ],
  director: [
    { key: 'pendingCount', label: 'Pending Approval', color: 'text-yellow-600' },
    { key: 'approvedToday', label: 'Approved Today', color: 'text-green-600' },
    { key: 'rejectedToday', label: 'Rejected Today', color: 'text-red-600' },
    { key: 'pendingAmount', label: 'Total Pending Amount', color: 'text-blue-600', money: true },
  ],
  accounts: [
    { key: 'total', label: 'Total Vouchers', color: 'text-gray-800' },
    { key: 'pending', label: 'Pending Approval', color: 'text-yellow-600' },
    { key: 'approved', label: 'Approved Vouchers', color: 'text-green-600' },
    { key: 'rejected', label: 'Rejected Vouchers', color: 'text-red-600' },
    { key: 'approvedAmount', label: 'Total Approved Amount', color: 'text-blue-600', money: true },
  ],
};

const RECENT_TITLE = {
  director: 'Recent Voucher Activity',
  accounts: 'Recent Approved Vouchers',
};

export default function Dashboard({ title }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setData(data))
      .catch(() => setError('Could not load dashboard'));
  }, []);

  const cards = CARDS[user.role] || [];

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-4">{title}</h1>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{error}</div>}
      {!data && !error && <p className="text-gray-600">Loading...</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {cards.map((c) => (
              <div key={c.key} className="bg-white p-5 rounded-lg shadow">
                <div className="text-sm text-gray-500">{c.label}</div>
                <div className={`text-3xl font-bold mt-1 ${c.color}`}>
                  {c.money ? formatAmount(data.stats[c.key]) : data.stats[c.key]}
                </div>
              </div>
            ))}
          </div>

          {user.role === 'employee' && (
            <Link to="/employee/vouchers/new"
              className="inline-block bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
              + Create New Voucher
            </Link>
          )}

          {user.role !== 'employee' && (
            <>
              <h2 className="font-semibold text-gray-700 mb-3">{RECENT_TITLE[user.role]}</h2>
              <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3">Voucher No.</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.length === 0 && (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Nothing to show yet</td></tr>
                    )}
                    {data.recent.map((v) => (
                      <tr key={v.id} className="border-t">
                        <td className="px-4 py-3 font-medium">{v.voucher_number}</td>
                        <td className="px-4 py-3">{v.employee_name}</td>
                        <td className="px-4 py-3">{v.expense_title || '-'}</td>
                        <td className="px-4 py-3">{formatAmount(v.amount)}</td>
                        <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                        <td className="px-4 py-3">{formatDate(v.approval_date || v.updated_at)}</td>
                        <td className="px-4 py-3">
                          <Link to={`/vouchers/${v.id}`} className="text-blue-600 hover:underline">View</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}