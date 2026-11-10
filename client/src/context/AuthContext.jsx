import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { tokenStore } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()));

  // Restore the session if a token is stored
  useEffect(() => {
    if (!tokenStore.get()) return;
    let cancelled = false;
    api
      .get('/auth/me')
      .then((res) => !cancelled && setUser(res.data.user))
      .catch(() => tokenStore.clear())
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Any API call that comes back 401 logs the user out
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('sweety:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sweety:unauthorized', onUnauthorized);
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    tokenStore.set(data.token);
    setUser(data.user);
  }, []);

  // Registering only creates the account. The person then logs in on the login page.
  const register = useCallback(async (name, email, password) => {
    await api.post('/auth/register', { name, email, password });
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout }),
    [user, loading, login, register, logout]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
