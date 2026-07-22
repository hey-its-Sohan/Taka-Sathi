import { Routes, Route, Navigate } from 'react-router-dom';
import ToastProvider from './context/ToastContext.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import useAuth from './context/useAuth.js';
import Loader from './components/ui/Loader.jsx';

import Login from './pages/Login.jsx';
import Onboarding from './pages/Onboarding.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LogEntry from './pages/LogEntry.jsx';
import History from './pages/History.jsx';
import LoanEligibility from './pages/LoanEligibility.jsx';
import VoiceAuthPage from './pages/VoiceAuthPage.jsx';
import NotFound from './pages/NotFound.jsx';

function RootRedirect() {
  const { isAuthenticated, isProfileComplete, loading } = useAuth();
  if (loading) return <Loader fullscreen label="Loading TakaSathi…" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={isProfileComplete ? '/dashboard' : '/onboarding'} replace />;
}

export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />

        {/* Onboarding requires auth but not a completed profile */}
        <Route element={<ProtectedRoute requireProfile={false} />}>
          <Route path="/onboarding" element={<Onboarding />} />
        </Route>

        {/* Fully protected app pages */}
        <Route element={<ProtectedRoute requireProfile={true} />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/log-entry" element={<LogEntry />} />
          <Route path="/history" element={<History />} />
          <Route path="/loans" element={<LoanEligibility />} />
          <Route path="/voice-auth" element={<VoiceAuthPage />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastProvider>
  );
}
