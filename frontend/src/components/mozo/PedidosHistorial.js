import React, { useState, useEffect, useCallback } from 'react';
import { pedidosService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

/* ── Responsive ── */
const useIsDesktop = () => {
  const [desk, setDesk] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const h = () => setDesk(window.innerWidth >= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return desk;
};

const ESTADO = {
  nuevo:     { label:'Nuevo',     color:'#3b82f6', bg:'#eff6ff', border:'#bfdbfe', icon:'fa-circle-dot',   gradient:'linear-gradient(135deg,#2563eb,#3b82f6)' },
  preparado: { label:'Listo',     color:'#16a34a', bg:'#f0fdf4', border:'#86efac', icon:'fa-check-circle', gradient:'linear-gradient(135deg,#15803d,#22c55e)' },
  entregado: { label:'Entregado', color:'#6b7280', bg:'#f9fafb', border:'#d1d5db', icon:'fa-hand-holding', gradient:'linear-gradient(135deg,#4b5563,#6b7280)' },
  pagado:    { label:'Pagado',    color:'#7c3aed', bg:'#f5f3ff', border:'#c4b5fd', icon:'fa-credit-card',  gradient:'linear-gradient(135deg,#6d28d9,#7c3aed)' },
};

const CSS = `
  @keyframes fadeIn  { from{opacity:0}             to{opacity:1} }
  @keyframes slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes modalIn { from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
`;

const tiempoDesde = (fecha) => {
  if (!fecha) return '';
  const mins = Math.floor((Date.now() - new Date(fecha)) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

const Spin = ({ size=36, color='#dc2626' }) => (
  <div style={{ width:size, height:size, border:`3px solid #f0f2f5`, borderTop:`3px solid ${color}`, borderRadius:'50%', animation:'spin .75s linear infinite', flexShrink:0 }} />
);

/* ── Shared logic hook ── */
const useHistorial = (user) => {
  const [pedidos, setPedidos]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('hoy');
  const [stats, setStats]             = useState(null);

  const fetchPedidos = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (user.rol !== 'administrador') params.mozo_id = user.id;
      if (filtroEstado !== 'todos') params.estado = filtroEstado;
      if (filtroPeriodo === 'hoy') params.fecha_desde = new Date().toISOString().split('T')[0];
      else if (filtroPeriodo === 'semana') {
        const d = new Date(); d.setDate(d.getDate() - 7);
        params.fecha_desde = d.toISOString().split('T')[0];
      }
      const r = await pedidosService.getAll(params);
      const data = r.data.data || [];
      setPedidos(data);
      setStats({
        total:    data.length,
        listos:   data.filter(p => p.estado === 'preparado').length,
        ingresos: data.filter(p => p.estado === 'pagado').reduce((s,p)=>s+parseFloat(p.total),0),
      });
    } catch { toast.error('Error al cargar historial'); }
    finally  { setLoading(false); }
  }, [user, filtroEstado, filtroPeriodo]);

  useEffect(() => { fetchPedidos(); }, [fetchPedidos]);

  const marcarEntregado = async (id, cb) => {
    try {
      await pedidosService.changeStatus(id, 'entregado');
      toast.success('Pedido entregado');
      cb?.();
      fetchPedidos();
    } catch { toast.error('Error al actualizar'); }
  };

  return { pedidos, loading, stats, filtroEstado, setFiltroEstado, filtroPeriodo, setFiltroPeriodo, marcarEntregado, fetchPedidos };
};

/* ── Panel de detalle de pedido (reutilizable) ── */
const DetallePedido = ({ pedido, onClose, onEntregado }) => {
  const { C } = useTheme();
  if (!pedido) return null;
  const est   = ESTADO[pedido.estado] || { label:pedido.estado, color:'#9ca3af', bg:'#f9fafb', icon:'fa-circle', gradient:'#9ca3af' };
  const hora  = new Date(pedido.created_at).toLocaleTimeString('es-PE', { hour:'2-digit', minute:'2-digit' });
  const fecha = new Date(pedido.created_at).toLocaleDateString('es-PE', { day:'2-digit', month:'short', year:'numeric' });
  return (
    <>
      {/* Hero */}
      <div style={{ background:est.gradient, borderRadius:20, padding:'20px', marginBottom:16, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-20, right:-16, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.1)' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.75)', fontWeight:700, letterSpacing:1, marginBottom:4 }}>PEDIDO</div>
            <div style={{ fontSize:28, fontWeight:900, color:'#fff', lineHeight:1 }}>#{pedido.id}</div>
            <div style={{ fontSize:13, color:'rgba(255,255,255,.8)', marginTop:6, display:'flex', alignItems:'center', gap:6 }}>
              <i className="fas fa-table" style={{ fontSize:11 }} />Mesa {pedido.mesa?.numero}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.7)', fontWeight:600 }}>TOTAL</div>
            <div style={{ fontSize:26, fontWeight:900, color:'#fff', lineHeight:1.1 }}>S/ {parseFloat(pedido.total).toFixed(2)}</div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,.2)', borderRadius:20, padding:'4px 10px', marginTop:6, fontSize:11, fontWeight:700, color:'#fff' }}>
              <i className={`fas ${est.icon}`} style={{ fontSize:10 }} />{est.label}
            </div>
          </div>
        </div>
      </div>

      {/* Chips info */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        {[{icon:'fa-clock',label:hora},{icon:'fa-calendar',label:fecha},{icon:'fa-box',label:`${pedido.detalles?.length||0} ítems`}].map((c,i)=>(
          <div key={i} style={{ flex:1, background:C.surfaceAlt, borderRadius:12, padding:'8px 6px', textAlign:'center', border:`1px solid ${C.border}` }}>
            <i className={`fas ${c.icon}`} style={{ color:C.textMuted, fontSize:13, display:'block', marginBottom:3 }} />
            <div style={{ fontSize:12, fontWeight:700, color:C.textSub }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Productos */}
      <div style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:1, marginBottom:10 }}>PRODUCTOS</div>
      {pedido.detalles?.length>0 ? (
        <div style={{ background:C.surfaceAlt, borderRadius:16, border:`1px solid ${C.border}`, overflow:'hidden', marginBottom:14 }}>
          {pedido.detalles.map((d,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 16px', borderBottom:i<pedido.detalles.length-1?`1px solid ${C.border}`:'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:C.surfaceAlt2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:C.textMuted }}>{d.cantidad}×</div>
                <span style={{ fontSize:14, color:C.textSub, fontWeight:500 }}>{d.producto?.nombre}</span>
              </div>
              <span style={{ fontSize:14, fontWeight:700, color:C.text }}>S/ {parseFloat(d.subtotal).toFixed(2)}</span>
            </div>
          ))}
        </div>
      ) : <p style={{ color:'#94a3b8', fontSize:13 }}>Sin detalle disponible</p>}

      {pedido.observaciones&&(
        <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:14, padding:'12px 14px', marginBottom:14 }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#92400e', marginBottom:5, display:'flex', alignItems:'center', gap:5 }}><i className="fas fa-note-sticky" />OBSERVACIONES</div>
          <div style={{ fontSize:13, color:'#78350f' }}>{pedido.observaciones}</div>
        </div>
      )}

      {pedido.estado==='preparado'&&(
        <button onClick={()=>onEntregado(pedido.id, onClose)} style={{ width:'100%', padding:'14px', background:'linear-gradient(135deg,#15803d,#22c55e)', color:'#fff', border:'none', borderRadius:16, fontWeight:800, fontSize:15, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', boxShadow:'0 4px 16px rgba(22,163,74,.4)' }}>
          <i className="fas fa-check" />Marcar como Entregado
        </button>
      )}
    </>
  );
};

