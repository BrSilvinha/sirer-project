import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

import AdminDashboard from '../admin/AdminDashboard';
import MozoDashboard from '../mozo/MozoDashboard';

/* ─── Paleta ─── */
const COLORS = {
  bg:      '#f1f5f9',
  drawer:  '#0f172a',
  drawerHover: '#1e293b',
  accent:  '#6366f1',
  accentLight: '#eef2ff',
  text:    '#f8fafc',
  subtext: '#94a3b8',
  border:  '#1e293b',
};

const ROL_INFO = {
  administrador: { label: 'Administrador', color: '#818cf8', icon: 'fa-crown'    },
  mozo:          { label: 'Mozo',          color: '#38bdf8', icon: 'fa-user-tie' },
};

/* ─── Drawer lateral ─── */
const Drawer = ({ open, onClose, user, logout, navItems, location }) => (
  <>
    {/* Overlay */}
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        opacity: open ? 1 : 0,
        pointerEvents: open ? 'all' : 'none',
        transition: 'opacity 0.25s ease',
        backdropFilter: 'blur(2px)',
      }}
    />

    {/* Panel */}
    <div style={{
      position: 'fixed', top: 0, left: 0, bottom: 0,
      width: 270, zIndex: 1001,
      background: COLORS.drawer,
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '28px 24px 20px', borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fas fa-utensils" style={{ color: '#fff', fontSize: 16 }}></i>
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 20, color: '#fff', letterSpacing: 1 }}>SIRER</div>
            <div style={{ fontSize: 11, color: COLORS.subtext, letterSpacing: 0.5 }}>Sistema de Gestión</div>
          </div>
        </div>

        {/* Info usuario */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: COLORS.drawerHover, borderRadius: 14, padding: '10px 12px',
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: `${ROL_INFO[user.rol]?.color}25`,
            border: `2px solid ${ROL_INFO[user.rol]?.color}60`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className={`fas ${ROL_INFO[user.rol]?.icon}`} style={{ color: ROL_INFO[user.rol]?.color, fontSize: 16 }}></i>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.nombre}
            </div>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: ROL_INFO[user.rol]?.color,
              marginTop: 1,
            }}>
              {ROL_INFO[user.rol]?.label}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, padding: '14px 12px' }}>
        <div style={{ fontSize: 10, color: COLORS.subtext, fontWeight: 700, letterSpacing: 1.2, padding: '0 12px 10px' }}>
          NAVEGACIÓN
        </div>
        {navItems.map((item) => {
          const active = location.pathname === item.path || (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '11px 14px', borderRadius: 12,
                marginBottom: 4,
                background: active ? COLORS.accent : 'transparent',
                color: active ? '#fff' : COLORS.subtext,
                textDecoration: 'none',
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                transition: 'all 0.15s',
                position: 'relative',
              }}
            >
              <i className={`fas ${item.icon}`} style={{ width: 18, textAlign: 'center', fontSize: 15 }}></i>
              {item.label}
              {active && (
                <div style={{
                  position: 'absolute', right: 12,
                  width: 6, height: 6, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.6)',
                }} />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: '12px 12px 28px', borderTop: `1px solid ${COLORS.border}` }}>
        <button
          onClick={() => { onClose(); logout(); }}
          style={{
            width: '100%', padding: '11px 14px',
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 12, color: '#f87171',
            fontWeight: 700, fontSize: 14, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 12,
            fontFamily: 'inherit',
          }}
        >
          <i className="fas fa-sign-out-alt" style={{ width: 18, textAlign: 'center' }}></i>
          Cerrar Sesión
        </button>
      </div>
    </div>
  </>
);

/* ── Top bar ── */
const TopBar = ({ onMenu, title }) => (
  <div style={{
    position: 'sticky', top: 0, zIndex: 900,
    background: '#fff',
    borderBottom: '1px solid #e2e8f0',
    padding: '0 16px',
    height: 58,
    display: 'flex', alignItems: 'center', gap: 14,
    boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
  }}>
    <button
      onClick={onMenu}
      style={{
        width: 40, height: 40, borderRadius: 12,
        background: COLORS.accentLight,
        border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 5,
        flexShrink: 0,
      }}
    >
      <span style={{ width: 18, height: 2, background: COLORS.accent, borderRadius: 2, display: 'block' }} />
      <span style={{ width: 14, height: 2, background: COLORS.accent, borderRadius: 2, display: 'block' }} />
      <span style={{ width: 18, height: 2, background: COLORS.accent, borderRadius: 2, display: 'block' }} />
    </button>

    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>{title}</div>
    </div>

    <div style={{
      background: COLORS.accentLight,
      borderRadius: 10, padding: '4px 12px',
      fontSize: 12, fontWeight: 700, color: COLORS.accent,
    }}>
      SIRER
    </div>
  </div>
);

/* ── Helper: título de la ruta activa ── */
const usePageTitle = (navItems, location) => {
  const match = navItems.find(i =>
    i.path !== '/dashboard' && location.pathname.startsWith(i.path)
  ) || navItems.find(i => location.pathname === i.path);
  return match?.label || 'Panel';
};

