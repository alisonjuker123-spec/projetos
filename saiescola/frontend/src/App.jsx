import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Pai from './pages/Pai';
import Professora from './pages/Professora';
import Portao from './pages/Portao';
import Admin from './pages/Admin';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  const roleRoutes = {
    pai: '/pai',
    professora: '/professora',
    portao: '/portao',
    admin: '/admin',
  };

  return <Navigate to={roleRoutes[user?.papel] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/pai"
              element={
                <ProtectedRoute role="pai">
                  <Pai />
                </ProtectedRoute>
              }
            />
            <Route
              path="/professora"
              element={
                <ProtectedRoute role="professora">
                  <Professora />
                </ProtectedRoute>
              }
            />
            <Route
              path="/portao"
              element={
                <ProtectedRoute role="portao">
                  <Portao />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute role="admin">
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SocketProvider>
    </AuthProvider>
  );
}
