export const FILE_URL = 'http://localhost:5000/';

export function homePath(role) {
  if (role === 'employee') return '/employee';
  if (role === 'director') return '/director';
  if (role === 'accounts') return '/accounts';
  return '/login';
}

export const DEPARTMENTS = ['Sales', 'Marketing', 'Finance', 'HR', 'IT', 'Operations', 'Admin'];
export const CATEGORIES = ['Travel', 'Food', 'Accommodation', 'Office Supplies', 'Software', 'Training', 'Other'];

export function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function formatAmount(value) {
  if (value === null || value === undefined || value === '') return '-';
  return Number(value).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
}

// converts a date from the backend into yyyy-mm-dd for <input type="date">
export function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}