/* ════════════════════════════════════════
   LAYOUT MOBILE
════════════════════════════════════════ */

const Sheet = ({ open, onClose, title, subtitle, children }) => {
  const { C } = useTheme();
  if(!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:C.overlay, backdropFilter:'blur(4px)', animation:'fadeIn .2s ease' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1051, background:C.surface, borderRadius:'24px 24px 0 0', maxHeight:'90vh', display:'flex', flexDirection:'column', animation:'slideUp .3s cubic-bezier(.4,0,.2,1)', boxShadow:'0 -8px 40px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12 }}><div style={{ width:44, height:5, background:C.border, borderRadius:3 }} /></div>
        {title&&(
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.borderLight}` }}>
            <div>
              <div style={{ fontWeight:800, fontSize:19, color:C.text }}>{title}</div>
              {subtitle&&<div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', background:C.surfaceAlt2, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textMuted, fontSize:16 }}><i className="fas fa-times" /></button>
          </div>
        )}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>{children}</div>
        <div style={{ height:'max(8px,env(safe-area-inset-bottom))' }} />
      </div>
    </>
  );
};

const PedidoCardMobile = ({ pedido, onClick }) => {
  const est    = ESTADO[pedido.estado]||{label:pedido.estado,color:'#9ca3af',bg:'#f9fafb',border:'#e2e8f0',icon:'fa-circle',gradient:'#9ca3af'};
  const hora   = new Date(pedido.created_at).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
  const tiempo = tiempoDesde(pedido.created_at);
  const [pressed,setPressed]=useState(false);
  const esListo=pedido.estado==='preparado';
  const { C } = useTheme();
  return (
    <div onClick={onClick} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ background:C.surface, borderRadius:20, marginBottom:10, border:`1.5px solid ${esListo?'#86efac':C.border}`, boxShadow:pressed?'0 1px 4px rgba(0,0,0,.06)':esListo?'0 6px 20px rgba(22,163,74,.16)':'0 2px 12px rgba(0,0,0,.06)', cursor:'pointer', transform:pressed?'scale(.98)':'scale(1)', transition:'transform .1s, box-shadow .1s', overflow:'hidden' }}>
      {/* Barra de color superior */}
      <div style={{ height:4, background:est.gradient }} />
      <div style={{ padding:'13px 16px 14px', display:'flex', alignItems:'center', gap:12 }}>
        {/* Ícono */}
        <div style={{ width:46, height:46, borderRadius:14, background:est.bg, border:`1.5px solid ${est.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <i className={`fas ${est.icon}`} style={{ color:est.color, fontSize:18 }} />
        </div>
        {/* Info central */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
            <div style={{ fontWeight:800, fontSize:15, color:C.text }}>Mesa {pedido.mesa?.numero}</div>
            <div style={{ fontWeight:900, fontSize:16, color:'#16a34a' }}>S/ {parseFloat(pedido.total).toFixed(2)}</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ display:'inline-flex', alignItems:'center', gap:4, background:est.bg, border:`1px solid ${est.border}`, color:est.color, borderRadius:20, padding:'3px 9px', fontSize:11, fontWeight:700 }}>
                <i className={`fas ${est.icon}`} style={{ fontSize:9 }} />{est.label}
              </span>
              {esListo&&<span style={{ background:'#dcfce7', border:'1px solid #86efac', color:'#16a34a', borderRadius:20, padding:'3px 8px', fontSize:10, fontWeight:700, animation:'pulse 2s infinite' }}><i className="fas fa-bell" style={{ marginRight:3, fontSize:9 }} />Listo</span>}
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, color:C.textMuted }}>
              <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                <i className="fas fa-clock" style={{ fontSize:9 }} />{hora}
              </span>
              <span style={{ background:C.surfaceAlt, borderRadius:20, padding:'2px 7px', fontWeight:700, color:C.textMuted }}>
                {tiempo}
              </span>
            </div>
          </div>
        </div>
        <i className="fas fa-chevron-right" style={{ color:'#cbd5e1', fontSize:12, flexShrink:0 }} />
      </div>
    </div>
  );
};

