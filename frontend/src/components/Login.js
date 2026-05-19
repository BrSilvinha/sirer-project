import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const resolveLogin = (input) => {
  const clean = input.trim();
  if (/^\d+$/.test(clean)) return `${clean}@sirer.pe`;
  return clean;
};

const useIsDesktop = () => {
  const [desk, setDesk] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const fn = () => setDesk(window.innerWidth >= 768);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  return desk;
};

const Login = () => {
  const [credential, setCredential] = useState('');
  const [password,   setPassword]   = useState('');
  const [showPass,   setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focused,    setFocused]    = useState(null);

  const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
  const navigate  = useNavigate();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    if (isAuthenticated && !isLoading) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => { clearError(); }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !credential || !password) return;
    setSubmitting(true);
    try { await login(resolveLogin(credential), password); }
    catch {}
    finally { setSubmitting(false); }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #1e293b', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const canSubmit = credential && password && !submitting;

  /* ────────── DESKTOP ────────── */
  if (isDesktop) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'inherit' }}>

        {/* Panel izquierdo — branding */}
        <div style={{
          width: '44%', background: '#0f172a',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '60px 48px', position: 'relative', overflow: 'hidden',
        }}>
          {/* Círculos decorativos */}
          <div style={{ position: 'absolute', top: -100, right: -100, width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.1)' }} />
          <div style={{ position: 'absolute', top: -50,  right: -50,  width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.03)' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.07)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.06)', background: 'rgba(99,102,241,0.03)' }} />

          {/* Logo */}
          <div style={{
            width: 90, height: 90, borderRadius: 26,
            background: 'linear-gradient(145deg, #4f46e5, #818cf8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 28, boxShadow: '0 16px 48px rgba(99,102,241,0.5)',
          }}>
            <i className="fas fa-utensils" style={{ fontSize: 36, color: '#fff' }}></i>
          </div>

          <h1 style={{ fontWeight: 900, fontSize: 40, color: '#fff', letterSpacing: 4, margin: 0 }}>SIRER</h1>
          <p style={{ color: '#64748b', fontSize: 15, marginTop: 12, fontWeight: 500, letterSpacing: 0.5, textAlign: 'center' }}>
            Sistema de Gestión de Restaurante
          </p>

          {/* Divisor */}
          <div style={{ width: 48, height: 3, background: '#6366f1', borderRadius: 2, margin: '28px 0' }} />

          {/* Features */}
          {[
            { icon: 'fa-table',     text: 'Control de mesas en tiempo real' },
            { icon: 'fa-utensils',  text: 'Gestión de pedidos y cocina'      },
            { icon: 'fa-chart-bar', text: 'Reportes y estadísticas'           },
          ].map(f => (
            <div key={f.icon} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, width: '100%', maxWidth: 280 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`fas ${f.icon}`} style={{ color: '#818cf8', fontSize: 14 }}></i>
              </div>
              <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}

          <div style={{ position: 'absolute', bottom: 24, fontSize: 12, color: '#334155' }}>
            © 2025 SIRER · Todos los derechos reservados
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div style={{
          flex: 1, background: '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            <h2 style={{ fontWeight: 800, fontSize: 28, color: '#0f172a', margin: '0 0 6px' }}>Bienvenido</h2>
            <p style={{ color: '#94a3b8', fontSize: 15, margin: '0 0 32px' }}>Ingresa tus credenciales para continuar</p>

            {error && (
              <div style={{
                background: '#fef2f2', border: '1.5px solid #fecaca',
                borderRadius: 12, padding: '12px 16px',
                color: '#dc2626', fontSize: 13, fontWeight: 600,
                marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelSt}>DNI o Correo electrónico</label>
                <div style={{ ...wrapSt, borderColor: focused === 'cred' ? '#6366f1' : '#e2e8f0', boxShadow: focused === 'cred' ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none' }}>
                  <div style={iconBoxSt}>
                    <i className="fas fa-id-card" style={{ color: focused === 'cred' ? '#6366f1' : '#94a3b8', fontSize: 15 }}></i>
                  </div>
                  <input
                    type="text"
                    value={credential}
                    onChange={e => setCredential(e.target.value)}
                    onFocus={() => setFocused('cred')}
                    onBlur={() => setFocused(null)}
                    placeholder="12345678 ó correo@ejemplo.com"
                    required
                    disabled={submitting}
                    style={inputSt}
                  />
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
                  Puedes ingresar tu DNI o correo electrónico
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={labelSt}>Contraseña</label>
                <div style={{ ...wrapSt, borderColor: focused === 'pass' ? '#6366f1' : '#e2e8f0', boxShadow: focused === 'pass' ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none' }}>
                  <div style={iconBoxSt}>
                    <i className="fas fa-lock" style={{ color: focused === 'pass' ? '#6366f1' : '#94a3b8', fontSize: 15 }}></i>
                  </div>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setFocused('pass')}
                    onBlur={() => setFocused(null)}
                    placeholder="Tu contraseña"
                    required
                    disabled={submitting}
                    style={{ ...inputSt, paddingRight: 48 }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)} style={eyeBtnSt}>
                    <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                  </button>
                </div>
              </div>

              <button type="submit" disabled={!canSubmit} style={{ ...btnSt, ...(canSubmit ? btnActiveSt : btnDisabledSt) }}>
                {submitting ? (
                  <><div style={spinnerSt} /> Ingresando...</>
                ) : (
                  <><i className="fas fa-sign-in-alt"></i> Ingresar</>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /* ────────── MÓVIL ────────── */
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: 'inherit' }}>

      {/* Hero */}
      <div style={{ flex: '0 0 auto', padding: '70px 32px 52px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.1)' }} />
        <div style={{ position: 'absolute', top: -60,  right: -60,  width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.08)', background: 'rgba(99,102,241,0.04)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: -80, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(99,102,241,0.07)' }} />

        <div style={{ width: 76, height: 76, borderRadius: 22, background: 'linear-gradient(145deg, #4f46e5, #818cf8)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 22, boxShadow: '0 12px 40px rgba(99,102,241,0.5)' }}>
          <i className="fas fa-utensils" style={{ fontSize: 30, color: '#fff' }}></i>
        </div>
        <h1 style={{ fontWeight: 900, fontSize: 32, color: '#fff', letterSpacing: 3, margin: 0 }}>SIRER</h1>
        <p style={{ color: '#475569', fontSize: 13, marginTop: 8, fontWeight: 500, letterSpacing: 0.5 }}>Sistema de Gestión de Restaurante</p>
      </div>

      {/* Card formulario */}
      <div style={{ flex: 1, background: '#fff', borderRadius: '28px 28px 0 0', padding: '32px 24px 48px', boxShadow: '0 -12px 48px rgba(0,0,0,0.3)', animation: 'slideUp 0.35s cubic-bezier(0.4,0,0.2,1)' }}>

        <h2 style={{ fontWeight: 800, fontSize: 22, color: '#0f172a', margin: '0 0 4px' }}>Bienvenido</h2>
        <p style={{ color: '#94a3b8', fontSize: 14, margin: '0 0 28px' }}>Ingresa tus credenciales para continuar</p>

        {error && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', borderRadius: 12, padding: '11px 14px', color: '#dc2626', fontSize: 13, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelSt}>DNI o Correo electrónico</label>
            <div style={{ ...wrapSt, borderColor: focused === 'cred' ? '#6366f1' : '#e2e8f0', boxShadow: focused === 'cred' ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none' }}>
              <div style={iconBoxSt}>
                <i className="fas fa-id-card" style={{ color: focused === 'cred' ? '#6366f1' : '#94a3b8', fontSize: 15 }}></i>
              </div>
              <input
                type="text"
                inputMode="text"
                value={credential}
                onChange={e => setCredential(e.target.value)}
                onFocus={() => setFocused('cred')}
                onBlur={() => setFocused(null)}
                placeholder="12345678 ó correo@ejemplo.com"
                required
                disabled={submitting}
                style={inputSt}
              />
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>
              <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
              Puedes ingresar tu DNI o correo electrónico
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={labelSt}>Contraseña</label>
            <div style={{ ...wrapSt, borderColor: focused === 'pass' ? '#6366f1' : '#e2e8f0', boxShadow: focused === 'pass' ? '0 0 0 3px rgba(99,102,241,0.12)' : 'none' }}>
              <div style={iconBoxSt}>
                <i className="fas fa-lock" style={{ color: focused === 'pass' ? '#6366f1' : '#94a3b8', fontSize: 15 }}></i>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setFocused('pass')}
                onBlur={() => setFocused(null)}
                placeholder="Tu contraseña"
                required
                disabled={submitting}
                style={{ ...inputSt, paddingRight: 48 }}
              />
              <button type="button" onClick={() => setShowPass(v => !v)} style={eyeBtnSt}>
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button type="submit" disabled={!canSubmit} style={{ ...btnSt, ...(canSubmit ? btnActiveSt : btnDisabledSt) }}>
            {submitting ? (
              <><div style={spinnerSt} /> Ingresando...</>
            ) : (
              <><i className="fas fa-sign-in-alt"></i> Ingresar</>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 32, color: '#cbd5e1', fontSize: 12 }}>
          © 2025 SIRER · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
};

/* ── Estilos compartidos ── */
const labelSt = {
  fontSize: 12, fontWeight: 700, color: '#475569',
  letterSpacing: 0.5, display: 'block', marginBottom: 8,
  textTransform: 'uppercase',
};

const wrapSt = {
  position: 'relative', display: 'flex', alignItems: 'center',
  border: '1.5px solid #e2e8f0', borderRadius: 14,
  background: '#f8fafc', transition: 'border-color 0.15s, box-shadow 0.15s',
  overflow: 'hidden',
};

const iconBoxSt = {
  width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const inputSt = {
  flex: 1, padding: '14px 14px 14px 0',
  border: 'none', outline: 'none',
  background: 'transparent', fontSize: 15,
  color: '#0f172a', fontFamily: 'inherit',
};

const eyeBtnSt = {
  position: 'absolute', right: 14, top: '50%',
  transform: 'translateY(-50%)',
  background: 'none', border: 'none',
  color: '#94a3b8', cursor: 'pointer',
  fontSize: 15, padding: 6, lineHeight: 1,
};

const btnSt = {
  width: '100%', padding: '16px',
  border: 'none', borderRadius: 16,
  fontSize: 16, fontWeight: 800,
  transition: 'all 0.2s',
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
  fontFamily: 'inherit', cursor: 'pointer',
};

const btnActiveSt = {
  background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
  color: '#fff',
  boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
};

const btnDisabledSt = {
  background: '#e2e8f0',
  color: '#94a3b8',
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const spinnerSt = {
  width: 18, height: 18,
  border: '3px solid rgba(255,255,255,0.3)',
  borderTop: '3px solid #fff',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

export default Login;
