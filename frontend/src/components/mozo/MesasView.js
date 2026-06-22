import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { mesasService, pedidosService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

/* ── Responsive hook ── */
const useIsDesktop = () => {
  const [desk, setDesk] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const h = () => setDesk(window.innerWidth >= 768);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return desk;
};

/* ── Paleta estados ── */
const EST = {
  libre:             { label:'Libre',   icon:'fa-check-circle', gradient:'linear-gradient(135deg,#16a34a,#22c55e)', light:'#f0fdf4', border:'#bbf7d0', color:'#16a34a' },
  ocupada:           { label:'Ocupada', icon:'fa-utensils',     gradient:'linear-gradient(135deg,#dc2626,#ef4444)', light:'#fef2f2', border:'#fecaca', color:'#dc2626' },
  cuenta_solicitada: { label:'Cuenta',  icon:'fa-receipt',      gradient:'linear-gradient(135deg,#d97706,#f59e0b)', light:'#fffbeb', border:'#fed7aa', color:'#d97706' },
};

const ESTADO_PEDIDO = {
  nuevo:     { label:'Nuevo',     color:'#3b82f6' },
  preparado: { label:'Listo',     color:'#10b981' },
  entregado: { label:'Entregado', color:'#6b7280' },
  pagado:    { label:'Pagado',    color:'#9ca3af' },
};

const CSS = `
  @keyframes fadeIn  { from{opacity:0}             to{opacity:1} }
  @keyframes slideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes modalIn { from{transform:scale(.96);opacity:0} to{transform:scale(1);opacity:1} }
`;

/* ── Shared logic hook ── */
const useMesas = () => {
  const [mesas, setMesas]     = useState([]);
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const { on, off } = useSocket();

  const fetchMesas = useCallback(async () => {
    try {
      const [mR, sR, pR] = await Promise.all([
        mesasService.getAll(),
        mesasService.getStats(),
        pedidosService.getAll({ limit: 200 }),
      ]);
      const pedidos = pR.data?.data || [];
      const totalesMesa = {};
      pedidos.filter(p => p.estado !== 'pagado').forEach(p => {
        totalesMesa[p.mesa_id] = (totalesMesa[p.mesa_id] || 0) + parseFloat(p.total || 0);
      });
      setMesas(mR.data.data.map(m => ({ ...m, totalActivo: totalesMesa[m.id] || 0 })));
      setStats(sR.data.data);
    } catch { toast.error('Error al cargar mesas'); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMesas();
    const t = setInterval(fetchMesas, 30000);
    return () => clearInterval(t);
  }, [fetchMesas]);

  useEffect(() => {
    const r = () => fetchMesas();
    ['mesa-liberada','mesa-estado-actualizada','nuevo-pedido','pedido-actualizado'].forEach(e => on(e, r));
    return () => ['mesa-liberada','mesa-estado-actualizada','nuevo-pedido','pedido-actualizado'].forEach(e => off(e, r));
  }, [on, off, fetchMesas]);

  return { mesas, stats, loading, fetchMesas };
};

/* ── Spinner ── */
const Spin = ({ size=36, color='#C62828' }) => (
  <div style={{ width:size, height:size, border:`3px solid #FFEBEE`, borderTop:`3px solid ${color}`, borderRadius:'50%', animation:'spin .75s linear infinite', flexShrink:0 }} />
);

/* ════════════════════════════════════════
   COMPONENTES MOBILE
════════════════════════════════════════ */

/* ── Bottom Sheet ── */
const Sheet = ({ open, onClose, title, subtitle, children, footer }) => {
  const { C } = useTheme();
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:C.overlay, backdropFilter:'blur(4px)', animation:'fadeIn .2s ease' }} />
      <div style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:1051, background:C.surface, borderRadius:'24px 24px 0 0', maxHeight:'92vh', display:'flex', flexDirection:'column', animation:'slideUp .3s cubic-bezier(.4,0,.2,1)', boxShadow:'0 -8px 40px rgba(0,0,0,.18)' }}>
        <div style={{ display:'flex', justifyContent:'center', paddingTop:12 }}>
          <div style={{ width:44, height:5, background:C.border, borderRadius:3 }} />
        </div>
        {title && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderBottom:`1px solid ${C.borderLight}` }}>
            <div>
              <div style={{ fontWeight:800, fontSize:19, color:C.text }}>{title}</div>
              {subtitle && <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} style={{ width:36, height:36, borderRadius:'50%', background:C.surfaceAlt2, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textMuted, fontSize:16 }}><i className="fas fa-times" /></button>
          </div>
        )}
        <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>{children}</div>
        {footer && <div style={{ padding:'12px 20px', paddingBottom:'max(20px,env(safe-area-inset-bottom))', borderTop:`1px solid ${C.borderLight}` }}>{footer}</div>}
      </div>
    </>
  );
};

