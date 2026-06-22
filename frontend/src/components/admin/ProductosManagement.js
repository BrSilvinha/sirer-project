import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { productosService, categoriasService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const CAT_COLORS = ['#C62828','#16a34a','#dc2626','#f59e0b','#0ea5e9','#8b5cf6','#ec4899','#14b8a6'];
const catColor   = (id) => CAT_COLORS[(id ?? 0) % CAT_COLORS.length];
const catLight   = (id) => catColor(id) + '18';
const PAGE_SIZE  = 20;

const Spin = () => {
  const { C } = useTheme();
  return <div style={{ width: 44, height: 44, border: `4px solid ${C.surfaceAlt2}`, borderTop: '4px solid #C62828', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />;
};

const Toggle = ({ value, onChange }) => (
  <div onClick={onChange} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
    <div style={{ width: 48, height: 28, borderRadius: 14, background: value ? '#16a34a' : '#94a3b8', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 4, left: value ? 24 : 4, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
    </div>
    <span style={{ fontWeight: 700, fontSize: 14, color: value ? '#16a34a' : '#94a3b8' }}>
      {value ? 'Disponible' : 'Agotado'}
    </span>
  </div>
);

const Sheet = ({ open, onClose, title, children, footer }) => {
  const { C } = useTheme();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: C.overlay, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: C.surface, borderRadius: '26px 26px 0 0', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.26s ease' }}>
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 4, display: 'inline-block' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 14px', borderBottom: `1px solid ${C.borderLight}` }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{title}</span>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: C.surfaceAlt2, border: 'none', cursor: 'pointer', color: C.textSub, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>{children}</div>
        {footer && <div style={{ padding: '12px 20px 32px', borderTop: `1px solid ${C.borderLight}` }}>{footer}</div>}
      </div>
    </div>
  );
};

const Field = ({ label, children }) => {
  const { C } = useTheme();
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
};

const ProductoSheet = ({ producto, onClose, onEdit, onDelete, onToggle }) => {
  const { C } = useTheme();
  if (!producto) return null;
  const color = catColor(producto.categoria?.id);
  const light = catLight(producto.categoria?.id);

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: C.overlay, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: C.surface, borderRadius: '26px 26px 0 0', animation: 'slideUp 0.26s ease', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, background: C.border, borderRadius: 4, display: 'inline-block' }} />
        </div>
        <div style={{ background: light, padding: '16px 20px 24px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: `0 8px 24px ${color}55` }}>
            <i className="fas fa-utensils" style={{ fontSize: 28, color: '#fff' }}></i>
          </div>
          <div style={{ fontWeight: 900, fontSize: 20, color: '#2C1810', marginBottom: 6 }}>{producto.nombre}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: color, color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700, marginBottom: 10 }}>
            <i className="fas fa-tag" style={{ fontSize: 10 }}></i>
            {producto.categoria?.nombre || 'Sin categoría'}
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#16a34a' }}>S/ {parseFloat(producto.precio || 0).toFixed(2)}</div>
          {producto.descripcion && (
            <div style={{ fontSize: 13, color: '#64748b', marginTop: 8, lineHeight: 1.5 }}>{producto.descripcion}</div>
          )}
        </div>

        <div style={{ padding: '20px 20px 36px' }}>
          <div style={{ background: C.surfaceAlt, borderRadius: 14, padding: '14px 16px', marginBottom: 16, border: `1.5px solid ${C.borderLight}` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 0.8, marginBottom: 10 }}>DISPONIBILIDAD</div>
            <Toggle value={producto.disponible} onChange={() => onToggle(producto)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onEdit} style={{ flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.surfaceAlt, color: C.textSub, fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className="fas fa-pen" style={{ fontSize: 13 }}></i>Editar
            </button>
            <button onClick={() => onDelete(producto)} style={{ flex: 1, padding: '14px', borderRadius: 14, border: '1.5px solid #fecaca', background: '#fef2f2', color: '#dc2626', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className="fas fa-trash" style={{ fontSize: 13 }}></i>Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProductoCard = ({ producto, onTap }) => {
  const { C } = useTheme();
  const [pressed, setPressed] = useState(false);
  const color = catColor(producto.categoria?.id);
  const light = catLight(producto.categoria?.id);

  return (
    <div
      onClick={onTap}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      style={{
        background: C.surface, borderRadius: 18, padding: '14px 16px', marginBottom: 10,
        boxShadow: pressed ? '0 1px 6px rgba(0,0,0,0.06)' : '0 3px 14px rgba(0,0,0,0.07)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14,
        transform: pressed ? 'scale(0.98)' : 'scale(1)', transition: 'transform 0.1s ease',
        opacity: producto.disponible ? 1 : 0.6, border: `1.5px solid ${C.borderLight}`,
      }}
    >
      <div style={{ width: 50, height: 50, borderRadius: 14, background: light, border: `1.5px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className="fas fa-utensils" style={{ color, fontSize: 18 }}></i>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{producto.nombre}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ background: light, color, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>{producto.categoria?.nombre || 'Sin cat.'}</span>
          <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 800 }}>S/ {parseFloat(producto.precio || 0).toFixed(2)}</span>
        </div>
        <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: producto.disponible ? '#22c55e' : '#ef4444' }} />
          <span style={{ fontSize: 11, color: producto.disponible ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
            {producto.disponible ? 'Disponible' : 'Agotado'}
          </span>
        </div>
      </div>
      <i className="fas fa-chevron-right" style={{ color: C.textMuted, fontSize: 13, flexShrink: 0 }}></i>
    </div>
  );
};

const Pagination = ({ page, totalPages, onPrev, onNext, total, pageSize }) => {
  const { C } = useTheme();
  if (totalPages <= 1) return null;
  const start = (page - 1) * pageSize + 1;
  const end   = Math.min(page * pageSize, total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, padding: '10px 4px' }}>
      <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{start}–{end} de {total}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onPrev} disabled={page === 1}
          style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`, background: page === 1 ? C.surfaceAlt2 : C.surface, color: page === 1 ? C.textMuted : C.text, cursor: page === 1 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-chevron-left" style={{ fontSize: 11 }}></i>
        </button>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.textSub, minWidth: 60, textAlign: 'center' }}>{page} / {totalPages}</span>
        <button onClick={onNext} disabled={page === totalPages}
          style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${C.border}`, background: page === totalPages ? C.surfaceAlt2 : C.surface, color: page === totalPages ? C.textMuted : C.text, cursor: page === totalPages ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <i className="fas fa-chevron-right" style={{ fontSize: 11 }}></i>
        </button>
      </div>
    </div>
  );
};

const ProductosManagement = () => {
  const { C } = useTheme();
  const [productos,   setProductos]   = useState([]);
  const [categorias,  setCategorias]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [showCatForm, setShowCatForm] = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [filtros,     setFiltros]     = useState({ categoria: 'todas', disponibilidad: 'todos', busqueda: '' });
  const [formData,    setFormData]    = useState({ nombre: '', descripcion: '', precio: '', categoria_id: '', disponible: true });
  const [catForm,     setCatForm]     = useState({ nombre: '', descripcion: '' });
  const [page,        setPage]        = useState(1);

  const inputSt = {
    width: '100%', padding: '13px 14px', border: `1.5px solid ${C.border}`,
    borderRadius: 12, fontSize: 15, outline: 'none', background: C.inputBg,
    color: C.text, fontFamily: 'inherit', boxSizing: 'border-box',
  };

  const fetchAll = useCallback(async () => {
    try {
      const [r1, r2] = await Promise.all([productosService.getAll(), categoriasService.getAll()]);
      setProductos(r1.data.data || []);
      setCategorias(r2.data.data || []);
    } catch { toast.error('Error al cargar datos'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { setPage(1); }, [filtros]);

  const productosFiltrados = useMemo(() => {
    let list = [...productos];
    if (filtros.categoria !== 'todas') list = list.filter(p => p.categoria?.id === parseInt(filtros.categoria));
    if (filtros.disponibilidad === 'disponibles') list = list.filter(p => p.disponible);
    if (filtros.disponibilidad === 'agotados')    list = list.filter(p => !p.disponible);
    if (filtros.busqueda.trim()) {
      const q = filtros.busqueda.toLowerCase();
      list = list.filter(p => p.nombre?.toLowerCase().includes(q) || p.categoria?.nombre?.toLowerCase().includes(q));
    }
    return list;
  }, [productos, filtros]);

  const totalPages    = Math.max(1, Math.ceil(productosFiltrados.length / PAGE_SIZE));
  const productosPagina = useMemo(
    () => productosFiltrados.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [productosFiltrados, page]
  );

  const openNew = () => {
    setEditing(null);
    setFormData({ nombre: '', descripcion: '', precio: '', categoria_id: '', disponible: true });
    setShowForm(true);
  };
  const openEdit = () => {
    const p = selected; setSelected(null);
    setTimeout(() => {
      setEditing(p);
      setFormData({ nombre: p.nombre, descripcion: p.descripcion || '', precio: p.precio?.toString() || '', categoria_id: p.categoria_id?.toString() || '', disponible: Boolean(p.disponible) });
      setShowForm(true);
    }, 200);
  };

  const handleSubmit = async () => {
    if (!formData.nombre.trim()) { toast.error('El nombre es requerido'); return; }
    const precio = parseFloat(formData.precio);
    if (!formData.precio || isNaN(precio) || precio <= 0) { toast.error('Precio inválido'); return; }
    if (!formData.categoria_id) { toast.error('Selecciona una categoría'); return; }
    setSaving(true);
    try {
      const payload = { nombre: formData.nombre.trim(), descripcion: formData.descripcion.trim(), precio, categoria_id: parseInt(formData.categoria_id), disponible: formData.disponible };
      if (editing) { await productosService.update(editing.id, payload); toast.success('Producto actualizado'); }
      else          { await productosService.create(payload);             toast.success('Producto creado');     }
      setShowForm(false); fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (producto) => {
    if (!window.confirm(`¿Eliminar "${producto.nombre}"?`)) return;
    setSelected(null);
    try { await productosService.delete(producto.id); toast.success('Producto eliminado'); fetchAll(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error al eliminar'); }
  };

  const handleToggle = async (producto) => {
    const nuevo = !producto.disponible;
    try {
      await productosService.changeAvailability(producto.id, nuevo);
      toast.success(`${producto.nombre} → ${nuevo ? 'Disponible' : 'Agotado'}`);
      setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, disponible: nuevo } : p));
      setSelected(prev => prev ? { ...prev, disponible: nuevo } : null);
    } catch { toast.error('Error al cambiar disponibilidad'); }
  };

  const handleCrearCategoria = async () => {
    if (!catForm.nombre.trim()) { toast.error('Nombre requerido'); return; }
    setSaving(true);
    try {
      await categoriasService.create({ nombre: catForm.nombre.trim(), descripcion: catForm.descripcion.trim() });
      toast.success('Categoría creada'); setShowCatForm(false); setCatForm({ nombre: '', descripcion: '' }); fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al crear categoría'); }
    finally { setSaving(false); }
  };

  const total      = productos.length;
  const disponibles = productos.filter(p => p.disponible).length;
  const agotados   = productos.filter(p => !p.disponible).length;

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {[
          { label: 'Total',       value: total,            color: '#C62828', icon: 'fa-utensils'     },
          { label: 'Disponibles', value: disponibles,       color: '#16a34a', icon: 'fa-circle-check' },
          { label: 'Agotados',    value: agotados,          color: '#ef4444', icon: 'fa-ban'          },
          { label: 'Categorías',  value: categorias.length, color: '#f59e0b', icon: 'fa-tags'         },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: C.surface, borderRadius: 16, padding: '12px 6px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: `1px solid ${C.borderLight}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
              <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 13 }}></i>
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: C.textMuted, fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Buscar */}
      <div style={{ position: 'relative', marginBottom: 12 }}>
        <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: C.textMuted, fontSize: 14 }}></i>
        <input type="text" placeholder="Buscar producto..." value={filtros.busqueda}
          onChange={e => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
          style={{ ...inputSt, paddingLeft: 40 }} />
      </div>

      {/* Filtro categoría */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 4, marginBottom: 10, WebkitOverflowScrolling: 'touch', msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <button onClick={() => setFiltros(f => ({ ...f, categoria: 'todas' }))}
          style={{ padding: '7px 16px', borderRadius: 20, border: 'none', background: filtros.categoria === 'todas' ? C.text : C.surfaceAlt2, color: filtros.categoria === 'todas' ? C.bg : C.textSub, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
          Todas
        </button>
        {categorias.map(c => {
          const active = filtros.categoria === String(c.id);
          const col = catColor(c.id);
          return (
            <button key={c.id} onClick={() => setFiltros(f => ({ ...f, categoria: String(c.id) }))}
              style={{ padding: '7px 16px', borderRadius: 20, border: 'none', background: active ? col : C.surfaceAlt2, color: active ? '#fff' : C.textSub, fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, fontFamily: 'inherit' }}>
              {c.nombre}
            </button>
          );
        })}
      </div>

      {/* Filtro disponibilidad */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[['todos','Todos'],['disponibles','Disponibles'],['agotados','Agotados']].map(([v, l]) => (
          <button key={v} onClick={() => setFiltros(f => ({ ...f, disponibilidad: v }))}
            style={{ flex: 1, padding: '9px 0', borderRadius: 10, border: 'none', background: filtros.disponibilidad === v ? '#C62828' : C.surfaceAlt2, color: filtros.disponibilidad === v ? '#fff' : C.textSub, fontWeight: 700, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
            {l}
          </button>
        ))}
      </div>

      {/* Botón nueva categoría */}
      <button onClick={() => setShowCatForm(true)}
        style={{ width: '100%', padding: '11px', borderRadius: 12, border: '1.5px dashed #FFCDD2', background: '#FFEBEE', color: '#C62828', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 18 }}>
        <i className="fas fa-tags"></i>Nueva Categoría
      </button>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}><Spin /></div>
      ) : productosFiltrados.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 60 }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, background: C.surfaceAlt2, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="fas fa-utensils" style={{ fontSize: 30, color: C.textMuted }}></i>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: C.textSub }}>Sin productos</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>Ajusta los filtros o agrega uno nuevo</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 12 }}>
            {productosFiltrados.length} PRODUCTO{productosFiltrados.length !== 1 ? 'S' : ''}
          </div>
          {productosPagina.map(p => (
            <ProductoCard key={p.id} producto={p} onTap={() => setSelected(p)} />
          ))}
          <Pagination
            page={page} totalPages={totalPages}
            onPrev={() => setPage(p => p - 1)} onNext={() => setPage(p => p + 1)}
            total={productosFiltrados.length} pageSize={PAGE_SIZE}
          />
        </>
      )}

      {/* FAB */}
      <button onClick={openNew}
        style={{ position: 'fixed', bottom: 86, right: 20, zIndex: 900, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg, #9B1B1B, #C62828)', color: '#fff', border: 'none', boxShadow: '0 6px 28px rgba(198,40,40,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fas fa-plus" style={{ fontSize: 22 }}></i>
      </button>

      <ProductoSheet producto={selected} onClose={() => setSelected(null)} onEdit={openEdit} onDelete={handleDelete} onToggle={handleToggle} />

      <Sheet open={showForm} onClose={() => setShowForm(false)} title={editing ? `Editar: ${editing.nombre}` : 'Nuevo Producto'}
        footer={
          <button onClick={handleSubmit} disabled={saving}
            style={{ width: '100%', padding: 16, border: 'none', borderRadius: 14, background: saving ? '#94a3b8' : 'linear-gradient(135deg, #9B1B1B, #C62828)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <i className={saving ? 'fas fa-circle-notch fa-spin' : editing ? 'fas fa-save' : 'fas fa-plus'}></i>
            {saving ? 'Guardando...' : editing ? 'Actualizar Producto' : 'Crear Producto'}
          </button>
        }>
        <Field label="Nombre *">
          <input style={inputSt} type="text" placeholder="Ej: Pollo a la brasa" value={formData.nombre} onChange={e => setFormData(f => ({ ...f, nombre: e.target.value }))} />
        </Field>
        <Field label="Precio (S/) *">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#16a34a', fontSize: 16 }}>S/</span>
            <input style={{ ...inputSt, paddingLeft: 36 }} type="number" inputMode="decimal" step="0.01" min="0" placeholder="0.00" value={formData.precio} onChange={e => setFormData(f => ({ ...f, precio: e.target.value }))} />
          </div>
        </Field>
        <Field label="Categoría *">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {categorias.map(c => {
              const active = formData.categoria_id === String(c.id);
              const col = catColor(c.id);
              return (
                <button key={c.id} type="button" onClick={() => setFormData(f => ({ ...f, categoria_id: String(c.id) }))}
                  style={{ padding: '9px 16px', borderRadius: 10, border: `2px solid ${active ? col : C.border}`, background: active ? col + '15' : C.surfaceAlt, color: active ? col : C.textSub, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {c.nombre}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="Descripción (opcional)">
          <textarea style={{ ...inputSt, minHeight: 80, resize: 'vertical', lineHeight: 1.5 }} placeholder="Descripción del producto..."
            value={formData.descripcion} onChange={e => setFormData(f => ({ ...f, descripcion: e.target.value }))} />
        </Field>
        <Field label="Disponibilidad">
          <div style={{ padding: '12px 14px', background: C.surfaceAlt, borderRadius: 12, border: `1.5px solid ${C.borderLight}` }}>
            <Toggle value={formData.disponible} onChange={() => setFormData(f => ({ ...f, disponible: !f.disponible }))} />
          </div>
        </Field>
      </Sheet>

      <Sheet open={showCatForm} onClose={() => setShowCatForm(false)} title="Nueva Categoría"
        footer={
          <button onClick={handleCrearCategoria} disabled={saving}
            style={{ width: '100%', padding: 16, border: 'none', borderRadius: 14, background: saving ? '#94a3b8' : 'linear-gradient(135deg, #9B1B1B, #C62828)', color: '#fff', fontWeight: 800, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <i className={saving ? 'fas fa-circle-notch fa-spin' : 'fas fa-tags'}></i>
            {saving ? 'Guardando...' : 'Crear Categoría'}
          </button>
        }>
        <Field label="Nombre *">
          <input style={inputSt} type="text" placeholder="Ej: Bebidas, Platos Principales..." value={catForm.nombre} onChange={e => setCatForm(f => ({ ...f, nombre: e.target.value }))} />
        </Field>
        <Field label="Descripción (opcional)">
          <textarea style={{ ...inputSt, minHeight: 70, resize: 'vertical' }} placeholder="Descripción opcional..." value={catForm.descripcion} onChange={e => setCatForm(f => ({ ...f, descripcion: e.target.value }))} />
        </Field>
      </Sheet>
    </div>
  );
};

export default ProductosManagement;
