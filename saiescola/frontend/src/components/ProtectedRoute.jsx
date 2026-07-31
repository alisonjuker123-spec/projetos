import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user?.papel !== role) {
    // Redirect to their correct route
    const roleRoutes = {
      pai: '/pai',
      professora: '/professora',
      portao: '/portao',
      admin: '/admin',
    };
    return <Navigate to={roleRoutes[user?.papel] || '/login'} replace />;
  }

  return children;
}
