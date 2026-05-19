import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { productosService, pedidosService, mesasService } from '../../services/api';
import toast from 'react-hot-toast';

const Spin = ({ color = '#6366f1' }) => (
  <div style={{
    width: 36, height: 36,
    border: '3px solid #f0f2f5',
    borderTop: `3px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  }} />
);

const PedidosForm = () => {
  const { mesaId } = useParams();
  const navigate = useNavigate();

  const [mesa, setMesa] = useState(null);
  const [grupos, setGrupos] = useState([]);     // [{ categoria, productos[] }]
  const [catActiva, setCatActiva] = useState('all');
  const [carrito, setCarrito] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCarrito, setShowCarrito] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [obs, setObs] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [mR, pR] = await Promise.all([
          mesasService.getById(mesaId),
          productosService.getAvailable(),
        ]);
        setMesa(mR.data.data);
        setGrupos(pR.data.data || []);
      } catch {
        toast.error('Error al cargar datos');
        navigate('/dashboard/mozo');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [mesaId, navigate]);

  // Productos del tab activo
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
    setEnviando(true);
    try {
      await pedidosService.create({
        mesa_id: parseInt(mesaId),
        productos: carrito.map(i => ({ producto_id: i.id, cantidad: i.cant })),
        observaciones: obs,
      });
      toast.success('¡Pedido enviado a cocina! 🍗');
      navigate('/dashboard/mozo');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Error al enviar el pedido');
    } finally {
      setEnviando(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '65vh', gap: 14 }}>
        <Spin />
        <span style={{ color: '#9ca3af', fontSize: 15 }}>Cargando productos...</span>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          onClick={() => navigate('/dashboard/mozo')}
          style={{
            width: 40, height: 40, borderRadius: 12,
            background: '#fff', border: '1.5px solid #e5e7eb',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, cursor: 'pointer', color: '#374151', flexShrink: 0,
          }}
        >
          ←
        </button>
        <div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#1a1a2e' }}>Mesa {mesa?.numero}</div>
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 1 }}>Selecciona los productos</div>
        </div>
      </div>

      {/* Tabs de categoría */}
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto',
        paddingBottom: 6, marginBottom: 16,
        WebkitOverflowScrolling: 'touch',
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        <Tab label="Todos" active={catActiva === 'all'} onClick={() => setCatActiva('all')} />
        {grupos.map(g => (
          <Tab
            key={g.categoria?.nombre}
            label={g.categoria?.nombre}
            active={catActiva === g.categoria?.nombre}
            onClick={() => setCatActiva(g.categoria?.nombre)}
          />
        ))}
      </div>

      {/* Grid de productos */}
      {productosMostrar.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#d1d5db' }}>
          Sin productos en esta categoría
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
          {productosMostrar.map(p => {
            const enCarrito = carrito.find(i => i.id === p.id);
            return (
              <div
                key={p.id}
                style={{
                  background: '#fff', borderRadius: 16,
                  padding: '14px 12px',
                  border: enCarrito ? '2px solid #6366f1' : '2px solid #f3f4f6',
                  boxShadow: enCarrito ? '0 2px 10px #6366f118' : '0 1px 6px rgba(0,0,0,0.06)',
                  display: 'flex', flexDirection: 'column', gap: 6,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', lineHeight: 1.3 }}>
                  {p.nombre}
                </div>
                {p.descripcion && (
                  <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.4 }}>
                    {p.descripcion}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ fontWeight: 800, color: '#16a34a', fontSize: 16 }}>
                    S/ {parseFloat(p.precio).toFixed(2)}
                  </span>
                  {enCarrito ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <CntBtn color="#64748b" onClick={() => cambiar(p.id, -1)}>−</CntBtn>
                      <span style={{ fontWeight: 900, fontSize: 16, minWidth: 22, textAlign: 'center' }}>
                        {enCarrito.cant}
                      </span>
                      <CntBtn color="#16a34a" onClick={() => cambiar(p.id, 1)}>+</CntBtn>
                    </div>
                  ) : (
                    <button
                      onClick={() => agregar(p)}
                      style={{
                        background: '#6366f1', color: '#fff', border: 'none',
                        borderRadius: 10, width: 34, height: 34,
                        fontSize: 20, fontWeight: 800, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FAB del carrito */}
      {totalItems > 0 && (
        <button
          onClick={() => setShowCarrito(true)}
          style={{
            position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#fff', border: 'none', borderRadius: 50,
            padding: '14px 24px',
            fontSize: 15, fontWeight: 800, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 10,
            boxShadow: '0 4px 24px rgba(220,38,38,0.45)',
            zIndex: 150, whiteSpace: 'nowrap',
          }}
        >
          🛒 Ver pedido ({totalItems})
          <span style={{
            background: '#fff', color: '#6366f1',
            borderRadius: 20, padding: '2px 12px',
            fontWeight: 900, fontSize: 14,
          }}>
            S/ {total.toFixed(2)}
          </span>
        </button>
      )}

      {/* Bottom sheet: carrito */}
      {showCarrito && (
        <Overlay onClose={() => setShowCarrito(false)}>
          <SheetHandle />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #f0f2f5' }}>
            <span style={{ fontWeight: 800, fontSize: 18 }}>Tu pedido</span>
            <button onClick={() => setShowCarrito(false)} style={closeBtn}>×</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {carrito.map(item => (
              <div key={item.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid #f9fafb',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>{item.nombre}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>S/ {item.precio.toFixed(2)} c/u</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CntBtn color="#6366f1" onClick={() => cambiar(item.id, -1)}>−</CntBtn>
                  <span style={{ fontWeight: 900, minWidth: 24, textAlign: 'center', fontSize: 16 }}>{item.cant}</span>
                  <CntBtn color="#16a34a" onClick={() => cambiar(item.id, 1)}>+</CntBtn>
                </div>
                <span style={{ fontWeight: 800, color: '#16a34a', minWidth: 64, textAlign: 'right', fontSize: 14 }}>
                  S/ {(item.precio * item.cant).toFixed(2)}
                </span>
              </div>
            ))}

            <textarea
              placeholder="Observaciones para cocina (opcional)..."
              value={obs}
              onChange={e => setObs(e.target.value)}
              rows={2}
              style={{
                width: '100%', marginTop: 14,
                border: '1.5px solid #e5e7eb', borderRadius: 12,
                padding: '10px 14px', fontSize: 13, color: '#374151',
                resize: 'none', outline: 'none', background: '#f9fafb',
              }}
            />

            <div style={{
              display: 'flex', justifyContent: 'space-between',
              fontWeight: 800, fontSize: 18, margin: '14px 0',
              color: '#1a1a2e',
            }}>
              <span>Total:</span>
              <span style={{ color: '#16a34a' }}>S/ {total.toFixed(2)}</span>
            </div>
          </div>

          <div style={{ padding: '12px 20px 24px', borderTop: '1px solid #f0f2f5' }}>
            <button
              onClick={() => { setShowCarrito(false); setShowConfirm(true); }}
              style={{
                width: '100%', padding: 18,
                background: 'linear-gradient(135deg, #15803d, #16a34a)',
                color: '#fff', border: 'none', borderRadius: 16,
                fontSize: 17, fontWeight: 800, cursor: 'pointer',
              }}
            >
              🍳 Enviar a Cocina
            </button>
          </div>
        </Overlay>
      )}

      {/* Confirmación */}
      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, animation: 'fadeIn 0.18s ease',
        }}>
          <div style={{
            background: '#fff', borderRadius: 24, padding: '28px 22px',
            width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
          }}>
            <h3 style={{ fontWeight: 800, fontSize: 20, marginBottom: 4, color: '#1a1a2e' }}>
              Confirmar pedido
            </h3>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 18 }}>
              Mesa {mesa?.numero} · {totalItems} items
            </p>

            {carrito.map(i => (
              <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 7, color: '#374151' }}>
                <span>{i.cant}× {i.nombre}</span>
                <span style={{ fontWeight: 700 }}>S/ {(i.precio * i.cant).toFixed(2)}</span>
              </div>
            ))}

            <div style={{ borderTop: '2px solid #f0f2f5', margin: '14px 0 20px', paddingTop: 14, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 17 }}>
              <span>Total:</span>
              <span style={{ color: '#16a34a' }}>S/ {total.toFixed(2)}</span>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  flex: 1, padding: 15, background: '#f3f4f6',
                  border: 'none', borderRadius: 14, fontWeight: 700,
                  fontSize: 15, cursor: 'pointer', color: '#374151',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={enviar}
                disabled={enviando}
                style={{
                  flex: 2, padding: 15,
                  background: enviando ? '#d1d5db' : 'linear-gradient(135deg, #15803d, #16a34a)',
                  color: '#fff', border: 'none', borderRadius: 14,
                  fontWeight: 800, fontSize: 15,
                  cursor: enviando ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {enviando
                  ? <><SpinSmall /> Enviando...</>
                  : '✅ Confirmar'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Helpers de UI ── */
const Tab = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    style={{
      padding: '8px 18px', borderRadius: 20, border: 'none',
      background: active ? '#6366f1' : '#fff',
      color: active ? '#fff' : '#6b7280',
      fontWeight: active ? 700 : 500,
      fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
      boxShadow: active ? '0 2px 10px #6366f130' : '0 1px 4px rgba(0,0,0,0.08)',
      transition: 'all 0.15s', flexShrink: 0,
    }}
  >
    {label}
  </button>
);

const CntBtn = ({ color, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      background: color, color: '#fff', border: 'none',
      borderRadius: 8, width: 30, height: 30, fontSize: 18,
      fontWeight: 800, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}
  >
    {children}
  </button>
);

const Overlay = ({ onClose, children }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed', inset: 0, zIndex: 1050,
      background: 'rgba(0,0,0,0.55)',
      display: 'flex', alignItems: 'flex-end',
      animation: 'fadeIn 0.2s ease',
    }}
  >
    <div
      onClick={e => e.stopPropagation()}
      style={{
        width: '100%', background: '#fff',
        borderRadius: '22px 22px 0 0',
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        animation: 'slideUp 0.28s ease',
      }}
    >
      {children}
    </div>
  </div>
);

const SheetHandle = () => (
  <div style={{ textAlign: 'center', paddingTop: 10 }}>
    <div style={{ width: 40, height: 4, background: '#dde1e7', borderRadius: 4, display: 'inline-block' }} />
  </div>
);

const SpinSmall = () => (
  <div style={{
    width: 18, height: 18,
    border: '2px solid rgba(255,255,255,0.4)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  }} />
);

const closeBtn = {
  background: '#f3f4f6', border: 'none', borderRadius: '50%',
  width: 34, height: 34, fontSize: 18, cursor: 'pointer',
  color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

export default PedidosForm;
