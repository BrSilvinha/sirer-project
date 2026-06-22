import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { pedidosService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const P = { red: '#C62828', redLt: '#EF5350', gold: '#F9A825', green: '#16a34a', brown: '#2C1810' };

const METODO = {
  efectivo: { label: 'Efectivo', icon: 'fa-money-bill-wave', color: '#16a34a' },
  tarjeta:  { label: 'Tarjeta', icon: 'fa-credit-card',     color: '#3b82f6' },
  yape:     { label: 'Yape',    icon: 'fa-mobile-alt',       color: '#7c3aed' },
};

const DeliveryView = () => {
  const navigate = useNavigate();
  const { C } = useTheme();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDelivery = useCallback(async () => {
    try {
      const r = await pedidosService.getAll({ limit: 50 });
      const all = r.data?.data || [];
      setPedidos(all.filter(p => p.tipo === 'delivery'));
    } catch { toast.error('Error al cargar pedidos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchDelivery(); }, [fetchDelivery]);

  const hoy = pedidos.filter(p => {
    const d = new Date(p.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  const totalHoy = hoy.reduce((s, p) => s + parseFloat(p.total || 0), 0);

  return (
    <div style={{ minHeight: '100%', paddingBottom: 100 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${P.brown} 0%, #3E2723 100%)`,
        borderRadius: '0 0 24px 24px', padding: '16px 16px 20px',
        marginBottom: 16, position: 'relative', overflow: 'hidden',
        animation: 'fadeUp .3s ease',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(249,168,37,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(249,168,37,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-motorcycle" style={{ color: P.gold, fontSize: 18 }} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: P.gold }}>Pedidos Delivery</div>
            <div style={{ fontSize: 12, color: '#BCAAA4' }}>Registra pedidos para llevar</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 10, color: '#BCAAA4', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>Hoy</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{hoy.length}</div>
            <div style={{ fontSize: 11, color: '#8D6E63', marginTop: 2 }}>pedidos</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(22,163,74,0.12)', borderRadius: 14, padding: '12px 14px', border: '1px solid rgba(22,163,74,0.15)' }}>
            <div style={{ fontSize: 10, color: '#86efac', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 4 }}>Ventas</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#22c55e', lineHeight: 1 }}>S/{totalHoy.toFixed(0)}</div>
            <div style={{ fontSize: 11, color: '#4ade80', marginTop: 2 }}>del día</div>
          </div>
        </div>
      </div>

      {/* Lista de pedidos delivery de hoy */}
      <div style={{ padding: '0 16px', animation: 'fadeUp .4s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>{hoy.length} pedido{hoy.length !== 1 ? 's' : ''} hoy</span>
          <button onClick={fetchDelivery} style={{
            width: 34, height: 34, borderRadius: 10, border: 'none',
            background: '#FFEBEE', color: P.red, cursor: 'pointer', fontSize: 13,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} />
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 0', gap: 14 }}>
            <div style={{ width: 40, height: 40, border: '3px solid #FFEBEE', borderTop: `3px solid ${P.gold}`, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
            <span style={{ color: C.textMuted, fontSize: 14 }}>Cargando...</span>
          </div>
        ) : hoy.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: C.surfaceAlt2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <i className="fas fa-motorcycle" style={{ fontSize: 32, color: C.textMuted }} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.textSub }}>Sin pedidos delivery hoy</div>
            <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>Toca el botón + para registrar uno</div>
          </div>
        ) : (
          hoy.map((p, i) => {
            const met = METODO[p.metodo_pago] || METODO.efectivo;
            return (
              <div key={p.id} style={{
                background: C.surface, borderRadius: 18, padding: '14px 16px',
                marginBottom: 10, border: `1.5px solid ${C.border}`,
                boxShadow: '0 2px 10px rgba(0,0,0,.05)',
                borderLeft: `4px solid ${met.color}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: `${met.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className={`fas ${met.icon}`} style={{ color: met.color, fontSize: 12 }} />
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>
                        #{p.id} {p.cliente_nombre ? `· ${p.cliente_nombre}` : ''}
                      </span>
                      <div style={{ fontSize: 11, color: C.textMuted }}>
                        {new Date(p.createdAt).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: P.green }}>S/{parseFloat(p.total).toFixed(2)}</div>
                    <span style={{ background: met.color, color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700 }}>{met.label}</span>
                  </div>
                </div>
                {p.detalles?.map((d, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.textSub, padding: '3px 0', marginLeft: 38 }}>
                    <span><strong style={{ color: C.text }}>{d.cantidad}×</strong> {d.producto?.nombre}</span>
                    <span style={{ fontWeight: 600 }}>S/{parseFloat(d.subtotal).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            );
          })
        )}
      </div>

      {/* FAB */}
      <button onClick={() => navigate('/dashboard/mozo/delivery/nuevo')} style={{
        position: 'fixed', bottom: 86, right: 20, zIndex: 900,
        width: 58, height: 58, borderRadius: '50%',
        background: `linear-gradient(135deg, ${P.red}, ${P.redLt})`,
        color: '#fff', border: 'none',
        boxShadow: '0 6px 28px rgba(198,40,40,0.55)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22,
      }}>
        <i className="fas fa-plus" />
      </button>
    </div>
  );
};

export default DeliveryView;
