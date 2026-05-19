import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { reportesService, mesasService } from '../../services/api';
import MesasManagement from './MesasManagement';
import ProductosManagement from './ProductosManagement';
import UsuariosManagement from './UsuariosManagement';
import ReportesManagement from './ReportesManagement';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

/* ── Spinner ── */
const Spin = () => (
  <div style={{ width: 40, height: 40, border: '3px solid #eef2ff', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin .75s linear infinite' }} />
);

/* ── Tarjeta stat ── */
const StatCard = ({ label, value, sub, icon, color, bg }) => (
  <div style={{ background: '#fff', borderRadius: 20, padding: '18px 16px', border: '1.5px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,.05)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', right: -14, top: -14, width: 72, height: 72, borderRadius: '50%', background: color + '10' }} />
    <div style={{ width: 42, height: 42, borderRadius: 13, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
      <i className={`fas ${icon}`} style={{ color, fontSize: 18 }} />
    </div>
    <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
  </div>
);

/* ── Sección card ── */
const SectionCard = ({ title, icon, iconColor, children }) => (
  <div style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}>
    <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 9 }}>
      <i className={`fas ${icon}`} style={{ color: iconColor, fontSize: 15 }} />
      <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{title}</span>
    </div>
    {children}
  </div>
);

/* ── Empty state ── */
const Empty = ({ icon, text }) => (
  <div style={{ textAlign: 'center', padding: '40px 20px' }}>
    <i className={`fas ${icon}`} style={{ fontSize: 36, color: '#e2e8f0', display: 'block', marginBottom: 12 }} />
    <div style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>{text}</div>
  </div>
);

/* ══════════════════════════════════════════
   ADMIN HOME
══════════════════════════════════════════ */
const AdminHome = () => {
  const [dash, setDash]   = useState(null);
  const [mesas, setMesas] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const [dR, mR] = await Promise.all([
        reportesService.getDashboard().catch(() => ({ data: { data: null } })),
        mesasService.getStats().catch(() => ({ data: { data: null } })),
      ]);
      setDash(dR.data.data || {
        resumen: { ventas_hoy: '0.00', pedidos_hoy: 0, promedio_por_pedido: '0.00' },
        pedidos_por_estado: [], productos_mas_vendidos: [], mozos_activos: [],
      });
      setMesas(mR.data.data || { total: 0, libres: 0, ocupadas: 0, cuenta_solicitada: 0, porcentaje_ocupacion: 0 });
    } catch {
      toast.error('Error al cargar el panel');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); const t = setInterval(fetch, 30000); return () => clearInterval(t); }, [fetch]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 14 }}>
        <style>{`@keyframes spin { to{transform:rotate(360deg)} }`}</style>
        <Spin />
        <span style={{ color: '#94a3b8', fontSize: 15 }}>Cargando panel...</span>
      </div>
    );
  }

  const ventas  = parseFloat(dash?.resumen?.ventas_hoy || 0);
  const pedidos = dash?.resumen?.pedidos_hoy || 0;
  const prom    = parseFloat(dash?.resumen?.promedio_por_pedido || 0);
  const ocup    = mesas?.porcentaje_ocupacion || 0;

  /* Charts */
  const chartOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } } } };

  const mesasChart = {
    labels: ['Libres', 'Ocupadas', 'Cuenta'],
    datasets: [{
      data: [mesas?.libres || 0, mesas?.ocupadas || 0, mesas?.cuenta_solicitada || 0],
      backgroundColor: ['rgba(22,163,74,.5)', 'rgba(220,38,38,.5)', 'rgba(217,119,6,.5)'],
      borderColor:     ['#16a34a', '#dc2626', '#d97706'],
      borderWidth: 2,
    }],
  };

  const pedidosChart = {
    labels: (dash?.pedidos_por_estado || []).map(p => p.estado.replace('_', ' ').toUpperCase()),
    datasets: [{
      label: 'Pedidos',
      data: (dash?.pedidos_por_estado || []).map(p => parseInt(p.cantidad)),
      backgroundColor: ['rgba(99,102,241,.5)', 'rgba(245,158,11,.5)', 'rgba(22,163,74,.5)', 'rgba(59,130,246,.5)', 'rgba(139,92,246,.5)'],
      borderColor:     ['#6366f1', '#f59e0b', '#16a34a', '#3b82f6', '#8b5cf6'],
      borderWidth: 2, borderRadius: 6,
    }],
  };

  return (
    <div style={{ padding: '20px 16px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <style>{`@keyframes spin { to{transform:rotate(360deg)} } @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadeIn .3s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 22, color: '#0f172a', margin: 0 }}>Panel Administrativo</h1>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
              <i className="fas fa-clock" style={{ marginRight: 6 }} />
              {new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <button onClick={fetch} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: '#eef2ff', border: '1.5px solid #c7d2fe', borderRadius: 12, color: '#6366f1', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            <i className="fas fa-rotate-right" style={{ fontSize: 12 }} />Actualizar
          </button>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 14, marginBottom: 24 }}>
        <StatCard label="Ventas hoy"   value={`S/${ventas.toFixed(0)}`}  icon="fa-dollar-sign" color="#16a34a" bg="#f0fdf4" />
        <StatCard label="Pedidos hoy"  value={pedidos}                   icon="fa-receipt"     color="#6366f1" bg="#eef2ff" />
        <StatCard label="Promedio"     value={`S/${prom.toFixed(0)}`}    icon="fa-chart-line"  color="#d97706" bg="#fffbeb" />
        <StatCard label="Ocupación"    value={`${ocup}%`}                icon="fa-table"       color="#0ea5e9" bg="#f0f9ff"
          sub={`${mesas?.ocupadas || 0} de ${mesas?.total || 0} mesas`} />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16, marginBottom: 24 }}>
        {/* Mesas doughnut */}
        <SectionCard title="Estado de Mesas" icon="fa-table" iconColor="#6366f1">
          <div style={{ padding: 16, height: 220 }}>
            {(mesas?.total || 0) > 0
              ? <Doughnut data={mesasChart} options={chartOpts} />
              : <Empty icon="fa-table" text="Sin datos de mesas" />
            }
          </div>
        </SectionCard>

        {/* Pedidos bar */}
        <SectionCard title="Pedidos por Estado" icon="fa-clipboard-list" iconColor="#16a34a">
          <div style={{ padding: 16, height: 220 }}>
            {(dash?.pedidos_por_estado?.length || 0) > 0
              ? <Bar data={pedidosChart} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} />
              : <Empty icon="fa-clipboard-list" text="Sin pedidos hoy" />
            }
          </div>
        </SectionCard>
      </div>

      {/* Lists row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: 16 }}>
        {/* Top productos */}
        <SectionCard title="Productos Más Vendidos" icon="fa-fire" iconColor="#ef4444">
          {(dash?.productos_mas_vendidos?.length || 0) > 0 ? (
            <div style={{ padding: '8px 0' }}>
              {dash.productos_mas_vendidos.slice(0, 5).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#fef3c7' : i === 1 ? '#f1f5f9' : '#fdf4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 12, color: i === 0 ? '#d97706' : i === 1 ? '#64748b' : '#a855f7', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.producto?.nombre || 'Producto'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>×{p.total_vendido || 0} unidades</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#16a34a', flexShrink: 0 }}>
                    S/{parseFloat(p.ingresos || p.ingresos_totales || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty icon="fa-box-open" text="Sin datos de productos hoy" />}
        </SectionCard>

        {/* Mozos activos */}
        <SectionCard title="Mozos Más Activos" icon="fa-user-tie" iconColor="#d97706">
          {(dash?.mozos_activos?.length || 0) > 0 ? (
            <div style={{ padding: '8px 0' }}>
              {dash.mozos_activos.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', borderBottom: i < dash.mozos_activos.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#eef2ff', border: '1.5px solid #c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <i className="fas fa-user-tie" style={{ color: '#6366f1', fontSize: 14 }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.mozo?.nombre || 'Mozo'}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{m.total_pedidos || 0} pedidos</div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#16a34a', flexShrink: 0 }}>
                    S/{parseFloat(m.total_ventas || 0).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          ) : <Empty icon="fa-users" text="Sin actividad de mozos hoy" />}
        </SectionCard>
      </div>
    </div>
  );
};

/* ── Router principal del admin ── */
const AdminDashboard = () => (
  <Routes>
    <Route path="/"          element={<AdminHome />} />
    <Route path="/mesas"     element={<MesasManagement />} />
    <Route path="/productos" element={<ProductosManagement />} />
    <Route path="/reportes"  element={<ReportesManagement />} />
    <Route path="/usuarios"  element={<UsuariosManagement />} />
  </Routes>
);

export default AdminDashboard;