const MobileLayout = ({ d }) => {
  const [pedidoDetalle, setPedidoDetalle] = useState(null);

  const PERIODOS=[
    { value:'hoy',    label:'Hoy',    icon:'fa-sun' },
    { value:'semana', label:'Semana', icon:'fa-calendar-week' },
    { value:'todos',  label:'Todo',   icon:'fa-history' },
  ];
  const ESTADOS_FILTRO=[
    { value:'todos',  label:'Todos',   icon:'fa-list'        },
    { value:'pagado', label:'Pagados', icon:'fa-credit-card' },
  ];

  return (
    <div>
      {d.stats?.listos>0&&(
        <div style={{ background:'linear-gradient(135deg,#15803d,#16a34a)', borderRadius:16, padding:'14px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:12, boxShadow:'0 4px 16px rgba(22,163,74,.3)' }}>
          <div style={{ width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="fas fa-bell" style={{ color:'#fff', fontSize:16 }} />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:800, color:'#fff', fontSize:14 }}>{d.stats.listos} pedido{d.stats.listos>1?'s':''} listo{d.stats.listos>1?'s':''} para entregar</div>
            <div style={{ fontSize:12, color:'rgba(255,255,255,.8)', marginTop:2 }}>Toca el pedido para marcarlo</div>
          </div>
        </div>
      )}

      {d.stats&&(
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
          <div style={{ background:'#eff6ff', borderRadius:18, padding:'16px 14px', border:'1.5px solid #bfdbfe', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#2563eb,#3b82f6)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="fas fa-clipboard-list" style={{ color:'#fff', fontSize:18 }} />
            </div>
            <div>
              <div style={{ fontSize:28, fontWeight:900, color:'#2563eb', lineHeight:1 }}>{d.stats.total}</div>
              <div style={{ fontSize:11, color:'#60a5fa', fontWeight:700, marginTop:2, letterSpacing:.5 }}>PEDIDOS</div>
            </div>
          </div>
          <div style={{ background:'#f5f3ff', borderRadius:18, padding:'16px 14px', border:'1.5px solid #c4b5fd', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:14, background:'linear-gradient(135deg,#6d28d9,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className="fas fa-coins" style={{ color:'#fff', fontSize:18 }} />
            </div>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:'#7c3aed', lineHeight:1 }}>S/{d.stats.ingresos.toFixed(0)}</div>
              <div style={{ fontSize:11, color:'#a78bfa', fontWeight:700, marginTop:2, letterSpacing:.5 }}>INGRESOS</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display:'flex', background:'#f1f5f9', borderRadius:14, padding:4, marginBottom:12, gap:4 }}>
        {PERIODOS.map(p=>{
          const active=d.filtroPeriodo===p.value;
          return <button key={p.value} onClick={()=>d.setFiltroPeriodo(p.value)} style={{ flex:1, padding:'9px 0', background:active?'#fff':'transparent', color:active?'#2C1810':'#94a3b8', border:'none', borderRadius:10, fontWeight:active?800:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:5, boxShadow:active?'0 2px 8px rgba(0,0,0,.1)':'none', transition:'all .15s', fontFamily:'inherit' }}>
            <i className={`fas ${p.icon}`} style={{ fontSize:11 }} />{p.label}
          </button>;
        })}
      </div>

      <div style={{ display:'flex', gap:7, overflowX:'auto', marginBottom:16, paddingBottom:4, scrollbarWidth:'none' }}>
        {ESTADOS_FILTRO.map(ef=>{
          const active=d.filtroEstado===ef.value;
          const est=ESTADO[ef.value];
          return <button key={ef.value} onClick={()=>d.setFiltroEstado(ef.value)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:20, flexShrink:0, background:active?(est?.gradient||'#2C1810'):'#fff', color:active?'#fff':'#64748b', border:active?'none':'1.5px solid #e2e8f0', fontWeight:700, fontSize:12, cursor:'pointer', boxShadow:active?'0 3px 10px rgba(0,0,0,.18)':'none', transition:'all .15s', fontFamily:'inherit' }}>
            <i className={`fas ${ef.icon}`} style={{ fontSize:10 }} />{ef.label}
          </button>;
        })}
      </div>

      {d.loading ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'60px 0', gap:14 }}>
          <Spin /><span style={{ color:'#94a3b8', fontSize:14 }}>Cargando historial...</span>
        </div>
      ) : d.pedidos.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="fas fa-clipboard-list" style={{ fontSize:30, color:'#cbd5e1' }} />
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:'#475569' }}>Sin pedidos</div>
          <div style={{ fontSize:13, color:'#94a3b8', marginTop:6 }}>Cambia los filtros para ver más resultados</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize:11, color:'#94a3b8', fontWeight:700, marginBottom:12, letterSpacing:.8, display:'flex', alignItems:'center', gap:6 }}>
            <i className="fas fa-list" style={{ fontSize:10 }} />{d.pedidos.length} PEDIDO{d.pedidos.length!==1?'S':''}
          </div>
          {d.pedidos.map(p=><PedidoCardMobile key={p.id} pedido={p} onClick={()=>setPedidoDetalle(p)} />)}
        </>
      )}

      <Sheet open={!!pedidoDetalle} onClose={()=>setPedidoDetalle(null)} title={`Pedido #${pedidoDetalle?.id}`} subtitle={pedidoDetalle?`Mesa ${pedidoDetalle.mesa?.numero}`:''}>
        <DetallePedido pedido={pedidoDetalle} onClose={()=>setPedidoDetalle(null)} onEntregado={(id,cb)=>d.marcarEntregado(id,()=>{ cb?.(); setPedidoDetalle(null); })} />
      </Sheet>
    </div>
  );
};

