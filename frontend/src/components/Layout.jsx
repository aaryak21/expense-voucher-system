import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = {
  employee: [
    { to: '/employee', label: 'Dashboard' },
    { to: '/employee/vouchers', label: 'My Vouchers' },
    { to: '/employee/vouchers/new', label: 'Create Voucher' },
  ],
  director: [
    { to: '/director', label: 'Dashboard' },
    { to: '/director/pending', label: 'Pending Approvals' },
    { to: '/director/vouchers', label: 'All Vouchers' },
  ],
  accounts: [
    { to: '/accounts', label: 'Dashboard' },
    { to: '/accounts/vouchers', label: 'All Vouchers' },
  ],
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
     <header className="bg-white shadow print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-gray-800 mr-3">Expense Vouchers</span>
            {(links[user.role] || []).map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded text-sm ${
                    isActive ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">{user.name} ({user.role})</span>
            <button onClick={logout} className="text-sm text-red-600 hover:underline">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}