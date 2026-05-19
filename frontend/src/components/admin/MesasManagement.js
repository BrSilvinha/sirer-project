import React, { useState, useEffect, useCallback } from 'react';
import { mesasService } from '../../services/api';
import toast from 'react-hot-toast';

const ESTADO = {
  libre:             { label: 'Libre',   color: '#16a34a', light: '#dcfce7', icon: 'fa-circle-check'        },
  ocupada:           { label: 'Ocupada', color: '#dc2626', light: '#fee2e2', icon: 'fa-users'               },
  cuenta_solicitada: { label: 'Cuenta',  color: '#d97706', light: '#fef3c7', icon: 'fa-file-invoice-dollar' },
};

const Spin = () => (
  <div style={{ width: 44, height: 44, border: '4px solid #f1f5f9', borderTop: '4px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
);

/* ── Sheet de detalle / acciones ── */
const MesaSheet = ({ mesa, onClose, onStatus, onEdit, onDelete, saving }) => {
  if (!mesa) return null;
  const est = ESTADO[mesa.estado] || ESTADO.libre;

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.18s ease' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', background: '#fff', borderRadius: '26px 26px 0 0', animation: 'slideUp 0.26s ease', overflow: 'hidden' }}
      >
        {/* Handle */}
        <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 4, display: 'inline-block' }} />
        </div>

        {/* Header con círculo grande */}
        <div style={{ textAlign: 'center', padding: '16px 20px 24px', background: est.light }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            background: est.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
            boxShadow: `0 8px 28px ${est.color}55`,
          }}>
            <span style={{ fontWeight: 900, fontSize: 36, color: '#fff', lineHeight: 1 }}>{mesa.numero}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#0f172a' }}>Mesa {mesa.numero}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: est.color, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, marginTop: 8 }}>
            <i className={`fas ${est.icon}`} style={{ fontSize: 11 }}></i>
            {est.label}
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>
            <i className="fas fa-users" style={{ marginRight: 5 }}></i>
            {mesa.capacidad} personas
          </div>
        </div>

        <div style={{ padding: '20px 20px 36px' }}>

          {/* Cambiar estado */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 12 }}>CAMBIAR ESTADO</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {Object.entries(ESTADO).map(([key, e]) => {
              const active = mesa.estado === key;
              return (
                <button
                  key={key}
                  onClick={() => !active && onStatus(key)}
                  disabled={active || saving}
                  style={{
                    flex: 1, padding: '12px 4px', borderRadius: 14,
                    border: `2px solid ${active ? e.color : '#e2e8f0'}`,
                    background: active ? e.light : '#f8fafc',
                    cursor: active ? 'default' : 'pointer',
                    fontFamily: 'inherit', transition: 'all 0.15s',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: active ? e.color : '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`fas ${e.icon}`} style={{ color: active ? '#fff' : '#94a3b8', fontSize: 13 }}></i>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? e.color : '#64748b' }}>{e.label}</span>
                </button>
              );
            })}
          </div>

          {/* Editar / Eliminar */}
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 1, marginBottom: 12 }}>CONFIGURACIÓN</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={onEdit}
              style={{
                flex: 1, padding: '14px', borderRadius: 14,
                border: '1.5px solid #e2e8f0', background: '#f8fafc',
                color: '#334155', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <i className="fas fa-pen" style={{ fontSize: 13 }}></i>
              Editar mesa
            </button>
            <button
              onClick={() => onDelete(mesa)}
              disabled={mesa.estado !== 'libre'}
              style={{
                flex: 1, padding: '14px', borderRadius: 14,
                border: `1.5px solid ${mesa.estado === 'libre' ? '#fecaca' : '#e2e8f0'}`,
                background: mesa.estado === 'libre' ? '#fef2f2' : '#f8fafc',
                color: mesa.estado === 'libre' ? '#dc2626' : '#cbd5e1',
                fontWeight: 700, fontSize: 14,
                cursor: mesa.estado === 'libre' ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <i className="fas fa-trash" style={{ fontSize: 13 }}></i>
              {mesa.estado === 'libre' ? 'Eliminar' : 'En uso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Sheet formulario ── */
const FormSheet = ({ open, onClose, editing, formData, setFormData, onSubmit, saving }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(15,23,42,0.65)', display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: '#fff', borderRadius: '26px 26px 0 0', animation: 'slideUp 0.26s ease' }}>
        <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 40, height: 4, background: '#e2e8f0', borderRadius: 4, display: 'inline-block' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 16px', borderBottom: '1px solid #f1f5f9' }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#0f172a' }}>
            {editing ? `Editar Mesa ${editing.numero}` : 'Nueva Mesa'}
          </span>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: '#f1f5f9', border: 'none', cursor: 'pointer', color: '#64748b', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {/* Número */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Número de mesa</label>
            <input
              type="number" inputMode="numeric" placeholder="Ej: 1, 2, 3..."
              value={formData.numero}
              onChange={e => setFormData(f => ({ ...f, numero: parseInt(e.target.value) || '' }))}
              min={1} max={999}
              style={{ width: '100%', padding: '18px', border: '2px solid #e2e8f0', borderRadius: 16, fontSize: 32, fontWeight: 900, outline: 'none', background: '#f8fafc', color: '#0f172a', fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }}
            />
          </div>

          {/* Capacidad */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
              <i className="fas fa-users" style={{ marginRight: 6 }}></i>Capacidad — {formData.capacidad} personas
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {[2, 4, 6, 8, 10, 12].map(n => (
                <button
                  key={n} type="button"
                  onClick={() => setFormData(f => ({ ...f, capacidad: n }))}
                  style={{
                    padding: '16px 0', borderRadius: 14,
                    border: `2px solid ${formData.capacidad === n ? '#6366f1' : '#e2e8f0'}`,
                    background: formData.capacidad === n ? '#eef2ff' : '#f8fafc',
                    color: formData.capacidad === n ? '#4f46e5' : '#64748b',
                    fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >{n}</button>
              ))}
            </div>
          </div>

          <button
            onClick={onSubmit} disabled={saving || !formData.numero}
            style={{
              width: '100%', padding: 16, border: 'none', borderRadius: 16,
              background: (saving || !formData.numero) ? '#e2e8f0' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
              color: (saving || !formData.numero) ? '#94a3b8' : '#fff',
              fontWeight: 800, fontSize: 16,
              cursor: (saving || !formData.numero) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              marginBottom: 16,
            }}
          >
            <i className={saving ? 'fas fa-circle-notch fa-spin' : editing ? 'fas fa-save' : 'fas fa-plus'}></i>
            {saving ? 'Guardando...' : editing ? 'Actualizar Mesa' : 'Crear Mesa'}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Tarjeta de mesa — LIMPIA, solo tap ── */
const MesaCard = ({ mesa, onTap }) => {
  const est = ESTADO[mesa.estado] || ESTADO.libre;
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={onTap}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      style={{
        background: '#fff',
        borderRadius: 20,
        padding: '20px 16px',
        boxShadow: pressed ? '0 2px 8px rgba(0,0,0,0.08)' : '0 4px 18px rgba(0,0,0,0.07)',
        cursor: 'pointer',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        textAlign: 'center',
        border: `2px solid ${pressed ? est.color + '40' : 'transparent'}`,
      }}
    >
      {/* Círculo con número */}
      <div style={{
        width: 70, height: 70, borderRadius: '50%',
        background: `linear-gradient(145deg, ${est.color}, ${est.color}cc)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 12px',
        boxShadow: `0 6px 20px ${est.color}45`,
      }}>
        <span style={{ fontWeight: 900, fontSize: 28, color: '#fff', lineHeight: 1 }}>{mesa.numero}</span>
      </div>

      {/* Label */}
      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 6 }}>Mesa {mesa.numero}</div>

      {/* Badge estado */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: est.light, color: est.color,
        borderRadius: 20, padding: '4px 10px',
        fontSize: 11, fontWeight: 700, marginBottom: 8,
      }}>
        <i className={`fas ${est.icon}`} style={{ fontSize: 10 }}></i>
        {est.label}
      </div>

      {/* Capacidad */}
      <div style={{ fontSize: 12, color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <i className="fas fa-users" style={{ fontSize: 11 }}></i>
        {mesa.capacidad} pers.
      </div>

      {/* Hint */}
      <div style={{ marginTop: 10, fontSize: 10, color: '#cbd5e1', fontWeight: 600 }}>
        Toca para gestionar
      </div>
    </div>
  );
};

/* ── Componente principal ── */
const MesasManagement = () => {
  const [mesas,       setMesas]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [selected,    setSelected]    = useState(null);   // mesa seleccionada → sheet detalle
  const [showForm,    setShowForm]    = useState(false);
  const [editingMesa, setEditingMesa] = useState(null);
  const [formData,    setFormData]    = useState({ numero: '', capacidad: 4 });

  const fetchMesas = useCallback(async () => {
    try {
      const r = await mesasService.getAll();
      setMesas(r.data.data || []);
    } catch {
      toast.error('Error al cargar mesas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMesas();
    const t = setInterval(fetchMesas, 30000);
    return () => clearInterval(t);
  }, [fetchMesas]);

  const openNew = () => { setEditingMesa(null); setFormData({ numero: '', capacidad: 4 }); setShowForm(true); };
  const openEdit = () => {
    const mesa = selected;
    setSelected(null);
    setTimeout(() => { setEditingMesa(mesa); setFormData({ numero: mesa.numero, capacidad: mesa.capacidad }); setShowForm(true); }, 200);
  };

  const handleSubmit = async () => {
    if (!formData.numero) { toast.error('Ingresa el número de mesa'); return; }
    setSaving(true);
    try {
      if (editingMesa) {
        await mesasService.update(editingMesa.id, formData);
        toast.success('Mesa actualizada');
      } else {
        await mesasService.create(formData);
        toast.success('Mesa creada');
      }
      setShowForm(false);
      fetchMesas();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mesa) => {
    if (!window.confirm(`¿Eliminar Mesa ${mesa.numero}?`)) return;
    setSelected(null);
    try {
      await mesasService.delete(mesa.id);
      toast.success('Mesa eliminada');
      fetchMesas();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al eliminar');
    }
  };

  const handleStatus = async (nuevoEstado) => {
    if (!selected) return;
    setSaving(true);
    try {
      await mesasService.changeStatus(selected.id, nuevoEstado);
      toast.success(`Mesa ${selected.numero} → ${ESTADO[nuevoEstado]?.label}`);
      // Actualiza localmente para respuesta inmediata
      setMesas(prev => prev.map(m => m.id === selected.id ? { ...m, estado: nuevoEstado } : m));
      setSelected(prev => ({ ...prev, estado: nuevoEstado }));
    } catch {
      toast.error('Error al cambiar estado');
    } finally {
      setSaving(false);
    }
  };

  /* Conteos */
  const libres   = mesas.filter(m => m.estado === 'libre').length;
  const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
  const cuenta   = mesas.filter(m => m.estado === 'cuenta_solicitada').length;

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[
          { label: 'Total',   value: mesas.length, color: '#6366f1', icon: 'fa-table-cells'   },
          { label: 'Libres',  value: libres,        color: '#16a34a', icon: 'fa-circle-check'  },
          { label: 'Ocup.',   value: ocupadas,      color: '#dc2626', icon: 'fa-users'         },
          { label: 'Cuenta',  value: cuenta,        color: '#d97706', icon: 'fa-receipt'       },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '14px 8px', textAlign: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
              <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 14 }}></i>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid de mesas */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin /></div>
      ) : mesas.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <i className="fas fa-table-cells" style={{ fontSize: 34, color: '#cbd5e1' }}></i>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#475569' }}>Sin mesas registradas</div>
          <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 6 }}>Toca el botón <strong>+</strong> para agregar la primera</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.8, marginBottom: 14 }}>
            {mesas.length} MESA{mesas.length !== 1 ? 'S' : ''} · toca cualquiera para gestionar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {mesas.map(m => (
              <MesaCard key={m.id} mesa={m} onTap={() => setSelected(m)} />
            ))}
          </div>
        </>
      )}

      {/* FAB */}
      <button
        onClick={openNew}
        style={{
          position: 'fixed', bottom: 86, right: 20, zIndex: 900,
          width: 58, height: 58, borderRadius: '50%',
          background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
          color: '#fff', border: 'none',
          boxShadow: '0 6px 28px rgba(99,102,241,0.55)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <i className="fas fa-plus" style={{ fontSize: 22 }}></i>
      </button>

      {/* Sheet detalle / acciones */}
      <MesaSheet
        mesa={selected}
        onClose={() => setSelected(null)}
        onStatus={handleStatus}
        onEdit={openEdit}
        onDelete={handleDelete}
        saving={saving}
      />

      {/* Sheet formulario */}
      <FormSheet
        open={showForm}
        onClose={() => setShowForm(false)}
        editing={editingMesa}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        saving={saving}
      />
    </div>
  );
};

export default MesasManagement;
