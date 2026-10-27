import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('rent_aasan_token');
    if (!token) {
      setLoading(false);
      return;
    }
    api('/auth/me')
      .then(setUser)
      .catch(() => localStorage.removeItem('rent_aasan_token'))
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api('/auth/login', { method: 'POST', body: { email, password } });
    localStorage.setItem('rent_aasan_token', data.access_token);
    setUser(data.user);
    return data.user;
  }

  async function register(payload) {
    const data = await api('/auth/register', { method: 'POST', body: payload });
    localStorage.setItem('rent_aasan_token', data.access_token);
    setUser(data.user);
    return data.user;
  }

  function logout() {
    localStorage.removeItem('rent_aasan_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function homeForRole(role) {
  if (role === 'landlord') return '/landlord';
  if (role === 'tenant') return '/tenant';
  if (role === 'dealer') return '/dealer';
  return '/login';
}
