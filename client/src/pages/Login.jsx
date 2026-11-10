import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { errorField, errorMessage } from '../api';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/Icon';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEMO = { email: 'demo@sweety.app', password: 'Demo@1234' };

export default function Login() {
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const isRegister = mode === 'register';
  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: undefined }));
    setFormError('');
  };

  function validate() {
    const e = {};
    if (isRegister && !form.name.trim()) e.name = 'Please enter your name.';
    if (!form.email.trim()) e.email = 'Please enter your email.';
    else if (!EMAIL_RE.test(form.email.trim())) e.email = 'Please enter a valid email address.';
    if (!form.password) e.password = 'Please enter a password.';
    else if (isRegister && form.password.length < 8) e.password = 'Password must be at least 8 characters.';
    return e;
  }

  async function submit(e) {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    setFormError('');
    try {
      if (isRegister) await register(form.name.trim(), form.email.trim(), form.password);
      else await login(form.email.trim(), form.password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      const field = errorField(err);
      if (field && ['name', 'email', 'password'].includes(field)) setErrors({ [field]: errorMessage(err) });
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <Logo size={72} />
          <h1>Sweety</h1>
          <p>Track your blood glucose, understand your day.</p>
        </div>

        <div className="segmented" role="tablist" aria-label="Log in or register">
          {['login', 'register'].map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              className={mode === m ? 'active' : ''}
              onClick={() => {
                setMode(m);
                setErrors({});
                setFormError('');
              }}
              type="button"
            >
              {m === 'login' ? 'Log in' : 'Create account'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} noValidate className="auth-form">
          {isRegister && (
            <div className="field">
              <label htmlFor="name">Name</label>
              <input id="name" className={`input ${errors.name ? 'input-error' : ''}`} autoComplete="name"
                value={form.name} onChange={set('name')} placeholder="Your full name" />
              {errors.name && <p className="field-error" role="alert">{errors.name}</p>}
            </div>
          )}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className={`input ${errors.email ? 'input-error' : ''}`}
              autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
            {errors.email && <p className="field-error" role="alert">{errors.email}</p>}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className={`input ${errors.password ? 'input-error' : ''}`}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={form.password} onChange={set('password')}
              placeholder={isRegister ? 'At least 8 characters' : 'Your password'} />
            {errors.password && <p className="field-error" role="alert">{errors.password}</p>}
          </div>

          {formError && <p className="form-error" role="alert">{formError}</p>}

          <button className="btn btn-primary btn-block btn-lg" disabled={busy}>
            {busy ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
          </button>
        </form>

        {!isRegister && (
          <button
            type="button"
            className="btn-plain demo-link"
            onClick={() => {
              setForm((f) => ({ ...f, ...DEMO }));
              setErrors({});
            }}
          >
            Fill in demo account
          </button>
        )}
        <p className="disclaimer">Sweety is a tracking tool and does not provide medical advice.</p>
      </div>
    </div>
  );
}
