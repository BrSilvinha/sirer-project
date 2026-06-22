import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productosService, pedidosService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const P = { red: '#C62828', redLt: '#EF5350', gold: '#F9A825', goldDk: '#F57F17', green: '#16a34a', brown: '#2C1810' };

const Spin = ({ color = P.red }) => (
  <div style={{ width: 36, height: 36, border: '3px solid #FFEBEE', borderTop: `3px solid ${color}`, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
);

const DeliveryForm = () => {
  const navigate = useNavigate();
  const { C } = useTheme();

  const [grupos, setGrupos] = useState([]);
  const [catActiva, setCatActiva] = useState('all');
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCarrito, setShowCarrito] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const pR = await productosService.getAvailable();
        setGrupos(pR.data.data || []);
      } catch {
        toast.error('Error al cargar productos');
        navigate('/dashboard/mozo');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const productosMostrar = catActiva === 'all'
    ? grupos.flatMap(g => g.productos || [])
    : (grupos.find(g => g.categoria?.nombre === catActiva)?.productos || []);

  const agregar = (p) => {
    setCarrito(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, cant: i.cant + 1 } : i);
      return [...prev, { id: p.id, nombre: p.nombre, precio: parseFloat(p.precio), cant: 1 }];
    });
  };

  const cambiar = (id, delta) => {
    setCarrito(prev =>
      prev.map(i => i.id === id ? { ...i, cant: i.cant + delta } : i).filter(i => i.cant > 0)
    );
  };

  const total = carrito.reduce((s, i) => s + i.precio * i.cant, 0);
  const totalItems = carrito.reduce((s, i) => s + i.cant, 0);

  const enviar = async () => {
    if (carrito.length === 0) { toast.error('Agrega productos al pedido'); return; }
    setEnviando(true);
    try {
      await pedidosService.create({
        tipo: 'delivery',
        productos: carrito.map(i => ({ producto_id: i.id, cantidad: i.cant })),
        observaciones: obs,
        metodo_pago: metodoPago,
        cliente_nombre: clienteNombre || null,
      });
      toast.success('Pedido delivery registrado');
      navigate('/dashboard/mozo/delivery');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al registrar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '65vh', gap: 14 }}>
        <Spin />
        <span style={{ color: C.textMuted, fontSize: 15 }}>Cargando productos...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeIn{from{opacity:0}to{opacity:1}} @keyframes slideUp{from{transform:translateY(40px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${P.brown} 0%, #3E2723 100%)`,
        borderRadius: '0 0 24px 24px', padding: '16px 16px 20px',
        marginBottom: 16, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(249,168,37,0.08)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/dashboard/mozo/delivery')} style={{
            width: 38, height: 38, borderRadius: 12,
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, cursor: 'pointer', color: '#fff', flexShrink: 0,
          }}>
            <i className="fas fa-arrow-left" />
          </button>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: P.gold }}>Nuevo Delivery</div>
            <div style={{ fontSize: 12, color: '#BCAAA4', marginTop: 2 }}>Selecciona productos y método de pago</div>
          </div>
        </div>
      </div>

      {/* Nombre del cliente (opcional) */}
      <div style={{ padding: '0 16px', marginBottom: 14 }}>
        <div style={{ position: 'relative' }}>
          <i className="fas fa-user" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 13 }} />
          <input
            type="text" placeholder="Nombre del cliente (opcional)"
            value={clienteNombre}
            onChange={e => setClienteNombre(e.target.value)}
            style={{
              width: '100%', padding: '12px 14px 12px 40px',
              border: `1.5px solid ${C.border}`, borderRadius: 14,
              fontSize: 14, outline: 'none', background: C.surface,
              color: C.text, fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Tabs de categoría */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px',
        paddingBottom: 6, marginBottom: 14,
        WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none',
      }}>
        <button onClick={() => setCatActiva('all')} style={{
          padding: '8px 18px', borderRadius: 20, flexShrink: 0,
          background: catActiva === 'all' ? P.red : C.surface,
          color: catActiva === 'all' ? '#fff' : C.textSub,
          fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          boxShadow: catActiva === 'all' ? '0 3px 10px rgba(198,40,40,.3)' : `0 1px 4px rgba(0,0,0,.06)`,
          border: catActiva === 'all' ? 'none' : `1.5px solid ${C.border}`,
        }}>
          Todos
        </button>
        {grupos.map(g => {
          const active = catActiva === g.categoria?.nombre;
          return (
            <button key={g.categoria?.nombre} onClick={() => setCatActiva(g.categoria?.nombre)} style={{
              padding: '8px 18px', borderRadius: 20, flexShrink: 0,
              background: active ? P.red : C.surface,
              color: active ? '#fff' : C.textSub,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: active ? '0 3px 10px rgba(198,40,40,.3)' : `0 1px 4px rgba(0,0,0,.06)`,
              border: active ? 'none' : `1.5px solid ${C.border}`,
            }}>
              {g.categoria?.nombre}
            </button>
          );
        })}
      </div>

      {/* Grid de productos */}
      <div style={{ padding: '0 16px' }}>
        {productosMostrar.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.textMuted }}>Sin productos en esta categoría</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            {productosMostrar.map(p => {
              const enCarrito = carrito.find(i => i.id === p.id);
              return (
                <div key={p.id} style={{
                  background: C.surface, borderRadius: 16, padding: '14px 12px',
                  border: enCarrito ? `2px solid ${P.red}` : `2px solid ${C.border}`,
                  boxShadow: enCarrito ? `0 2px 10px ${P.red}18` : '0 1px 6px rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column', gap: 6, transition: 'all 0.15s',
                }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, lineHeight: 1.3 }}>{p.nombre}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontWeight: 800, fontSize: 15, color: P.green }}>S/{parseFloat(p.precio).toFixed(2)}</span>
                    {enCarrito ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => cambiar(p.id, -1)} style={{ width: 28, height: 28, borderRadius: 8, background: '#FFEBEE', border: 'none', color: P.red, fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                        <span style={{ fontWeight: 800, fontSize: 15, color: P.red, minWidth: 20, textAlign: 'center' }}>{enCarrito.cant}</span>
                        <button onClick={() => cambiar(p.id, 1)} style={{ width: 28, height: 28, borderRadius: 8, background: P.red, border: 'none', color: '#fff', fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                    ) : (
                      <button onClick={() => agregar(p)} style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${P.red}, ${P.redLt})`, border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(198,40,40,.3)' }}>+</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Barra flotante del carrito */}
      {totalItems > 0 && (
        <div style={{
          position: 'fixed', bottom: 72, left: 12, right: 12, zIndex: 100,
          background: `linear-gradient(135deg, ${P.red}, ${P.redLt})`,
          borderRadius: 20, padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          boxShadow: '0 8px 32px rgba(198,40,40,0.45)',
          animation: 'slideUp 0.3s ease',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>S/ {total.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>{totalItems} producto{totalItems !== 1 ? 's' : ''}</div>
          </div>
          <button onClick={() => setShowCarrito(true)} style={{
            background: '#fff', border: 'none', borderRadius: 14,
            padding: '10px 20px', fontWeight: 800, fontSize: 14,
            color: P.red, cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <i className="fas fa-motorcycle" />Ver Pedido
          </button>
        </div>
      )}

      {/* Sheet Carrito */}
      {showCarrito && (
        <>
          <div onClick={() => setShowCarrito(false)} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: C.overlay, backdropFilter: 'blur(4px)', animation: 'fadeIn .2s ease' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1051, background: C.surface, borderRadius: '24px 24px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease', boxShadow: '0 -8px 40px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
              <div style={{ width: 44, height: 5, background: C.border, borderRadius: 3 }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: `1px solid ${C.borderLight}` }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 19, color: C.text }}>
                  <i className="fas fa-motorcycle" style={{ color: P.red, marginRight: 8 }} />Pedido Delivery
                </div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{totalItems} productos · S/ {total.toFixed(2)}</div>
              </div>
              <button onClick={() => setShowCarrito(false)} style={{ width: 36, height: 36, borderRadius: '50%', background: C.surfaceAlt2, border: 'none', cursor: 'pointer', color: C.textMuted, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Items del carrito */}
              {carrito.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${C.borderLight}` }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{item.nombre}</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>S/{item.precio.toFixed(2)} c/u</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button onClick={() => cambiar(item.id, -1)} style={{ width: 30, height: 30, borderRadius: 8, background: '#FFEBEE', border: 'none', color: P.red, fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontWeight: 800, fontSize: 16, color: C.text, minWidth: 24, textAlign: 'center' }}>{item.cant}</span>
                    <button onClick={() => cambiar(item.id, 1)} style={{ width: 30, height: 30, borderRadius: 8, background: P.red, border: 'none', color: '#fff', fontWeight: 900, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: P.green, minWidth: 60, textAlign: 'right' }}>
                    S/{(item.precio * item.cant).toFixed(2)}
                  </div>
                </div>
              ))}

              {/* Método de pago */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 10, textTransform: 'uppercase' }}>Método de pago</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  {[
                    { key: 'efectivo', label: 'Efectivo', icon: 'fa-money-bill-wave', color: P.green },
                    { key: 'tarjeta', label: 'Tarjeta', icon: 'fa-credit-card', color: '#3b82f6' },
                    { key: 'yape', label: 'Yape', icon: 'fa-mobile-alt', color: '#7c3aed' },
                  ].map(m => {
                    const active = metodoPago === m.key;
                    return (
                      <button key={m.key} onClick={() => setMetodoPago(m.key)} style={{
                        flex: 1, padding: '14px 6px', borderRadius: 14,
                        border: `2px solid ${active ? m.color : C.border}`,
                        background: active ? m.color + '12' : C.surface,
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10,
                          background: active ? m.color : C.surfaceAlt2,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          boxShadow: active ? `0 3px 10px ${m.color}40` : 'none',
                        }}>
                          <i className={`fas ${m.icon}`} style={{ color: active ? '#fff' : C.textMuted, fontSize: 15 }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: active ? m.color : C.textSub }}>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observaciones */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' }}>Observaciones (opcional)</div>
                <textarea
                  value={obs} onChange={e => setObs(e.target.value)}
                  placeholder="Ej: Sin ensalada, extra ají..."
                  style={{
                    width: '100%', padding: '12px', border: `1.5px solid ${C.border}`,
                    borderRadius: 12, fontSize: 14, outline: 'none', background: C.inputBg,
                    color: C.text, fontFamily: 'inherit', minHeight: 60, resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {/* Footer con total y botón confirmar */}
            <div style={{ padding: '14px 20px', paddingBottom: 'max(20px, env(safe-area-inset-bottom))', borderTop: `1px solid ${C.borderLight}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 900, color: P.green }}>S/ {total.toFixed(2)}</span>
              </div>
              <button onClick={enviar} disabled={enviando || carrito.length === 0} style={{
                width: '100%', padding: '15px',
                background: enviando ? C.surfaceAlt2 : `linear-gradient(135deg, ${P.red}, ${P.redLt})`,
                color: enviando ? C.textMuted : '#fff',
                border: 'none', borderRadius: 16, fontWeight: 800, fontSize: 16,
                cursor: enviando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: enviando ? 'none' : '0 6px 20px rgba(198,40,40,.4)',
              }}>
                {enviando ? (
                  <><Spin color="#fff" /> Registrando...</>
                ) : (
                  <><i className="fas fa-check-circle" /> Confirmar Delivery</>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DeliveryForm;
