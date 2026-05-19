import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from '../admin/AdminDashboard';
import MozoDashboard from '../mozo/MozoDashboard';

/* ─────────────────────────────────────────
   DESIGN TOKENS  (fuente de verdad única)
───────────────────────────────────────── */
const T = {
  primary:   '#6366f1',
  primaryDk: '#4f46e5',
  primaryBg: '#eef2ff',
  dark:      '#0f172a',
  dark2:     '#1e293b',
  dark3:     '#334155',
  muted:     '#94a3b8',
  bg:        '#f8fafc',
  border:    '#e2e8f0',
  text:      '#0f172a',
};

/* ─────────────────────────────────────────
   CONFIG DE ROLES
───────────────────────────────────────── */
const ROL_CFG = {
  administrador: { label: 'Administrador', icon: 'fa-crown',    color: '#818cf8' },
  mozo:          { label: 'Mozo',          icon: 'fa-user-tie', color: '#38bdf8' },
};

const NAV = {
  administrador: [
    { path: '/dashboard/admin',           label: 'Panel',     icon: 'fa-gauge',    exact: true },
    { path: '/dashboard/admin/mesas',     label: 'Mesas',     icon: 'fa-table'                },
    { path: '/dashboard/admin/productos', label: 'Productos', icon: 'fa-utensils'             },
    { path: '/dashboard/admin/reportes',  label: 'Reportes',  icon: 'fa-chart-bar'            },
    { path: '/dashboard/admin/usuarios',  label: 'Usuarios',  icon: 'fa-users'                },
  ],
  mozo: [
    { path: '/dashboard/mozo',           label: 'Mesas',    icon: 'fa-table', exact: true },
    { path: '/dashboard/mozo/historial', label: 'Historial', icon: 'fa-clock'             },
  ],
};

/* ─────────────────────────────────────────
   CSS GLOBAL
───────────────────────────────────────── */
const CSS = `
  @keyframes sirer-fadeIn  { from{opacity:0}              to{opacity:1} }
  @keyframes sirer-slideUp { from{transform:translateY(8px);opacity:0} to{transform:translateY(0);opacity:1} }
  :root { --safe-b: env(safe-area-inset-bottom, 0px); }
`;

/* ─────────────────────────────────────────
   HELPER: ruta activa
───────────────────────────────────────── */
const isActive = (path, loc, exact) =>
  exact ? loc.pathname === path || loc.pathname === path + '/'
        : loc.pathname.startsWith(path);

