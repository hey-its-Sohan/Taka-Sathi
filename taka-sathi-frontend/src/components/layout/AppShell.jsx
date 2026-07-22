import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Mic, History, Landmark, LogOut, Menu, Wallet, Shield } from 'lucide-react';
import useAuth from '../../context/useAuth.js';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/log-entry', label: 'Log Entry', icon: Mic },
  { to: '/history', label: 'History', icon: History },
  { to: '/loans', label: 'Loan Eligibility', icon: Landmark },
  { to: '/voice-auth', label: 'Avoid Crowds', icon: Shield },
];

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-neutral text-neutral-content w-64">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="rounded-xl bg-gold-gradient p-2 text-secondary-content">
          <Wallet size={20} strokeWidth={2.25} />
        </div>
        <div>
          <p className="font-display font-bold text-lg leading-none">TakaSathi</p>
          <p className="text-[11px] text-neutral-content/50 mt-0.5">টাকাসাথী</p>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? 'bg-white/10 text-white'
                  : 'text-neutral-content/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="avatar placeholder">
            <div className="bg-gold-gradient text-secondary-content rounded-full w-9">
              <span className="text-sm font-semibold">{(user?.name || user?.phoneNumber || '?')[0]}</span>
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{user?.name || user?.phoneNumber}</p>
            <p className="text-xs text-neutral-content/50 truncate">{user?.businessName || 'Business'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-neutral-content/60 hover:bg-white/5 hover:text-white w-full mt-1 transition"
        >
          <LogOut size={18} /> Log out
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ children, title }) {
  return (
    <div className="min-h-screen bg-base-200">
      <div className="drawer lg:drawer-open">
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          {/* Topbar (mobile) */}
          <div className="lg:hidden flex items-center gap-3 bg-base-100 border-b border-base-300 px-4 py-3 sticky top-0 z-30">
            <label htmlFor="app-drawer" className="btn btn-ghost btn-sm btn-square">
              <Menu size={20} />
            </label>
            <p className="font-display font-semibold">{title || 'TakaSathi'}</p>
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {title && (
              <h1 className="hidden lg:block font-display text-2xl font-bold text-neutral mb-6">
                {title}
              </h1>
            )}
            {children}
          </main>
        </div>

        <div className="drawer-side z-40">
          <label htmlFor="app-drawer" aria-label="close sidebar" className="drawer-overlay" />
          <SidebarContent onNavigate={() => document.getElementById('app-drawer').checked = false} />
        </div>
      </div>
    </div>
  );
}
