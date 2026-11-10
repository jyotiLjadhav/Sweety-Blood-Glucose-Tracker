import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { initials } from '../utils/format';
import Icon from './Icon';
import Sheet from './Sheet';

/** iOS "large title" header. On phones the avatar opens an account sheet. */
export default function PageHeader({ title, subtitle, action }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="page-header">
        <div className="page-header-text">
          {subtitle && <p className="page-subtitle">{subtitle}</p>}
          <h1>{title}</h1>
        </div>
        <div className="page-header-actions">
          {action}
          <button
            className="avatar avatar-btn mobile-only"
            onClick={() => setOpen(true)}
            aria-label="Account"
          >
            {initials(user?.name)}
          </button>
        </div>
      </header>

      <Sheet open={open} title="Account" onClose={() => setOpen(false)} closeLabel="Done">
        <div className="account-card">
          <div className="avatar avatar-lg" aria-hidden="true">{initials(user?.name)}</div>
          <strong>{user?.name}</strong>
          <span>{user?.email}</span>
        </div>
        <button className="btn btn-danger-soft btn-block" onClick={logout}>
          <Icon name="logout" size={18} /> Log out
        </button>
      </Sheet>
    </>
  );
}