/* ── Tarjeta de mesa (mobile) ── */
const MesaCardMobile = ({ mesa, onTap, onCobrar }) => {
  const e = EST[mesa.estado] || EST.libre;
  const [pressed, setPressed] = useState(false);
  const { C } = useTheme();
  return (
    <div onClick={() => onTap(mesa)} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerLeave={()=>setPressed(false)}
      style={{ borderRadius:20, background:C.surface, border:`1.5px solid ${e.border}`, overflow:'hidden', cursor:'pointer', userSelect:'none', transform:pressed?'scale(.95)':'scale(1)', transition:'transform .12s, box-shadow .12s', boxShadow:pressed?'0 2px 8px rgba(0,0,0,.08)':'0 4px 20px rgba(0,0,0,.09)' }}
    >
      <div style={{ background:e.gradient, padding:'18px 14px 14px', display:'flex', flexDirection:'column', alignItems:'center', gap:8, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-24, right:-18, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.12)' }} />
        <div style={{ width:58, height:58, borderRadius:'50%', background:'rgba(255,255,255,.22)', border:'2px solid rgba(255,255,255,.4)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:26, color:'#fff' }}>
          {mesa.numero}
        </div>
        <div style={{ background:'rgba(255,255,255,.25)', borderRadius:20, padding:'3px 12px', fontSize:11, fontWeight:700, color:'#fff', letterSpacing:.5, display:'flex', alignItems:'center', gap:5 }}>
          <i className={`fas ${e.icon}`} style={{ fontSize:9 }} />{e.label}
        </div>
      </div>
      <div style={{ padding:'10px 12px 12px' }}>
        <div style={{ fontSize:11, color:C.textMuted, textAlign:'center', marginBottom:mesa.estado !== 'libre' ? 8 : 10, display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
          <i className="fas fa-users" style={{ fontSize:10 }} />{mesa.capacidad} personas
        </div>
        {mesa.estado !== 'libre' && mesa.totalActivo > 0 && (
          <div style={{ background:'linear-gradient(135deg,#16a34a,#22c55e)', borderRadius:10, padding:'7px 10px', marginBottom:8, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
            <i className="fas fa-coins" style={{ color:'rgba(255,255,255,.85)', fontSize:11 }} />
            <span style={{ fontWeight:900, fontSize:16, color:'#fff', letterSpacing:-.5 }}>S/ {mesa.totalActivo.toFixed(2)}</span>
          </div>
        )}
        {mesa.estado === 'libre' && (
          <div style={{ background:e.gradient, borderRadius:12, padding:'10px 0', color:'#fff', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 3px 10px rgba(22,163,74,.35)' }}>
            <i className="fas fa-play" style={{ fontSize:11 }} />Atender
          </div>
        )}
        {mesa.estado === 'ocupada' && (
          <div style={{ display:'flex', gap:7 }}>
            <div style={{ flex:1, background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:10, padding:'9px 0', color:'#2563eb', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5 }}>
              <i className="fas fa-plus" style={{ fontSize:10 }} />Agregar
            </div>
            <div onClick={ev=>{ev.stopPropagation();onCobrar(mesa);}} style={{ flex:1, background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:10, padding:'9px 0', color:'#16a34a', fontWeight:700, fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', gap:5, cursor:'pointer' }}>
              <i className="fas fa-receipt" style={{ fontSize:10 }} />Cobrar
            </div>
          </div>
        )}
        {mesa.estado === 'cuenta_solicitada' && (
          <div onClick={ev=>{ev.stopPropagation();onCobrar(mesa);}} style={{ background:e.gradient, borderRadius:12, padding:'10px 0', color:'#fff', fontWeight:700, fontSize:13, display:'flex', alignItems:'center', justifyContent:'center', gap:7, cursor:'pointer', animation:'pulse 2s infinite' }}>
            <i className="fas fa-receipt" />Cobrar Ahora
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Sheet pedidos (mobile) ── */
const SheetPedidos = ({ mesa, pedidos, loading, onClose, onAgregar, onCobrar, onMarcarEntregado }) => {
  const e = mesa?(EST[mesa.estado]||EST.libre):EST.libre;
  const { C } = useTheme();
  const total = pedidos.reduce((s,p)=>s+parseFloat(p.total||0),0);
  const pendientes = pedidos.filter(p=>p.estado==='preparado').length;
  return (
    <Sheet open={!!mesa} onClose={onClose} title={`Mesa ${mesa?.numero}`} subtitle={`${pedidos.length} pedido(s) · S/ ${total.toFixed(2)}`}
      footer={
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onAgregar} style={{ flex:1, padding:'13px 0', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:14, color:'#2563eb', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit' }}>
            <i className="fas fa-plus" />Agregar más
          </button>
          <button onClick={onCobrar} style={{ flex:1, padding:'13px 0', background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', borderRadius:14, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 4px 14px rgba(22,163,74,.4)', fontFamily:'inherit' }}>
            <i className="fas fa-receipt" />Cobrar S/ {total.toFixed(2)}
          </button>
        </div>
      }
    >
      {pendientes>0&&(
        <div style={{ background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:14, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'#16a34a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <i className="fas fa-bell" style={{ color:'#fff', fontSize:15 }} />
          </div>
          <div>
            <div style={{ fontWeight:700, color:'#15803d', fontSize:14 }}>{pendientes} pedido{pendientes>1?'s':''} listo{pendientes>1?'s':''}</div>
            <div style={{ fontSize:12, color:'#4ade80' }}>Listo para entregar al cliente</div>
          </div>
        </div>
      )}
      {loading ? <div style={{ display:'flex', justifyContent:'center', padding:'50px 0' }}><Spin /></div>
       : pedidos.length===0 ? (
        <div style={{ textAlign:'center', padding:'50px 20px' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', background:C.surfaceAlt2, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="fas fa-clipboard" style={{ fontSize:28, color:C.textMuted }} />
          </div>
          <div style={{ fontWeight:700, fontSize:16, color:C.textSub }}>Sin pedidos</div>
          <div style={{ fontSize:13, color:C.textMuted, marginTop:6 }}>Toca "Agregar más" para crear el primer pedido</div>
        </div>
      ) : pedidos.map(p=>{
        const est=ESTADO_PEDIDO[p.estado]||{label:p.estado,color:'#9ca3af'};
        const esListo=p.estado==='preparado';
        return (
          <div key={p.id} style={{ background:esListo?'#f0fdf4':C.surfaceAlt, borderRadius:16, border:`1.5px solid ${esListo?'#86efac':C.border}`, padding:'14px 16px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:30, height:30, borderRadius:10, background:est.color+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className="fas fa-clipboard-list" style={{ color:est.color, fontSize:12 }} />
                </div>
                <span style={{ fontWeight:700, fontSize:14, color:C.text }}>Pedido #{p.id}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ background:est.color, color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{est.label}</span>
                <span style={{ fontWeight:800, color:'#16a34a', fontSize:15 }}>S/{parseFloat(p.total).toFixed(2)}</span>
              </div>
            </div>
            {p.detalles?.map((d,i)=>(
              <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.textSub, padding:'4px 0', borderTop:i>0?`1px solid ${C.borderLight}`:'none' }}>
                <span><span style={{ fontWeight:700, color:C.text }}>{d.cantidad}×</span> {d.producto?.nombre}</span>
                <span style={{ fontWeight:600, color:C.textSub }}>S/{parseFloat(d.subtotal).toFixed(2)}</span>
              </div>
            ))}
            {esListo&&(
              <button onClick={()=>onMarcarEntregado(p.id)} style={{ marginTop:12, width:'100%', padding:11, background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit', boxShadow:'0 3px 10px rgba(22,163,74,.35)' }}>
                <i className="fas fa-check" />Marcar como Entregado
              </button>
            )}
          </div>
        );
      })}
    </Sheet>
  );
};

/* ── Sheet cobro (reutilizable mobile/desktop) ── */
const CobroPanel = ({ mesa, onClose, onPagado, isModal=false }) => {
  const [cuenta, setCuenta]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [procesando, setProcesando] = useState(null); // 'yape' | 'efectivo' | null

  useEffect(()=>{
    if(!mesa) return;
    setLoading(true); setCuenta(null);
    pedidosService.getCuenta(mesa.id)
      .then(r=>setCuenta(r.data.data))
      .catch(()=>toast.error('Error al cargar la cuenta'))
      .finally(()=>setLoading(false));
  },[mesa]);

  const total = cuenta ? parseFloat(cuenta.resumen.total_general) : 0;

  const pagar = async (metodo) => {
    setProcesando(metodo);
    try {
      await pedidosService.procesarPago(mesa.id, { metodo_pago: metodo, monto_recibido: total, observaciones_pago: '' });
      toast.success(metodo === 'yape' ? `Yape confirmado — S/ ${total.toFixed(2)}` : `Efectivo cobrado — S/ ${total.toFixed(2)}`, { duration: 4000 });
      onPagado();
    } catch { toast.error('Error al procesar el pago'); }
    finally { setProcesando(null); }
  };

  const content = loading ? (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'50px 0', gap:14 }}>
      <Spin color="#16a34a" /><span style={{ color:'#94a3b8', fontSize:14 }}>Calculando cuenta...</span>
    </div>
  ) : (
    <>
      {/* Total hero */}
      <div style={{ background:'linear-gradient(135deg,#15803d,#16a34a,#22c55e)', borderRadius:22, padding:'26px 20px', textAlign:'center', color:'#fff', marginBottom:18, boxShadow:'0 8px 28px rgba(22,163,74,.38)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-30, right:-20, width:110, height:110, borderRadius:'50%', background:'rgba(255,255,255,.08)' }} />
        <div style={{ position:'absolute', bottom:-20, left:-10, width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,.05)' }} />
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, opacity:.8, marginBottom:6 }}>TOTAL A COBRAR · MESA {mesa?.numero}</div>
        <div style={{ fontSize:56, fontWeight:900, letterSpacing:-2, lineHeight:1 }}>S/ {total.toFixed(2)}</div>
        <div style={{ fontSize:12, opacity:.75, marginTop:10, display:'flex', justifyContent:'center', gap:14 }}>
          <span style={{ background:'rgba(255,255,255,.18)', borderRadius:20, padding:'3px 10px' }}>
            <i className="fas fa-clipboard-list" style={{ marginRight:5 }} />{cuenta?.resumen.total_pedidos} pedido{cuenta?.resumen.total_pedidos!==1?'s':''}
          </span>
          <span style={{ background:'rgba(255,255,255,.18)', borderRadius:20, padding:'3px 10px' }}>
            <i className="fas fa-box" style={{ marginRight:5 }} />{cuenta?.resumen.total_items} ítem{cuenta?.resumen.total_items!==1?'s':''}
          </span>
        </div>
      </div>

      {/* Productos */}
      {cuenta?.resumen.productos?.length>0&&(
        <div style={{ borderRadius:18, border:'1.5px solid #e2e8f0', overflow:'hidden', marginBottom:18 }}>
          <div style={{ padding:'10px 16px', background:'#f8fafc', borderBottom:'1px solid #e2e8f0', fontSize:11, fontWeight:700, color:'#94a3b8', letterSpacing:1 }}>DETALLE DE CONSUMO</div>
          {cuenta.resumen.productos.map((p,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'11px 16px', borderBottom:i<cuenta.resumen.productos.length-1?'1px solid #f1f5f9':'none', background:'#fff' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#64748b' }}>{p.cantidad}×</div>
                <span style={{ fontSize:14, color:'#374151', fontWeight:500 }}>{p.producto?.nombre||p.nombre}</span>
              </div>
              <span style={{ fontWeight:800, fontSize:14, color:'#2C1810' }}>S/ {parseFloat(p.subtotal).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Botones de pago directos */}
      <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textAlign:'center', letterSpacing:1, marginBottom:14 }}>SELECCIONA EL MÉTODO DE PAGO</div>
      <div style={{ display:'flex', gap:12, marginBottom:12 }}>
        <button onClick={()=>pagar('yape')} disabled={!!procesando}
          style={{ flex:1, border:'2.5px solid #7c3aed', borderRadius:22, padding:'22px 10px', background:procesando==='yape'?'#7c3aed':'#f5f3ff', cursor:procesando?'not-allowed':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:10, fontFamily:'inherit', boxShadow:'0 5px 18px rgba(124,58,237,.18)', transition:'all .15s', opacity:procesando&&procesando!=='yape'?.45:1 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#a78bfa)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(124,58,237,.4)' }}>
            {procesando==='yape' ? <i className="fas fa-spinner fa-spin" style={{ color:'#fff', fontSize:24 }} /> : <i className="fas fa-mobile-alt" style={{ color:'#fff', fontSize:24 }} />}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:900, color:procesando==='yape'?'#fff':'#7c3aed', fontSize:17 }}>YAPE</div>
            <div style={{ fontSize:12, color:procesando==='yape'?'rgba(255,255,255,.8)':'#94a3b8', marginTop:2 }}>Pago digital</div>
          </div>
        </button>

        <button onClick={()=>pagar('efectivo')} disabled={!!procesando}
          style={{ flex:1, border:'2.5px solid #16a34a', borderRadius:22, padding:'22px 10px', background:procesando==='efectivo'?'#16a34a':'#f0fdf4', cursor:procesando?'not-allowed':'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:10, fontFamily:'inherit', boxShadow:'0 5px 18px rgba(22,163,74,.18)', transition:'all .15s', opacity:procesando&&procesando!=='efectivo'?.45:1 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:'linear-gradient(135deg,#16a34a,#22c55e)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(22,163,74,.4)' }}>
            {procesando==='efectivo' ? <i className="fas fa-spinner fa-spin" style={{ color:'#fff', fontSize:24 }} /> : <i className="fas fa-money-bill-wave" style={{ color:'#fff', fontSize:24 }} />}
          </div>
          <div style={{ textAlign:'center' }}>
            <div style={{ fontWeight:900, color:procesando==='efectivo'?'#fff':'#16a34a', fontSize:17 }}>EFECTIVO</div>
            <div style={{ fontSize:12, color:procesando==='efectivo'?'rgba(255,255,255,.8)':'#94a3b8', marginTop:2 }}>Pago en caja</div>
          </div>
        </button>
      </div>
      <div style={{ fontSize:11, color:'#94a3b8', textAlign:'center', letterSpacing:.3 }}>
        Toca el método para confirmar el cobro de S/ {total.toFixed(2)}
      </div>
    </>
  );

  if(isModal) return content;
  return <Sheet open={!!mesa} onClose={onClose} title={`Cobrar Mesa ${mesa?.numero}`}>{content}</Sheet>;
};

/* ════════════════════════════════════════
   LAYOUT MOBILE
════════════════════════════════════════ */
const MobileLayout = ({ mesas, stats, loading, fetchMesas }) => {
  const navigate = useNavigate();
  const { C } = useTheme();
  const [filtro, setFiltro]           = useState('todas');
  const [mesaPedidos, setMesaPedidos] = useState(null);
  const [pedidos, setPedidos]         = useState([]);
  const [loadingPed, setLoadingPed]   = useState(false);
  const [mesaCobro, setMesaCobro]     = useState(null);

  const abrirPedidos = async(mesa)=>{
    setMesaPedidos(mesa); setLoadingPed(true);
    try{ const r=await pedidosService.getByMesa(mesa.id); setPedidos(r.data.data||[]); }
    catch{ setPedidos([]); }
    finally{ setLoadingPed(false); }
  };

  const handleTap=(mesa)=>{ if(mesa.estado==='libre') navigate(`/dashboard/mozo/pedidos/${mesa.id}`); else abrirPedidos(mesa); };
  const handlePagado=()=>{ setMesaCobro(null); setMesaPedidos(null); fetchMesas(); };
  const handleEntregado=async(pedidoId)=>{
    try{ await pedidosService.changeStatus(pedidoId,'entregado'); toast.success('Pedido entregado');
      if(mesaPedidos){ const r=await pedidosService.getByMesa(mesaPedidos.id); setPedidos(r.data.data||[]); }
    }catch{ toast.error('Error al actualizar'); }
  };

  const FILTROS=[
    { key:'todas',             label:'Todas',   count:mesas.length,             e:null },
    { key:'libre',             label:'Libres',  count:stats?.libres??0,          e:EST.libre },
    { key:'ocupada',           label:'Ocupadas',count:stats?.ocupadas??0,        e:EST.ocupada },
    { key:'cuenta_solicitada', label:'Cuenta',  count:stats?.cuenta_solicitada??0,e:EST.cuenta_solicitada },
  ];

  const mesasFiltradas=mesas.filter(m=>filtro==='todas'||m.estado===filtro);

  if(loading) return <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'65vh', gap:16 }}><Spin size={44} /><span style={{ color:C.textMuted, fontSize:15 }}>Cargando mesas...</span></div>;

  return (
    <div>
      {stats&&(
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
          {[
            { label:'Libres',   value:stats.libres,            color:'#16a34a', icon:'fa-check-circle', bg:'#f0fdf4' },
            { label:'Ocupadas', value:stats.ocupadas,          color:'#dc2626', icon:'fa-utensils',      bg:'#fef2f2' },
            { label:'Cuenta',   value:stats.cuenta_solicitada, color:'#d97706', icon:'fa-receipt',       bg:'#fffbeb' },
          ].map(s=>(
            <div key={s.label} style={{ background:s.bg, borderRadius:16, padding:'12px 8px', textAlign:'center', border:`1.5px solid ${s.color}25` }}>
              <i className={`fas ${s.icon}`} style={{ fontSize:16, color:s.color, display:'block', marginBottom:4 }} />
              <div style={{ fontSize:28, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:s.color+'aa', fontWeight:700, marginTop:4, letterSpacing:.5 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:2 }}>
        {FILTROS.map(f=>{
          const active=filtro===f.key;
          return (
            <button key={f.key} onClick={()=>setFiltro(f.key)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:20, flexShrink:0, background:active?(f.e?f.e.gradient:'#2C1810'):'#fff', color:active?'#fff':'#64748b', border:active?'none':'1.5px solid #e2e8f0', fontWeight:700, fontSize:13, cursor:'pointer', boxShadow:active?'0 3px 10px rgba(0,0,0,.15)':'none', fontFamily:'inherit', transition:'all .15s' }}>
              {f.e&&<i className={`fas ${f.e.icon}`} style={{ fontSize:11 }} />}{f.label}
              <span style={{ background:active?'rgba(255,255,255,.3)':'#f1f5f9', color:active?'#fff':'#94a3b8', borderRadius:20, padding:'1px 7px', fontSize:11, fontWeight:800 }}>{f.count}</span>
            </button>
          );
        })}
      </div>
      {mesasFiltradas.length===0 ? (
        <div style={{ textAlign:'center', padding:'64px 20px' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:C.surfaceAlt2, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <i className="fas fa-chair" style={{ fontSize:32, color:C.textMuted }} />
          </div>
          <div style={{ fontSize:16, fontWeight:700, color:C.textSub }}>Sin mesas</div>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
          {mesasFiltradas.map(m=><MesaCardMobile key={m.id} mesa={m} onTap={handleTap} onCobrar={m2=>setMesaCobro(m2)} />)}
        </div>
      )}
      <SheetPedidos mesa={mesaPedidos} pedidos={pedidos} loading={loadingPed} onClose={()=>setMesaPedidos(null)}
        onAgregar={()=>{ setMesaPedidos(null); navigate(`/dashboard/mozo/pedidos/${mesaPedidos.id}`); }}
        onCobrar={()=>{ setMesaCobro(mesaPedidos); setMesaPedidos(null); }}
        onMarcarEntregado={handleEntregado} />
      <CobroPanel mesa={mesaCobro} onClose={()=>setMesaCobro(null)} onPagado={handlePagado} />
    </div>
  );
};

/* ════════════════════════════════════════
   LAYOUT DESKTOP
════════════════════════════════════════ */

/* ── Tarjeta de mesa (desktop) ── */
const MesaCardDesk = ({ mesa, onTap, onCobrar }) => {
  const e = EST[mesa.estado]||EST.libre;
  const [hov, setHov] = useState(false);
  const { C } = useTheme();
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ background:C.surface, borderRadius:20, border:`1.5px solid ${hov?e.color:e.border}`, overflow:'hidden', cursor:'pointer', transition:'all .2s', boxShadow:hov?`0 8px 32px ${e.color}25`:'0 2px 12px rgba(0,0,0,.06)', transform:hov?'translateY(-4px)':'none' }}>
      {/* Tope de color */}
      <div style={{ height:6, background:e.gradient }} />
      <div style={{ padding:'20px 18px 18px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:e.light, border:`1.5px solid ${e.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:22, color:e.color }}>
            {mesa.numero}
          </div>
          <span style={{ background:e.light, color:e.color, border:`1px solid ${e.border}`, borderRadius:20, padding:'4px 12px', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:5 }}>
            <i className={`fas ${e.icon}`} style={{ fontSize:10 }} />{e.label}
          </span>
        </div>
        <div style={{ fontSize:13, color:C.textMuted, display:'flex', alignItems:'center', gap:5, marginBottom: mesa.estado !== 'libre' && mesa.totalActivo > 0 ? 10 : 16 }}>
          <i className="fas fa-users" style={{ fontSize:11 }} />{mesa.capacidad} personas
        </div>
        {mesa.estado !== 'libre' && mesa.totalActivo > 0 && (
          <div style={{ background:'linear-gradient(135deg,#16a34a,#22c55e)', borderRadius:12, padding:'9px 12px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'center', gap:7, boxShadow:'0 3px 10px rgba(22,163,74,.25)' }}>
            <i className="fas fa-coins" style={{ color:'rgba(255,255,255,.85)', fontSize:12 }} />
            <span style={{ fontWeight:900, fontSize:18, color:'#fff', letterSpacing:-.5 }}>S/ {mesa.totalActivo.toFixed(2)}</span>
          </div>
        )}
        {mesa.estado==='libre'&&(
          <button onClick={()=>onTap(mesa)} style={{ width:'100%', padding:'10px 0', background:e.gradient, border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit', boxShadow:`0 3px 10px ${e.color}40` }}>
            <i className="fas fa-play" style={{ fontSize:11 }} />Atender
          </button>
        )}
        {mesa.estado==='ocupada'&&(
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={()=>onTap(mesa)} style={{ flex:1, padding:'10px 0', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:12, color:'#2563eb', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
              <i className="fas fa-plus" style={{ fontSize:11 }} />Agregar
            </button>
            <button onClick={()=>onCobrar(mesa)} style={{ flex:1, padding:'10px 0', background:'#f0fdf4', border:'1.5px solid #bbf7d0', borderRadius:12, color:'#16a34a', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontFamily:'inherit' }}>
              <i className="fas fa-receipt" style={{ fontSize:11 }} />Cobrar
            </button>
          </div>
        )}
        {mesa.estado==='cuenta_solicitada'&&(
          <button onClick={()=>onCobrar(mesa)} style={{ width:'100%', padding:'10px 0', background:e.gradient, border:'none', borderRadius:12, color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit', boxShadow:`0 3px 10px ${e.color}40`, animation:'pulse 2s infinite' }}>
            <i className="fas fa-receipt" />Cobrar Ahora
          </button>
        )}
      </div>
    </div>
  );
};

/* ── Modal desktop ── */
const Modal = ({ open, onClose, title, subtitle, children, width=520 }) => {
  const { C } = useTheme();
  if(!open) return null;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:1050, background:C.overlay, backdropFilter:'blur(6px)', animation:'fadeIn .2s ease' }} />
      <div style={{ position:'fixed', inset:0, zIndex:1051, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ background:C.surface, borderRadius:24, width:'100%', maxWidth:width, maxHeight:'85vh', display:'flex', flexDirection:'column', boxShadow:'0 24px 64px rgba(0,0,0,.22)', animation:'modalIn .25s ease' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 24px', borderBottom:`1px solid ${C.borderLight}` }}>
            <div>
              <div style={{ fontWeight:800, fontSize:20, color:C.text }}>{title}</div>
              {subtitle&&<div style={{ fontSize:13, color:C.textMuted, marginTop:2 }}>{subtitle}</div>}
            </div>
            <button onClick={onClose} style={{ width:38, height:38, borderRadius:'50%', background:C.surfaceAlt2, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textMuted }}><i className="fas fa-times" /></button>
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>{children}</div>
        </div>
      </div>
    </>
  );
};

const DesktopLayout = ({ mesas, stats, loading, fetchMesas }) => {
  const navigate = useNavigate();
  const { C } = useTheme();
  const [filtro, setFiltro]           = useState('todas');
  const [mesaModal, setMesaModal]     = useState(null);   // pedidos
  const [pedidos, setPedidos]         = useState([]);
  const [loadingPed, setLoadingPed]   = useState(false);
  const [mesaCobro, setMesaCobro]     = useState(null);

  const abrirPedidos = async(mesa)=>{
    setMesaModal(mesa); setLoadingPed(true);
    try{ const r=await pedidosService.getByMesa(mesa.id); setPedidos(r.data.data||[]); }
    catch{ setPedidos([]); }
    finally{ setLoadingPed(false); }
  };

  const handleTap=(mesa)=>{ if(mesa.estado==='libre') navigate(`/dashboard/mozo/pedidos/${mesa.id}`); else abrirPedidos(mesa); };
  const handlePagado=()=>{ setMesaCobro(null); setMesaModal(null); fetchMesas(); };
  const handleEntregado=async(pedidoId)=>{
    try{ await pedidosService.changeStatus(pedidoId,'entregado'); toast.success('Pedido entregado');
      if(mesaModal){ const r=await pedidosService.getByMesa(mesaModal.id); setPedidos(r.data.data||[]); }
    }catch{ toast.error('Error'); }
  };

  const FILTROS=[
    { key:'todas',             label:'Todas las mesas',   icon:'fa-th',          count:mesas.length },
    { key:'libre',             label:'Libres',            icon:'fa-check-circle', count:stats?.libres??0 },
    { key:'ocupada',           label:'Ocupadas',          icon:'fa-utensils',     count:stats?.ocupadas??0 },
    { key:'cuenta_solicitada', label:'Cuenta solicitada', icon:'fa-receipt',      count:stats?.cuenta_solicitada??0 },
  ];

  const mesasFiltradas=mesas.filter(m=>filtro==='todas'||m.estado===filtro);
  const total = pedidos.reduce((s,p)=>s+parseFloat(p.total||0),0);

  return (
    <div style={{ display:'flex', minHeight:'calc(100vh - 58px)', background:C.bg }}>
      {/* ── Sidebar ── */}
      <aside style={{ width:260, flexShrink:0, background:'#2C1810', display:'flex', flexDirection:'column', padding:'24px 16px', gap:6 }}>
        {/* Header sidebar */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:1.2, marginBottom:12 }}>GESTIÓN DE MESAS</div>
          <button onClick={fetchMesas} style={{ width:'100%', padding:'10px 14px', background:'#1e293b', border:'1px solid #334155', borderRadius:12, color:'#94a3b8', fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', gap:8, fontFamily:'inherit' }}>
            <i className="fas fa-rotate-right" style={{ fontSize:12 }} />Actualizar mesas
          </button>
        </div>

        {/* Stats sidebar */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20 }}>
          {[
            { label:'Libres',   value:stats?.libres??0,            color:'#22c55e', bg:'rgba(34,197,94,.12)'  },
            { label:'Ocupadas', value:stats?.ocupadas??0,          color:'#ef4444', bg:'rgba(239,68,68,.12)'  },
            { label:'Cuenta',   value:stats?.cuenta_solicitada??0, color:'#f59e0b', bg:'rgba(245,158,11,.12)' },
            { label:'Total',    value:mesas.length,                color:'#EF5350', bg:'rgba(129,140,248,.12)'},
          ].map(s=>(
            <div key={s.label} style={{ background:s.bg, borderRadius:12, padding:'10px 8px', textAlign:'center', border:`1px solid ${s.color}25` }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1 }}>{s.value}</div>
              <div style={{ fontSize:10, color:s.color+'aa', fontWeight:700, marginTop:3, letterSpacing:.5 }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ fontSize:11, color:'#475569', fontWeight:700, letterSpacing:1.2, marginBottom:8, paddingLeft:4 }}>FILTRAR</div>
        {FILTROS.map(f=>{
          const active=filtro===f.key;
          const e=EST[f.key];
          return (
            <button key={f.key} onClick={()=>setFiltro(f.key)}
              style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 14px', borderRadius:12, background:active?'#C62828':'transparent', color:active?'#fff':'#64748b', border:'none', cursor:'pointer', fontWeight:active?700:500, fontSize:14, transition:'all .15s', textAlign:'left', fontFamily:'inherit', width:'100%', boxShadow:active?'0 2px 8px rgba(198,40,40,.4)':'none' }}
              onMouseEnter={ev=>ev.currentTarget.style.background=active?'#C62828':'#1e293b'}
              onMouseLeave={ev=>ev.currentTarget.style.background=active?'#C62828':'transparent'}
            >
              <div style={{ width:32, height:32, borderRadius:10, background:active?'rgba(255,255,255,.2)':e?e.light:'#1e293b', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <i className={`fas ${f.icon}`} style={{ fontSize:13, color:active?'#fff':e?e.color:'#64748b' }} />
              </div>
              <span style={{ flex:1 }}>{f.label}</span>
              <span style={{ background:active?'rgba(255,255,255,.25)':'#1e293b', color:active?'#fff':'#64748b', borderRadius:20, padding:'2px 8px', fontSize:12, fontWeight:800 }}>{f.count}</span>
            </button>
          );
        })}
      </aside>

      {/* ── Main ── */}
      <main style={{ flex:1, padding:'28px 32px', overflowY:'auto' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
          <div>
            <h1 style={{ fontWeight:900, fontSize:26, color:C.text, margin:0 }}>Mesas del Restaurante</h1>
            <p style={{ color:C.textSub, fontSize:14, margin:'4px 0 0' }}>
              {mesasFiltradas.length} mesa{mesasFiltradas.length!==1?'s':''} · Actualización automática cada 30s
            </p>
          </div>
          {stats?.cuenta_solicitada>0&&(
            <div style={{ background:'linear-gradient(135deg,#d97706,#f59e0b)', borderRadius:14, padding:'10px 18px', display:'flex', alignItems:'center', gap:10, boxShadow:'0 4px 16px rgba(245,158,11,.35)' }}>
              <i className="fas fa-bell" style={{ color:'#fff', fontSize:18, animation:'pulse 1.5s infinite' }} />
              <div>
                <div style={{ fontWeight:800, color:'#fff', fontSize:14 }}>{stats.cuenta_solicitada} cuenta{stats.cuenta_solicitada>1?'s':''} pendiente{stats.cuenta_solicitada>1?'s':''}</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,.8)' }}>Clientes esperando cobro</div>
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:300, gap:16 }}>
            <Spin size={44} /><span style={{ color:'#94a3b8', fontSize:15 }}>Cargando mesas...</span>
          </div>
        ) : mesasFiltradas.length===0 ? (
          <div style={{ textAlign:'center', padding:'80px 20px' }}>
            <div style={{ width:90, height:90, borderRadius:'50%', background:'#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
              <i className="fas fa-chair" style={{ fontSize:36, color:'#cbd5e1' }} />
            </div>
            <div style={{ fontSize:18, fontWeight:700, color:'#475569' }}>Sin mesas para mostrar</div>
            <div style={{ fontSize:14, color:'#94a3b8', marginTop:8 }}>Cambia el filtro para ver más</div>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:18 }}>
            {mesasFiltradas.map(m=><MesaCardDesk key={m.id} mesa={m} onTap={handleTap} onCobrar={m2=>setMesaCobro(m2)} />)}
          </div>
        )}
      </main>

      {/* ── Modal Pedidos ── */}
      <Modal open={!!mesaModal} onClose={()=>setMesaModal(null)} title={`Mesa ${mesaModal?.numero} — Pedidos`} subtitle={`${pedidos.length} pedido(s) · S/ ${total.toFixed(2)} total`} width={560}>
        {loadingPed ? <div style={{ display:'flex', justifyContent:'center', padding:'40px 0' }}><Spin /></div>
        : pedidos.length===0 ? (
          <div style={{ textAlign:'center', padding:'40px 0' }}>
            <i className="fas fa-clipboard" style={{ fontSize:44, color:C.textMuted, display:'block', marginBottom:14 }} />
            <div style={{ fontWeight:700, color:C.textSub, fontSize:16 }}>Sin pedidos activos</div>
            <div style={{ color:C.textMuted, fontSize:13, marginTop:6 }}>Toca "Agregar más" para crear el primer pedido</div>
          </div>
        ) : pedidos.map(p=>{
          const est=ESTADO_PEDIDO[p.estado]||{label:p.estado,color:'#9ca3af'};
          const esListo=p.estado==='preparado';
          return (
            <div key={p.id} style={{ background:esListo?'#f0fdf4':C.surfaceAlt, borderRadius:16, border:`1.5px solid ${esListo?'#86efac':C.border}`, padding:'14px 16px', marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:30, height:30, borderRadius:10, background:est.color+'20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <i className="fas fa-clipboard-list" style={{ color:est.color, fontSize:12 }} />
                  </div>
                  <span style={{ fontWeight:700, fontSize:14, color:C.text }}>Pedido #{p.id}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <span style={{ background:est.color, color:'#fff', borderRadius:20, padding:'3px 10px', fontSize:11, fontWeight:700 }}>{est.label}</span>
                  <span style={{ fontWeight:800, color:'#16a34a', fontSize:15 }}>S/{parseFloat(p.total).toFixed(2)}</span>
                </div>
              </div>
              {p.detalles?.map((d,i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:C.textSub, padding:'4px 0', borderTop:i>0?`1px solid ${C.borderLight}`:'none' }}>
                  <span><span style={{ fontWeight:700, color:C.text }}>{d.cantidad}×</span> {d.producto?.nombre}</span>
                  <span style={{ fontWeight:600, color:C.textSub }}>S/{parseFloat(d.subtotal).toFixed(2)}</span>
                </div>
              ))}
              {esListo&&<button onClick={()=>handleEntregado(p.id)} style={{ marginTop:10, width:'100%', padding:'10px', background:'linear-gradient(135deg,#16a34a,#22c55e)', color:'#fff', border:'none', borderRadius:12, fontWeight:700, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit' }}><i className="fas fa-check" />Marcar como Entregado</button>}
            </div>
          );
        })}
        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <button onClick={()=>{ setMesaModal(null); navigate(`/dashboard/mozo/pedidos/${mesaModal.id}`); }} style={{ flex:1, padding:'13px 0', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:14, color:'#2563eb', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit' }}><i className="fas fa-plus" />Agregar más</button>
          <button onClick={()=>{ setMesaCobro(mesaModal); setMesaModal(null); }} style={{ flex:1, padding:'13px 0', background:'linear-gradient(135deg,#16a34a,#22c55e)', border:'none', borderRadius:14, color:'#fff', fontWeight:700, fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:7, fontFamily:'inherit', boxShadow:'0 4px 14px rgba(22,163,74,.4)' }}><i className="fas fa-receipt" />Cobrar S/ {total.toFixed(2)}</button>
        </div>
      </Modal>

      {/* ── Modal Cobro ── */}
      <Modal open={!!mesaCobro} onClose={()=>setMesaCobro(null)} title={`Cobrar Mesa ${mesaCobro?.numero}`} width={480}>
        <CobroPanel mesa={mesaCobro} onClose={()=>setMesaCobro(null)} onPagado={handlePagado} isModal />
      </Modal>
    </div>
  );
};

/* ════════════════════════════════════════
   ROOT
════════════════════════════════════════ */
const MesasView = () => {
  const isDesktop = useIsDesktop();
  const { mesas, stats, loading, fetchMesas } = useMesas();
  return (
    <>
      <style>{CSS}</style>
      {isDesktop
        ? <DesktopLayout mesas={mesas} stats={stats} loading={loading} fetchMesas={fetchMesas} />
        : <MobileLayout  mesas={mesas} stats={stats} loading={loading} fetchMesas={fetchMesas} />
      }
    </>
  );
};

export default MesasView;
