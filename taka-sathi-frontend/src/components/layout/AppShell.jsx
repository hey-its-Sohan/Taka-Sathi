import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Mic, History, Landmark, LogOut, Menu, Wallet, Shield } from 'lucide-react';
import useAuth from '../../context/useAuth.js';
import useLanguage from '../../context/useLanguage.js';

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
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-neutral to-[#061614] text-neutral-content w-64 border-r border-base-300/10 shadow-xl">
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
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-primary/20 text-white shadow-[inset_3px_0_0_0_rgba(20,184,166,1)]'
                  : 'text-neutral-content/60 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {t(label)}
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
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-neutral-content/60 hover:bg-error/20 hover:text-error w-full mt-1 transition"
        >
          <LogOut size={18} /> {t('Log out')}
        </button>
      </div>
    </div>
  );
}

function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="join bg-base-100 shadow-sm border border-base-300 rounded-xl p-0.5 scale-90 shrink-0">
      <button
        onClick={() => setLanguage('default')}
        className={`btn btn-xs rounded-lg px-2 text-[10px] sm:text-[11px] font-bold ${
          language === 'default' ? 'bg-primary text-primary-content hover:bg-primary' : 'btn-ghost text-neutral/70 hover:bg-base-200'
        }`}
        title="Mixed Language (System Default)"
      >
        Default
      </button>
      <button
        onClick={() => setLanguage('bn')}
        className={`btn btn-xs rounded-lg px-2 text-[10px] sm:text-[11px] font-bold ${
          language === 'bn' ? 'bg-primary text-primary-content hover:bg-primary' : 'btn-ghost text-neutral/70 hover:bg-base-200'
        }`}
        title="Full Bangla (বাং)"
      >
        বাং
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`btn btn-xs rounded-lg px-2 text-[10px] sm:text-[11px] font-bold ${
          language === 'en' ? 'bg-primary text-primary-content hover:bg-primary' : 'btn-ghost text-neutral/70 hover:bg-base-200'
        }`}
        title="Full English"
      >
        EN
      </button>
    </div>
  );
}

export default function AppShell({ children, title }) {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-base-200">
      <div className="drawer lg:drawer-open">
        <input id="app-drawer" type="checkbox" className="drawer-toggle" />
        <div className="drawer-content flex flex-col">
          {/* Topbar (mobile) */}
          <div className="lg:hidden flex items-center justify-between bg-base-100 border-b border-base-300 px-4 py-3 sticky top-0 z-30">
            <div className="flex items-center gap-3 min-w-0">
              <label htmlFor="app-drawer" className="btn btn-ghost btn-sm btn-square shrink-0">
                <Menu size={20} />
              </label>
              <p className="font-display font-semibold truncate">{t(title) || 'TakaSathi'}</p>
            </div>
            <LanguageToggle />
          </div>

          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto">
            {title && (
              <div className="hidden lg:flex items-center justify-between mb-6 border-b border-base-300/40 pb-4">
                <h1 className="font-display text-2xl font-bold text-neutral">
                  {t(title)}
                </h1>
                <LanguageToggle />
              </div>
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
