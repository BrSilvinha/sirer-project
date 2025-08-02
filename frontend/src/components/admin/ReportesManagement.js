import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Form, 
    Spinner, Modal, Tab, Tabs, Table, ButtonGroup,
    ProgressBar, Alert
} from 'react-bootstrap';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
} from 'chart.js';
import { Bar, Line, Doughnut, Pie } from 'react-chartjs-2';
import { reportesService } from '../../services/api';
import toast from 'react-hot-toast';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    Filler
);

const ReportesManagement = () => {
    const [activeTab, setActiveTab] = useState('ventas');
    const [loading, setLoading] = useState(false);
    const [filtros, setFiltros] = useState({
        fechaInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 días atrás
        fechaFin: new Date().toISOString().split('T')[0],
        periodo: 'dia', // 'hora', 'dia', 'semana', 'mes'
        comparar: false
    });
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportType, setExportType] = useState('pdf');

    // Estados para diferentes tipos de reportes
    const [reporteVentas, setReporteVentas] = useState(null);
    const [reporteProductos, setReporteProductos] = useState(null);
    const [reporteMozos, setReporteMozos] = useState(null);
    const [reporteMesas, setReporteMesas] = useState(null);

    // Mock data generators
    const generateVentasData = useCallback(() => {
        const dias = Math.ceil((new Date(filtros.fechaFin) - new Date(filtros.fechaInicio)) / (1000 * 60 * 60 * 24));
        const ventasPorDia = [];
        
        for (let i = 0; i <= dias; i++) {
            const fecha = new Date(filtros.fechaInicio);
            fecha.setDate(fecha.getDate() + i);
            
            // Simular variación más realista
            const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
            const baseVentas = esFinde ? 800 + Math.random() * 400 : 500 + Math.random() * 300;
            
            ventasPorDia.push({
                fecha: fecha.toISOString().split('T')[0],
                ventas: parseFloat(baseVentas.toFixed(2)),
                pedidos: Math.floor(baseVentas / 25) + Math.floor(Math.random() * 10),
                promedio: parseFloat((baseVentas / (Math.floor(baseVentas / 25) + Math.floor(Math.random() * 10))).toFixed(2))
            });
        }

        const totalVentas = ventasPorDia.reduce((sum, dia) => sum + dia.ventas, 0);
        const totalPedidos = ventasPorDia.reduce((sum, dia) => sum + dia.pedidos, 0);
        const promedioGeneral = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

        return {
            periodo: {
                inicio: filtros.fechaInicio,
                fin: filtros.fechaFin,
                dias: dias + 1
            },
            resumen: {
                total_ventas: totalVentas,
                total_pedidos: totalPedidos,
                promedio_pedido: promedioGeneral,
                mejor_dia: ventasPorDia.reduce((max, dia) => dia.ventas > max.ventas ? dia : max),
                crecimiento: Math.random() > 0.5 ? (Math.random() * 15) : -(Math.random() * 8)
            },
            datos_diarios: ventasPorDia
        };
    }, [filtros]);

    const generateProductosData = useCallback(() => {
        const productos = [
            { nombre: 'Pizza Margarita', categoria: 'Platos Principales', precio: 25.90 },
            { nombre: 'Hamburguesa Clásica', categoria: 'Platos Principales', precio: 18.50 },
            { nombre: 'Pasta Carbonara', categoria: 'Platos Principales', precio: 22.00 },
            { nombre: 'Ensalada César', categoria: 'Entradas', precio: 12.00 },
            { nombre: 'Coca Cola', categoria: 'Bebidas', precio: 3.50 },
            { nombre: 'Agua Mineral', categoria: 'Bebidas', precio: 2.00 },
            { nombre: 'Café Espresso', categoria: 'Bebidas', precio: 4.00 },
            { nombre: 'Tiramisú', categoria: 'Postres', precio: 8.50 },
            { nombre: 'Cheesecake', categoria: 'Postres', precio: 9.00 },
            { nombre: 'Pan de Ajo', categoria: 'Entradas', precio: 6.50 }
        ];

        const productosVendidos = productos.map(producto => {
            const cantidad = Math.floor(Math.random() * 150) + 20;
            const ingresos = cantidad * producto.precio;
            const popularidad = Math.floor(Math.random() * 100) + 1;
            
            return {
                ...producto,
                cantidad_vendida: cantidad,
                ingresos_totales: parseFloat(ingresos.toFixed(2)),
                popularidad_score: popularidad,
                veces_pedido: Math.floor(cantidad * (0.7 + Math.random() * 0.6)),
                promedio_por_pedido: parseFloat((cantidad / (Math.floor(cantidad * (0.7 + Math.random() * 0.6)) || 1)).toFixed(2))
            };
        }).sort((a, b) => b.ingresos_totales - a.ingresos_totales);

        // Agrupar por categorías
        const porCategorias = productosVendidos.reduce((acc, producto) => {
            if (!acc[producto.categoria]) {
                acc[producto.categoria] = {
                    categoria: producto.categoria,
                    productos: [],
                    total_cantidad: 0,
                    total_ingresos: 0
                };
            }
            acc[producto.categoria].productos.push(producto);
            acc[producto.categoria].total_cantidad += producto.cantidad_vendida;
            acc[producto.categoria].total_ingresos += producto.ingresos_totales;
            return acc;
        }, {});

        return {
            productos_individuales: productosVendidos,
            por_categorias: Object.values(porCategorias),
            resumen: {
                total_productos: productosVendidos.length,
                mas_vendido: productosVendidos[0],
                menos_vendido: productosVendidos[productosVendidos.length - 1],
                promedio_popularidad: productosVendidos.reduce((sum, p) => sum + p.popularidad_score, 0) / productosVendidos.length
            }
        };
    }, []);

    const generateMozosData = useCallback(() => {
        const mozos = [
            { id: 1, nombre: 'Juan Pérez', experiencia: 'Senior', turno: 'Mañana' },
            { id: 2, nombre: 'María González', experiencia: 'Semi-Senior', turno: 'Tarde' },
            { id: 3, nombre: 'Carlos Ruiz', experiencia: 'Junior', turno: 'Noche' },
            { id: 4, nombre: 'Ana López', experiencia: 'Senior', turno: 'Mañana' },
            { id: 5, nombre: 'Luis Torres', experiencia: 'Semi-Senior', turno: 'Tarde' }
        ];

        const performanceMozos = mozos.map(mozo => {
            const pedidos = Math.floor(Math.random() * 80) + 30;
            const ventas = pedidos * (20 + Math.random() * 15);
            const propinas = ventas * (0.08 + Math.random() * 0.07); // 8-15% de propinas
            const satisfaccion = 75 + Math.random() * 25; // 75-100%
            const eficiencia = 70 + Math.random() * 30; // 70-100%

            return {
                ...mozo,
                total_pedidos: pedidos,
                total_ventas: parseFloat(ventas.toFixed(2)),
                promedio_pedido: parseFloat((ventas / pedidos).toFixed(2)),
                propinas_estimadas: parseFloat(propinas.toFixed(2)),
                satisfaccion_cliente: parseFloat(satisfaccion.toFixed(1)),
                eficiencia_servicio: parseFloat(eficiencia.toFixed(1)),
                mesas_atendidas: Math.floor(pedidos / 3) + Math.floor(Math.random() * 5),
                horas_trabajadas: 8 + Math.floor(Math.random() * 4)
            };
        }).sort((a, b) => b.total_ventas - a.total_ventas);

        return {
            mozos_performance: performanceMozos,
            resumen: {
                total_mozos: performanceMozos.length,
                mejor_vendedor: performanceMozos[0],
                promedio_ventas: performanceMozos.reduce((sum, m) => sum + m.total_ventas, 0) / performanceMozos.length,
                satisfaccion_promedio: performanceMozos.reduce((sum, m) => sum + m.satisfaccion_cliente, 0) / performanceMozos.length
            }
        };
    }, []);

    const generateMesasData = useCallback(() => {
        const mesas = [];
        for (let i = 1; i <= 12; i++) {
            const ocupaciones = Math.floor(Math.random() * 8) + 2; // 2-10 ocupaciones por día
            const horasOcupada = ocupaciones * (1.5 + Math.random() * 1); // 1.5-2.5 horas promedio
            const capacidad = i <= 8 ? 4 : 6;
            const ingresos = ocupaciones * capacidad * (15 + Math.random() * 20);
            const rotacion = ocupaciones; // veces que se ocupó
            const eficiencia = (horasOcupada / 12) * 100; // % del tiempo ocupada

            mesas.push({
                numero: i,
                capacidad: capacidad,
                total_ocupaciones: ocupaciones,
                horas_ocupada: parseFloat(horasOcupada.toFixed(1)),
                ingresos_generados: parseFloat(ingresos.toFixed(2)),
                rotacion_diaria: rotacion,
                eficiencia_ocupacion: parseFloat(eficiencia.toFixed(1)),
                promedio_por_ocupacion: parseFloat((ingresos / ocupaciones).toFixed(2)),
                tiempo_promedio_ocupacion: parseFloat((horasOcupada / ocupaciones).toFixed(1))
            });
        }

        const mesasOrdenadas = mesas.sort((a, b) => b.ingresos_generados - a.ingresos_generados);

        return {
            mesas_performance: mesasOrdenadas,
            resumen: {
                total_mesas: mesas.length,
                mesa_mas_rentable: mesasOrdenadas[0],
                ocupacion_promedio: mesas.reduce((sum, m) => sum + m.eficiencia_ocupacion, 0) / mesas.length,
                ingresos_totales: mesas.reduce((sum, m) => sum + m.ingresos_generados, 0),
                rotacion_promedio: mesas.reduce((sum, m) => sum + m.rotacion_diaria, 0) / mesas.length
            }
        };
    }, []);

    const fetchReportes = useCallback(async () => {
        setLoading(true);
        try {
            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Generar datos mock
            setReporteVentas(generateVentasData());
            setReporteProductos(generateProductosData());
            setReporteMozos(generateMozosData());
            setReporteMesas(generateMesasData());
            
        } catch (error) {
            console.error('Error fetching reportes:', error);
            toast.error('Error al cargar reportes');
        } finally {
            setLoading(false);
        }
    }, [generateVentasData, generateProductosData, generateMozosData, generateMesasData]);

    useEffect(() => {
        fetchReportes();
    }, [fetchReportes]);

    const handleFiltroChange = useCallback((campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }));
    }, []);

    const handleExportar = useCallback((tipo) => {
        setExportType(tipo);
        setShowExportModal(true);
    }, []);

    const handleConfirmExport = useCallback(async () => {
        try {
            // Simular exportación
            toast.loading('Generando reporte...', { duration: 2000 });
            
            setTimeout(() => {
                toast.success(`Reporte exportado como ${exportType.toUpperCase()}`);
                setShowExportModal(false);
            }, 2000);
            
        } catch (error) {
            toast.error('Error al exportar reporte');
        }
    }, [exportType]);

    // Configuraciones de gráficos
    const ventasChartData = {
        labels: reporteVentas?.datos_diarios?.map(d => 
            new Date(d.fecha).toLocaleDateString('es', { month: 'short', day: 'numeric' })
        ) || [],
        datasets: [
            {
                label: 'Ventas ($)',
                data: reporteVentas?.datos_diarios?.map(d => d.ventas) || [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Pedidos',
                data: reporteVentas?.datos_diarios?.map(d => d.pedidos) || [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.4,
                yAxisID: 'y1',
                fill: false
            }
        ]
    };

    const productosChartData = {
        labels: reporteProductos?.productos_individuales?.slice(0, 8).map(p => p.nombre) || [],
        datasets: [{
            label: 'Ingresos ($)',
            data: reporteProductos?.productos_individuales?.slice(0, 8).map(p => p.ingresos_totales) || [],
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 205, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)',
                'rgba(153, 102, 255, 0.8)',
                'rgba(255, 159, 64, 0.8)',
                'rgba(199, 199, 199, 0.8)',
                'rgba(83, 102, 255, 0.8)'
            ]
        }]
    };

    const categoriasChartData = {
        labels: reporteProductos?.por_categorias?.map(c => c.categoria) || [],
        datasets: [{
            data: reporteProductos?.por_categorias?.map(c => c.total_ingresos) || [],
            backgroundColor: [
                'rgba(255, 99, 132, 0.8)',
                'rgba(54, 162, 235, 0.8)',
                'rgba(255, 205, 86, 0.8)',
                'rgba(75, 192, 192, 0.8)'
            ]
        }]
    };

    const mozosChartData = {
        labels: reporteMozos?.mozos_performance?.map(m => m.nombre.split(' ')[0]) || [],
        datasets: [
            {
                label: 'Ventas ($)',
                data: reporteMozos?.mozos_performance?.map(m => m.total_ventas) || [],
                backgroundColor: 'rgba(54, 162, 235, 0.8)'
            },
            {
                label: 'Pedidos',
                data: reporteMozos?.mozos_performance?.map(m => m.total_pedidos) || [],
                backgroundColor: 'rgba(255, 99, 132, 0.8)'
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
            }
        }
    };

    const ventasChartOptions = {
        ...chartOptions,
        scales: {
            y: {
                type: 'linear',
                display: true,
                position: 'left',
                title: {
                    display: true,
                    text: 'Ventas ($)'
                }
            },
            y1: {
                type: 'linear',
                display: true,
                position: 'right',
                title: {
                    display: true,
                    text: 'Pedidos'
                },
                grid: {
                    drawOnChartArea: false,
                }
            }
        }
    };

    return (
        <Container fluid>
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="mb-1">
                                <i className="fas fa-chart-line text-primary me-2"></i>
                                Reportes Avanzados
                            </h2>
                            <p className="text-muted mb-0">
                                Análisis detallado del rendimiento del restaurante
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleExportar('excel')}
                            >
                                <i className="fas fa-file-excel me-1"></i>
                                Excel
                            </Button>
                            <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleExportar('pdf')}
                            >
                                <i className="fas fa-file-pdf me-1"></i>
                                PDF
                            </Button>
                            <Button 
                                variant="primary" 
                                size="sm"
                                onClick={fetchReportes}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Spinner animation="border" size="sm" />
                                ) : (
                                    <i className="fas fa-sync-alt"></i>
                                )}
                                <span className="ms-1">Actualizar</span>
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Filtros globales */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Fecha Inicio</Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={filtros.fechaInicio}
                                    onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Fecha Fin</Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={filtros.fechaFin}
                                    onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Período</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.periodo}
                                    onChange={(e) => handleFiltroChange('periodo', e.target.value)}
                                >
                                    <option value="hora">Por Hora</option>
                                    <option value="dia">Por Día</option>
                                    <option value="semana">Por Semana</option>
                                    <option value="mes">Por Mes</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3} className="d-flex align-items-end">
                            <Form.Check
                                type="switch"
                                id="comparar-switch"
                                label="Comparar períodos"
                                checked={filtros.comparar}
                                onChange={(e) => handleFiltroChange('comparar', e.target.checked)}
                            />
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Tabs de reportes */}
            <Tabs 
                activeKey={activeTab} 
                onSelect={(k) => setActiveTab(k)}
                className="mb-4"
            >
                {/* Reporte de Ventas */}
                <Tab eventKey="ventas" title={
                    <span>
                        <i className="fas fa-chart-line me-2"></i>
                        Ventas
                    </span>
                }>
                    {reporteVentas && (
                        <>
                            {/* Métricas de ventas */}
                            <Row className="mb-4">
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-dollar-sign fa-2x text-success mb-2"></i>
                                            <div className="h4 mb-0 text-success">
                                                ${reporteVentas.resumen.total_ventas.toFixed(2)}
                                            </div>
                                            <div className="text-muted small">Total Ventas</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-receipt fa-2x text-primary mb-2"></i>
                                            <div className="h4 mb-0 text-primary">
                                                {reporteVentas.resumen.total_pedidos}
                                            </div>
                                            <div className="text-muted small">Total Pedidos</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-chart-line fa-2x text-info mb-2"></i>
                                            <div className="h4 mb-0 text-info">
                                                ${reporteVentas.resumen.promedio_pedido.toFixed(2)}
                                            </div>
                                            <div className="text-muted small">Promedio por Pedido</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className={`fas ${reporteVentas.resumen.crecimiento >= 0 ? 'fa-arrow-up' : 'fa-arrow-down'} fa-2x text-warning mb-2`}></i>
                                            <div className="h4 mb-0 text-warning">
                                                {reporteVentas.resumen.crecimiento >= 0 ? '+' : ''}{reporteVentas.resumen.crecimiento.toFixed(1)}%
                                            </div>
                                            <div className="text-muted small">Crecimiento</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Gráfico de ventas */}
                            <Row className="mb-4">
                                <Col>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Evolución de Ventas y Pedidos</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div style={{ height: '400px' }}>
                                                <Line data={ventasChartData} options={ventasChartOptions} />
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Tabla detallada */}
                            <Row>
                                <Col>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Detalle Diario</h5>
                                        </Card.Header>
                                        <Card.Body className="p-0">
                                            <Table responsive className="mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th>Fecha</th>
                                                        <th>Ventas</th>
                                                        <th>Pedidos</th>
                                                        <th>Promedio</th>
                                                        <th>Tendencia</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reporteVentas.datos_diarios.map((dia, index) => (
                                                        <tr key={index}>
                                                            <td>{new Date(dia.fecha).toLocaleDateString()}</td>
                                                            <td>
                                                                <strong className="text-success">
                                                                    ${dia.ventas.toFixed(2)}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <Badge bg="primary">{dia.pedidos}</Badge>
                                                            </td>
                                                            <td>${dia.promedio.toFixed(2)}</td>
                                                            <td>
                                                                {index > 0 && (
                                                                    <i className={`fas ${
                                                                        dia.ventas > reporteVentas.datos_diarios[index-1].ventas 
                                                                            ? 'fa-arrow-up text-success' 
                                                                            : 'fa-arrow-down text-danger'
                                                                    }`}></i>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </Tab>

                {/* Reporte de Productos */}
                <Tab eventKey="productos" title={
                    <span>
                        <i className="fas fa-utensils me-2"></i>
                        Productos
                    </span>
                }>
                    {reporteProductos && (
                        <>
                            {/* Métricas de productos */}
                            <Row className="mb-4">
                                <Col md={4}>
                                    <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-utensils fa-2x text-primary mb-2"></i>
                                            <div className="h4 mb-0 text-primary">
                                                {reporteProductos.resumen.total_productos}
                                            </div>
                                            <div className="text-muted small">Productos Activos</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-crown fa-2x text-success mb-2"></i>
                                            <div className="h6 mb-1 text-success">
                                                {reporteProductos.resumen.mas_vendido.nombre}
                                            </div>
                                            <div className="text-muted small">Más Vendido</div>
                                            <div className="small">
                                                ${reporteProductos.resumen.mas_vendido.ingresos_totales.toFixed(2)}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={4}>
                                    <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-star fa-2x text-warning mb-2"></i>
                                            <div className="h4 mb-0 text-warning">
                                                {reporteProductos.resumen.promedio_popularidad.toFixed(1)}
                                            </div>
                                            <div className="text-muted small">Score Promedio</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Gráficos de productos */}
                            <Row className="mb-4">
                                <Col lg={8}>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Top 8 Productos por Ingresos</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div style={{ height: '350px' }}>
                                                <Bar data={productosChartData} options={chartOptions} />
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col lg={4}>
                                    <Card className="border-0 shadow-sm h-100">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Ventas por Categoría</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div style={{ height: '350px' }}>
                                                <Doughnut data={categoriasChartData} options={chartOptions} />
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Tabla de productos */}
                            <Row>
                                <Col>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Ranking de Productos</h5>
                                        </Card.Header>
                                        <Card.Body className="p-0">
                                            <Table responsive className="mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Producto</th>
                                                        <th>Categoría</th>
                                                        <th>Cantidad</th>
                                                        <th>Ingresos</th>
                                                        <th>Popularidad</th>
                                                        <th>Rendimiento</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reporteProductos.productos_individuales.map((producto, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <Badge bg={index < 3 ? 'warning' : 'light'} text={index < 3 ? 'dark' : 'dark'}>
                                                                    #{index + 1}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    {index === 0 && <i className="fas fa-crown text-warning me-2"></i>}
                                                                    <strong>{producto.nombre}</strong>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <Badge bg="outline-secondary">
                                                                    {producto.categoria}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <Badge bg="primary">{producto.cantidad_vendida}</Badge>
                                                            </td>
                                                            <td>
                                                                <strong className="text-success">
                                                                    ${producto.ingresos_totales.toFixed(2)}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    <ProgressBar 
                                                                        now={producto.popularidad_score} 
                                                                        style={{ width: '60px', height: '8px' }}
                                                                        className="me-2"
                                                                    />
                                                                    <small>{producto.popularidad_score}%</small>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    producto.popularidad_score >= 80 ? 'bg-success' :
                                                                    producto.popularidad_score >= 60 ? 'bg-warning' : 'bg-danger'
                                                                }`}>
                                                                    {producto.popularidad_score >= 80 ? 'Excelente' :
                                                                     producto.popularidad_score >= 60 ? 'Bueno' : 'Regular'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </Tab>

                {/* Reporte de Mozos */}
                <Tab eventKey="mozos" title={
                    <span>
                        <i className="fas fa-users me-2"></i>
                        Mozos
                    </span>
                }>
                    {reporteMozos && (
                        <>
                            {/* Métricas de mozos */}
                            <Row className="mb-4">
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-users fa-2x text-primary mb-2"></i>
                                            <div className="h4 mb-0 text-primary">
                                                {reporteMozos.resumen.total_mozos}
                                            </div>
                                            <div className="text-muted small">Mozos Activos</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-crown fa-2x text-success mb-2"></i>
                                            <div className="h6 mb-1 text-success">
                                                {reporteMozos.resumen.mejor_vendedor.nombre}
                                            </div>
                                            <div className="text-muted small">Mejor Vendedor</div>
                                            <div className="small">
                                                ${reporteMozos.resumen.mejor_vendedor.total_ventas.toFixed(2)}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-chart-line fa-2x text-info mb-2"></i>
                                            <div className="h4 mb-0 text-info">
                                                ${reporteMozos.resumen.promedio_ventas.toFixed(2)}
                                            </div>
                                            <div className="text-muted small">Promedio Ventas</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-smile fa-2x text-warning mb-2"></i>
                                            <div className="h4 mb-0 text-warning">
                                                {reporteMozos.resumen.satisfaccion_promedio.toFixed(1)}%
                                            </div>
                                            <div className="text-muted small">Satisfacción</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Gráfico de mozos */}
                            <Row className="mb-4">
                                <Col>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Performance de Mozos</h5>
                                        </Card.Header>
                                        <Card.Body>
                                            <div style={{ height: '350px' }}>
                                                <Bar data={mozosChartData} options={chartOptions} />
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Tabla de mozos */}
                            <Row>
                                <Col>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Ranking de Mozos</h5>
                                        </Card.Header>
                                        <Card.Body className="p-0">
                                            <Table responsive className="mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th>#</th>
                                                        <th>Mozo</th>
                                                        <th>Turno</th>
                                                        <th>Pedidos</th>
                                                        <th>Ventas</th>
                                                        <th>Promedio</th>
                                                        <th>Satisfacción</th>
                                                        <th>Eficiencia</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reporteMozos.mozos_performance.map((mozo, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <Badge bg={index < 3 ? 'warning' : 'light'} text={index < 3 ? 'dark' : 'dark'}>
                                                                    #{index + 1}
                                                                </Badge>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    {index === 0 && <i className="fas fa-crown text-warning me-2"></i>}
                                                                    <div>
                                                                        <strong>{mozo.nombre}</strong>
                                                                        <div className="small text-muted">{mozo.experiencia}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <Badge bg="outline-info">{mozo.turno}</Badge>
                                                            </td>
                                                            <td>
                                                                <Badge bg="primary">{mozo.total_pedidos}</Badge>
                                                            </td>
                                                            <td>
                                                                <strong className="text-success">
                                                                    ${mozo.total_ventas.toFixed(2)}
                                                                </strong>
                                                            </td>
                                                            <td>${mozo.promedio_pedido.toFixed(2)}</td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    <ProgressBar 
                                                                        now={mozo.satisfaccion_cliente} 
                                                                        style={{ width: '60px', height: '8px' }}
                                                                        className="me-2"
                                                                        variant={mozo.satisfaccion_cliente >= 90 ? 'success' : 
                                                                                mozo.satisfaccion_cliente >= 80 ? 'warning' : 'danger'}
                                                                    />
                                                                    <small>{mozo.satisfaccion_cliente.toFixed(1)}%</small>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    mozo.eficiencia_servicio >= 90 ? 'bg-success' :
                                                                    mozo.eficiencia_servicio >= 80 ? 'bg-warning' : 'bg-danger'
                                                                }`}>
                                                                    {mozo.eficiencia_servicio.toFixed(1)}%
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </Tab>

                {/* Reporte de Mesas */}
                <Tab eventKey="mesas" title={
                    <span>
                        <i className="fas fa-table me-2"></i>
                        Mesas
                    </span>
                }>
                    {reporteMesas && (
                        <>
                            {/* Métricas de mesas */}
                            <Row className="mb-4">
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-table fa-2x text-primary mb-2"></i>
                                            <div className="h4 mb-0 text-primary">
                                                {reporteMesas.resumen.total_mesas}
                                            </div>
                                            <div className="text-muted small">Total Mesas</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-star fa-2x text-success mb-2"></i>
                                            <div className="h6 mb-1 text-success">
                                                Mesa {reporteMesas.resumen.mesa_mas_rentable.numero}
                                            </div>
                                            <div className="text-muted small">Más Rentable</div>
                                            <div className="small">
                                                ${reporteMesas.resumen.mesa_mas_rentable.ingresos_generados.toFixed(2)}
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-percentage fa-2x text-info mb-2"></i>
                                            <div className="h4 mb-0 text-info">
                                                {reporteMesas.resumen.ocupacion_promedio.toFixed(1)}%
                                            </div>
                                            <div className="text-muted small">Ocupación Promedio</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                                <Col md={3}>
                                    <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                        <Card.Body className="text-center">
                                            <i className="fas fa-sync-alt fa-2x text-warning mb-2"></i>
                                            <div className="h4 mb-0 text-warning">
                                                {reporteMesas.resumen.rotacion_promedio.toFixed(1)}
                                            </div>
                                            <div className="text-muted small">Rotación Promedio</div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Tabla de mesas */}
                            <Row>
                                <Col>
                                    <Card className="border-0 shadow-sm">
                                        <Card.Header className="bg-white border-0">
                                            <h5 className="mb-0">Performance por Mesa</h5>
                                        </Card.Header>
                                        <Card.Body className="p-0">
                                            <Table responsive className="mb-0">
                                                <thead className="bg-light">
                                                    <tr>
                                                        <th>Mesa</th>
                                                        <th>Capacidad</th>
                                                        <th>Ocupaciones</th>
                                                        <th>Horas Ocupada</th>
                                                        <th>Ingresos</th>
                                                        <th>Eficiencia</th>
                                                        <th>Rotación</th>
                                                        <th>Rendimiento</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {reporteMesas.mesas_performance.map((mesa, index) => (
                                                        <tr key={index}>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    {index === 0 && <i className="fas fa-crown text-warning me-2"></i>}
                                                                    <strong>Mesa {mesa.numero}</strong>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <Badge bg="outline-secondary">{mesa.capacidad} pers</Badge>
                                                            </td>
                                                            <td>
                                                                <Badge bg="primary">{mesa.total_ocupaciones}</Badge>
                                                            </td>
                                                            <td>{mesa.horas_ocupada}h</td>
                                                            <td>
                                                                <strong className="text-success">
                                                                    ${mesa.ingresos_generados.toFixed(2)}
                                                                </strong>
                                                            </td>
                                                            <td>
                                                                <div className="d-flex align-items-center">
                                                                    <ProgressBar 
                                                                        now={mesa.eficiencia_ocupacion} 
                                                                        style={{ width: '60px', height: '8px' }}
                                                                        className="me-2"
                                                                        variant={mesa.eficiencia_ocupacion >= 70 ? 'success' : 
                                                                                mesa.eficiencia_ocupacion >= 50 ? 'warning' : 'danger'}
                                                                    />
                                                                    <small>{mesa.eficiencia_ocupacion.toFixed(1)}%</small>
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <Badge bg="info">{mesa.rotacion_diaria}x</Badge>
                                                            </td>
                                                            <td>
                                                                <span className={`badge ${
                                                                    mesa.eficiencia_ocupacion >= 70 ? 'bg-success' :
                                                                    mesa.eficiencia_ocupacion >= 50 ? 'bg-warning' : 'bg-danger'
                                                                }`}>
                                                                    {mesa.eficiencia_ocupacion >= 70 ? 'Excelente' :
                                                                     mesa.eficiencia_ocupacion >= 50 ? 'Bueno' : 'Regular'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </Table>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            </Row>
                        </>
                    )}
                </Tab>
            </Tabs>

            {/* Modal de exportación */}
            <Modal show={showExportModal} onHide={() => setShowExportModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-download me-2"></i>
                        Exportar Reporte
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Tipo de archivo:</strong>
                        <Badge bg="primary" className="ms-2">
                            {exportType.toUpperCase()}
                        </Badge>
                    </div>
                    
                    <div className="mb-3">
                        <strong>Período:</strong>
                        <div className="text-muted">
                            Del {new Date(filtros.fechaInicio).toLocaleDateString()} 
                            al {new Date(filtros.fechaFin).toLocaleDateString()}
                        </div>
                    </div>

                    <div className="mb-3">
                        <strong>Secciones incluidas:</strong>
                        <div className="mt-2">
                            {['ventas', 'productos', 'mozos', 'mesas'].map(seccion => (
                                <Badge key={seccion} bg="outline-success" className="me-2 mb-1">
                                    <i className="fas fa-check me-1"></i>
                                    {seccion.charAt(0).toUpperCase() + seccion.slice(1)}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    <Alert variant="info" className="small">
                        <i className="fas fa-info-circle me-2"></i>
                        El reporte se generará con todos los gráficos y tablas del período seleccionado.
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowExportModal(false)}>
                        Cancelar
                    </Button>
                    <Button variant="primary" onClick={handleConfirmExport}>
                        <i className="fas fa-download me-2"></i>
                        Exportar {exportType.toUpperCase()}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ReportesManagement;