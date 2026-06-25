import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('saiescola_token'));
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('saiescola_usuario');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const isAuthenticated = !!token && !!user;

  async function login(email, senha) {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/auth/login', { email, senha });
      const { token: newToken, usuario } = response.data;

      localStorage.setItem('saiescola_token', newToken);
      localStorage.setItem('saiescola_usuario', JSON.stringify(usuario));

      setToken(newToken);
      setUser(usuario);
      return { success: true, usuario };
    } catch (err) {
      const msg = err.response?.data?.error || 'Erro ao fazer login';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('saiescola_token');
    localStorage.removeItem('saiescola_usuario');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
