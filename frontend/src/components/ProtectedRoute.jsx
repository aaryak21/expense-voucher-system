import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { homePath } from '../utils';

export default function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={homePath(user.role)} replace />;
  }
  return children;
}