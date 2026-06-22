import React, { useState, useEffect, useCallback } from 'react';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { reportesService } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, Title, Tooltip, Legend, ArcElement, Filler
);

const A       = '#C62828';
const SDARK   = '#1A0E0A';
const SDARK2  = '#2C1810';
const SDARK3  = '#4E342E';
const BAR_COLORS = ['#C62828','#16a34a','#F9A825','#0ea5e9','#ec4899','#8b5cf6','#14b8a6','#E65100'];

const useIsDesktop = () => {
    const [desk, setDesk] = useState(() => window.innerWidth >= 768);
    useEffect(() => {
        const h = () => setDesk(window.innerWidth >= 768);
        window.addEventListener('resize', h);
        return () => window.removeEventListener('resize', h);
    }, []);
    return desk;
};

const fmt  = n => `S/${parseFloat(n || 0).toFixed(2)}`;
const fmtK = n => { const v = parseFloat(n || 0); return v >= 1000 ? `S/${(v/1000).toFixed(1)}k` : `S/${v.toFixed(0)}`; };

const TABS = [
    { key: 'ventas',    label: 'Ventas',    icon: 'fa-chart-line' },
    { key: 'productos', label: 'Productos', icon: 'fa-utensils'   },
    { key: 'mozos',     label: 'Mozos',     icon: 'fa-user-tie'   },
    { key: 'mesas',     label: 'Mesas',     icon: 'fa-table'      },
];
const PERIODOS = [
    { key: 'hora',   label: 'Hora'   },
    { key: 'dia',    label: 'Día'    },
    { key: 'semana', label: 'Semana' },
    { key: 'mes',    label: 'Mes'    },
];

const useReportes = () => {
    const [loading, setLoading] = useState(false);
    const [filtros, setFiltros] = useState({
        fechaInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fechaFin:    new Date().toISOString().split('T')[0],
        periodo:     'dia',
    });
    const [reporteVentas,    setReporteVentas]    = useState(null);
    const [reporteProductos, setReporteProductos] = useState(null);
    const [reporteMozos,     setReporteMozos]     = useState(null);
    const [reporteMesas,     setReporteMesas]     = useState(null);
    const [error, setError] = useState(null);

    const fetchReportes = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const p = { fecha_desde: filtros.fechaInicio, fecha_hasta: filtros.fechaFin, agrupar_por: filtros.periodo };
            const [v, pr, m, ms] = await Promise.all([
                reportesService.getVentas(p).catch(() => null),
                reportesService.getProductosMasVendidos(p).catch(() => null),
                reportesService.getMozosRendimiento(p).catch(() => null),
                reportesService.getMesasRendimiento(p).catch(() => null),
            ]);
            setReporteVentas(v?.data?.data || null);
            setReporteProductos(pr?.data?.data || null);
            setReporteMozos(m?.data?.data || null);
            setReporteMesas(ms?.data?.data || null);
            if (!v && !pr && !m && !ms) setError('No se pudieron cargar los reportes.');
        } catch {
            setError('Error al cargar reportes.');
            toast.error('Error al cargar reportes');
        } finally { setLoading(false); }
    }, [filtros]);

    useEffect(() => { fetchReportes(); }, [fetchReportes]);

    const exportarCSV = useCallback((tab) => {
        let csv = '';
        const nom = `reporte_${tab}_${filtros.fechaInicio}_${filtros.fechaFin}`;
        if (tab === 'ventas' && reporteVentas)
            { csv = 'Período,Ventas,Pedidos,Promedio\n'; reporteVentas.ventas_por_periodo?.forEach(v => { csv += `${v.periodo},${v.total_ventas},${v.total_pedidos},${v.promedio_pedido}\n`; }); }
        else if (tab === 'productos' && reporteProductos)
            { csv = 'Producto,Categoría,Cantidad,Ingresos\n'; reporteProductos.productos?.forEach(p => { csv += `"${p.producto?.nombre}","${p.producto?.categoria?.nombre}",${p.total_vendido},${p.ingresos_totales}\n`; }); }
        else if (tab === 'mozos' && reporteMozos)
            { csv = 'Mozo,Pedidos,Ventas,Promedio\n'; reporteMozos.mozos?.forEach(m => { csv += `"${m.mozo?.nombre}",${m.total_pedidos},${m.total_ventas},${m.promedio_por_pedido}\n`; }); }
        else if (tab === 'mesas' && reporteMesas)
            { csv = 'Mesa,Capacidad,Pedidos,Ingresos,Promedio\n'; reporteMesas.mesas?.forEach(m => { csv += `Mesa ${m.mesa?.numero},${m.mesa?.capacidad},${m.total_pedidos},${m.ingresos_totales},${m.promedio_por_pedido}\n`; }); }
        if (!csv) { toast.error('No hay datos'); return; }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob); link.download = `${nom}.csv`;
        document.body.appendChild(link); link.click(); document.body.removeChild(link);
        toast.success('CSV descargado');
    }, [filtros, reporteVentas, reporteProductos, reporteMozos, reporteMesas]);

    const exportarPDF = useCallback((tab) => {
        const periodo = `${filtros.fechaInicio} al ${filtros.fechaFin}`;
        let rows = '', headers = '';
        if (tab === 'ventas' && reporteVentas) { headers = '<tr><th>#</th><th>Período</th><th>Ventas</th><th>Pedidos</th><th>Promedio</th></tr>'; reporteVentas.ventas_por_periodo?.forEach((v, i) => { rows += `<tr><td>${i+1}</td><td>${v.periodo}</td><td>S/${v.total_ventas}</td><td>${v.total_pedidos}</td><td>S/${v.promedio_pedido}</td></tr>`; }); }
        else if (tab === 'productos' && reporteProductos) { headers = '<tr><th>#</th><th>Producto</th><th>Cantidad</th><th>Ingresos</th></tr>'; reporteProductos.productos?.forEach((p, i) => { rows += `<tr><td>${i+1}</td><td>${p.producto?.nombre}</td><td>${p.total_vendido}</td><td>S/${p.ingresos_totales}</td></tr>`; }); }
        else if (tab === 'mozos' && reporteMozos) { headers = '<tr><th>#</th><th>Mozo</th><th>Pedidos</th><th>Ventas</th><th>Promedio</th></tr>'; reporteMozos.mozos?.forEach((m, i) => { rows += `<tr><td>${i+1}</td><td>${m.mozo?.nombre}</td><td>${m.total_pedidos}</td><td>S/${m.total_ventas}</td><td>S/${m.promedio_por_pedido}</td></tr>`; }); }
        else if (tab === 'mesas' && reporteMesas) { headers = '<tr><th>Mesa</th><th>Cap.</th><th>Pedidos</th><th>Ingresos</th><th>Promedio</th></tr>'; reporteMesas.mesas?.forEach(m => { rows += `<tr><td>Mesa ${m.mesa?.numero}</td><td>${m.mesa?.capacidad}</td><td>${m.total_pedidos}</td><td>S/${m.ingresos_totales}</td><td>S/${m.promedio_por_pedido}</td></tr>`; }); }
        const html = `<html><head><title>SIRER - ${tab}</title><style>body{font-family:Arial,sans-serif;margin:20px}h1{color:#C62828;margin-bottom:4px}p{color:#64748b;font-size:13px}table{width:100%;border-collapse:collapse;margin-top:16px}th,td{border:1px solid #ddd;padding:9px 12px;text-align:left}th{background:#f1f5f9;font-weight:700}</style></head><body><h1>SIRER — ${tab.charAt(0).toUpperCase()+tab.slice(1)}</h1><p>Período: ${periodo} · Generado: ${new Date().toLocaleString()}</p><table><thead>${headers}</thead><tbody>${rows}</tbody></table></body></html>`;
        const w = window.open('', '_blank');
        w.document.write(html); w.document.close();
        setTimeout(() => w.print(), 500);
        toast.success('PDF listo — usa Ctrl+P para guardar');
    }, [filtros, reporteVentas, reporteProductos, reporteMozos, reporteMesas]);

    return { loading, filtros, setFiltros, reporteVentas, reporteProductos, reporteMozos, reporteMesas, error, setError, fetchReportes, exportarCSV, exportarPDF };
};

