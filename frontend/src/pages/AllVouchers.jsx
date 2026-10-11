import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import { DEPARTMENTS, CATEGORIES, formatAmount, formatDate } from '../utils';

const emptyFilters = {
  search: '', status: '', department: '', category: '',
  from: '', to: '', minAmount: '', maxAmount: '',
};

const inputClass = 'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function AllVouchers({ title, pendingOnly = false }) {
  const [filters, setFilters] = useState(emptyFilters);   // what is typed in the form
  const [applied, setApplied] = useState(emptyFilters);   // what was actually searched
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = {};
    Object.entries(applied).forEach(([k, v]) => { if (v !== '') params[k] = v; });
    if (pendingOnly) params.status = 'pending';
    params.sortBy = sortBy;
    params.order = order;

    setLoading(true);
    api
      .get('/vouchers', { params })
      .then(({ data }) => { setVouchers(data); setError(''); })
      .catch(() => setError('Could not load vouchers'))
      .finally(() => setLoading(false));
  }, [applied, sortBy, order, pendingOnly]);

  function handleChange(e) {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  }

  function applyFilters(e) {
    e.preventDefault();
    if (filters.minAmount !== '' && filters.maxAmount !== '' &&
        Number(filters.minAmount) > Number(filters.maxAmount)) {
      setError('Minimum amount cannot be greater than maximum amount');
      return;
    }
    if (filters.from && filters.to && filters.from > filters.to) {
      setError('"From" date cannot be after "To" date');
      return;
    }
    setApplied(filters);
  }

  function clearFilters() {
    setFilters(emptyFilters);
    setApplied(emptyFilters);
    setError('');
  }

  function toggleSort(col) {
    if (sortBy === col) setOrder(order === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setOrder('asc'); }
  }

  const arrow = (col) => (sortBy === col ? (order === 'asc' ? ' ▲' : ' ▼') : '');

  const Th = ({ col, children }) => (
    <th className="px-4 py-3 cursor-pointer select-none hover:text-gray-900 whitespace-nowrap"
        onClick={() => toggleSort(col)}>
      {children}{arrow(col)}
    </th>
  );

  return (
    <Layout>
      <h1 className="text-xl font-bold text-gray-800 mb-4">{title}</h1>

      <form onSubmit={applyFilters} className="bg-white p-4 rounded-lg shadow mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input name="search" value={filters.search} onChange={handleChange}
            className={inputClass} placeholder="Voucher no. or employee name" />

          {!pendingOnly && (
            <select name="status" value={filters.status} onChange={handleChange} className={inputClass}>
              <option value="">All statuses</option>
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          )}

          <select name="department" value={filters.department} onChange={handleChange} className={inputClass}>
            <option value="">All departments</option>
            {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>

          <select name="category" value={filters.category} onChange={handleChange} className={inputClass}>
            <option value="">All categories</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div>
            <label className="text-xs text-gray-500">Expense date from</label>
            <input type="date" name="from" value={filters.from} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Expense date to</label>
            <input type="date" name="to" value={filters.to} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Min amount (₹)</label>
            <input type="number" min="0" name="minAmount" value={filters.minAmount} onChange={handleChange} className={inputClass} />
          </div>
          <div>
            <label className="text-xs text-gray-500">Max amount (₹)</label>
            <input type="number" min="0" name="maxAmount" value={filters.maxAmount} onChange={handleChange} className={inputClass} />
          </div>
        </div>

        <div className="flex gap-3 mt-4">
          <button type="submit" className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700">
            Search
          </button>
          <button type="button" onClick={clearFilters}
            className="px-4 py-2 rounded border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Clear
          </button>
        </div>
      </form>

      {error && <div className="bg-red-50 text-red-700 text-sm p-3 rounded mb-4">{error}</div>}

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <Th col="voucher_number">Voucher No.</Th>
              <Th col="employee_name">Employee</Th>
              <th className="px-4 py-3">Department</th>
              <Th col="expense_date">Expense Date</Th>
              <Th col="amount">Amount</Th>
              <Th col="status">Status</Th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
            )}
            {!loading && vouchers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-500">No vouchers found</td></tr>
            )}
            {!loading && vouchers.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-4 py-3 font-medium">{v.voucher_number}</td>
                <td className="px-4 py-3">{v.employee_name}</td>
                <td className="px-4 py-3">{v.department || '-'}</td>
                <td className="px-4 py-3">{formatDate(v.expense_date)}</td>
                <td className="px-4 py-3">{formatAmount(v.amount)}</td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3">
                  <Link to={`/vouchers/${v.id}`} className="text-blue-600 hover:underline">
                    {pendingOnly ? 'Review' : 'View'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Layout>
  );
}