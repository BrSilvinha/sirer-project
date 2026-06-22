import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

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
  const { C } = useTheme();

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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1A0E0A' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #2C1810', borderTop: '4px solid #F9A825', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  const canSubmit = credential && password && !submitting;

  const focusRed = '#C62828';
  const focusRedRgba = 'rgba(198,40,40,0.12)';

  const wrapSt = {
    position: 'relative', display: 'flex', alignItems: 'center',
    border: `1.5px solid ${C.border}`, borderRadius: 14,
    background: C.inputBg, transition: 'border-color 0.15s, box-shadow 0.15s',
    overflow: 'hidden',
  };

  const inputSt = {
    flex: 1, padding: '14px 14px 14px 0',
    border: 'none', outline: 'none',
    background: 'transparent', fontSize: 15,
    color: C.text, fontFamily: 'inherit',
  };

  const labelSt = {
    fontSize: 12, fontWeight: 700, color: C.textSub,
    letterSpacing: 0.5, display: 'block', marginBottom: 8,
    textTransform: 'uppercase',
  };

  /* ────────── DESKTOP ────────── */
  if (isDesktop) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'inherit' }}>

        {/* Panel izquierdo — branding El Chavo */}
        <div style={{
          width: '44%', background: 'linear-gradient(170deg, #1A0E0A 0%, #2C1810 50%, #3E2723 100%)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '60px 48px', position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -100, right: -100, width: 320, height: 320, borderRadius: '50%', border: '1px solid rgba(249,168,37,0.1)' }} />
          <div style={{ position: 'absolute', top: -50,  right: -50,  width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(249,168,37,0.08)', background: 'rgba(249,168,37,0.03)' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 260, height: 260, borderRadius: '50%', border: '1px solid rgba(198,40,40,0.1)' }} />
          <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', border: '1px solid rgba(198,40,40,0.08)', background: 'rgba(198,40,40,0.04)' }} />

          <img
            src={`${process.env.PUBLIC_URL}/logo-chavo.png`}
            alt="El Chavo - Pollería y Parrilla"
            style={{
              width: 380, height: 380, objectFit: 'contain',
              marginBottom: 12,
              filter: 'drop-shadow(0 8px 32px rgba(249,168,37,0.35))',
            }}
          />

          <div style={{ width: 48, height: 3, background: 'linear-gradient(90deg, #C62828, #F9A825)', borderRadius: 2, margin: '28px 0' }} />

          {[
            { icon: 'fa-fire',       text: 'Pollos a la brasa y parrillas' },
            { icon: 'fa-table',      text: 'Control de mesas en tiempo real' },
            { icon: 'fa-chart-bar',  text: 'Reportes y estadísticas'       },
          ].map(f => (
            <div key={f.icon} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, width: '100%', maxWidth: 280 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'rgba(249,168,37,0.12)',
                border: '1px solid rgba(249,168,37,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`fas ${f.icon}`} style={{ color: '#F9A825', fontSize: 14 }}></i>
              </div>
              <span style={{ color: '#BCAAA4', fontSize: 13, fontWeight: 500 }}>{f.text}</span>
            </div>
          ))}

          <div style={{ position: 'absolute', bottom: 24, fontSize: 12, color: '#4E342E' }}>
            © 2025 El Chavo · Todos los derechos reservados
          </div>
        </div>

        {/* Panel derecho — formulario */}
        <div style={{
          flex: 1, background: C.bg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px',
        }}>
          <div style={{ width: '100%', maxWidth: 420 }}>

            <h2 style={{ fontWeight: 800, fontSize: 28, color: C.text, margin: '0 0 6px' }}>Bienvenido</h2>
            <p style={{ color: C.textMuted, fontSize: 15, margin: '0 0 32px' }}>Ingresa tus credenciales para continuar</p>

            {error && (
              <div style={{
                background: '#FFEBEE', border: '1.5px solid #FFCDD2',
                borderRadius: 12, padding: '12px 16px',
                color: '#C62828', fontSize: 13, fontWeight: 600,
                marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 20 }}>
                <label style={labelSt}>DNI o Correo electrónico</label>
                <div style={{ ...wrapSt, borderColor: focused === 'cred' ? focusRed : C.border, boxShadow: focused === 'cred' ? `0 0 0 3px ${focusRedRgba}` : 'none' }}>
                  <div style={iconBoxSt}>
                    <i className="fas fa-id-card" style={{ color: focused === 'cred' ? focusRed : C.textMuted, fontSize: 15 }}></i>
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
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
                  <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
                  Puedes ingresar tu DNI o correo electrónico
                </div>
              </div>

              <div style={{ marginBottom: 32 }}>
                <label style={labelSt}>Contraseña</label>
                <div style={{ ...wrapSt, borderColor: focused === 'pass' ? focusRed : C.border, boxShadow: focused === 'pass' ? `0 0 0 3px ${focusRedRgba}` : 'none' }}>
                  <div style={iconBoxSt}>
                    <i className="fas fa-lock" style={{ color: focused === 'pass' ? focusRed : C.textMuted, fontSize: 15 }}></i>
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
                    <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} style={{ color: C.textMuted }}></i>
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(170deg, #1A0E0A, #2C1810)', fontFamily: 'inherit' }}>

      {/* Hero branding El Chavo */}
      <div style={{ flex: '0 0 auto', padding: '60px 32px 48px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -100, right: -100, width: 280, height: 280, borderRadius: '50%', border: '1px solid rgba(249,168,37,0.1)' }} />
        <div style={{ position: 'absolute', top: -60,  right: -60,  width: 180, height: 180, borderRadius: '50%', border: '1px solid rgba(249,168,37,0.08)', background: 'rgba(249,168,37,0.04)' }} />
        <div style={{ position: 'absolute', bottom: 0, left: -80, width: 200, height: 200, borderRadius: '50%', border: '1px solid rgba(198,40,40,0.1)' }} />

        <img
          src={`${process.env.PUBLIC_URL}/logo-chavo.png`}
          alt="El Chavo - Pollería y Parrilla"
          style={{
            width: 300, height: 300, objectFit: 'contain',
            marginBottom: 4,
            filter: 'drop-shadow(0 6px 24px rgba(249,168,37,0.35))',
          }}
        />
      </div>

      {/* Card formulario */}
      <div style={{ flex: 1, background: C.surface, borderRadius: '28px 28px 0 0', padding: '32px 24px 48px', boxShadow: '0 -12px 48px rgba(0,0,0,0.3)', animation: 'slideUp 0.35s cubic-bezier(0.4,0,0.2,1)' }}>

        <h2 style={{ fontWeight: 800, fontSize: 22, color: C.text, margin: '0 0 4px' }}>Bienvenido</h2>
        <p style={{ color: C.textMuted, fontSize: 14, margin: '0 0 28px' }}>Ingresa tus credenciales para continuar</p>

        {error && (
          <div style={{ background: '#FFEBEE', border: '1.5px solid #FFCDD2', borderRadius: 12, padding: '11px 14px', color: '#C62828', fontSize: 13, fontWeight: 600, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-exclamation-circle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelSt}>DNI o Correo electrónico</label>
            <div style={{ ...wrapSt, borderColor: focused === 'cred' ? focusRed : C.border, boxShadow: focused === 'cred' ? `0 0 0 3px ${focusRedRgba}` : 'none' }}>
              <div style={iconBoxSt}>
                <i className="fas fa-id-card" style={{ color: focused === 'cred' ? focusRed : C.textMuted, fontSize: 15 }}></i>
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
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 5 }}>
              <i className="fas fa-info-circle" style={{ marginRight: 4 }}></i>
              Puedes ingresar tu DNI o correo electrónico
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <label style={labelSt}>Contraseña</label>
            <div style={{ ...wrapSt, borderColor: focused === 'pass' ? focusRed : C.border, boxShadow: focused === 'pass' ? `0 0 0 3px ${focusRedRgba}` : 'none' }}>
              <div style={iconBoxSt}>
                <i className="fas fa-lock" style={{ color: focused === 'pass' ? focusRed : C.textMuted, fontSize: 15 }}></i>
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
                <i className={`fas ${showPass ? 'fa-eye-slash' : 'fa-eye'}`} style={{ color: C.textMuted }}></i>
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

        <div style={{ textAlign: 'center', marginTop: 32, color: C.textMuted, fontSize: 12 }}>
          © 2025 El Chavo · Todos los derechos reservados
        </div>
      </div>
    </div>
  );
};

/* ── Estilos que NO dependen del tema ── */
const iconBoxSt = {
  width: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
};

const eyeBtnSt = {
  position: 'absolute', right: 14, top: '50%',
  transform: 'translateY(-50%)',
  background: 'none', border: 'none',
  cursor: 'pointer',
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
  background: 'linear-gradient(135deg, #C62828, #EF5350)',
  color: '#fff',
  boxShadow: '0 8px 24px rgba(198,40,40,0.4)',
};

const btnDisabledSt = {
  background: '#D7CCC8',
  color: '#8D6E63',
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