/* ════════════════════════════════════════
   LAYOUT DESKTOP
════════════════════════════════════════ */

const Modal = ({ open, onClose, title, subtitle, children, width=540 }) => {
  if(!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:'rgba(15,23,42,.65)', backdropFilter:'blur(6px)', animation:'fadeIn .2s ease' }} />
      <div style={{ position:'fixed', inset:0, zIndex:1051, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ background:'#fff', borderRadius:24, width:'100%', maxWidth:width, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,.22)', animation:'modalIn .25s ease' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 24px', borderBottom:'1px solid #f1f5f9' }}>
            <div>
              <div style={{ fontWeight:800, fontSize:20, color:'#2C1810' }}>{title}</div>
              {subtitle&&<div style={{ fontSize:13, color:'#94a3b8', marginTop:2 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} style={{ width:38, height:38, borderRadius:'50%', background:'#f1f5f9', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#64748b' }}><i className="fas fa-times" /></button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>{children}</div>
        </div>
      </div>
    </>
  );
};

const DesktopLayout = ({ d }) => {
  const [pedidoDetalle, setPedidoDetalle] = useState(null);

  const PERIODOS=[
    { value:'hoy',    label:'Hoy',    icon:'fa-sun' },
    { value:'semana', label:'Semana', icon:'fa-calendar-week' },
    { value:'todos',  label:'Todo',   icon:'fa-history' },
  ];
  const ESTADOS_FILTRO=[
    { value:'todos',  label:'Todos los pedidos', icon:'fa-list',        color:'#2C1810' },
    { value:'pagado', label:'Solo pagados',       icon:'fa-credit-card', color:'#7c3aed' },
  ];

  const hora  = p => new Date(p.created_at).toLocaleTimeString('es-PE',{hour:'2-digit',minute:'2-digit'});
  const fecha = p => new Date(p.created_at).toLocaleDateString('es-PE',{day:'2-digit',month:'short'});

  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - 58px)', background:'#f1f5f9' }}>
      {/* ── Sidebar ── */}
      <aside style={{ width:260, flexShrink:0, background:'#2C1810', display:'flex', flexDirection:'column', padding:'24px 16px', overflowY:'auto' }}>
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:1.2, marginBottom:12 }}>HISTORIAL DE PEDIDOS</div>
          <button onClick={d.fetchPedidos} style={{ width:'100%', padding:'10px 14px', background:'#1e293b', border:'1px solid #334155', borderRadius:12, color:'#94a3b8', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit' }}>
            <i className="fas fa-rotate-right" style={{ fontSize:12 }} />Actualizar
          </button>
        </div>

        {/* Stats */}
        {d.stats&&(
          <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
            <div style={{ background:'rgba(96,165,250,.12)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(96,165,250,.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'#60a5fa', fontWeight:700, letterSpacing:.5 }}>PEDIDOS</span>
              <span style={{ fontSize:22, fontWeight:900, color:'#60a5fa' }}>{d.stats.total}</span>
            </div>
            <div style={{ background:'rgba(192,132,252,.12)', borderRadius:12, padding:'12px 14px', border:'1px solid rgba(192,132,252,.2)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <span style={{ fontSize:11, color:'#c084fc', fontWeight:700, letterSpacing:.5 }}>INGRESOS</span>
              <span style={{ fontSize:16, fontWeight:900, color:'#c084fc' }}>S/{d.stats.ingresos.toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* Período */}
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:1.2, marginBottom:8, paddingLeft:4 }}>PERÍODO</div>
        <div style={{ marginBottom:20 }}>
          {PERIODOS.map(p=>{
            const active=d.filtroPeriodo===p.value;
            return (
              <button key={p.value} onClick={()=>d.setFiltroPeriodo(p.value)}
                style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px', borderRadius:12, background:active?'#C62828':'transparent', color:active?'#fff':'#64748b', border:'none', cursor:'pointer', fontWeight:active?700:500, fontSize:14, marginBottom:4, textAlign:'left', fontFamily:'inherit', boxShadow:active?'0 2px 8px rgba(198,40,40,.4)':'none', transition:'all .15s' }}
                onMouseEnter={ev=>{if(!active)ev.currentTarget.style.background='#1e293b';}}
                onMouseLeave={ev=>{if(!active)ev.currentTarget.style.background='transparent';}}
              >
                <i className={`fas ${p.icon}`} style={{ width:18, textAlign:'center', fontSize:14 }} />{p.label}
              </button>
            );
          })}
        </div>

        {/* Estado */}
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:1.2, marginBottom:8, paddingLeft:4 }}>ESTADO</div>
        {ESTADOS_FILTRO.map(ef=>{
          const active=d.filtroEstado===ef.value;
          const est=ESTADO[ef.value];
          return (
            <button key={ef.value} onClick={()=>d.setFiltroEstado(ef.value)}
              style={{ display:'flex', alignItems:'center', gap:10, width:'100%', padding:'11px 14px', borderRadius:12, background:active?'#C62828':'transparent', color:active?'#fff':'#64748b', border:'none', cursor:'pointer', fontWeight:active?700:500, fontSize:14, marginBottom:4, textAlign:'left', fontFamily:'inherit', boxShadow:active?'0 2px 8px rgba(198,40,40,.4)':'none', transition:'all .15s' }}
              onMouseEnter={ev=>{if(!active)ev.currentTarget.style.background='#1e293b';}}
              onMouseLeave={ev=>{if(!active)ev.currentTarget.style.background='transparent';}}
            >
              <div style={{ width:28, height:28, borderRadius:8, background:active?'rgba(255,255,255,.2)':est?est.bg+'40':'#1e293b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={`fas ${ef.icon}`} style={{ fontSize:12, color:active?'#fff':ef.color }} />
              </div>
              {ef.label}
            </button>
          );
        })}
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'#fff', borderBottom:'1px solid #e2e8f0', padding:'20px 32px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div>
            <h1 style={{ fontWeight:900, fontSize:24, color:'#2C1810', margin:0 }}>Historial de Pedidos</h1>
            <p style={{ color:'#64748b', fontSize:13, margin:'4px 0 0', display:'flex', alignItems:'center', gap:6 }}>
              <i className="fas fa-list" style={{ fontSize:11 }} />
              {d.pedidos.length} pedido{d.pedidos.length!==1?'s':''} · {d.filtroPeriodo==='hoy'?'Hoy':d.filtroPeriodo==='semana'?'Última semana':'Todo el tiempo'}
            </p>
          </div>
          {d.stats?.listos>0&&(
            <div style={{ background:'linear-gradient(135deg,#15803d,#16a34a)', borderRadius:14, padding:'10px 18px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 4px 16px rgba(22,163,74,.35)' }}>
              <i className="fas fa-bell" style={{ color:'#fff', fontSize:18, animation:'pulse 1.5s infinite' }} />
              <div>
                <div style={{ fontWeight:800, color:'#fff', fontSize:14 }}>{d.stats.listos} pedido{d.stats.listos>1?'s':''} listo{d.stats.listos>1?'s':''}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.8)' }}>Listos para entregar</div>
              </div>
            </div>
          )}
        </div>

        {/* Tabla */}
        <div style={{ flex:1, overflowY:'auto', padding:'24px 32px' }}>
          {d.loading ? (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16 }}>
              <Spin size={44} /><span style={{ color:'#94a3b8', fontSize:15 }}>Cargando historial...</span>
            </div>
          ) : d.pedidos.length===0 ? (
            <div style={{ textAlign:'center', padding:'80px 20px' }}>
              <div style={{ width:90, height:90, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <i className="fas fa-clipboard-list" style={{ fontSize:36, color:'#cbd5e1' }} />
              </div>
              <div style={{ fontSize:18, fontWeight:700, color:'#475569' }}>Sin pedidos</div>
              <div style={{ fontSize:14, color:'#94a3b8', marginTop:8 }}>Cambia el filtro de período o estado</div>
            </div>
          ) : (
            <div style={{ background:'#fff', borderRadius:20, border:'1px solid #e2e8f0', overflow:'hidden', boxShadow:'0 2px 12px rgba(0,0,0,.06)' }}>
              {/* Encabezado tabla */}
              <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 1fr 140px 100px 100px', gap:0, padding:'12px 20px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                {['#','Mesa','Estado','Fecha','Ítems','Total'].map(h=>(
                  <div key={h} style={{ fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:.8 }}>{h.toUpperCase()}</div>
                ))}
              </div>
              {/* Filas */}
              {d.pedidos.map((p,idx)=>{
                const est=ESTADO[p.estado]||{label:p.estado,color:'#9ca3af',bg:'#f9fafb',border:'#e2e8f0',icon:'fa-circle'};
                const esListo=p.estado==='preparado';
                return (
                  <div key={p.id}
                    onClick={()=>setPedidoDetalle(p)}
                    style={{ display:'grid', gridTemplateColumns:'60px 1fr 1fr 140px 100px 100px', gap:0, padding:'14px 20px', background:esListo?'#f0fdf4':idx%2===0?'#fff':'#fafafa', borderBottom:'1px solid #f1f5f9', cursor:'pointer', transition:'background .15s' }}
                    onMouseEnter={ev=>ev.currentTarget.style.background=esListo?'#dcfce7':'#f5f7ff'}
                    onMouseLeave={ev=>ev.currentTarget.style.background=esListo?'#f0fdf4':idx%2===0?'#fff':'#fafafa'}
                  >
                    <div style={{ fontWeight:800, color:'#64748b', fontSize:14 }}>#{p.id}</div>
                    <div style={{ fontWeight:700, color:'#2C1810', fontSize:14, display:'flex', alignItems:'center', gap:6 }}>
                      <i className="fas fa-table" style={{ color:'#94a3b8', fontSize:12 }} />Mesa {p.mesa?.numero}
                    </div>
                    <div style={{ display:'flex', alignItems:'center' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:est.bg, border:`1px solid ${est.border}`, color:est.color, borderRadius:20, padding:'4px 10px', fontSize:12, fontWeight:700 }}>
                        <i className={`fas ${est.icon}`} style={{ fontSize:10 }} />{est.label}
                      </span>
                      {esListo&&<span style={{ marginLeft:6, background:'#f0fdf4', border:'1px solid #86efac', color:'#16a34a', borderRadius:20, padding:'3px 8px', fontSize:10, fontWeight:700, animation:'pulse 2s infinite' }}><i className="fas fa-bell" style={{ marginRight:3 }} /></span>}
                    </div>
                    <div style={{ fontSize:13, color:'#64748b', display:'flex', alignItems:'center', gap:5 }}>
                      <i className="fas fa-clock" style={{ fontSize:11 }} />{fecha(p)} · {hora(p)}
                      <span style={{ background:'#f1f5f9', borderRadius:20, padding:'2px 7px', fontSize:11, fontWeight:700, color:'#64748b' }}>{tiempoDesde(p.created_at)}</span>
                    </div>
                    <div style={{ fontSize:13, color:'#64748b' }}>{p.detalles?.length||0} ítem{p.detalles?.length!==1?'s':''}</div>
                    <div style={{ fontWeight:800, fontSize:15, color:'#16a34a' }}>S/ {parseFloat(p.total).toFixed(2)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* ── Modal detalle ── */}
      <Modal open={!!pedidoDetalle} onClose={()=>setPedidoDetalle(null)} title={`Pedido #${pedidoDetalle?.id}`} subtitle={pedidoDetalle?`Mesa ${pedidoDetalle.mesa?.numero} · ${fecha(pedidoDetalle)}`:''}  width={520}>
        <DetallePedido pedido={pedidoDetalle} onClose={()=>setPedidoDetalle(null)} onEntregado={(id,cb)=>d.marcarEntregado(id,()=>{ cb?.(); setPedidoDetalle(null); })} />
      </Modal>
    </div>
  );
};

/* ════════════════════════════════════════
   ROOT
════════════════════════════════════════ */
const PedidosHistorial = () => {
  const { user } = useAuth();
  const isDesktop = useIsDesktop();
  const d = useHistorial(user);
  return (
    <>
      <style>{CSS}</style>
      {isDesktop ? <DesktopLayout d={d} /> : <MobileLayout d={d} />}
    </>
  );
};

export default PedidosHistorial;