const EmptyChart = ({ icon, msg }) => {
    const { C } = useTheme();
    return (
        <div style={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textMuted }}>
            <div style={{ textAlign: 'center' }}>
                <i className={`fas ${icon}`} style={{ fontSize: 26, display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 13 }}>{msg}</div>
            </div>
        </div>
    );
};
const EmptyState = ({ icon, msg }) => {
    const { C } = useTheme();
    return (
        <div style={{ textAlign: 'center', paddingTop: 60, color: C.textMuted }}>
            <i className={`fas ${icon}`} style={{ fontSize: 38, display: 'block', marginBottom: 12 }} />
            <div style={{ fontSize: 14 }}>{msg}</div>
        </div>
    );
};

/* -- Mobile KPI card -- */
const MobileKpiCard = ({ icon, label, value, color }) => {
    const { C } = useTheme();
    const [pressed, setPressed] = useState(false);
    return (
        <div
            onTouchStart={() => setPressed(true)} onTouchEnd={() => setPressed(false)}
            onMouseDown={() => setPressed(true)} onMouseUp={() => setPressed(false)} onMouseLeave={() => setPressed(false)}
            style={{ background: C.surface, borderRadius: 16, padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12, boxShadow: pressed ? '0 1px 4px rgba(0,0,0,0.06)' : '0 2px 10px rgba(0,0,0,0.08)', flex: '1 1 0', minWidth: 0, transform: pressed ? 'scale(0.97)' : 'scale(1)', transition: 'transform 0.12s', border: `1px solid ${C.borderLight}`, borderLeft: `4px solid ${color}` }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, flexShrink: 0, background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={`fas ${icon}`} style={{ color, fontSize: 18 }} />
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 19, fontWeight: 800, color: C.text, lineHeight: 1.1 }}>{value}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
            </div>
        </div>
    );
};

const MobileRankRow = ({ pos, name, sub, ingresos, maxIngresos, extra }) => {
    const { C } = useTheme();
    const medal = pos === 1 ? '#F9A825' : pos === 2 ? '#8B6914' : pos === 3 ? '#cd7f32' : null;
    const pct = maxIngresos > 0 ? Math.round((parseFloat(ingresos) / maxIngresos) * 100) : 0;
    return (
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.borderLight}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: medal ? medal + '20' : SDARK3 + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: medal || C.textMuted }}>
                    {medal ? <i className="fas fa-crown" style={{ color: medal, fontSize: 11 }} /> : `#${pos}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                    {sub && <div style={{ fontSize: 11, color: C.textMuted }}>{sub}</div>}
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a', flexShrink: 0 }}>{fmt(ingresos)}</div>
            </div>
            <div style={{ height: 4, background: C.surfaceAlt2, borderRadius: 4, overflow: 'hidden', marginLeft: 42 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg,${A},#F9A825)`, borderRadius: 4, transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
            {extra && <div style={{ fontSize: 11, color: C.textMuted, marginTop: 4, marginLeft: 42 }}>{extra}</div>}
        </div>
    );
};

const TabChip = ({ label, icon, active, onClick }) => {
    const { C } = useTheme();
    return (
        <button onClick={onClick} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 20, border: `1px solid ${active ? A : C.borderLight}`, cursor: 'pointer', background: active ? A : C.surface, color: active ? '#fff' : C.textSub, fontWeight: 700, fontSize: 13, boxShadow: active ? `0 3px 10px ${A}50` : '0 1px 4px rgba(0,0,0,0.06)', transition: 'all 0.15s' }}>
            <i className={`fas ${icon}`} style={{ fontSize: 12 }} />{label}
        </button>
    );
};