/* ─────────────────────────────────────────
   LAYOUT MOZO  (sin cambios, se mantiene)
───────────────────────────────────────── */
const MozoLayout = ({ user, logout }) => {
  const location = useLocation();
  const [isDesktop, setIsDesktop] = React.useState(() => window.innerWidth >= 768);

  React.useEffect(() => {
    const h = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);

  const tabs = [
    { path: '/dashboard/mozo',           label: 'Mesas',    icon: 'fa-table',   exact: true },
    { path: '/dashboard/mozo/historial', label: 'Historial', icon: 'fa-history' },
  ];

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path || location.pathname === '/dashboard/mozo';
    return location.pathname.startsWith(path);
  };

  /* ── Desktop ── */
  if (isDesktop) {
    return (
      <div style={{ minHeight: '100vh', background: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
        {/* Top bar desktop */}
        <div style={{
          background: '#0f172a', color: '#fff',
          padding: '0 28px', height: 58,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          flexShrink: 0,
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-utensils" style={{ color: '#fff', fontSize: 15 }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 17, letterSpacing: 1 }}>SIRER</div>
              <div style={{ fontSize: 10, color: '#64748b', letterSpacing: 0.5 }}>Sistema de Gestión</div>
            </div>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {tabs.map(tab => {
              const active = isActive(tab.path, tab.exact);
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 18px', borderRadius: 10,
                    background: active ? '#6366f1' : 'transparent',
                    color: active ? '#fff' : '#94a3b8',
                    textDecoration: 'none', fontWeight: active ? 700 : 500,
                    fontSize: 14, transition: 'all 0.15s',
                    boxShadow: active ? '0 2px 8px rgba(99,102,241,0.4)' : 'none',
                  }}
                >
                  <i className={`fas ${tab.icon}`} style={{ fontSize: 13 }}></i>
                  {tab.label}
                </Link>
              );
            })}
          </div>

          {/* Usuario + salir */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.2)', border: '1.5px solid rgba(99,102,241,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-user-tie" style={{ color: '#818cf8', fontSize: 13 }}></i>
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{user.nombre.split(' ')[0]}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>Mozo</div>
              </div>
            </div>
            <button
              onClick={logout}
              style={{
                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 10, color: '#f87171', padding: '7px 14px',
                fontSize: 13, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 7,
              }}
            >
              <i className="fas fa-sign-out-alt" style={{ fontSize: 12 }}></i>
              Salir
            </button>
          </div>
        </div>

        {/* Contenido sin restricción de ancho */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Routes>
            <Route path="/mozo/*" element={<MozoDashboard />} />
            <Route path="/" element={<Navigate to="/dashboard/mozo" replace />} />
            <Route path="*" element={<Navigate to="/dashboard/mozo" replace />} />
          </Routes>
        </div>
      </div>
    );
  }

  /* ── Mobile ── */
  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        background: 'linear-gradient(135deg, #c0392b 0%, #e74c3c 100%)',
        color: '#fff', padding: '12px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <i className="fas fa-utensils" style={{ fontSize: 20 }}></i>
          <div>
            <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>SIRER</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Bienvenido, {user.nombre.split(' ')[0]}</div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 8, color: '#fff', padding: '6px 14px',
            fontSize: 13, cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit',
          }}
        >Salir</button>
      </div>

      <div style={{ flex: 1, padding: '12px 12px 80px 12px', maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <Routes>
          <Route path="/mozo/*" element={<MozoDashboard />} />
          <Route path="/" element={<Navigate to="/dashboard/mozo" replace />} />
          <Route path="*" element={<Navigate to="/dashboard/mozo" replace />} />
        </Routes>
      </div>

      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e0e0e0',
        display: 'flex', boxShadow: '0 -4px 12px rgba(0,0,0,0.08)', zIndex: 200,
      }}>
        {tabs.map(tab => {
          const active = isActive(tab.path, tab.exact);
          return (
            <Link
              key={tab.path}
              to={tab.path}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', padding: '10px 0 8px',
                color: active ? '#c0392b' : '#999',
                textDecoration: 'none', fontSize: 11,
                fontWeight: active ? 700 : 400, gap: 3,
              }}
            >
              <i className={`fas ${tab.icon}`} style={{ fontSize: 20 }}></i>
              {tab.label}
              {active && <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#c0392b', marginTop: 1 }} />}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   LAYOUT ADMIN
───────────────────────────────────────── */
const AdminLayout = ({ user, logout, hasRole }) => {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const getNavItems = () => [
    { path: '/dashboard/admin',           label: 'Panel',     icon: 'fa-gauge'     },
    { path: '/dashboard/admin/mesas',     label: 'Mesas',     icon: 'fa-table'     },
    { path: '/dashboard/admin/productos', label: 'Productos', icon: 'fa-utensils'  },
    { path: '/dashboard/admin/reportes',  label: 'Reportes',  icon: 'fa-chart-bar' },
    { path: '/dashboard/admin/usuarios',  label: 'Usuarios',  icon: 'fa-users'     },
  ];

  const navItems = getNavItems();
  const pageTitle = usePageTitle(navItems, location);

  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  return (
    <div style={{ minHeight: '100vh', background: COLORS.bg }}>
      <TopBar onMenu={() => setDrawerOpen(true)} title={pageTitle} />

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        logout={logout}
        navItems={navItems}
        location={location}
      />

      <div style={{ padding: 0 }}>
        <Routes>
          <Route path="/admin/*" element={<AdminDashboard />} />
          <Route path="/" element={<Navigate to="/dashboard/admin" replace />} />
          <Route path="*" element={
            <div style={{ textAlign: 'center', paddingTop: 80, color: '#94a3b8' }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>🍽️</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>¡Bienvenido, {user.nombre.split(' ')[0]}!</div>
            </div>
          } />
        </Routes>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   DASHBOARD ROOT
───────────────────────────────────────── */
const Dashboard = () => {
  const { user, logout, hasRole } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (hasRole('mozo')) return <MozoLayout user={user} logout={logout} />;
  return <AdminLayout user={user} logout={logout} hasRole={hasRole} />;
};

export default Dashboard;
