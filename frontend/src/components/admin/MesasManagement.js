import React, { useState, useEffect, useCallback } from 'react';
import { mesasService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

const ESTADO = {
  libre:             { label: 'Libre',   color: '#16a34a', light: '#dcfce7', icon: 'fa-circle-check'        },
  ocupada:           { label: 'Ocupada', color: '#dc2626', light: '#fee2e2', icon: 'fa-users'               },
  cuenta_solicitada: { label: 'Cuenta',  color: '#d97706', light: '#fef3c7', icon: 'fa-file-invoice-dollar' },
};

const Spin = () => {
  const { C } = useTheme();
  return <div style={{ width: 44, height: 44, border: `4px solid ${C.surfaceAlt2}`, borderTop: '4px solid #C62828', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />;
};

const MesaSheet = ({ mesa, onClose, onStatus, onEdit, onDelete, saving }) => {
  const { C } = useTheme();
  if (!mesa) return null;
  const est = ESTADO[mesa.estado] || ESTADO.libre;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: C.overlay, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: C.surface, borderRadius: '26px 26px 0 0', animation: 'slideUp 0.26s ease', overflow: 'hidden' }}>
        <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 40, height: 4, background: C.border, borderRadius: 4, display: 'inline-block' }} />
        </div>
        <div style={{ textAlign: 'center', padding: '16px 20px 24px', background: est.light }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: est.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: `0 8px 28px ${est.color}55` }}>
            <span style={{ fontWeight: 900, fontSize: 36, color: '#fff', lineHeight: 1 }}>{mesa.numero}</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#2C1810' }}>Mesa {mesa.numero}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: est.color, color: '#fff', borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700, marginTop: 8 }}>
            <i className={`fas ${est.icon}`} style={{ fontSize: 11 }}></i>{est.label}
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 10 }}>
            <i className="fas fa-users" style={{ marginRight: 5 }}></i>{mesa.capacidad} personas
          </div>
        </div>

        <div style={{ padding: '20px 20px 36px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 12 }}>CAMBIAR ESTADO</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {Object.entries(ESTADO).map(([key, e]) => {
              const active = mesa.estado === key;
              return (
                <button key={key} onClick={() => !active && onStatus(key)} disabled={active || saving}
                  style={{ flex: 1, padding: '12px 4px', borderRadius: 14, border: `2px solid ${active ? e.color : C.border}`, background: active ? e.light : C.surfaceAlt, cursor: active ? 'default' : 'pointer', fontFamily: 'inherit', transition: 'all 0.15s', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: active ? e.color : C.surfaceAlt2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={`fas ${e.icon}`} style={{ color: active ? '#fff' : C.textMuted, fontSize: 13 }}></i>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: active ? e.color : C.textSub }}>{e.label}</span>
                </button>
              );
            })}
          </div>

          <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, marginBottom: 12 }}>CONFIGURACIÓN</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onEdit} style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, #C62828, #EF5350)', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(198,40,40,0.3)' }}>
              <i className="fas fa-pen" style={{ fontSize: 13 }}></i>Editar mesa
            </button>
            <button onClick={() => onDelete(mesa)} disabled={mesa.estado !== 'libre'}
              style={{ flex: 1, padding: '14px', borderRadius: 14, border: `1.5px solid ${mesa.estado === 'libre' ? '#fecaca' : C.border}`, background: mesa.estado === 'libre' ? '#fef2f2' : C.surfaceAlt, color: mesa.estado === 'libre' ? '#dc2626' : C.textMuted, fontWeight: 700, fontSize: 14, cursor: mesa.estado === 'libre' ? 'pointer' : 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <i className="fas fa-trash" style={{ fontSize: 13 }}></i>
              {mesa.estado === 'libre' ? 'Eliminar' : 'En uso'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const FormSheet = ({ open, onClose, editing, formData, setFormData, onSubmit, saving }) => {
  const { C } = useTheme();
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: C.overlay, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn 0.18s ease' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', background: C.surface, borderRadius: '26px 26px 0 0', animation: 'slideUp 0.26s ease' }}>
        <div style={{ textAlign: 'center', padding: '14px 0 6px' }}>
          <div style={{ width: 40, height: 4, background: C.border, borderRadius: 4, display: 'inline-block' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: C.text }}>
            {editing ? `Editar Mesa ${editing.numero}` : 'Nueva Mesa'}
          </span>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', background: C.surfaceAlt2, border: 'none', cursor: 'pointer', color: C.textSub, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div style={{ padding: 20 }}>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>Número de mesa</label>
            <input type="number" inputMode="numeric" placeholder="Ej: 1, 2, 3..."
              value={formData.numero}
              onChange={e => setFormData(f => ({ ...f, numero: parseInt(e.target.value) || '' }))}
              min={1} max={999}
              style={{ width: '100%', padding: '18px', border: `2px solid ${C.border}`, borderRadius: 16, fontSize: 32, fontWeight: 900, outline: 'none', background: C.inputBg, color: C.text, fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }} />
          </div>

          <div style={{ marginBottom: 28 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.textSub, letterSpacing: 0.8, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
              <i className="fas fa-users" style={{ marginRight: 6 }}></i>Capacidad — {formData.capacidad} personas
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
              {[2, 4, 6, 8, 10, 12].map(n => (
                <button key={n} type="button" onClick={() => setFormData(f => ({ ...f, capacidad: n }))}
                  style={{ padding: '16px 0', borderRadius: 14, border: `2px solid ${formData.capacidad === n ? '#C62828' : C.border}`, background: formData.capacidad === n ? '#FFEBEE' : C.surfaceAlt, color: formData.capacidad === n ? '#9B1B1B' : C.textSub, fontWeight: 800, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', boxShadow: formData.capacidad === n ? '0 2px 8px rgba(198,40,40,0.15)' : 'none', transition: 'all 0.15s ease' }}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <button onClick={onSubmit} disabled={saving || !formData.numero}
            style={{ width: '100%', padding: 16, border: 'none', borderRadius: 16, background: (saving || !formData.numero) ? C.surfaceAlt2 : 'linear-gradient(135deg, #C62828, #EF5350)', color: (saving || !formData.numero) ? C.textMuted : '#fff', fontWeight: 800, fontSize: 16, cursor: (saving || !formData.numero) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, boxShadow: (saving || !formData.numero) ? 'none' : '0 6px 20px rgba(198,40,40,0.35)', transition: 'all 0.2s ease' }}>
            <i className={saving ? 'fas fa-circle-notch fa-spin' : editing ? 'fas fa-save' : 'fas fa-plus'}></i>
            {saving ? 'Guardando...' : editing ? 'Actualizar Mesa' : 'Crear Mesa'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MesaCard = ({ mesa, onTap }) => {
  const { C } = useTheme();
  const est = ESTADO[mesa.estado] || ESTADO.libre;
  const [pressed, setPressed] = useState(false);

  return (
    <div
      onClick={onTap}
      onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
      onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
      style={{
        background: `linear-gradient(160deg, ${C.surface} 0%, ${est.light}44 100%)`,
        borderRadius: 22, padding: '22px 16px',
        boxShadow: pressed
          ? `0 2px 8px rgba(0,0,0,0.06), inset 0 0 0 2px ${est.color}30`
          : `0 4px 20px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)`,
        cursor: 'pointer',
        transform: pressed ? 'scale(0.95)' : 'scale(1)',
        transition: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 0.18s ease',
        textAlign: 'center',
        border: `1.5px solid ${pressed ? est.color + '50' : est.color + '18'}`,
        position: 'relative', overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', top: -20, right: -20, width: 70, height: 70, borderRadius: '50%', background: `${est.color}08`, pointerEvents: 'none' }} />
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: `linear-gradient(145deg, ${est.color}, ${est.color}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', boxShadow: `0 8px 24px ${est.color}40`, transition: 'box-shadow 0.18s ease' }}>
        <span style={{ fontWeight: 900, fontSize: 28, color: '#fff', lineHeight: 1 }}>{mesa.numero}</span>
      </div>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 8 }}>Mesa {mesa.numero}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: est.light, color: est.color, borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 700, marginBottom: 8, border: `1px solid ${est.color}25` }}>
        <i className={`fas ${est.icon}`} style={{ fontSize: 10 }}></i>{est.label}
      </div>
      <div style={{ fontSize: 12, color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
        <i className="fas fa-users" style={{ fontSize: 11 }}></i>{mesa.capacidad} pers.
      </div>
      <div style={{ marginTop: 10, fontSize: 10, color: C.textMuted, fontWeight: 600, opacity: 0.7 }}>Toca para gestionar</div>
    </div>
  );
};

const MesasManagement = () => {
  const { C } = useTheme();
  const [mesas,       setMesas]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [selected,    setSelected]    = useState(null);
  const [showForm,    setShowForm]    = useState(false);
  const [editingMesa, setEditingMesa] = useState(null);
  const [formData,    setFormData]    = useState({ numero: '', capacidad: 4 });
  const [refreshing,  setRefreshing]  = useState(false);

  const fetchMesas = useCallback(async () => {
    try {
      const r = await mesasService.getAll();
      setMesas(r.data.data || []);
    } catch { toast.error('Error al cargar mesas'); }
    finally { setLoading(false); }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const r = await mesasService.getAll();
      setMesas(r.data.data || []);
      toast.success('Mesas actualizadas');
    } catch { toast.error('Error al actualizar'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => {
    fetchMesas();
    const t = setInterval(fetchMesas, 30000);
    return () => clearInterval(t);
  }, [fetchMesas]);

  const openNew = () => { setEditingMesa(null); setFormData({ numero: '', capacidad: 4 }); setShowForm(true); };
  const openEdit = () => {
    const mesa = selected; setSelected(null);
    setTimeout(() => { setEditingMesa(mesa); setFormData({ numero: mesa.numero, capacidad: mesa.capacidad }); setShowForm(true); }, 200);
  };

  const handleSubmit = async () => {
    if (!formData.numero) { toast.error('Ingresa el número de mesa'); return; }
    setSaving(true);
    try {
      if (editingMesa) { await mesasService.update(editingMesa.id, formData); toast.success('Mesa actualizada'); }
      else             { await mesasService.create(formData);                 toast.success('Mesa creada');      }
      setShowForm(false); fetchMesas();
    } catch (err) { toast.error(err.response?.data?.error || 'Error al guardar'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (mesa) => {
    if (!window.confirm(`¿Eliminar Mesa ${mesa.numero}?`)) return;
    setSelected(null);
    try { await mesasService.delete(mesa.id); toast.success('Mesa eliminada'); fetchMesas(); }
    catch (err) { toast.error(err.response?.data?.error || 'Error al eliminar'); }
  };

  const handleStatus = async (nuevoEstado) => {
    if (!selected) return;
    setSaving(true);
    try {
      await mesasService.changeStatus(selected.id, nuevoEstado);
      toast.success(`Mesa ${selected.numero} → ${ESTADO[nuevoEstado]?.label}`);
      setMesas(prev => prev.map(m => m.id === selected.id ? { ...m, estado: nuevoEstado } : m));
      setSelected(prev => ({ ...prev, estado: nuevoEstado }));
    } catch { toast.error('Error al cambiar estado'); }
    finally { setSaving(false); }
  };

  const libres   = mesas.filter(m => m.estado === 'libre').length;
  const ocupadas = mesas.filter(m => m.estado === 'ocupada').length;
  const cuenta   = mesas.filter(m => m.estado === 'cuenta_solicitada').length;

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '4px 0' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: -0.3 }}>
            Gestión de Mesas
          </div>
          <div style={{ fontSize: 12, color: C.textMuted, fontWeight: 500, marginTop: 2 }}>
            Administra las mesas del local
          </div>
        </div>
        <button onClick={handleRefresh} disabled={refreshing}
          style={{ width: 42, height: 42, borderRadius: 14, border: `1.5px solid ${C.borderLight}`, background: C.surface, cursor: refreshing ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', transition: 'all 0.15s ease' }}>
          <i className={`fas fa-arrows-rotate ${refreshing ? 'fa-spin' : ''}`} style={{ fontSize: 15, color: '#C62828' }}></i>
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
        {[
          { label: 'Total',  value: mesas.length, color: '#C62828', icon: 'fa-table-cells'  },
          { label: 'Libres', value: libres,        color: '#16a34a', icon: 'fa-circle-check' },
          { label: 'Ocup.',  value: ocupadas,      color: '#dc2626', icon: 'fa-users'        },
          { label: 'Cuenta', value: cuenta,        color: '#d97706', icon: 'fa-receipt'      },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: C.surface, borderRadius: 20, padding: '14px 6px',
            textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
            border: `2px solid ${s.color}20`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`, borderRadius: '20px 20px 0 0' }} />
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '4px auto 8px' }}>
              <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 14 }}></i>
            </div>
            <div style={{ fontSize: 26, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: s.color, fontWeight: 700, marginTop: 5, textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Grid de mesas */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}><Spin /></div>
      ) : mesas.length === 0 ? (
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <i className="fas fa-table-cells" style={{ fontSize: 34, color: '#C62828' }}></i>
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: C.textSub }}>Sin mesas registradas</div>
          <div style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>Toca el botón <strong>+</strong> para agregar la primera</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.8, marginBottom: 14 }}>
            {mesas.length} MESA{mesas.length !== 1 ? 'S' : ''} · toca cualquiera para gestionar
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
            {mesas.map(m => <MesaCard key={m.id} mesa={m} onTap={() => setSelected(m)} />)}
          </div>
        </>
      )}

      {/* FAB */}
      <button onClick={openNew}
        style={{ position: 'fixed', bottom: 86, right: 20, zIndex: 900, width: 58, height: 58, borderRadius: '50%', background: 'linear-gradient(135deg, #C62828, #EF5350)', color: '#fff', border: 'none', boxShadow: '0 6px 28px rgba(198,40,40,0.55)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <i className="fas fa-plus" style={{ fontSize: 22 }}></i>
      </button>

      <MesaSheet mesa={selected} onClose={() => setSelected(null)} onStatus={handleStatus} onEdit={openEdit} onDelete={handleDelete} saving={saving} />
      <FormSheet open={showForm} onClose={() => setShowForm(false)} editing={editingMesa} formData={formData} setFormData={setFormData} onSubmit={handleSubmit} saving={saving} />
    </div>
  );
};

export default MesasManagement;
