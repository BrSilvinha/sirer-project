import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', flexDirection: 'column', gap: 16 }}>
        <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
        <div style={{ width: 48, height: 48, border: '4px solid #eef2ff', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin .75s linear infinite' }} />
        <div style={{ fontWeight: 700, color: '#94a3b8', fontSize: 15 }}>Verificando acceso...</div>
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.rol)) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: 24 }}>
        <div style={{ background: '#fff', borderRadius: 24, padding: '48px 32px', textAlign: 'center', maxWidth: 400, width: '100%', boxShadow: '0 8px 32px rgba(0,0,0,.1)', border: '1.5px solid #e2e8f0' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#fffbeb', border: '2px solid #fde68a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <i className="fas fa-lock" style={{ fontSize: 28, color: '#d97706' }} />
          </div>
          <h3 style={{ fontWeight: 900, fontSize: 20, color: '#0f172a', margin: '0 0 8px' }}>Acceso Denegado</h3>
          <p style={{ color: '#64748b', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
            No tienes permisos para acceder a esta sección.
          </p>
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#64748b', textAlign: 'left' }}>
            <div><strong>Tu rol:</strong> {user?.rol}</div>
            {allowedRoles.length > 0 && <div style={{ marginTop: 4 }}><strong>Requerido:</strong> {allowedRoles.join(', ')}</div>}
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