const MobileLayout = ({ data }) => {
    const { C } = useTheme();
    const { loading, filtros, setFiltros, reporteVentas, reporteProductos, reporteMozos, reporteMesas, error, setError, fetchReportes, exportarCSV, exportarPDF } = data;
    const [activeTab, setActiveTab] = useState('ventas');
    const [showFiltros, setShowFiltros] = useState(false);

    const ventasCD = {
        labels: reporteVentas?.ventas_por_periodo?.map(v => new Date(v.periodo).toLocaleDateString('es', { month: 'short', day: 'numeric' })) || [],
        datasets: [
            { label: 'Ventas S/', data: reporteVentas?.ventas_por_periodo?.map(v => parseFloat(v.total_ventas)) || [], borderColor: A, backgroundColor: A+'20', tension: 0.4, fill: true },
            { label: 'Pedidos',   data: reporteVentas?.ventas_por_periodo?.map(v => parseInt(v.total_pedidos)) || [],   borderColor: '#F9A825', backgroundColor: '#F9A82510', tension: 0.4, yAxisID: 'y1' },
        ],
    };
    const prodCD = { labels: reporteProductos?.productos?.slice(0,6).map(p => p.producto?.nombre||'') || [], datasets: [{ label: 'Ingresos S/', data: reporteProductos?.productos?.slice(0,6).map(p => parseFloat(p.ingresos_totales||0)) || [], backgroundColor: BAR_COLORS }] };
    const mozoCD = { labels: reporteMozos?.mozos?.map(m => (m.mozo?.nombre||'').split(' ')[0]) || [], datasets: [{ label: 'Ventas S/', data: reporteMozos?.mozos?.map(m => parseFloat(m.total_ventas||0)) || [], backgroundColor: A }, { label: 'Pedidos', data: reporteMozos?.mozos?.map(m => parseInt(m.total_pedidos||0)) || [], backgroundColor: '#F9A825' }] };

    const mxVenta = Math.max(...(reporteVentas?.ventas_por_periodo?.map(v => parseFloat(v.total_ventas||0)) || [0]));
    const mxProd  = Math.max(...(reporteProductos?.productos?.map(p => parseFloat(p.ingresos_totales||0)) || [0]));
    const mxMozo  = Math.max(...(reporteMozos?.mozos?.map(m => parseFloat(m.total_ventas||0)) || [0]));
    const mxMesa  = Math.max(...(reporteMesas?.mesas?.map(m => parseFloat(m.ingresos_totales||0)) || [0]));

    const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 10, font: { size: 11 }, color: C.textSub } } }, scales: { x: { ticks: { font: { size: 10 }, maxRotation: 35, color: C.textMuted }, grid: { display: false } }, y: { ticks: { font: { size: 10 }, color: C.textMuted }, grid: { color: C.borderLight } } } };
    const ventasOpts = { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, position: 'left' }, y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 10 }, color: C.textMuted } } } };

    return (
        <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 40 }}>
            {/* Header */}
            <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '12px 16px', position: 'sticky', top: 58, zIndex: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 12, background: A+'15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className="fas fa-chart-bar" style={{ color: A, fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Reportes</div>
                        <div style={{ fontSize: 10, color: C.textMuted }}>{filtros.fechaInicio} → {filtros.fechaFin}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {[
                            { icon: 'fa-sliders-h', fn: () => setShowFiltros(v=>!v), bg: showFiltros ? A : SDARK3+'25', cl: showFiltros ? '#fff' : SDARK3 },
                            { icon: 'fa-file-csv',  fn: () => exportarCSV(activeTab), bg: '#f0fdf4', cl: '#16a34a' },
                            { icon: 'fa-file-pdf',  fn: () => exportarPDF(activeTab), bg: '#fef2f2', cl: '#dc2626' },
                            { icon: loading ? 'fa-spinner fa-spin' : 'fa-sync-alt', fn: fetchReportes, bg: '#FFF8E1', cl: '#F57F17' },
                        ].map((b, i) => (
                            <button key={i} onClick={b.fn} disabled={loading && i===3}
                                style={{ width: 34, height: 34, borderRadius: 10, border: 'none', cursor: 'pointer', background: b.bg, color: b.cl, fontSize: 13 }}>
                                <i className={`fas ${b.icon}`} />
                            </button>
                        ))}
                    </div>
                </div>
                {showFiltros && (
                    <div style={{ background: '#FFF8E1', borderRadius: 14, padding: '12px', marginBottom: 10, border: `1px solid #F9A82530` }}>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                            {[['Desde','fechaInicio'],['Hasta','fechaFin']].map(([lbl,key]) => (
                                <div key={key} style={{ flex: 1 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: SDARK3, marginBottom: 4 }}>{lbl}</div>
                                    <input type="date" value={filtros[key]} onChange={e => setFiltros(f=>({...f,[key]:e.target.value}))}
                                        style={{ width: '100%', padding: '7px 8px', borderRadius: 9, border: `1.5px solid ${C.border}`, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: C.inputBg, color: C.text }} />
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'flex', gap: 5 }}>
                            {PERIODOS.map(p => (
                                <button key={p.key} onClick={() => setFiltros(f=>({...f,periodo:p.key}))}
                                    style={{ flex: 1, padding: '6px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: filtros.periodo===p.key ? A : C.surfaceAlt2, color: filtros.periodo===p.key ? '#fff' : C.textSub, boxShadow: filtros.periodo===p.key ? `0 2px 8px ${A}40` : 'none' }}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <div style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2, scrollbarWidth: 'none' }}>
                    {TABS.map(t => <TabChip key={t.key} label={t.label} icon={t.icon} active={activeTab===t.key} onClick={() => setActiveTab(t.key)} />)}
                </div>
            </div>

            {error && (
                <div style={{ margin: '12px 16px 0', background: '#fef2f2', borderRadius: 12, padding: '11px 14px', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <i className="fas fa-exclamation-circle" style={{ color: '#dc2626' }} />
                    <div style={{ fontSize: 13, color: '#dc2626', flex: 1 }}>{error}</div>
                    <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626' }}><i className="fas fa-times" /></button>
                </div>
            )}
            {loading && (
                <div style={{ textAlign: 'center', paddingTop: 60, color: C.textMuted }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: 30, display: 'block', marginBottom: 12, color: A }} />
                    <div style={{ fontSize: 14 }}>Cargando...</div>
                </div>
            )}

            {/* VENTAS */}
            {!loading && activeTab==='ventas' && (
                <div style={{ padding: '14px 16px 0' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <MobileKpiCard icon="fa-dollar-sign" label="Total ventas"  color="#16a34a" value={fmtK(reporteVentas?.resumen_total?.total_ventas)} />
                        <MobileKpiCard icon="fa-receipt"     label="Pedidos"       color={A}       value={reporteVentas?.resumen_total?.total_pedidos || 0} />
                    </div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <MobileKpiCard icon="fa-chart-line"  label="Prom/pedido"  color="#F9A825" value={fmtK(reporteVentas?.resumen_total?.promedio_pedido)} />
                        <MobileKpiCard icon="fa-calendar"    label="Períodos"      color="#0ea5e9" value={reporteVentas?.ventas_por_periodo?.length || 0} />
                    </div>
                    <div style={{ background: C.surface, borderRadius: 18, padding: '14px 12px', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: `1px solid ${C.borderLight}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Evolución de ventas</div>
                        {reporteVentas?.ventas_por_periodo?.length > 0
                            ? <div style={{ height: 220 }}><Line data={ventasCD} options={ventasOpts} /></div>
                            : <EmptyChart icon="fa-chart-line" msg="Sin datos en este período" />}
                    </div>
                    {reporteVentas?.ventas_por_periodo?.length > 0 && (
                        <div style={{ background: C.surface, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginBottom: 16, border: `1px solid ${C.borderLight}` }}>
                            <div style={{ padding: '13px 16px 10px', borderBottom: `1px solid ${C.borderLight}`, fontWeight: 700, fontSize: 14, color: C.text }}>Detalle por período</div>
                            {reporteVentas.ventas_por_periodo.map((v, i) => (
                                <MobileRankRow key={i} pos={i+1}
                                    name={new Date(v.periodo).toLocaleDateString('es',{weekday:'short',month:'short',day:'numeric'})}
                                    sub={`${v.total_pedidos} pedidos`} ingresos={v.total_ventas} maxIngresos={mxVenta}
                                    extra={`Promedio: ${fmt(v.promedio_pedido)}`} />
                            ))}
                        </div>
                    )}
                    {!reporteVentas && <EmptyState icon="fa-chart-line" msg="Sin datos de ventas" />}
                </div>
            )}
            {/* PRODUCTOS */}
            {!loading && activeTab==='productos' && (
                <div style={{ padding: '14px 16px 0' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <MobileKpiCard icon="fa-utensils" label="Productos"  color={A}       value={reporteProductos?.productos?.length || 0} />
                        <MobileKpiCard icon="fa-fire"     label="Top item"   color="#E65100" value={(reporteProductos?.productos?.[0]?.producto?.nombre||'—').split(' ')[0]} />
                    </div>
                    <div style={{ background: C.surface, borderRadius: 18, padding: '14px 12px', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: `1px solid ${C.borderLight}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Top 6 por ingresos</div>
                        {reporteProductos?.productos?.length > 0
                            ? <div style={{ height: 220 }}><Bar data={prodCD} options={baseOpts} /></div>
                            : <EmptyChart icon="fa-utensils" msg="Sin datos en este período" />}
                    </div>
                    {reporteProductos?.productos?.length > 0 && (
                        <div style={{ background: C.surface, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginBottom: 16, border: `1px solid ${C.borderLight}` }}>
                            <div style={{ padding: '13px 16px 10px', borderBottom: `1px solid ${C.borderLight}`, fontWeight: 700, fontSize: 14, color: C.text }}>Ranking</div>
                            {reporteProductos.productos.map((p, i) => (
                                <MobileRankRow key={i} pos={i+1} name={p.producto?.nombre||'Sin nombre'}
                                    sub={p.producto?.categoria?.nombre} ingresos={p.ingresos_totales} maxIngresos={mxProd}
                                    extra={`${p.total_vendido} unidades`} />
                            ))}
                        </div>
                    )}
                    {!reporteProductos && <EmptyState icon="fa-utensils" msg="Sin datos de productos" />}
                </div>
            )}
            {/* MOZOS */}
            {!loading && activeTab==='mozos' && (
                <div style={{ padding: '14px 16px 0' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <MobileKpiCard icon="fa-user-tie" label="Mozos"    color={A}       value={reporteMozos?.mozos?.length || 0} />
                        <MobileKpiCard icon="fa-trophy"   label="Top mozo" color="#F9A825" value={(reporteMozos?.mozos?.[0]?.mozo?.nombre||'—').split(' ')[0]} />
                    </div>
                    <div style={{ background: C.surface, borderRadius: 18, padding: '14px 12px', marginBottom: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.07)', border: `1px solid ${C.borderLight}` }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: C.text, marginBottom: 12 }}>Performance</div>
                        {reporteMozos?.mozos?.length > 0
                            ? <div style={{ height: 220 }}><Bar data={mozoCD} options={baseOpts} /></div>
                            : <EmptyChart icon="fa-user-tie" msg="Sin datos en este período" />}
                    </div>
                    {reporteMozos?.mozos?.length > 0 && (
                        <div style={{ background: C.surface, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginBottom: 16, border: `1px solid ${C.borderLight}` }}>
                            <div style={{ padding: '13px 16px 10px', borderBottom: `1px solid ${C.borderLight}`, fontWeight: 700, fontSize: 14, color: C.text }}>Ranking</div>
                            {reporteMozos.mozos.map((m, i) => (
                                <MobileRankRow key={i} pos={i+1} name={m.mozo?.nombre||'Sin nombre'}
                                    ingresos={m.total_ventas} maxIngresos={mxMozo}
                                    extra={`${m.total_pedidos} pedidos · prom ${fmt(m.promedio_por_pedido)}`} />
                            ))}
                        </div>
                    )}
                    {!reporteMozos && <EmptyState icon="fa-user-tie" msg="Sin datos de mozos" />}
                </div>
            )}
            {/* MESAS */}
            {!loading && activeTab==='mesas' && (
                <div style={{ padding: '14px 16px 0' }}>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                        <MobileKpiCard icon="fa-table"       label="Mesas"    color={A}       value={reporteMesas?.mesas?.length || 0} />
                        <MobileKpiCard icon="fa-dollar-sign" label="Ingresos" color="#16a34a"
                            value={fmtK(reporteMesas?.mesas?.reduce((a,m)=>a+parseFloat(m.ingresos_totales||0),0))} />
                    </div>
                    {reporteMesas?.mesas?.length > 0 ? (
                        <div style={{ background: C.surface, borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', marginBottom: 16, border: `1px solid ${C.borderLight}` }}>
                            <div style={{ padding: '13px 16px 10px', borderBottom: `1px solid ${C.borderLight}`, fontWeight: 700, fontSize: 14, color: C.text }}>Performance por mesa</div>
                            {reporteMesas.mesas.map((m, i) => (
                                <MobileRankRow key={i} pos={i+1} name={`Mesa ${m.mesa?.numero||'?'}`}
                                    sub={`${m.mesa?.capacidad||0} personas`}
                                    ingresos={m.ingresos_totales} maxIngresos={mxMesa}
                                    extra={`${m.total_pedidos} pedidos · prom ${fmt(m.promedio_por_pedido)}`} />
                            ))}
                        </div>
                    ) : !loading && <EmptyState icon="fa-table" msg="Sin datos de mesas" />}
                </div>
            )}
        </div>
    );
};

/* -- Desktop KPI card -- */
const DeskKpi = ({ icon, label, value, color, sub }) => {
    const { C } = useTheme();
    const [hov, setHov] = useState(false);
    return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ background: C.surface, borderRadius: 20, padding: '22px 24px', boxShadow: hov ? '0 12px 32px rgba(0,0,0,0.13)' : '0 2px 12px rgba(0,0,0,0.07)', transform: hov ? 'translateY(-4px)' : 'translateY(0)', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', position: 'relative', overflow: 'hidden', cursor: 'default', border: `1px solid ${C.borderLight}` }}>
            <div style={{ position: 'absolute', right: -24, bottom: -24, width: 96, height: 96, borderRadius: '50%', background: color + '12', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: -8, bottom: -8, width: 52, height: 52, borderRadius: '50%', background: color + '18', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ width: 40, height: 40, borderRadius: 14, background: color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={`fas ${icon}`} style={{ color, fontSize: 16 }} />
                    </div>
                </div>
                <div style={{ fontSize: 30, fontWeight: 900, color: C.text, lineHeight: 1, letterSpacing: -1 }}>{value}</div>
                {sub && <div style={{ fontSize: 12, color: C.textSub, marginTop: 8, fontWeight: 500 }}>{sub}</div>}
                <div style={{ position: 'absolute', bottom: -22, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${color}, ${color}60)`, borderRadius: 2 }} />
            </div>
        </div>
    );
};

const DeskTable = ({ columns, rows }) => {
    const { C } = useTheme();
    const [hov, setHov] = useState(null);
    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                    <tr style={{ background: C.surfaceAlt, borderBottom: `2px solid ${C.border}` }}>
                        {columns.map((c, i) => (
                            <th key={i} style={{ padding: '11px 16px', textAlign: i===0 ? 'center' : 'left', fontWeight: 700, fontSize: 11, color: C.textMuted, letterSpacing: 0.8, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{c}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} onMouseEnter={() => setHov(ri)} onMouseLeave={() => setHov(null)}
                            style={{ background: hov===ri ? C.surfaceAlt : ri%2===0 ? C.surface : C.surfaceAlt, transition: 'background 0.1s', borderBottom: `1px solid ${C.borderLight}` }}>
                            {row.map((cell, ci) => (
                                <td key={ci} style={{ padding: '13px 16px', textAlign: ci===0 ? 'center' : 'left', verticalAlign: 'middle', color: C.text }}>{cell}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PosBadge = ({ pos }) => {
    const cfg = pos===1 ? ['#fef3c7','#92400e','fa-crown'] : pos===2 ? ['#f1f5f9','#475569','fa-crown'] : pos===3 ? ['#fef3c7','#92400e','fa-crown'] : null;
    return cfg
        ? <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:9, background:cfg[0] }}><i className={`fas ${cfg[2]}`} style={{ color:cfg[1], fontSize:11 }} /></span>
        : <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:28, height:28, borderRadius:9, background:'#f8fafc', color:'#94a3b8', fontWeight:700, fontSize:12 }}>#{pos}</span>;
};

const ProgressBar = ({ name, value, max, color, sub }) => {
    const { C } = useTheme();
    const pct = max > 0 ? Math.round((parseFloat(value)/max)*100) : 0;
    const [hov, setHov] = useState(false);
    return (
        <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ padding: '10px 4px', borderRadius: 10, background: hov ? C.surfaceAlt : 'transparent', transition: 'background 0.12s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <div style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{name}</span>
                    {sub && <span style={{ fontSize: 11, color: C.textMuted }}>{sub}</span>}
                </div>
                <span style={{ fontWeight: 800, color: color || '#16a34a', flexShrink: 0, marginLeft: 8 }}>{fmt(value)}</span>
            </div>
            <div style={{ height: 7, background: C.surfaceAlt2, borderRadius: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: color ? `linear-gradient(90deg,${color},#F9A825)` : `linear-gradient(90deg,${A},#F9A825)`, borderRadius: 6, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
        </div>
    );
};

const DeskCard = ({ title, children, action }) => {
    const { C } = useTheme();
    return (
        <div style={{ background: C.surface, borderRadius: 22, overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.07)', border: `1px solid ${C.borderLight}` }}>
            <div style={{ padding: '18px 24px 14px', borderBottom: `1px solid ${C.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{title}</div>
                {action}
            </div>
            {children}
        </div>
    );
};

const SideItem = ({ tab, active, onClick }) => {
    const [hov, setHov] = useState(false);
    return (
        <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', border: 'none', borderRadius: 12, cursor: 'pointer', textAlign: 'left', background: active ? A : hov ? SDARK2 : 'transparent', color: active ? '#fff' : '#94a3b8', fontWeight: active ? 700 : 500, fontSize: 14, marginBottom: 3, transition: 'all 0.15s', boxShadow: active ? `0 4px 12px ${A}50` : 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                <i className={`fas ${tab.icon}`} style={{ fontSize: 14 }} />
            </div>
            <span style={{ flex: 1 }}>{tab.label}</span>
            {active && <i className="fas fa-chevron-right" style={{ fontSize: 10, opacity: 0.6 }} />}
        </button>
    );
};

const DesktopLayout = ({ data }) => {
    const { C } = useTheme();
    const { loading, filtros, setFiltros, reporteVentas, reporteProductos, reporteMozos, reporteMesas, error, setError, fetchReportes, exportarCSV, exportarPDF } = data;
    const [activeTab, setActiveTab] = useState('ventas');

    const ventasCD = {
        labels: reporteVentas?.ventas_por_periodo?.map(v => new Date(v.periodo).toLocaleDateString('es',{month:'short',day:'numeric'})) || [],
        datasets: [
            { label: 'Ventas S/', data: reporteVentas?.ventas_por_periodo?.map(v => parseFloat(v.total_ventas)) || [], borderColor: A, backgroundColor: A+'25', tension: 0.4, fill: true, pointBackgroundColor: A, pointRadius: 4, pointHoverRadius: 6 },
            { label: 'Pedidos',   data: reporteVentas?.ventas_por_periodo?.map(v => parseInt(v.total_pedidos)) || [],   borderColor: '#f59e0b', backgroundColor: '#f59e0b15', tension: 0.4, yAxisID: 'y1', pointBackgroundColor: '#f59e0b', pointRadius: 4 },
        ],
    };
    const prodCD = { labels: reporteProductos?.productos?.slice(0,8).map(p => p.producto?.nombre?.split(' ')[0]||'') || [], datasets: [{ label: 'Ingresos S/', data: reporteProductos?.productos?.slice(0,8).map(p => parseFloat(p.ingresos_totales||0)) || [], backgroundColor: BAR_COLORS, borderRadius: 8, borderSkipped: false }] };
    const mozoCD = { labels: reporteMozos?.mozos?.map(m => (m.mozo?.nombre||'').split(' ')[0]) || [], datasets: [{ label: 'Ventas S/', data: reporteMozos?.mozos?.map(m => parseFloat(m.total_ventas||0)) || [], backgroundColor: A, borderRadius: 8 }, { label: 'Pedidos', data: reporteMozos?.mozos?.map(m => parseInt(m.total_pedidos||0)) || [], backgroundColor: '#f59e0b', borderRadius: 8 }] };

    const baseOpts = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { boxWidth: 12, font: { size: 12 }, padding: 14, color: C.textSub } }, tooltip: { bodyFont: { size: 12 } } }, scales: { x: { ticks: { font: { size: 11 }, color: C.textMuted }, grid: { display: false } }, y: { ticks: { font: { size: 11 }, color: C.textMuted }, grid: { color: C.borderLight } } } };
    const ventasOpts = { ...baseOpts, scales: { ...baseOpts.scales, y: { ...baseOpts.scales.y, position: 'left', title: { display: true, text: 'Ventas S/', font: { size: 11 }, color: C.textMuted } }, y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { font: { size: 11 }, color: C.textMuted }, title: { display: true, text: 'Pedidos', font: { size: 11 }, color: C.textMuted } } } };

    const mxProd = Math.max(...(reporteProductos?.productos?.map(p => parseFloat(p.ingresos_totales||0)) || [0]));
    const mxMozo = Math.max(...(reporteMozos?.mozos?.map(m => parseFloat(m.total_ventas||0)) || [0]));
    const mxMesa = Math.max(...(reporteMesas?.mesas?.map(m => parseFloat(m.ingresos_totales||0)) || [0]));

    const ventasRows = (reporteVentas?.ventas_por_periodo||[]).map((v,i) => [
        <PosBadge pos={i+1} />,
        new Date(v.periodo).toLocaleDateString('es',{weekday:'short',year:'numeric',month:'short',day:'numeric'}),
        <span style={{ fontWeight: 800, color: '#16a34a', fontSize: 14 }}>{fmt(v.total_ventas)}</span>,
        <span style={{ background: A+'15', color: A, padding:'3px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>{v.total_pedidos}</span>,
        <span style={{ color: C.textSub }}>{fmt(v.promedio_pedido)}</span>,
    ]);
    const prodRows = (reporteProductos?.productos||[]).map((p,i) => [
        <PosBadge pos={i+1} />,
        <div><div style={{ fontWeight: 700, color: C.text }}>{p.producto?.nombre||'—'}</div><div style={{ fontSize: 11, color: C.textMuted }}>{p.producto?.categoria?.nombre}</div></div>,
        <span style={{ background: '#f0fdf4', color: '#16a34a', padding:'3px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>{p.total_vendido} uds</span>,
        <span style={{ fontWeight: 800, color: '#16a34a', fontSize: 14 }}>{fmt(p.ingresos_totales)}</span>,
    ]);
    const mozoRows = (reporteMozos?.mozos||[]).map((m,i) => [
        <PosBadge pos={i+1} />,
        <span style={{ fontWeight: 700, color: C.text }}>{m.mozo?.nombre||'—'}</span>,
        <span style={{ background: A+'15', color: A, padding:'3px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>{m.total_pedidos}</span>,
        <span style={{ fontWeight: 800, color: '#16a34a', fontSize: 14 }}>{fmt(m.total_ventas)}</span>,
        <span style={{ color: C.textSub }}>{fmt(m.promedio_por_pedido)}</span>,
    ]);
    const mesaRows = (reporteMesas?.mesas||[]).map((m,i) => [
        <PosBadge pos={i+1} />,
        <span style={{ fontWeight: 700, color: C.text }}>Mesa {m.mesa?.numero||'?'}</span>,
        <span style={{ background: C.surfaceAlt2, color: C.textSub, padding:'3px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>{m.mesa?.capacidad||0} pers</span>,
        <span style={{ background: A+'15', color: A, padding:'3px 12px', borderRadius: 20, fontWeight: 700, fontSize: 12 }}>{m.total_pedidos}</span>,
        <span style={{ fontWeight: 800, color: '#16a34a', fontSize: 14 }}>{fmt(m.ingresos_totales)}</span>,
        <span style={{ color: C.textSub }}>{fmt(m.promedio_por_pedido)}</span>,
    ]);

    const ExportBtns = () => (
        <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => exportarCSV(activeTab)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, border:'1px solid #dcfce7', background:'#f0fdf4', color:'#16a34a', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                <i className="fas fa-file-csv" />CSV
            </button>
            <button onClick={() => exportarPDF(activeTab)} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', borderRadius:10, border:'1px solid #fecaca', background:'#fef2f2', color:'#dc2626', fontWeight:700, fontSize:12, cursor:'pointer' }}>
                <i className="fas fa-file-pdf" />PDF
            </button>
        </div>
    );

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>

            {/* SIDEBAR — always dark */}
            <div style={{ width: 272, flexShrink: 0, background: SDARK, display: 'flex', flexDirection: 'column', position: 'sticky', top: 58, height: 'calc(100vh - 58px)', overflowY: 'auto' }}>
                <div style={{ padding: '22px 18px 16px', borderBottom: `1px solid ${SDARK2}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <img src={`${process.env.PUBLIC_URL}/logo-chavo.png`} alt="El Chavo" style={{ width: 42, height: 42, objectFit: 'contain', borderRadius: 14, flexShrink: 0 }} />
                        <div>
                            <div style={{ fontWeight: 900, fontSize: 17, color: '#fff', letterSpacing: 0.3 }}>Reportes</div>
                            <div style={{ fontSize: 11, color: '#64748b' }}>Análisis del negocio</div>
                        </div>
                    </div>
                </div>
                <nav style={{ flex: 1, padding: '16px 12px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1.2, padding: '0 4px 12px', textTransform: 'uppercase' }}>Secciones</div>
                    {TABS.map(t => <SideItem key={t.key} tab={t} active={activeTab===t.key} onClick={() => setActiveTab(t.key)} />)}
                </nav>
                <div style={{ padding: '16px 14px', borderTop: `1px solid ${SDARK2}` }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#475569', letterSpacing: 1.2, marginBottom: 14, textTransform: 'uppercase' }}>Período</div>
                    {[['Desde','fechaInicio'],['Hasta','fechaFin']].map(([lbl,key]) => (
                        <div key={key} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 5 }}>{lbl}</div>
                            <input type="date" value={filtros[key]} onChange={e => setFiltros(f=>({...f,[key]:e.target.value}))}
                                style={{ width: '100%', padding: '8px 10px', borderRadius: 9, border: `1.5px solid ${SDARK3}`, fontSize: 12, outline: 'none', boxSizing: 'border-box', background: SDARK2, color: '#f8fafc', colorScheme: 'dark' }} />
                        </div>
                    ))}
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>Agrupar por</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5, marginBottom: 16 }}>
                        {PERIODOS.map(p => (
                            <button key={p.key} onClick={() => setFiltros(f=>({...f,periodo:p.key}))}
                                style={{ padding: '7px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: filtros.periodo===p.key ? A : SDARK2, color: filtros.periodo===p.key ? '#fff' : '#64748b', boxShadow: filtros.periodo===p.key ? `0 3px 10px ${A}50` : 'none', transition: 'all 0.15s' }}>
                                {p.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={fetchReportes} disabled={loading}
                        style={{ width: '100%', padding: '10px 0', borderRadius: 12, border: 'none', cursor: 'pointer', background: loading ? SDARK3 : `linear-gradient(135deg,#9B1B1B,#EF5350)`, color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: loading ? 'none' : `0 4px 14px ${A}50`, transition: 'all 0.2s' }}>
                        <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} style={{ marginRight: 8 }} />
                        Actualizar datos
                    </button>
                </div>
            </div>

            {/* CONTENT */}
            <div style={{ flex: 1, minWidth: 0, padding: '0 0 48px', overflowY: 'auto' }}>
                <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className={`fas ${TABS.find(t=>t.key===activeTab)?.icon}`} style={{ color: A, fontSize: 15 }} />
                            <span style={{ fontWeight: 800, fontSize: 18, color: C.text }}>{TABS.find(t=>t.key===activeTab)?.label}</span>
                        </div>
                        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>
                            {filtros.fechaInicio} → {filtros.fechaFin} · Agrupado por {filtros.periodo}
                        </div>
                    </div>
                    <ExportBtns />
                </div>

                <div style={{ padding: '28px 32px 0' }}>
                    {error && (
                        <div style={{ background: '#fef2f2', borderRadius: 14, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
                            <i className="fas fa-exclamation-circle" style={{ color: '#dc2626', fontSize: 16 }} />
                            <div style={{ fontSize: 14, color: '#dc2626', flex: 1 }}>{error}</div>
                            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}><i className="fas fa-times" /></button>
                        </div>
                    )}
                    {loading && (
                        <div style={{ textAlign: 'center', paddingTop: 100, color: C.textMuted }}>
                            <i className="fas fa-spinner fa-spin" style={{ fontSize: 40, display: 'block', marginBottom: 16, color: A }} />
                            <div style={{ fontSize: 16 }}>Cargando reportes...</div>
                        </div>
                    )}

                    {/* VENTAS */}
                    {!loading && activeTab==='ventas' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginBottom: 28 }}>
                                <DeskKpi icon="fa-dollar-sign" label="Total ventas"   color="#16a34a" value={fmt(reporteVentas?.resumen_total?.total_ventas)} />
                                <DeskKpi icon="fa-receipt"     label="Total pedidos"  color={A}       value={reporteVentas?.resumen_total?.total_pedidos || 0} />
                                <DeskKpi icon="fa-chart-line"  label="Prom / pedido"  color="#f59e0b" value={fmt(reporteVentas?.resumen_total?.promedio_pedido)} />
                                <DeskKpi icon="fa-calendar-day" label="Períodos"      color="#0ea5e9" value={reporteVentas?.ventas_por_periodo?.length || 0} sub={`Agrupado por ${filtros.periodo}`} />
                            </div>
                            <DeskCard title="Evolución de Ventas y Pedidos">
                                <div style={{ padding: '20px 24px' }}>
                                    {reporteVentas?.ventas_por_periodo?.length > 0
                                        ? <div style={{ height: 360 }}><Line data={ventasCD} options={ventasOpts} /></div>
                                        : <EmptyChart icon="fa-chart-line" msg="Sin datos en este período" />}
                                </div>
                            </DeskCard>
                            {ventasRows.length > 0 && (
                                <div style={{ marginTop: 20 }}>
                                    <DeskCard title="Detalle por período">
                                        <DeskTable columns={['#','Período','Ventas','Pedidos','Promedio']} rows={ventasRows} />
                                    </DeskCard>
                                </div>
                            )}
                            {!reporteVentas && <EmptyState icon="fa-chart-line" msg="Sin datos de ventas" />}
                        </>
                    )}

                    {/* PRODUCTOS */}
                    {!loading && activeTab==='productos' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 28 }}>
                                <DeskKpi icon="fa-utensils"    label="Productos"     color={A}       value={reporteProductos?.productos?.length || 0} />
                                <DeskKpi icon="fa-fire"        label="Más vendido"   color="#dc2626" value={(reporteProductos?.productos?.[0]?.producto?.nombre||'—').split(' ')[0]} sub={`${reporteProductos?.productos?.[0]?.total_vendido||0} unidades`} />
                                <DeskKpi icon="fa-dollar-sign" label="Mayor ingreso" color="#16a34a" value={fmt(reporteProductos?.productos?.[0]?.ingresos_totales)} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 20 }}>
                                <DeskCard title="Top 8 por ingresos">
                                    <div style={{ padding: '20px 24px' }}>
                                        {reporteProductos?.productos?.length > 0
                                            ? <div style={{ height: 300 }}><Bar data={prodCD} options={baseOpts} /></div>
                                            : <EmptyChart icon="fa-utensils" msg="Sin datos" />}
                                    </div>
                                </DeskCard>
                                <DeskCard title="Leaderboard">
                                    <div style={{ padding: '16px 20px' }}>
                                        {(reporteProductos?.productos?.slice(0,6)||[]).map((p,i) => (
                                            <ProgressBar key={i} name={p.producto?.nombre||'—'} sub={p.producto?.categoria?.nombre} value={p.ingresos_totales} max={mxProd} color={BAR_COLORS[i]} />
                                        ))}
                                        {!reporteProductos?.productos?.length && <EmptyChart icon="fa-utensils" msg="Sin datos" />}
                                    </div>
                                </DeskCard>
                            </div>
                            {prodRows.length > 0 && <DeskCard title="Ranking completo"><DeskTable columns={['#','Producto','Cantidad','Ingresos']} rows={prodRows} /></DeskCard>}
                            {!reporteProductos && <EmptyState icon="fa-utensils" msg="Sin datos de productos" />}
                        </>
                    )}

                    {/* MOZOS */}
                    {!loading && activeTab==='mozos' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 28 }}>
                                <DeskKpi icon="fa-user-tie" label="Mozos activos"  color={A}       value={reporteMozos?.mozos?.length || 0} />
                                <DeskKpi icon="fa-trophy"   label="Top mozo"       color="#f59e0b" value={(reporteMozos?.mozos?.[0]?.mozo?.nombre||'—').split(' ')[0]} sub={`${fmt(reporteMozos?.mozos?.[0]?.total_ventas)} en ventas`} />
                                <DeskKpi icon="fa-receipt"  label="Total pedidos"  color="#16a34a" value={reporteMozos?.mozos?.reduce((a,m)=>a+parseInt(m.total_pedidos||0),0)||0} />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 20 }}>
                                <DeskCard title="Ventas y Pedidos por mozo">
                                    <div style={{ padding: '20px 24px' }}>
                                        {reporteMozos?.mozos?.length > 0
                                            ? <div style={{ height: 300 }}><Bar data={mozoCD} options={baseOpts} /></div>
                                            : <EmptyChart icon="fa-user-tie" msg="Sin datos" />}
                                    </div>
                                </DeskCard>
                                <DeskCard title="Comparativa">
                                    <div style={{ padding: '16px 20px' }}>
                                        {(reporteMozos?.mozos||[]).map((m,i) => (
                                            <ProgressBar key={i} name={(m.mozo?.nombre||'—').split(' ')[0]} sub={`${m.total_pedidos} pedidos`} value={m.total_ventas} max={mxMozo} />
                                        ))}
                                        {!reporteMozos?.mozos?.length && <EmptyChart icon="fa-user-tie" msg="Sin datos" />}
                                    </div>
                                </DeskCard>
                            </div>
                            {mozoRows.length > 0 && <DeskCard title="Ranking completo"><DeskTable columns={['#','Mozo','Pedidos','Ventas','Promedio']} rows={mozoRows} /></DeskCard>}
                            {!reporteMozos && <EmptyState icon="fa-user-tie" msg="Sin datos de mozos" />}
                        </>
                    )}

                    {/* MESAS */}
                    {!loading && activeTab==='mesas' && (
                        <>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 28 }}>
                                <DeskKpi icon="fa-table"       label="Mesas"            color={A}       value={reporteMesas?.mesas?.length || 0} />
                                <DeskKpi icon="fa-dollar-sign" label="Ingresos totales"  color="#16a34a" value={fmt(reporteMesas?.mesas?.reduce((a,m)=>a+parseFloat(m.ingresos_totales||0),0))} />
                                <DeskKpi icon="fa-fire"        label="Mesa top"          color="#dc2626" value={`Mesa ${reporteMesas?.mesas?.[0]?.mesa?.numero||'—'}`} sub={fmt(reporteMesas?.mesas?.[0]?.ingresos_totales)} />
                            </div>
                            {reporteMesas?.mesas?.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, marginBottom: 20 }}>
                                    <DeskCard title="Ranking completo">
                                        <DeskTable columns={['#','Mesa','Capacidad','Pedidos','Ingresos','Promedio']} rows={mesaRows} />
                                    </DeskCard>
                                    <DeskCard title="Comparativa de ingresos">
                                        <div style={{ padding: '16px 20px' }}>
                                            {reporteMesas.mesas.map((m,i) => (
                                                <ProgressBar key={i} name={`Mesa ${m.mesa?.numero||'?'}`} sub={`${m.mesa?.capacidad||0} personas · ${m.total_pedidos} pedidos`} value={m.ingresos_totales} max={mxMesa} color={BAR_COLORS[i%BAR_COLORS.length]} />
                                            ))}
                                        </div>
                                    </DeskCard>
                                </div>
                            )}
                            {!reporteMesas && <EmptyState icon="fa-table" msg="Sin datos de mesas" />}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const ReportesManagement = () => {
    const isDesktop = useIsDesktop();
    const data = useReportes();
    return isDesktop ? <DesktopLayout data={data} /> : <MobileLayout data={data} />;
};

export default ReportesManagement;
