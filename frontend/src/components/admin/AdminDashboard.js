import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  Title, Tooltip, Legend, ArcElement, PointElement, LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { reportesService, mesasService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import MesasManagement from './MesasManagement';
import ProductosManagement from './ProductosManagement';
import UsuariosManagement from './UsuariosManagement';
import ReportesManagement from './ReportesManagement';
import toast from 'react-hot-toast';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

const P = { red: '#C62828', redLt: '#EF5350', gold: '#F9A825', goldDk: '#F57F17', brown: '#2C1810', green: '#16a34a', orange: '#E65100' };

const Spin = () => {
  const { C } = useTheme();
  return <div style={{ width: 44, height: 44, border: `4px solid ${C.surfaceAlt2}`, borderTop: `4px solid ${P.gold}`, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />;
};

const useIsDesktop = () => {
  const [d, setD] = useState(() => window.innerWidth >= 768);
  useEffect(() => { const h = () => setD(window.innerWidth >= 768); window.addEventListener('resize', h); return () => window.removeEventListener('resize', h); }, []);
  return d;
};

const AdminHome = () => {
  const { C } = useTheme();
  const isDesktop = useIsDesktop();
  const [dash, setDash] = useState(null);
  const [mesas, setMesas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartTab, setChartTab] = useState('mesas');

  const fetchData = useCallback(async () => {
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

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 30000); return () => clearInterval(t); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}`}</style>
        <Spin />
        <span style={{ color: C.textMuted, fontSize: 14, fontWeight: 600 }}>Cargando panel...</span>
      </div>
    );
  }

  const ventas = parseFloat(dash?.resumen?.ventas_hoy || 0);
  const pedidos = dash?.resumen?.pedidos_hoy || 0;
  const prom = parseFloat(dash?.resumen?.promedio_por_pedido || 0);
  const ocup = mesas?.porcentaje_ocupacion || 0;

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
  const fecha = new Date().toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  const mesasChart = {
    labels: ['Libres', 'Ocupadas', 'Cuenta'],
    datasets: [{
      data: [mesas?.libres || 0, mesas?.ocupadas || 0, mesas?.cuenta_solicitada || 0],
      backgroundColor: ['rgba(22,163,74,.65)', 'rgba(198,40,40,.65)', 'rgba(249,168,37,.65)'],
      borderColor: ['#16a34a', '#C62828', '#F9A825'],
      borderWidth: 2.5,
    }],
  };

  const pedidosChart = {
    labels: (dash?.pedidos_por_estado || []).map(p => p.estado.replace('_', ' ').toUpperCase()),
    datasets: [{
      label: 'Pedidos',
      data: (dash?.pedidos_por_estado || []).map(p => parseInt(p.cantidad)),
      backgroundColor: ['rgba(198,40,40,.6)', 'rgba(249,168,37,.6)', 'rgba(22,163,74,.6)', 'rgba(14,165,233,.6)', 'rgba(139,92,246,.6)'],
      borderColor: [P.red, P.gold, P.green, '#0ea5e9', '#8b5cf6'],
      borderWidth: 2, borderRadius: 8,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 14, font: { size: 11, weight: '600' }, color: C.textSub } } },
  };

  const maxProdVenta = Math.max(...(dash?.productos_mas_vendidos?.slice(0, 5).map(p => parseFloat(p.ingresos || p.ingresos_totales || 0)) || [1]));
  const medalColors = ['#F9A825', '#BCAAA4', '#CD7F32'];

  /* ════════════ DESKTOP ════════════ */
  if (isDesktop) {
    return (
      <div style={{ padding: '28px 32px 48px', maxWidth: 1200, margin: '0 auto', background: C.bg, minHeight: '100%' }}>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 28, animation: 'fadeUp .35s ease' }}>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: 26, color: C.text, margin: 0 }}>{saludo}</h1>
            <p style={{ color: C.textMuted, fontSize: 14, margin: '4px 0 0' }}>
              <i className="fas fa-calendar-day" style={{ marginRight: 8 }} />{fecha}
            </p>
          </div>
          <button onClick={fetchData} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: P.red, border: 'none', borderRadius: 12, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(198,40,40,.35)' }}>
            <i className="fas fa-rotate-right" style={{ fontSize: 12 }} />Actualizar
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18, marginBottom: 28, animation: 'fadeUp .4s ease' }}>
          {[
            { label: 'Ventas hoy', value: `S/${ventas.toFixed(0)}`, icon: 'fa-dollar-sign', color: P.green, bg: '#f0fdf4' },
            { label: 'Pedidos hoy', value: pedidos, icon: 'fa-receipt', color: P.red, bg: '#FFEBEE' },
            { label: 'Ticket promedio', value: `S/${prom.toFixed(0)}`, icon: 'fa-chart-line', color: P.gold, bg: '#FFF8E1' },
            { label: 'Ocupación', value: `${ocup}%`, icon: 'fa-table', color: '#0ea5e9', bg: '#f0f9ff', sub: `${mesas?.ocupadas || 0} de ${mesas?.total || 0} mesas` },
          ].map((s, i) => (
            <div key={i} style={{ background: C.surface, borderRadius: 20, padding: '20px', border: `1.5px solid ${C.border}`, boxShadow: '0 2px 12px rgba(0,0,0,.06)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', right: -16, top: -16, width: 76, height: 76, borderRadius: '50%', background: s.color + '10' }} />
              <div style={{ width: 44, height: 44, borderRadius: 14, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 18 }} />
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.value}</div>
              {s.sub && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>{s.sub}</div>}
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 24 }}>
          <div style={{ background: C.surface, borderRadius: 20, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 9 }}>
              <i className="fas fa-table" style={{ color: P.red, fontSize: 14 }} />
              <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Estado de Mesas</span>
            </div>
            <div style={{ padding: 20, height: 260 }}>
              {(mesas?.total || 0) > 0 ? <Doughnut data={mesasChart} options={chartOpts} /> : <div style={{ textAlign: 'center', paddingTop: 80, color: C.textMuted }}><i className="fas fa-table" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />Sin datos</div>}
            </div>
          </div>
          <div style={{ background: C.surface, borderRadius: 20, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 9 }}>
              <i className="fas fa-clipboard-list" style={{ color: P.green, fontSize: 14 }} />
              <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Pedidos por Estado</span>
            </div>
            <div style={{ padding: 20, height: 260 }}>
              {(dash?.pedidos_por_estado?.length || 0) > 0 ? <Bar data={pedidosChart} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} /> : <div style={{ textAlign: 'center', paddingTop: 80, color: C.textMuted }}><i className="fas fa-clipboard-list" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />Sin pedidos hoy</div>}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
          <div style={{ background: C.surface, borderRadius: 20, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 9 }}>
              <i className="fas fa-fire" style={{ color: '#ef4444', fontSize: 14 }} />
              <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Top Productos</span>
            </div>
            {(dash?.productos_mas_vendidos?.length || 0) > 0 ? (
              <div style={{ padding: '8px 0' }}>
                {dash.productos_mas_vendidos.slice(0, 5).map((p, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < 4 ? `1px solid ${C.borderLight}` : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 10, background: i < 3 ? medalColors[i] + '20' : C.surfaceAlt2, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {i < 3 ? <i className="fas fa-crown" style={{ color: medalColors[i], fontSize: 11 }} /> : <span style={{ fontWeight: 800, fontSize: 12, color: C.textMuted }}>#{i+1}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.producto?.nombre || 'Producto'}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{p.total_vendido || 0} uds</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: P.green, flexShrink: 0 }}>S/{parseFloat(p.ingresos || p.ingresos_totales || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}><i className="fas fa-box-open" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />Sin datos hoy</div>}
          </div>

          <div style={{ background: C.surface, borderRadius: 20, border: `1.5px solid ${C.border}`, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', gap: 9 }}>
              <i className="fas fa-user-tie" style={{ color: P.gold, fontSize: 14 }} />
              <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Mozos Activos</span>
            </div>
            {(dash?.mozos_activos?.length || 0) > 0 ? (
              <div style={{ padding: '8px 0' }}>
                {dash.mozos_activos.map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: i < dash.mozos_activos.length - 1 ? `1px solid ${C.borderLight}` : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: `${P.gold}15`, border: `1.5px solid ${P.gold}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fas fa-user-tie" style={{ color: P.gold, fontSize: 14 }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.mozo?.nombre || 'Mozo'}</div>
                      <div style={{ fontSize: 11, color: C.textMuted }}>{m.total_pedidos || 0} pedidos</div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: P.green, flexShrink: 0 }}>S/{parseFloat(m.total_ventas || 0).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ textAlign: 'center', padding: '40px 20px', color: C.textMuted }}><i className="fas fa-users" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />Sin actividad hoy</div>}
          </div>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     MOBILE — UI PREMIUM
  ════════════════════════════════════════════ */
  return (
    <div style={{ minHeight: '100%', background: C.bg, paddingBottom: 24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}} @keyframes barGrow{from{width:0}to{width:var(--bar-w)}}`}</style>

      {/* ── Hero Header con saludo ── */}
      <div style={{
        background: `linear-gradient(135deg, ${P.brown} 0%, #3E2723 100%)`,
        borderRadius: '0 0 28px 28px',
        padding: '20px 20px 24px',
        marginBottom: -14,
        position: 'relative', overflow: 'hidden',
        animation: 'fadeUp .3s ease',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'rgba(249,168,37,0.06)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 100, height: 100, borderRadius: '50%', background: 'rgba(198,40,40,0.06)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 13, color: '#BCAAA4', fontWeight: 500, marginBottom: 2 }}>{saludo} 👋</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#EFEBE9', lineHeight: 1.1 }}>Panel Admin</div>
          </div>
          <button onClick={fetchData} style={{
            width: 40, height: 40, borderRadius: 12, border: 'none',
            background: 'rgba(249,168,37,0.15)', color: P.gold,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 15,
          }}>
            <i className="fas fa-rotate-right" />
          </button>
        </div>

        {/* Stat principal — Ventas del día */}
        <div style={{
          background: 'linear-gradient(135deg, #C62828, #EF5350)',
          borderRadius: 20, padding: '20px 22px',
          boxShadow: '0 8px 28px rgba(198,40,40,0.4)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', right: -20, bottom: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ position: 'absolute', right: 10, bottom: 10, width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-dollar-sign" style={{ color: '#fff', fontSize: 14 }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', textTransform: 'uppercase', letterSpacing: 0.8 }}>Ventas del día</span>
          </div>
          <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: -1 }}>
            S/{ventas.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 6, fontWeight: 500 }}>
            <i className="fas fa-calendar-day" style={{ marginRight: 6, fontSize: 10 }} />{fecha}
          </div>
        </div>
      </div>

      {/* ── Stats secundarios (3 pills) ── */}
      <div style={{ display: 'flex', gap: 10, padding: '24px 16px 0', animation: 'fadeUp .4s ease' }}>
        {[
          { icon: 'fa-receipt', label: 'Pedidos', value: pedidos, color: P.red, bg: '#FFEBEE' },
          { icon: 'fa-chart-line', label: 'Promedio', value: `S/${prom.toFixed(0)}`, color: P.gold, bg: '#FFF8E1' },
          { icon: 'fa-table', label: `${ocup}% Ocup.`, value: `${mesas?.ocupadas || 0}/${mesas?.total || 0}`, color: '#0ea5e9', bg: '#f0f9ff' },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, background: C.surface, borderRadius: 16,
            padding: '14px 10px', textAlign: 'center',
            border: `1.5px solid ${C.border}`,
            boxShadow: '0 2px 8px rgba(0,0,0,.04)',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 11, background: s.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 8px',
            }}>
              <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 14 }} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: C.text, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Mesas rápido — chips de estado ── */}
      <div style={{ padding: '18px 16px 0', animation: 'fadeUp .45s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <i className="fas fa-table" style={{ color: P.red, fontSize: 13 }} />
          <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Estado de Mesas</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: 'Libres', value: mesas?.libres || 0, color: '#16a34a', bg: '#f0fdf4', icon: 'fa-circle-check' },
            { label: 'Ocupadas', value: mesas?.ocupadas || 0, color: '#C62828', bg: '#FFEBEE', icon: 'fa-users' },
            { label: 'Cuenta', value: mesas?.cuenta_solicitada || 0, color: '#F9A825', bg: '#FFF8E1', icon: 'fa-receipt' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, background: C.surface, borderRadius: 14,
              padding: '12px 8px', textAlign: 'center',
              border: `1.5px solid ${s.color}25`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 6 }}>
                <i className={`fas ${s.icon}`} style={{ color: s.color, fontSize: 11 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: s.color, textTransform: 'uppercase', letterSpacing: 0.3 }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts con tabs ── */}
      <div style={{ padding: '18px 16px 0', animation: 'fadeUp .5s ease' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            { key: 'mesas', label: 'Mesas', icon: 'fa-chart-pie' },
            { key: 'pedidos', label: 'Pedidos', icon: 'fa-chart-bar' },
          ].map(t => (
            <button key={t.key} onClick={() => setChartTab(t.key)} style={{
              flex: 1, padding: '10px 0', borderRadius: 12,
              background: chartTab === t.key ? P.red : C.surface,
              color: chartTab === t.key ? '#fff' : C.textSub,
              fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              boxShadow: chartTab === t.key ? '0 4px 14px rgba(198,40,40,.3)' : `0 1px 4px rgba(0,0,0,.06)`,
              border: chartTab === t.key ? 'none' : `1.5px solid ${C.border}`,
              transition: 'all 0.2s',
            }}>
              <i className={`fas ${t.icon}`} style={{ fontSize: 12 }} />{t.label}
            </button>
          ))}
        </div>

        <div style={{
          background: C.surface, borderRadius: 20,
          border: `1.5px solid ${C.border}`,
          padding: '16px 14px', minHeight: 200,
          boxShadow: '0 2px 10px rgba(0,0,0,.04)',
        }}>
          {chartTab === 'mesas' ? (
            (mesas?.total || 0) > 0
              ? <div style={{ height: 210 }}><Doughnut data={mesasChart} options={chartOpts} /></div>
              : <div style={{ textAlign: 'center', padding: '50px 0', color: C.textMuted }}>
                  <i className="fas fa-table" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Sin datos de mesas</div>
                </div>
          ) : (
            (dash?.pedidos_por_estado?.length || 0) > 0
              ? <div style={{ height: 210 }}><Bar data={pedidosChart} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { display: false } } }} /></div>
              : <div style={{ textAlign: 'center', padding: '50px 0', color: C.textMuted }}>
                  <i className="fas fa-clipboard-list" style={{ fontSize: 32, display: 'block', marginBottom: 10 }} />
                  <div style={{ fontSize: 13, fontWeight: 600 }}>Sin pedidos hoy</div>
                </div>
          )}
        </div>
      </div>

      {/* ── Top Productos con progress bars ── */}
      <div style={{ padding: '18px 16px 0', animation: 'fadeUp .55s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-fire" style={{ color: '#ef4444', fontSize: 12 }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: C.text, flex: 1 }}>Top Productos</span>
          {(dash?.productos_mas_vendidos?.length || 0) > 0 && (
            <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>{dash.productos_mas_vendidos.length} items</span>
          )}
        </div>

        <div style={{
          background: C.surface, borderRadius: 20,
          border: `1.5px solid ${C.border}`,
          overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,.04)',
        }}>
          {(dash?.productos_mas_vendidos?.length || 0) > 0 ? (
            dash.productos_mas_vendidos.slice(0, 5).map((p, i) => {
              const ingreso = parseFloat(p.ingresos || p.ingresos_totales || 0);
              const pct = maxProdVenta > 0 ? Math.round((ingreso / maxProdVenta) * 100) : 0;
              return (
                <div key={i} style={{
                  padding: '14px 18px',
                  borderBottom: i < Math.min(4, (dash.productos_mas_vendidos.length || 1) - 1) ? `1px solid ${C.borderLight}` : 'none',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 10, flexShrink: 0,
                      background: i < 3 ? medalColors[i] + '20' : C.surfaceAlt2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {i < 3
                        ? <i className="fas fa-crown" style={{ color: medalColors[i], fontSize: 11 }} />
                        : <span style={{ fontWeight: 800, fontSize: 12, color: C.textMuted }}>#{i + 1}</span>
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.producto?.nombre || 'Producto'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: P.green, lineHeight: 1 }}>S/{ingreso.toFixed(2)}</div>
                      <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>×{p.total_vendido || 0}</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 5, background: C.surfaceAlt2, borderRadius: 4, overflow: 'hidden', marginLeft: 42 }}>
                    <div style={{
                      height: '100%', width: `${pct}%`, borderRadius: 4,
                      background: i === 0 ? `linear-gradient(90deg, ${P.red}, ${P.redLt})` : i === 1 ? `linear-gradient(90deg, ${P.gold}, ${P.goldDk})` : `linear-gradient(90deg, ${P.green}, #22c55e)`,
                      transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
                    }} />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: C.textMuted }}>
              <i className="fas fa-box-open" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 13, fontWeight: 600 }}>Sin datos de productos hoy</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Mozos Activos ── */}
      <div style={{ padding: '18px 16px 0', animation: 'fadeUp .6s ease' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-user-tie" style={{ color: P.gold, fontSize: 12 }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Mozos Activos</span>
        </div>

        {(dash?.mozos_activos?.length || 0) > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {dash.mozos_activos.map((m, i) => (
              <div key={i} style={{
                background: C.surface, borderRadius: 16,
                padding: '14px 16px', border: `1.5px solid ${C.border}`,
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 2px 8px rgba(0,0,0,.04)',
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 14,
                  background: `linear-gradient(135deg, ${P.gold}20, ${P.gold}10)`,
                  border: `2px solid ${P.gold}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className="fas fa-user-tie" style={{ color: P.gold, fontSize: 18 }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.mozo?.nombre || 'Mozo'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                    <span style={{
                      background: `${P.red}12`, color: P.red, borderRadius: 20,
                      padding: '2px 10px', fontSize: 11, fontWeight: 700,
                    }}>
                      {m.total_pedidos || 0} pedidos
                    </span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 900, fontSize: 16, color: P.green, lineHeight: 1 }}>
                    S/{parseFloat(m.total_ventas || 0).toFixed(0)}
                  </div>
                  <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>ventas</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            background: C.surface, borderRadius: 16, border: `1.5px solid ${C.border}`,
            textAlign: 'center', padding: '36px 20px', color: C.textMuted,
          }}>
            <i className="fas fa-users" style={{ fontSize: 28, display: 'block', marginBottom: 10 }} />
            <div style={{ fontSize: 13, fontWeight: 600 }}>Sin actividad de mozos hoy</div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminDashboard = () => (
  <Routes>
    <Route path="/" element={<AdminHome />} />
    <Route path="/mesas" element={<MesasManagement />} />
    <Route path="/productos" element={<ProductosManagement />} />
    <Route path="/reportes" element={<ReportesManagement />} />
    <Route path="/usuarios" element={<UsuariosManagement />} />
  </Routes>
);

export default AdminDashboard;
