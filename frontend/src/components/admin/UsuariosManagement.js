import React, { useState, useEffect, useCallback } from 'react';
import { authService } from '../../services/api';
import toast from 'react-hot-toast';

/* ─── Paleta ─── */
const ROL = {
  administrador: { label: 'Admin', color: '#6366f1', bg: '#eef2ff', icon: 'fa-crown'    },
  mozo:          { label: 'Mozo',  color: '#0ea5e9', bg: '#f0f9ff', icon: 'fa-user-tie' },
};
const A = '#6366f1';
const DARK = '#0f172a';

const inp = {
  width: '100%', padding: '11px 14px',
  border: '1.5px solid #e2e8f0', borderRadius: 10,
  fontSize: 14, outline: 'none',
  background: '#f8fafc', color: DARK,
  fontFamily: 'inherit', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};
const lbl = {
  fontSize: 11, fontWeight: 700, color: '#64748b',
  letterSpacing: 0.6, marginBottom: 6, display: 'block',
  textTransform: 'uppercase',
};

/* ─── Hook responsive ─── */
const useIsDesktop = () => {
  const [desk, setDesk] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const h = () => setDesk(window.innerWidth >= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return desk;
};

/* ─── Lógica compartida ─── */
const useUsuarios = () => {
  const [usuarios, setUsuarios]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [stats, setStats]           = useState({ total:0, activos:0, mozos:0, staff:0 });
  const [filtros, setFiltros]       = useState({ rol:'todos', estado:'todos', busqueda:'' });
  const [showForm, setShowForm]     = useState(false);
  const [showPass, setShowPass]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [formData, setFormData]     = useState({ nombre:'', email:'', password:'', rol:'mozo', activo:true });
  const [passData, setPassData]     = useState({ usuarioId:null, nuevaPassword:'', confirmarPassword:'' });

  const calcStats = useCallback((data) => {
    setStats({
      total:   data.length,
      activos: data.filter(u => u.activo).length,
      mozos:   data.filter(u => u.rol==='mozo').length,
      staff:   data.filter(u => u.rol === 'administrador').length,
    });
  }, []);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const r = await authService.getUsers();
      const data = r.data.data || [];
      setUsuarios(data);
      calcStats(data);
    } catch { toast.error('Error al cargar usuarios'); }
    finally { setLoading(false); }
  }, [calcStats]);

  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const filtrados = (() => {
    let list = [...usuarios];
    if (filtros.rol !== 'todos')        list = list.filter(u => u.rol === filtros.rol);
    if (filtros.estado === 'activos')   list = list.filter(u => u.activo);
    if (filtros.estado === 'inactivos') list = list.filter(u => !u.activo);
    if (filtros.busqueda) {
      const q = filtros.busqueda.toLowerCase();
      list = list.filter(u => u.nombre.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  })();

  const openNew = () => {
    setEditing(null);
    setFormData({ nombre:'', email:'', password:'', rol:'mozo', activo:true });
    setShowForm(true);
  };

  const openEdit = (u) => {
    setEditing(u);
    const dniVal = u.email?.endsWith('@sirer.pe') ? u.email.replace('@sirer.pe','') : u.email;
    setFormData({ nombre:dniVal, email:u.email, password:'', rol:u.rol, activo:u.activo });
    setShowForm(true);
  };

  const openPassword = (u) => {
    setPassData({ usuarioId: u.id, nuevaPassword:'', confirmarPassword:'' });
    setShowPass(true);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) { toast.error('El DNI es requerido'); return; }
    if (!editing && !formData.password) { toast.error('La contraseña es requerida'); return; }
    setSaving(true);
    try {
      const payload = { ...formData };
      if (editing && !payload.password) delete payload.password;
      if (editing) { await authService.updateUser(editing.id, payload); toast.success('Usuario actualizado'); }
      else         { await authService.register(payload);               toast.success('Usuario creado');      }
      setShowForm(false);
      fetchUsuarios();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleToggle = async (u) => {
    try {
      await authService.toggleUserStatus(u.id, !u.activo);
      toast.success(`Usuario ${!u.activo ? 'activado' : 'desactivado'}`);
      fetchUsuarios();
    } catch { toast.error('Error al cambiar estado'); }
  };

  const handleChangePassword = async () => {
    if (!passData.nuevaPassword)                              { toast.error('Ingresa la contraseña'); return; }
    if (passData.nuevaPassword.length < 6)                   { toast.error('Mínimo 6 caracteres');   return; }
    if (passData.nuevaPassword !== passData.confirmarPassword){ toast.error('No coinciden');           return; }
    setSaving(true);
    try {
      await authService.changePassword(passData.usuarioId, { nuevaPassword: passData.nuevaPassword });
      toast.success('Contraseña actualizada');
      setShowPass(false);
    } catch { toast.error('Error al cambiar contraseña'); }
    finally { setSaving(false); }
  };

  const passOk = passData.nuevaPassword.length >= 6 && passData.nuevaPassword === passData.confirmarPassword;

  return { usuarios, loading, saving, stats, filtros, setFiltros, filtrados, showForm, setShowForm, showPass, setShowPass, editing, formData, setFormData, passData, setPassData, passOk, openNew, openEdit, openPassword, handleSubmit, handleToggle, handleChangePassword, fetchUsuarios };
};

/* ══════════════════════════════════════════════
   COMPONENTES COMPARTIDOS
══════════════════════════════════════════════ */
const ROLES_FILTRO = [
  { value:'todos',         label:'Todos', icon:'fa-users'    },
  { value:'administrador', label:'Admin', icon:'fa-crown'    },
  { value:'mozo',          label:'Mozo',  icon:'fa-user-tie' },
];
const ROLES_FORM = [
  { value:'mozo',          label:'Mozo',  icon:'fa-user-tie', color:'#0ea5e9' },
  { value:'administrador', label:'Admin', icon:'fa-crown',    color: A        },
];
const ESTADOS_FILTRO = [
  { value:'todos',     label:'Todos',     icon:'fa-list'         },
  { value:'activos',   label:'Activos',   icon:'fa-circle-check' },
  { value:'inactivos', label:'Inactivos', icon:'fa-circle-xmark' },
];

/* Campos comunes del formulario */
const FormFields = ({ formData, setFormData, editing }) => (
  <>
    {/* DNI */}
    <div style={{ marginBottom: 16 }}>
      <label style={lbl}>DNI *</label>
      <div style={{ position:'relative' }}>
        <i className="fas fa-id-card" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:13 }} />
        <input style={{ ...inp, paddingLeft:36 }} type="text" inputMode="numeric" placeholder="Ej: 12345678"
          value={formData.nombre}
          onChange={e => {
            const dni = e.target.value.replace(/\D/g,'').slice(0,8);
            setFormData(f => ({ ...f, nombre:dni, email: dni ? `${dni}@sirer.pe` : '' }));
          }}
          maxLength={8}
        />
      </div>
      {formData.nombre && (
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:5, padding:'5px 10px', background:A+'10', borderRadius:8 }}>
          <i className="fas fa-envelope" style={{ color:A, fontSize:11 }} />
          <span style={{ fontSize:12, color:A, fontWeight:600 }}>Login: {formData.nombre}@sirer.pe</span>
        </div>
      )}
    </div>

    {/* Contraseña */}
    <div style={{ marginBottom: 16 }}>
      <label style={lbl}>{editing ? 'Contraseña (vacío = mantener)' : 'Contraseña *'}</label>
      <div style={{ position:'relative' }}>
        <i className="fas fa-lock" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:13 }} />
        <input style={{ ...inp, paddingLeft:36 }} type="password" placeholder="Mínimo 6 caracteres"
          value={formData.password}
          onChange={e => setFormData(f => ({ ...f, password:e.target.value }))}
          required={!editing}
        />
      </div>
    </div>

    {/* Rol */}
    <div style={{ marginBottom: 16 }}>
      <label style={lbl}>Rol *</label>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {ROLES_FORM.map(r => {
          const active = formData.rol === r.value;
          return (
            <button key={r.value} type="button" onClick={() => setFormData(f => ({ ...f, rol:r.value }))}
              style={{ padding:'12px 8px', border:`2px solid ${active ? r.color : '#e2e8f0'}`, borderRadius:12, background: active ? r.color+'12' : '#f8fafc', cursor:'pointer', fontFamily:'inherit', display:'flex', flexDirection:'column', alignItems:'center', gap:5, transition:'all 0.15s' }}>
              <div style={{ width:36, height:36, borderRadius:10, background: active ? r.color+'20' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className={`fas ${r.icon}`} style={{ color: active ? r.color : '#94a3b8', fontSize:16 }} />
              </div>
              <span style={{ fontSize:12, fontWeight:700, color: active ? r.color : '#64748b' }}>{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>

    {/* Estado — solo en edición */}
    {editing && (
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Estado</label>
        <div onClick={() => setFormData(f => ({ ...f, activo:!f.activo }))}
          style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', borderRadius:12, cursor:'pointer', background: formData.activo ? '#f0fdf4' : '#fef2f2', border:`1.5px solid ${formData.activo ? '#22c55e' : '#ef4444'}30`, transition:'all 0.2s' }}>
          <i className={`fas ${formData.activo ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ color: formData.activo ? '#22c55e' : '#ef4444', fontSize:20 }} />
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:14, color: formData.activo ? '#16a34a' : '#dc2626' }}>{formData.activo ? 'Activo' : 'Inactivo'}</div>
            <div style={{ fontSize:11, color:'#94a3b8' }}>{formData.activo ? 'Puede iniciar sesión' : 'Sin acceso al sistema'}</div>
          </div>
          <div style={{ width:44, height:24, borderRadius:12, background: formData.activo ? '#22c55e' : '#cbd5e1', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
            <div style={{ position:'absolute', top:2, width:20, height:20, background:'#fff', borderRadius:'50%', left: formData.activo ? 22 : 2, transition:'left 0.2s', boxShadow:'0 1px 4px rgba(0,0,0,0.2)' }} />
          </div>
        </div>
      </div>
    )}
  </>
);

/* Campos de contraseña */
const PassFields = ({ passData, setPassData, passOk }) => (
  <>
    <div style={{ marginBottom: 14 }}>
      <label style={lbl}>Nueva Contraseña *</label>
      <div style={{ position:'relative' }}>
        <i className="fas fa-lock" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:13 }} />
        <input style={{ ...inp, paddingLeft:36 }} type="password" placeholder="Mínimo 6 caracteres"
          value={passData.nuevaPassword}
          onChange={e => setPassData(p => ({ ...p, nuevaPassword:e.target.value }))}
        />
      </div>
    </div>
    <div style={{ marginBottom: 14 }}>
      <label style={lbl}>Confirmar Contraseña *</label>
      <div style={{ position:'relative' }}>
        <i className="fas fa-lock-open" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:13 }} />
        <input
          style={{ ...inp, paddingLeft:36, borderColor: passData.confirmarPassword ? (passOk ? '#22c55e' : '#ef4444') : '#e2e8f0' }}
          type="password" placeholder="Repite la contraseña"
          value={passData.confirmarPassword}
          onChange={e => setPassData(p => ({ ...p, confirmarPassword:e.target.value }))}
        />
      </div>
      {passData.confirmarPassword && (
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:5, fontSize:12, fontWeight:600, color: passOk ? '#22c55e' : '#ef4444' }}>
          <i className={`fas ${passOk ? 'fa-circle-check' : 'fa-exclamation-circle'}`} />
          {passOk ? 'Las contraseñas coinciden' : 'No coinciden'}
        </div>
      )}
    </div>
  </>
);

/* ══════════════════════════════════════════════
   MOBILE
══════════════════════════════════════════════ */

/* Bottom sheet */
const Sheet = ({ open, onClose, title, children, footer }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(15,23,42,0.6)', display:'flex', alignItems:'flex-end', animation:'fadeIn 0.2s ease', backdropFilter:'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ width:'100%', background:'#fff', borderRadius:'24px 24px 0 0', maxHeight:'93vh', display:'flex', flexDirection:'column', animation:'slideUp 0.28s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ textAlign:'center', paddingTop:10, paddingBottom:2 }}>
          <div style={{ width:40, height:4, background:'#cbd5e1', borderRadius:4, display:'inline-block' }} />
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 20px 14px', borderBottom:'1px solid #f1f5f9' }}>
          <span style={{ fontWeight:800, fontSize:17, color:DARK }}>{title}</span>
          <button onClick={onClose} style={{ width:32, height:32, borderRadius:'50%', background:'#f1f5f9', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
            <i className="fas fa-times" style={{ fontSize:13 }} />
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px 32px', borderTop:'1px solid #f1f5f9' }}>{footer}</div>}
      </div>
    </div>
  );
};

/* Card usuario (mobile) */
const UsuarioCard = ({ usuario, onTap }) => {
  const r = ROL[usuario.rol] || { label:usuario.rol, color:'#64748b', bg:'#f1f5f9', icon:'fa-user' };
  const [pressed, setPressed] = useState(false);
  return (
    <div onClick={() => onTap(usuario)}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      style={{ background:'#fff', borderRadius:18, padding:'14px 16px', marginBottom:10, border:`1.5px solid ${usuario.activo ? '#f1f5f9' : '#fee2e2'}`, boxShadow: pressed ? '0 1px 4px rgba(0,0,0,0.05)' : '0 2px 10px rgba(0,0,0,0.07)', transform: pressed ? 'scale(0.98)' : 'scale(1)', transition:'transform 0.12s, box-shadow 0.12s', cursor:'pointer', opacity: usuario.activo ? 1 : 0.65, display:'flex', alignItems:'center', gap:14 }}>
      <div style={{ width:52, height:52, borderRadius:16, flexShrink:0, background:r.bg, border:`2px solid ${r.color}30`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
        <i className={`fas ${r.icon}`} style={{ color:r.color, fontSize:20 }} />
        <div style={{ position:'absolute', bottom:-2, right:-2, width:14, height:14, borderRadius:'50%', background: usuario.activo ? '#22c55e' : '#ef4444', border:'2px solid #fff' }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontWeight:700, fontSize:15, color:DARK, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{usuario.nombre}</div>
        <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
          <span style={{ background:r.color+'18', color:r.color, borderRadius:20, padding:'2px 10px', fontSize:11, fontWeight:700 }}>{r.label}</span>
          <span style={{ fontSize:11, color:'#94a3b8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{usuario.email}</span>
        </div>
      </div>
      <i className="fas fa-chevron-right" style={{ color:'#cbd5e1', fontSize:13, flexShrink:0 }} />
    </div>
  );
};

/* Detail sheet (mobile) */
const UserDetailSheet = ({ usuario, onClose, onEdit, onPassword, onToggle }) => {
  if (!usuario) return null;
  const r = ROL[usuario.rol] || { label:usuario.rol, color:'#64748b', bg:'#f1f5f9', icon:'fa-user' };
  const actions = [
    { label:'Editar usuario',      icon:'fa-pen',        color:A,        bg:'#eef2ff', fn:onEdit     },
    { label:'Cambiar contraseña',  icon:'fa-key',        color:'#f59e0b', bg:'#fffbeb', fn:onPassword },
    { label: usuario.activo ? 'Desactivar usuario' : 'Activar usuario',
      icon:  usuario.activo ? 'fa-user-slash' : 'fa-user-check',
      color: usuario.activo ? '#ef4444' : '#22c55e',
      bg:    usuario.activo ? '#fef2f2' : '#f0fdf4',
      fn: onToggle },
  ];
  return (
    <Sheet open title="Gestionar usuario" onClose={onClose}>
      <div style={{ display:'flex', alignItems:'center', gap:16, paddingBottom:20, borderBottom:'1px solid #f1f5f9', marginBottom:20 }}>
        <div style={{ width:64, height:64, borderRadius:20, background:r.bg, border:`2px solid ${r.color}30`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <i className={`fas ${r.icon}`} style={{ color:r.color, fontSize:26 }} />
        </div>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:800, fontSize:18, color:DARK }}>{usuario.nombre}</div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:5, flexWrap:'wrap' }}>
            <span style={{ background:r.color+'18', color:r.color, borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700 }}>{r.label}</span>
            <span style={{ background: usuario.activo ? '#dcfce7' : '#fee2e2', color: usuario.activo ? '#16a34a' : '#dc2626', borderRadius:20, padding:'3px 12px', fontSize:12, fontWeight:700 }}>
              <i className={`fas ${usuario.activo ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ marginRight:4, fontSize:10 }} />
              {usuario.activo ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{usuario.email}</div>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        {actions.map((a,i) => (
          <button key={i} onClick={a.fn} style={{ display:'flex', alignItems:'center', gap:16, padding:'15px 18px', borderRadius:16, border:'none', background:a.bg, cursor:'pointer', textAlign:'left', width:'100%', fontFamily:'inherit' }}>
            <div style={{ width:42, height:42, borderRadius:14, background:a.color+'20', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={`fas ${a.icon}`} style={{ color:a.color, fontSize:17 }} />
            </div>
            <span style={{ fontWeight:700, fontSize:15, color:a.color, flex:1 }}>{a.label}</span>
            <i className="fas fa-chevron-right" style={{ color:a.color+'60', fontSize:12 }} />
          </button>
        ))}
      </div>
    </Sheet>
  );
};

const MobileLayout = ({ d }) => {
  const [selected, setSelected] = useState(null);

  const handleEdit = () => {
    const u = selected; setSelected(null);
    setTimeout(() => d.openEdit(u), 200);
  };
  const handlePassOpen = () => {
    const u = selected; setSelected(null);
    setTimeout(() => d.openPassword(u), 200);
  };
  const handleToggle = () => {
    const u = selected; setSelected(null);
    d.handleToggle(u);
  };

  return (
    <div style={{ background:'#f1f5f9', minHeight:'100vh', paddingBottom:100 }}>
      {/* Header sticky */}
      <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'14px 16px', position:'sticky', top:58, zIndex:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
          <div style={{ width:38, height:38, borderRadius:12, background:A+'15', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="fas fa-users" style={{ color:A, fontSize:16 }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, fontSize:15, color:DARK }}>Usuarios</div>
            <div style={{ fontSize:11, color:'#94a3b8' }}>{d.stats.activos} activos de {d.stats.total}</div>
          </div>
          <button onClick={d.fetchUsuarios} disabled={d.loading} style={{ width:34, height:34, borderRadius:10, border:'none', cursor:'pointer', background:A+'15', color:A, fontSize:13 }}>
            <i className={`fas ${d.loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} />
          </button>
        </div>
        {/* Búsqueda */}
        <div style={{ position:'relative', marginBottom:10 }}>
          <i className="fas fa-search" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:13 }} />
          <input type="text" placeholder="Buscar nombre o DNI..." value={d.filtros.busqueda}
            onChange={e => d.setFiltros(f => ({ ...f, busqueda:e.target.value }))}
            style={{ ...inp, paddingLeft:38, marginBottom:0 }}
          />
          {d.filtros.busqueda && (
            <button onClick={() => d.setFiltros(f => ({ ...f, busqueda:'' }))} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:14 }}>
              <i className="fas fa-times-circle" />
            </button>
          )}
        </div>
        {/* Filtro rol */}
        <div style={{ display:'flex', gap:6, overflowX:'auto', paddingBottom:2, scrollbarWidth:'none' }}>
          {ROLES_FILTRO.map(r => {
            const active = d.filtros.rol === r.value;
            return (
              <button key={r.value} onClick={() => d.setFiltros(f => ({ ...f, rol:r.value }))}
                style={{ flexShrink:0, display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:20, border:'none', cursor:'pointer', background: active ? A : '#f1f5f9', color: active ? '#fff' : '#64748b', fontWeight:700, fontSize:12, boxShadow: active ? `0 2px 8px ${A}40` : 'none', transition:'all 0.15s' }}>
                <i className={`fas ${r.icon}`} style={{ fontSize:10 }} />{r.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding:'14px 16px 0' }}>
        {/* Stats */}
        <div style={{ display:'flex', gap:10, marginBottom:12 }}>
          {[
            { label:'Total',   value:d.stats.total,   color:A,        icon:'fa-users'       },
            { label:'Activos', value:d.stats.activos,  color:'#22c55e', icon:'fa-circle-check'},
            { label:'Mozos',   value:d.stats.mozos,   color:'#0ea5e9', icon:'fa-user-tie'   },
            { label:'Staff',   value:d.stats.staff,   color:'#f59e0b', icon:'fa-fire'        },
          ].map(s => (
            <div key={s.label} style={{ flex:1, background:'#fff', borderRadius:14, padding:'10px 6px', textAlign:'center', boxShadow:'0 1px 6px rgba(0,0,0,0.06)' }}>
              <i className={`fas ${s.icon}`} style={{ color:s.color, fontSize:13, display:'block', marginBottom:4 }} />
              <div style={{ fontSize:20, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:9, color:'#94a3b8', fontWeight:700, letterSpacing:0.5, marginTop:2 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filtro estado */}
        <div style={{ display:'flex', gap:6, marginBottom:14 }}>
          {ESTADOS_FILTRO.map(e => {
            const active = d.filtros.estado === e.value;
            return (
              <button key={e.value} onClick={() => d.setFiltros(f => ({ ...f, estado:e.value }))}
                style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'9px 0', borderRadius:12, border:'none', cursor:'pointer', background: active ? DARK : '#fff', color: active ? '#fff' : '#64748b', fontWeight:700, fontSize:12, boxShadow: active ? '0 2px 8px rgba(15,23,42,0.3)' : '0 1px 4px rgba(0,0,0,0.06)', transition:'all 0.15s' }}>
                <i className={`fas ${e.icon}`} style={{ fontSize:11 }} />{e.label}
              </button>
            );
          })}
        </div>

        {/* Lista */}
        {d.loading ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize:28, display:'block', marginBottom:12, color:A }} />
            <div style={{ fontSize:14 }}>Cargando usuarios...</div>
          </div>
        ) : d.filtrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 20px', color:'#94a3b8' }}>
            <div style={{ width:72, height:72, borderRadius:24, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <i className="fas fa-users" style={{ fontSize:28, color:'#cbd5e1' }} />
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:'#475569', marginBottom:6 }}>Sin usuarios</div>
            <div style={{ fontSize:13 }}>Cambia los filtros o agrega uno nuevo</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginBottom:10, letterSpacing:0.5 }}>
              {d.filtrados.length} USUARIO{d.filtrados.length!==1?'S':''}
            </div>
            {d.filtrados.map(u => <UsuarioCard key={u.id} usuario={u} onTap={setSelected} />)}
          </>
        )}
      </div>

      {/* FAB */}
      <button onClick={d.openNew} style={{ position:'fixed', bottom:86, right:20, zIndex:900, width:56, height:56, borderRadius:'50%', background:`linear-gradient(135deg,#4f46e5,#818cf8)`, color:'#fff', border:'none', boxShadow:`0 4px 20px ${A}55`, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <i className="fas fa-plus" style={{ fontSize:20 }} />
      </button>

      {/* Detail sheet */}
      {selected && <UserDetailSheet usuario={selected} onClose={() => setSelected(null)} onEdit={handleEdit} onPassword={handlePassOpen} onToggle={handleToggle} />}

      {/* Form sheet */}
      <Sheet open={d.showForm} onClose={() => d.setShowForm(false)} title={d.editing ? 'Editar Usuario' : 'Nuevo Usuario'}
        footer={
          <button onClick={d.handleSubmit} disabled={d.saving} style={{ width:'100%', padding:15, background: d.saving ? '#94a3b8' : `linear-gradient(135deg,#4f46e5,#818cf8)`, color:'#fff', border:'none', borderRadius:14, fontWeight:800, fontSize:16, cursor: d.saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {d.saving ? <><i className="fas fa-spinner fa-spin" />Guardando...</> : d.editing ? <><i className="fas fa-save" />Actualizar</> : <><i className="fas fa-user-plus" />Crear Usuario</>}
          </button>
        }>
        <FormFields formData={d.formData} setFormData={d.setFormData} editing={d.editing} />
      </Sheet>

      {/* Pass sheet */}
      <Sheet open={d.showPass} onClose={() => d.setShowPass(false)} title="Cambiar Contraseña"
        footer={
          <button onClick={d.handleChangePassword} disabled={d.saving || !d.passOk} style={{ width:'100%', padding:15, background:(!d.passOk||d.saving) ? '#94a3b8' : 'linear-gradient(135deg,#f59e0b,#fbbf24)', color:'#fff', border:'none', borderRadius:14, fontWeight:800, fontSize:16, cursor:(!d.passOk||d.saving) ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {d.saving ? <><i className="fas fa-spinner fa-spin" />Guardando...</> : <><i className="fas fa-key" />Cambiar Contraseña</>}
          </button>
        }>
        <div style={{ display:'flex', alignItems:'center', gap:12, background:'#f8fafc', borderRadius:12, padding:'11px 14px', marginBottom:18 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:A+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="fas fa-user" style={{ color:A, fontSize:15 }} />
          </div>
          <div>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase' }}>Usuario</div>
            <div style={{ fontSize:14, fontWeight:700, color:DARK }}>{d.usuarios.find(u => u.id===d.passData.usuarioId)?.nombre||'—'}</div>
          </div>
        </div>
        <PassFields passData={d.passData} setPassData={d.setPassData} passOk={d.passOk} />
      </Sheet>
    </div>
  );
};

/* ══════════════════════════════════════════════
   DESKTOP
══════════════════════════════════════════════ */

/* Modal centrado (desktop) */
const Modal = ({ open, onClose, title, children, footer, width = 520 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(15,23,42,0.5)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(4px)', animation:'fadeIn 0.2s ease', padding:'20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:width, maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,0.2)', animation:'slideUp 0.25s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 16px', borderBottom:'1px solid #f1f5f9' }}>
          <span style={{ fontWeight:800, fontSize:18, color:DARK }}>{title}</span>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', background:'#f1f5f9', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}>
            <i className="fas fa-times" style={{ fontSize:14 }} />
          </button>
        </div>
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>{children}</div>
        {footer && <div style={{ padding:'16px 24px 20px', borderTop:'1px solid #f1f5f9' }}>{footer}</div>}
      </div>
    </div>
  );
};

/* Fila de tabla (desktop) */
const TableRow = ({ usuario, onEdit, onPassword, onToggle }) => {
  const r = ROL[usuario.rol] || { label:usuario.rol, color:'#64748b', bg:'#f1f5f9', icon:'fa-user' };
  const [hov, setHov] = useState(false);

  return (
    <tr onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: hov ? '#fafbff' : '#fff', transition:'background 0.1s', borderBottom:'1px solid #f1f5f9', opacity: usuario.activo ? 1 : 0.6 }}>

      {/* Usuario */}
      <td style={{ padding:'14px 20px', verticalAlign:'middle' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:44, height:44, borderRadius:14, flexShrink:0, background:r.bg, border:`2px solid ${r.color}25`, display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
            <i className={`fas ${r.icon}`} style={{ color:r.color, fontSize:18 }} />
            <div style={{ position:'absolute', bottom:-2, right:-2, width:12, height:12, borderRadius:'50%', background: usuario.activo ? '#22c55e' : '#ef4444', border:'2px solid #fff' }} />
          </div>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:DARK, whiteSpace:'nowrap' }}>{usuario.nombre}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:2 }}>{usuario.email}</div>
          </div>
        </div>
      </td>

      {/* Rol */}
      <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, background:r.color+'15', color:r.color, borderRadius:20, padding:'5px 12px', fontWeight:700, fontSize:13 }}>
          <i className={`fas ${r.icon}`} style={{ fontSize:11 }} />{r.label}
        </span>
      </td>

      {/* Estado */}
      <td style={{ padding:'14px 16px', verticalAlign:'middle' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, background: usuario.activo ? '#dcfce7' : '#fee2e2', color: usuario.activo ? '#16a34a' : '#dc2626', borderRadius:20, padding:'5px 12px', fontWeight:700, fontSize:13 }}>
          <i className={`fas ${usuario.activo ? 'fa-circle-check' : 'fa-circle-xmark'}`} style={{ fontSize:11 }} />
          {usuario.activo ? 'Activo' : 'Inactivo'}
        </span>
      </td>

      {/* Acciones */}
      <td style={{ padding:'14px 20px', verticalAlign:'middle' }}>
        <div style={{ display:'flex', gap:6, opacity: hov ? 1 : 0.4, transition:'opacity 0.15s' }}>
          <button onClick={() => onEdit(usuario)} title="Editar"
            style={{ width:34, height:34, borderRadius:10, border:'none', cursor:'pointer', background:'#eef2ff', color:A, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#e0e7ff'}
            onMouseLeave={e => e.currentTarget.style.background='#eef2ff'}>
            <i className="fas fa-pen" />
          </button>
          <button onClick={() => onPassword(usuario)} title="Cambiar contraseña"
            style={{ width:34, height:34, borderRadius:10, border:'none', cursor:'pointer', background:'#fffbeb', color:'#d97706', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background='#fef3c7'}
            onMouseLeave={e => e.currentTarget.style.background='#fffbeb'}>
            <i className="fas fa-key" />
          </button>
          <button onClick={() => onToggle(usuario)} title={usuario.activo ? 'Desactivar' : 'Activar'}
            style={{ width:34, height:34, borderRadius:10, border:'none', cursor:'pointer', background: usuario.activo ? '#fef2f2' : '#f0fdf4', color: usuario.activo ? '#ef4444' : '#22c55e', fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', transition:'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = usuario.activo ? '#fee2e2' : '#dcfce7'}
            onMouseLeave={e => e.currentTarget.style.background = usuario.activo ? '#fef2f2' : '#f0fdf4'}>
            <i className={`fas ${usuario.activo ? 'fa-user-slash' : 'fa-user-check'}`} />
          </button>
        </div>
      </td>
    </tr>
  );
};

const DesktopLayout = ({ d }) => {
  return (
    <div style={{ minHeight:'100vh', background:'#f1f5f9', padding:'32px 36px 48px' }}>

      {/* ── Encabezado ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:900, color:DARK, display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:A+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <i className="fas fa-users" style={{ color:A, fontSize:20 }} />
            </div>
            Gestión de Usuarios
          </h1>
          <div style={{ fontSize:13, color:'#94a3b8', marginTop:6, marginLeft:56 }}>
            {d.stats.activos} activos · {d.stats.total} en total
          </div>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={d.fetchUsuarios} disabled={d.loading}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 18px', borderRadius:12, border:'1px solid #e2e8f0', background:'#fff', color:'#64748b', fontWeight:600, fontSize:14, cursor:'pointer', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <i className={`fas ${d.loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} />
            Actualizar
          </button>
          <button onClick={d.openNew}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', borderRadius:12, border:'none', background:`linear-gradient(135deg,#4f46e5,#818cf8)`, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', boxShadow:`0 4px 14px ${A}40` }}>
            <i className="fas fa-user-plus" />
            Nuevo Usuario
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total usuarios',  value:d.stats.total,   color:A,        icon:'fa-users',        sub:'registrados' },
          { label:'Usuarios activos', value:d.stats.activos, color:'#22c55e', icon:'fa-circle-check', sub:'con acceso'   },
          { label:'Mozos',           value:d.stats.mozos,   color:'#0ea5e9', icon:'fa-user-tie',     sub:'en sala'      },
          { label:'Admins',          value:d.stats.staff,   color:'#818cf8', icon:'fa-crown',        sub:'administradores'  },
        ].map(s => (
          <div key={s.label}
            style={{ background:'#fff', borderRadius:20, padding:'20px 22px', boxShadow:'0 2px 12px rgba(0,0,0,0.07)', position:'relative', overflow:'hidden', transition:'transform 0.15s, box-shadow 0.15s', cursor:'default' }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.07)'; }}
          >
            <div style={{ position:'absolute', right:-20, bottom:-20, width:80, height:80, borderRadius:'50%', background:s.color+'12' }} />
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:0.8, textTransform:'uppercase' }}>{s.label}</div>
              <div style={{ width:38, height:38, borderRadius:12, background:s.color+'18', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className={`fas ${s.icon}`} style={{ color:s.color, fontSize:16 }} />
              </div>
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:DARK, lineHeight:1, letterSpacing:-1 }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:6 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div style={{ background:'#fff', borderRadius:18, padding:'16px 20px', marginBottom:16, boxShadow:'0 1px 6px rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
        {/* Búsqueda */}
        <div style={{ position:'relative', flex:'1 1 260px', minWidth:200 }}>
          <i className="fas fa-search" style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', color:'#94a3b8', fontSize:13 }} />
          <input type="text" placeholder="Buscar nombre o DNI..." value={d.filtros.busqueda}
            onChange={e => d.setFiltros(f => ({ ...f, busqueda:e.target.value }))}
            style={{ ...inp, paddingLeft:38, background:'#f8fafc' }}
          />
          {d.filtros.busqueda && (
            <button onClick={() => d.setFiltros(f => ({ ...f, busqueda:'' }))} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94a3b8' }}>
              <i className="fas fa-times-circle" />
            </button>
          )}
        </div>

        {/* Separador */}
        <div style={{ width:1, height:32, background:'#e2e8f0', flexShrink:0 }} />

        {/* Filtro rol */}
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {ROLES_FILTRO.map(r => {
            const active = d.filtros.rol === r.value;
            return (
              <button key={r.value} onClick={() => d.setFiltros(f => ({ ...f, rol:r.value }))}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', background: active ? A : '#f1f5f9', color: active ? '#fff' : '#64748b', fontWeight:700, fontSize:13, boxShadow: active ? `0 2px 8px ${A}40` : 'none', transition:'all 0.15s', whiteSpace:'nowrap' }}>
                <i className={`fas ${r.icon}`} style={{ fontSize:11 }} />{r.label}
              </button>
            );
          })}
        </div>

        {/* Separador */}
        <div style={{ width:1, height:32, background:'#e2e8f0', flexShrink:0 }} />

        {/* Filtro estado */}
        <div style={{ display:'flex', gap:6, flexShrink:0 }}>
          {ESTADOS_FILTRO.map(e => {
            const active = d.filtros.estado === e.value;
            return (
              <button key={e.value} onClick={() => d.setFiltros(f => ({ ...f, estado:e.value }))}
                style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, border:'none', cursor:'pointer', background: active ? DARK : '#f1f5f9', color: active ? '#fff' : '#64748b', fontWeight:700, fontSize:13, transition:'all 0.15s', whiteSpace:'nowrap' }}>
                <i className={`fas ${e.icon}`} style={{ fontSize:11 }} />{e.label}
              </button>
            );
          })}
        </div>

        {/* Contador */}
        <div style={{ marginLeft:'auto', fontSize:13, color:'#94a3b8', fontWeight:600, flexShrink:0 }}>
          {d.filtrados.length} resultado{d.filtrados.length!==1?'s':''}
        </div>
      </div>

      {/* ── Tabla ── */}
      <div style={{ background:'#fff', borderRadius:20, overflow:'hidden', boxShadow:'0 2px 16px rgba(0,0,0,0.07)' }}>
        {d.loading ? (
          <div style={{ textAlign:'center', padding:'80px 0', color:'#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize:32, display:'block', marginBottom:14, color:A }} />
            <div style={{ fontSize:15 }}>Cargando usuarios...</div>
          </div>
        ) : d.filtrados.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px', color:'#94a3b8' }}>
            <div style={{ width:80, height:80, borderRadius:28, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="fas fa-users" style={{ fontSize:32, color:'#cbd5e1' }} />
            </div>
            <div style={{ fontSize:17, fontWeight:700, color:'#475569', marginBottom:8 }}>Sin resultados</div>
            <div style={{ fontSize:14 }}>Ajusta los filtros o crea un nuevo usuario</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'#f8fafc', borderBottom:'2px solid #e2e8f0' }}>
                {['Usuario','Rol','Estado','Acciones'].map((h,i) => (
                  <th key={h} style={{ padding:'12px 20px', textAlign:'left', fontSize:11, fontWeight:700, color:'#64748b', letterSpacing:0.8, textTransform:'uppercase', whiteSpace:'nowrap', paddingLeft: i===0 ? 20 : 16 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.filtrados.map(u => (
                <TableRow key={u.id} usuario={u}
                  onEdit={d.openEdit}
                  onPassword={d.openPassword}
                  onToggle={d.handleToggle}
                />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Modal crear/editar ── */}
      <Modal open={d.showForm} onClose={() => d.setShowForm(false)} title={d.editing ? 'Editar Usuario' : 'Nuevo Usuario'}
        footer={
          <button onClick={d.handleSubmit} disabled={d.saving}
            style={{ width:'100%', padding:14, background: d.saving ? '#94a3b8' : `linear-gradient(135deg,#4f46e5,#818cf8)`, color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:15, cursor: d.saving ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow: d.saving ? 'none' : `0 4px 14px ${A}40` }}>
            {d.saving ? <><i className="fas fa-spinner fa-spin" />Guardando...</> : d.editing ? <><i className="fas fa-save" />Actualizar Usuario</> : <><i className="fas fa-user-plus" />Crear Usuario</>}
          </button>
        }>
        <FormFields formData={d.formData} setFormData={d.setFormData} editing={d.editing} />
      </Modal>

      {/* ── Modal contraseña ── */}
      <Modal open={d.showPass} onClose={() => d.setShowPass(false)} title="Cambiar Contraseña" width={440}
        footer={
          <button onClick={d.handleChangePassword} disabled={d.saving || !d.passOk}
            style={{ width:'100%', padding:14, background:(!d.passOk||d.saving) ? '#94a3b8' : 'linear-gradient(135deg,#f59e0b,#fbbf24)', color:'#fff', border:'none', borderRadius:12, fontWeight:800, fontSize:15, cursor:(!d.passOk||d.saving) ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {d.saving ? <><i className="fas fa-spinner fa-spin" />Guardando...</> : <><i className="fas fa-key" />Cambiar Contraseña</>}
          </button>
        }>
        <div style={{ display:'flex', alignItems:'center', gap:14, background:'#f8fafc', borderRadius:14, padding:'14px 16px', marginBottom:20 }}>
          <div style={{ width:42, height:42, borderRadius:12, background:A+'15', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <i className="fas fa-user" style={{ color:A, fontSize:17 }} />
          </div>
          <div>
            <div style={{ fontSize:10, color:'#94a3b8', fontWeight:700, textTransform:'uppercase', marginBottom:2 }}>Usuario</div>
            <div style={{ fontSize:15, fontWeight:800, color:DARK }}>{d.usuarios.find(u=>u.id===d.passData.usuarioId)?.nombre||'—'}</div>
          </div>
        </div>
        <PassFields passData={d.passData} setPassData={d.setPassData} passOk={d.passOk} />
      </Modal>
    </div>
  );
};

/* ══════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════ */
const UsuariosManagement = () => {
  const isDesktop = useIsDesktop();
  const d = useUsuarios();
  return isDesktop ? <DesktopLayout d={d} /> : <MobileLayout d={d} />;
};

export default UsuariosManagement;
