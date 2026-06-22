import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { pedidosService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const CSS = `
  @keyframes spin    { to{transform:rotate(360deg)} }
  @keyframes fadeIn  { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
`;

const ESTADO = {
  nuevo:     { label:'Nuevo',      color:'#C62828', bg:'#FFEBEE', icon:'fa-plus-circle'  },
  preparado: { label:'Listo',      color:'#16a34a', bg:'#f0fdf4', icon:'fa-check-circle' },
  entregado: { label:'Entregado',  color:'#0ea5e9', bg:'#f0f9ff', icon:'fa-handshake'    },
  pagado:    { label:'Pagado',     color:'#64748b', bg:'#f8fafc', icon:'fa-receipt'       },
};

const SIGUIENTE = {
  nuevo:     ['preparado'],
  preparado: ['entregado'],
  entregado: [],
  pagado:    [],
};

const tiempoDesde = (fecha) => {
  if (!fecha) return null;
  const mins = Math.floor((Date.now() - new Date(fecha)) / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

/* ── Spinner ── */
const Spin = () => (
  <div style={{ width: 36, height: 36, border: '3px solid #FFEBEE', borderTop: '3px solid #C62828', borderRadius: '50%', animation: 'spin .75s linear infinite' }} />
);

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════ */
const PedidoDetalles = () => {
  const { pedidoId } = useParams();
  const navigate = useNavigate();
  const { C } = useTheme();
  const [pedido, setPedido]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [cambiando, setCambiando] = useState(false);

  const fetch = useCallback(async () => {
    try {
      const r = await pedidosService.getById(pedidoId);
      setPedido(r.data.data);
    } catch {
      toast.error('No se pudo cargar el pedido');
      navigate('/dashboard/mozo/historial');
    } finally {
      setLoading(false);
    }
  }, [pedidoId, navigate]);

  useEffect(() => { fetch(); }, [fetch]);

  const cambiarEstado = async (nuevoEstado) => {
    setCambiando(true);
    try {
      await pedidosService.changeStatus(pedidoId, nuevoEstado);
      toast.success(`Pedido marcado como ${ESTADO[nuevoEstado]?.label}`);
      fetch();
    } catch {
      toast.error('Error al actualizar el estado');
    } finally {
      setCambiando(false);
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14 }}>
      <style>{CSS}</style>
      <Spin /><span style={{ color: '#94a3b8', fontSize: 15 }}>Cargando pedido...</span>
    </div>
  );

  if (!pedido) return null;

  const est = ESTADO[pedido.estado] || ESTADO.nuevo;
  const total = parseFloat(pedido.total || 0);
  const siguientes = SIGUIENTE[pedido.estado] || [];
  const detalles = pedido.detalles || pedido.DetallePedidos || [];

  return (
    <>
      <style>{CSS}</style>

      {/* ── Encabezado ── */}
      <div style={{ background: `linear-gradient(135deg,${est.color}dd,${est.color})`, padding: '20px 16px 16px', animation: 'fadeIn .3s ease' }}>
        <button onClick={() => navigate('/dashboard/mozo/historial')} style={{ background: 'rgba(255,255,255,.2)', border: '1px solid rgba(255,255,255,.35)', borderRadius: 10, color: '#fff', padding: '7px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 7, marginBottom: 16 }}>
          <i className="fas fa-arrow-left" style={{ fontSize: 11 }} />Volver
        </button>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.7)', fontWeight: 700, letterSpacing: 1, marginBottom: 4 }}>PEDIDO</div>
            <div style={{ fontWeight: 900, fontSize: 28, color: '#fff', lineHeight: 1 }}>#{pedido.id}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', marginTop: 4 }}>
              Mesa {pedido.mesa?.numero || pedido.Mesa?.numero || '—'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ background: 'rgba(255,255,255,.2)', borderRadius: 12, padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 7, border: '1px solid rgba(255,255,255,.3)' }}>
              <i className={`fas ${est.icon}`} style={{ color: '#fff', fontSize: 14 }} />
              <span style={{ fontWeight: 800, color: '#fff', fontSize: 14 }}>{est.label}</span>
            </div>
            <div style={{ fontWeight: 900, fontSize: 26, color: '#fff', marginTop: 8 }}>S/ {total.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 16px 32px' }}>

        {/* ── Botones de acción ── */}
        {siguientes.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {siguientes.map(sig => {
              const s = ESTADO[sig];
              return (
                <button key={sig} onClick={() => cambiarEstado(sig)} disabled={cambiando}
                  style={{ width: '100%', padding: '14px 0', background: cambiando ? '#d1d5db' : `linear-gradient(135deg,${s.color}cc,${s.color})`, color: '#fff', border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 15, cursor: cambiando ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontFamily: 'inherit', boxShadow: cambiando ? 'none' : `0 4px 16px ${s.color}50`, animation: cambiando ? 'none' : 'fadeIn .3s ease' }}>
                  {cambiando
                    ? <><Spin /><span>Actualizando...</span></>
                    : <><i className={`fas ${s.icon}`} />Marcar como {s.label}</>
                  }
                </button>
              );
            })}
          </div>
        )}

        {/* ── Agregar productos ── */}
        <button onClick={() => navigate(`/dashboard/mozo/pedidos/${pedido.mesa?.id || pedido.Mesa?.id}`)}
          style={{ width: '100%', padding: '13px 0', background: '#FFEBEE', border: '1.5px solid #FFCDD2', borderRadius: 14, color: '#C62828', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', marginBottom: 20 }}>
          <i className="fas fa-plus" />Agregar más productos
        </button>

        {/* ── Lista de productos ── */}
        <div style={{ background: C.surface, borderRadius: 20, border: `1.5px solid ${C.border}`, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-utensils" style={{ color: '#C62828', fontSize: 14 }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Productos</span>
            <span style={{ marginLeft: 'auto', background: '#FFEBEE', color: '#C62828', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>{detalles.length} ítem{detalles.length !== 1 ? 's' : ''}</span>
          </div>
          {detalles.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
              <i className="fas fa-clipboard" style={{ fontSize: 32, display: 'block', marginBottom: 10, opacity: .3 }} />
              <div style={{ fontSize: 14, fontWeight: 600 }}>Sin productos</div>
            </div>
          ) : (
            <div>
              {detalles.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px', borderBottom: i < detalles.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 900, fontSize: 14, color: '#C62828' }}>
                    {d.cantidad}×
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.producto?.nombre || d.Producto?.nombre || 'Producto'}
                    </div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>S/ {parseFloat(d.precio_unitario || d.producto?.precio || 0).toFixed(2)} c/u</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#16a34a', flexShrink: 0 }}>
                    S/ {parseFloat(d.subtotal).toFixed(2)}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', background: C.surfaceAlt, borderTop: `1.5px solid ${C.border}` }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>Total</span>
                <span style={{ fontWeight: 900, fontSize: 18, color: '#16a34a' }}>S/ {total.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Info del pedido ── */}
        <div style={{ background: C.surface, borderRadius: 20, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-info-circle" style={{ color: C.textMuted, fontSize: 14 }} />
            <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Información</span>
          </div>
          <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { label:'Mesa',  value:`Mesa ${pedido.mesa?.numero || pedido.Mesa?.numero || '—'}`,                icon:'fa-table'    },
              { label:'Mozo',  value: pedido.mozo?.nombre || pedido.Usuario?.nombre || '—',                      icon:'fa-user-tie' },
              { label:'Fecha', value: new Date(pedido.createdAt || pedido.fecha).toLocaleDateString('es'),        icon:'fa-calendar' },
              { label:'Hora',  value: new Date(pedido.createdAt || pedido.fecha).toLocaleTimeString('es',{hour:'2-digit',minute:'2-digit'}), icon:'fa-clock' },
            ].map(r => (
              <div key={r.label} style={{ background: C.surfaceAlt, borderRadius: 12, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, letterSpacing: 0.6, marginBottom: 4 }}>
                  <i className={`fas ${r.icon}`} style={{ marginRight: 5, color: '#C62828' }} />{r.label.toUpperCase()}
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.value}</div>
              </div>
            ))}
          </div>
          {pedido.observaciones && (
            <div style={{ padding: '0 18px 16px' }}>
              <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <i className="fas fa-sticky-note" style={{ color: '#d97706', fontSize: 14, marginTop: 1, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 10, color: '#d97706', fontWeight: 700, letterSpacing: 0.6, marginBottom: 3 }}>OBSERVACIONES</div>
                  <div style={{ fontSize: 13, color: '#92400e', fontWeight: 600 }}>{pedido.observaciones}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PedidoDetalles;
