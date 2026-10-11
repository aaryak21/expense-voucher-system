import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { homePath } from './utils';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyVouchers from './pages/MyVouchers';
import VoucherForm from './pages/VoucherForm';
import VoucherDetails from './pages/VoucherDetails';
import AllVouchers from './pages/AllVouchers';

function Home() {
  const { user } = useAuth();
  return <Navigate to={user ? homePath(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Employee */}
      <Route path="/employee" element={
        <ProtectedRoute roles={['employee']}><Dashboard title="Employee Dashboard" /></ProtectedRoute>
      } />
      <Route path="/employee/vouchers" element={
        <ProtectedRoute roles={['employee']}><MyVouchers /></ProtectedRoute>
      } />
      <Route path="/employee/vouchers/new" element={
        <ProtectedRoute roles={['employee']}><VoucherForm /></ProtectedRoute>
      } />
      <Route path="/employee/vouchers/:id/edit" element={
        <ProtectedRoute roles={['employee']}><VoucherForm /></ProtectedRoute>
      } />

      {/* Director */}
      <Route path="/director" element={
        <ProtectedRoute roles={['director']}><Dashboard title="Director Dashboard" /></ProtectedRoute>
      } />
      <Route path="/director/pending" element={
        <ProtectedRoute roles={['director']}>
          <AllVouchers key="pending" title="Pending Approvals" pendingOnly />
        </ProtectedRoute>
      } />
      <Route path="/director/vouchers" element={
        <ProtectedRoute roles={['director']}>
          <AllVouchers key="director-all" title="All Vouchers" />
        </ProtectedRoute>
      } />

      {/* Accounts */}
      <Route path="/accounts" element={
        <ProtectedRoute roles={['accounts']}><Dashboard title="Accounts Dashboard" /></ProtectedRoute>
      } />
      <Route path="/accounts/vouchers" element={
        <ProtectedRoute roles={['accounts']}>
          <AllVouchers key="accounts-all" title="All Vouchers" />
        </ProtectedRoute>
      } />

      {/* Shared details page (the backend decides what each role may see) */}
      <Route path="/vouchers/:id" element={
        <ProtectedRoute><VoucherDetails /></ProtectedRoute>
      } />

      <Route path="*" element={<Home />} />
    </Routes>
  );
}