/* ─────────────────────────────────────────
   HOOK RESPONSIVE
───────────────────────────────────────── */
const useIsDesktop = () => {
  const [d, setD] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const h = () => setD(window.innerWidth >= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return d;
};

/* ══════════════════════════════════════════
   TOP BAR  DESKTOP
   Barra fija arriba, oscura, con logo + nav + usuario
══════════════════════════════════════════ */
const TopBarDesktop = ({ user, logout, navItems, location }) => {
  const rol = ROL_CFG[user.rol] || ROL_CFG.mozo;
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 58, background: T.dark, zIndex: 200,
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 0,
      boxShadow: '0 2px 16px rgba(0,0,0,.3)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 32, flexShrink: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-utensils" style={{ color: '#fff', fontSize: 14 }} />
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 17, color: '#fff', letterSpacing: 1, lineHeight: 1 }}>SIRER</div>
          <div style={{ fontSize: 9, color: T.muted, letterSpacing: 0.4 }}>Sistema de Gestión</div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
        {navItems.map(item => {
          const active = isActive(item.path, location, item.exact);
          return (
            <Link key={item.path} to={item.path} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 10,
              background: active ? T.primary : 'transparent',
              color: active ? '#fff' : T.muted,
              textDecoration: 'none', fontWeight: active ? 700 : 500,
              fontSize: 13, transition: 'all 0.15s',
              boxShadow: active ? `0 2px 8px ${T.primary}55` : 'none',
              whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => !active && (e.currentTarget.style.background = T.dark2)}
              onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
            >
              <i className={`fas ${item.icon}`} style={{ fontSize: 12 }} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Usuario + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${rol.color}20`, border: `1.5px solid ${rol.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className={`fas ${rol.icon}`} style={{ color: rol.color, fontSize: 13 }} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', lineHeight: 1.1 }}>{user.nombre.split(' ')[0]}</div>
            <div style={{ fontSize: 10, color: rol.color, fontWeight: 600 }}>{rol.label}</div>
          </div>
        </div>
        <div style={{ width: 1, height: 28, background: T.dark3 }} />
        <button onClick={logout} style={{
          background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)',
          borderRadius: 9, color: '#f87171', padding: '7px 12px',
          fontSize: 12, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <i className="fas fa-sign-out-alt" style={{ fontSize: 11 }} />
          Salir
        </button>
      </div>
    </header>
  );
};

/* ══════════════════════════════════════════
   TOP BAR  MOBILE
   Barra compacta: logo + rol + usuario + logout
══════════════════════════════════════════ */
const TopBarMobile = ({ user, logout }) => {
  const rol = ROL_CFG[user.rol] || ROL_CFG.mozo;
  const initials = (user.nombre || '?').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 56, background: T.dark, zIndex: 200,
      display: 'flex', alignItems: 'center', padding: '0 16px',
      boxShadow: '0 2px 12px rgba(0,0,0,.35)',
    }}>
      {/* Logo */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg,#4f46e5,#818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className="fas fa-utensils" style={{ color: '#fff', fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#fff', letterSpacing: 0.8, lineHeight: 1 }}>SIRER</div>
          <div style={{ fontSize: 10, color: rol.color, fontWeight: 600 }}>{rol.label}</div>
        </div>
      </div>

      {/* Avatar + logout */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${rol.color}20`, border: `1.5px solid ${rol.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 900, color: rol.color }}>{initials}</span>
        </div>
        <button onClick={logout} style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(239,68,68,.15)', border: '1px solid rgba(239,68,68,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#f87171', flexShrink: 0 }}>
          <i className="fas fa-sign-out-alt" style={{ fontSize: 13 }} />
        </button>
      </div>
    </header>
  );
};

/* ══════════════════════════════════════════
   BOTTOM NAV  MOBILE
   Tabs fijos abajo, blanco, con indicador indigo
══════════════════════════════════════════ */
const BottomNav = ({ navItems, location }) => {
  const many = navItems.length > 3;
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      background: '#fff', borderTop: `1px solid ${T.border}`,
      display: 'flex', zIndex: 200,
      paddingBottom: 'var(--safe-b)',
      boxShadow: '0 -4px 20px rgba(0,0,0,.08)',
    }}>
      {navItems.map(item => {
        const active = isActive(item.path, location, item.exact);
        return (
          <Link key={item.path} to={item.path} style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '10px 2px 8px', textDecoration: 'none',
            color: active ? T.primary : T.muted,
            position: 'relative', minWidth: 0,
            transition: 'color 0.15s',
          }}>
            {active && (
              <div style={{ position: 'absolute', top: 0, left: '25%', right: '25%', height: 3, background: T.primary, borderRadius: '0 0 4px 4px' }} />
            )}
            <i className={`fas ${item.icon}`} style={{ fontSize: many ? 18 : 22, marginBottom: 3, transition: 'font-size .15s' }} />
            <span style={{ fontSize: many ? 9 : 10, fontWeight: active ? 700 : 500, lineHeight: 1, textAlign: 'center', letterSpacing: 0.2 }}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};

/* ══════════════════════════════════════════
   ROUTES COMPARTIDAS
══════════════════════════════════════════ */
const AppRoutes = ({ user }) => (
  <Routes>
    {user.rol === 'administrador' && (
      <>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/" element={<Navigate to="/dashboard/admin" replace />} />
        <Route path="*" element={<Navigate to="/dashboard/admin" replace />} />
      </>
    )}
    {user.rol === 'mozo' && (
      <>
        <Route path="/mozo/*" element={<MozoDashboard />} />
        <Route path="/" element={<Navigate to="/dashboard/mozo" replace />} />
        <Route path="*" element={<Navigate to="/dashboard/mozo" replace />} />
      </>
    )}
  </Routes>
);

/* ══════════════════════════════════════════
   APP LAYOUT  (único para ambos roles)
══════════════════════════════════════════ */
const AppLayout = ({ user, logout }) => {
  const location = useLocation();
  const isDesktop = useIsDesktop();
  const navItems = NAV[user.rol] || [];

  /* ── Desktop: top bar + contenido full-width ── */
  if (isDesktop) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg }}>
        <TopBarDesktop user={user} logout={logout} navItems={navItems} location={location} />
        <main style={{ paddingTop: 58, minHeight: '100vh' }}>
          <AppRoutes user={user} />
        </main>
      </div>
    );
  }

  /* ── Mobile: top bar + bottom nav ── */
  return (
    <div style={{ minHeight: '100vh', background: T.bg, paddingTop: 56, paddingBottom: 66 }}>
      <TopBarMobile user={user} logout={logout} />
      <main>
        <AppRoutes user={user} />
      </main>
      <BottomNav navItems={navItems} location={location} />
    </div>
  );
};

/* ══════════════════════════════════════════
   DASHBOARD ROOT
══════════════════════════════════════════ */
const Dashboard = () => {
  const { user, logout } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return (
    <>
      <style>{CSS}</style>
      <AppLayout user={user} logout={logout} />
    </>
  );
};

export default Dashboard;
