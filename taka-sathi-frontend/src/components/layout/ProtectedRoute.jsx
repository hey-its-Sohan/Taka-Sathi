import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuth from '../../context/useAuth.js';
import Loader from '../ui/Loader.jsx';

export default function ProtectedRoute({ requireProfile = true }) {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullscreen label="Checking your session…" />;

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireProfile && !isProfileComplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}
