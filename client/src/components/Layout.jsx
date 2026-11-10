import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';
import Icon, { Logo } from './Icon';
import DailyReminder from './DailyReminder';

const NAV = [
  { to: '/', label: 'Dashboard', icon: 'home', end: true },
  { to: '/readings', label: 'Readings', icon: 'list' },
  { to: '/add', label: 'Add reading', tabLabel: 'Add', icon: 'plus', primary: true },
  { to: '/reports', label: 'Reports', icon: 'chart' },
];

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      {/* Desktop / tablet sidebar */}
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <Logo size={36} />
          <div>
            <strong>Sweety</strong>
            <span>Glucose tracker</span>
          </div>
        </div>
        <nav className="sidebar-nav">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="sidebar-link" data-cursor="link">
              <Icon name={item.icon} size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="avatar" aria-hidden="true">{initials(user?.name)}</div>
          <div className="sidebar-user-text">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <button className="icon-btn" onClick={logout} aria-label="Log out" title="Log out" data-cursor="danger">
            <Icon name="logout" size={20} />
          </button>
        </div>
      </aside>

      <main className="main" id="main">
        <DailyReminder />
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav className="tabbar" aria-label="Main navigation">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `tab ${isActive ? 'active' : ''} ${item.primary ? 'tab-primary' : ''}`}
            data-cursor={item.primary ? 'button' : 'link'}
          >
            <span className="tab-icon">
              <Icon name={item.icon} size={item.primary ? 24 : 24} strokeWidth={item.primary ? 2.4 : 1.9} />
            </span>
            <span className="tab-label">{item.tabLabel || item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
