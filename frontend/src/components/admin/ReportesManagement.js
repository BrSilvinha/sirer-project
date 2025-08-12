import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Form, 
    Table, Spinner, Modal, Tab, Tabs, ButtonGroup, Alert
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
import { Bar, Line } from 'react-chartjs-2';
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
        fechaInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        fechaFin: new Date().toISOString().split('T')[0],
        periodo: 'dia',
        comparar: false
    });
    const [showExportModal, setShowExportModal] = useState(false);
    const [exportType, setExportType] = useState('pdf');
    const [exportando, setExportando] = useState(false);

    // Estados para diferentes tipos de reportes
    const [reporteVentas, setReporteVentas] = useState(null);
    const [reporteProductos, setReporteProductos] = useState(null);
    const [reporteMozos, setReporteMozos] = useState(null);
    const [reporteMesas, setReporteMesas] = useState(null);
    const [error, setError] = useState(null);

    const fetchReportes = useCallback(async () => {
        setLoading(true);
        setError(null);
        
        try {
            const params = {
                fecha_desde: filtros.fechaInicio,
                fecha_hasta: filtros.fechaFin,
                agrupar_por: filtros.periodo
            };

            // Llamadas independientes con manejo de errores individual
            const promises = [
                reportesService.getVentas(params).catch(err => {
                    console.error('Error en ventas:', err);
                    return null;
                }),
                reportesService.getProductosMasVendidos(params).catch(err => {
                    console.error('Error en productos:', err);
                    return null;
                }),
                reportesService.getMozosRendimiento(params).catch(err => {
                    console.error('Error en mozos:', err);
                    return null;
                }),
                reportesService.getMesasRendimiento(params).catch(err => {
                    console.error('Error en mesas:', err);
                    return null;
                })
            ];

            const [ventasResponse, productosResponse, mozosResponse, mesasResponse] = await Promise.all(promises);

            // Establecer datos o null si hubo error
            setReporteVentas(ventasResponse?.data?.data || null);
            setReporteProductos(productosResponse?.data?.data || null);
            setReporteMozos(mozosResponse?.data?.data || null);
            setReporteMesas(mesasResponse?.data?.data || null);

            // Si todos los reportes fallaron, mostrar error general
            if (!ventasResponse && !productosResponse && !mozosResponse && !mesasResponse) {
                setError('No se pudieron cargar los reportes. Verifique la conexión con el servidor.');
            }
            
        } catch (error) {
            console.error('Error general en fetchReportes:', error);
            setError('Error al cargar reportes. Verifique la conexión con el servidor.');
            toast.error('Error al cargar reportes');
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => {
        fetchReportes();
    }, [fetchReportes]);

    const handleFiltroChange = useCallback((campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }));
    }, []);

    // ✅ FUNCIÓN DE EXPORTACIÓN A CSV (simulación de Excel)
    const exportarCSV = useCallback((datos, nombreArchivo) => {
        try {
            let csvContent = '';
            
            if (activeTab === 'ventas' && reporteVentas) {
                csvContent = 'Período,Total Ventas,Total Pedidos,Promedio por Pedido\n';
                reporteVentas.ventas_por_periodo?.forEach(venta => {
                    csvContent += `${venta.periodo},${venta.total_ventas},${venta.total_pedidos},${venta.promedio_pedido}\n`;
                });
            } else if (activeTab === 'productos' && reporteProductos) {
                csvContent = 'Producto,Categoría,Cantidad Vendida,Ingresos Totales\n';
                reporteProductos.productos?.forEach(producto => {
                    csvContent += `"${producto.producto?.nombre}","${producto.producto?.categoria?.nombre}",${producto.total_vendido},${producto.ingresos_totales}\n`;
                });
            } else if (activeTab === 'mozos' && reporteMozos) {
                csvContent = 'Mozo,Total Pedidos,Total Ventas,Promedio por Pedido\n';
                reporteMozos.mozos?.forEach(mozo => {
                    csvContent += `"${mozo.mozo?.nombre}",${mozo.total_pedidos},${mozo.total_ventas},${mozo.promedio_por_pedido}\n`;
                });
            } else if (activeTab === 'mesas' && reporteMesas) {
                csvContent = 'Mesa,Capacidad,Total Pedidos,Ingresos Totales,Promedio por Pedido\n';
                reporteMesas.mesas?.forEach(mesa => {
                    csvContent += `Mesa ${mesa.mesa?.numero},${mesa.mesa?.capacidad},${mesa.total_pedidos},${mesa.ingresos_totales},${mesa.promedio_por_pedido}\n`;
                });
            }

            if (csvContent) {
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                toast.success('Archivo CSV descargado correctamente');
            } else {
                toast.error('No hay datos para exportar');
            }
        } catch (error) {
            console.error('Error exportando CSV:', error);
            toast.error('Error al generar archivo CSV');
        }
    }, [activeTab, reporteVentas, reporteProductos, reporteMozos, reporteMesas]);

    // ✅ FUNCIÓN DE EXPORTACIÓN A PDF (simulación básica)
    const exportarPDF = useCallback(() => {
        try {
            // Crear contenido HTML para el PDF
            const fechaActual = new Date().toLocaleDateString();
            const periodo = `${filtros.fechaInicio} al ${filtros.fechaFin}`;
            
            let contenidoHTML = `
                <html>
                <head>
                    <title>Reporte SIRER - ${activeTab.toUpperCase()}</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px; }
                        .periodo { color: #666; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        .total { font-weight: bold; background-color: #e8f5e8; }
                        .footer { margin-top: 30px; text-align: right; color: #666; font-size: 12px; }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <h1>SISTEMA SIRER</h1>
                        <h2>Reporte de ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                    </div>
                    <div class="periodo">
                        <strong>Período:</strong> ${periodo}<br>
                        <strong>Generado:</strong> ${fechaActual}
                    </div>
            `;

            if (activeTab === 'ventas' && reporteVentas) {
                contenidoHTML += `
                    <h3>Resumen Total</h3>
                    <table>
                        <tr><td><strong>Total Ventas:</strong></td><td>$${reporteVentas.resumen_total?.total_ventas || '0.00'}</td></tr>
                        <tr><td><strong>Total Pedidos:</strong></td><td>${reporteVentas.resumen_total?.total_pedidos || 0}</td></tr>
                        <tr><td><strong>Promedio por Pedido:</strong></td><td>$${reporteVentas.resumen_total?.promedio_pedido || '0.00'}</td></tr>
                    </table>
                    
                    <h3>Ventas por Período</h3>
                    <table>
                        <tr><th>Período</th><th>Total Ventas</th><th>Total Pedidos</th><th>Promedio</th></tr>
                `;
                reporteVentas.ventas_por_periodo?.forEach(venta => {
                    contenidoHTML += `<tr><td>${venta.periodo}</td><td>$${venta.total_ventas}</td><td>${venta.total_pedidos}</td><td>$${venta.promedio_pedido}</td></tr>`;
                });
                contenidoHTML += '</table>';
            }

            if (activeTab === 'productos' && reporteProductos) {
                contenidoHTML += `
                    <h3>Productos Más Vendidos</h3>
                    <table>
                        <tr><th>Posición</th><th>Producto</th><th>Categoría</th><th>Cantidad</th><th>Ingresos</th></tr>
                `;
                reporteProductos.productos?.forEach((producto, index) => {
                    contenidoHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${producto.producto?.nombre || 'N/A'}</td>
                            <td>${producto.producto?.categoria?.nombre || 'N/A'}</td>
                            <td>${producto.total_vendido}</td>
                            <td>$${producto.ingresos_totales}</td>
                        </tr>
                    `;
                });
                contenidoHTML += '</table>';
            }

            if (activeTab === 'mozos' && reporteMozos) {
                contenidoHTML += `
                    <h3>Rendimiento de Mozos</h3>
                    <table>
                        <tr><th>Posición</th><th>Mozo</th><th>Total Pedidos</th><th>Total Ventas</th><th>Promedio</th></tr>
                `;
                reporteMozos.mozos?.forEach((mozo, index) => {
                    contenidoHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${mozo.mozo?.nombre || 'N/A'}</td>
                            <td>${mozo.total_pedidos}</td>
                            <td>$${mozo.total_ventas}</td>
                            <td>$${mozo.promedio_por_pedido}</td>
                        </tr>
                    `;
                });
                contenidoHTML += '</table>';
            }

            if (activeTab === 'mesas' && reporteMesas) {
                contenidoHTML += `
                    <h3>Rendimiento de Mesas</h3>
                    <table>
                        <tr><th>Mesa</th><th>Capacidad</th><th>Total Pedidos</th><th>Ingresos</th><th>Promedio</th></tr>
                `;
                reporteMesas.mesas?.forEach(mesa => {
                    contenidoHTML += `
                        <tr>
                            <td>Mesa ${mesa.mesa?.numero}</td>
                            <td>${mesa.mesa?.capacidad} personas</td>
                            <td>${mesa.total_pedidos}</td>
                            <td>$${mesa.ingresos_totales}</td>
                            <td>$${mesa.promedio_por_pedido}</td>
                        </tr>
                    `;
                });
                contenidoHTML += '</table>';
            }

            contenidoHTML += `
                    <div class="footer">
                        <p>Generado por Sistema SIRER - ${new Date().toLocaleString()}</p>
                    </div>
                </body>
                </html>
            `;

            // Abrir en nueva ventana para imprimir/guardar como PDF
            const ventanaPDF = window.open('', '_blank');
            ventanaPDF.document.write(contenidoHTML);
            ventanaPDF.document.close();
            
            // Auto-imprimir después de un breve delay
            setTimeout(() => {
                ventanaPDF.print();
            }, 500);
            
            toast.success('PDF generado correctamente. Use Ctrl+P para guardar como PDF');
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            toast.error('Error al generar PDF');
        }
    }, [activeTab, filtros, reporteVentas, reporteProductos, reporteMozos, reporteMesas]);

    const handleExportar = useCallback((tipo) => {
        setExportType(tipo);
        setShowExportModal(true);
    }, []);

    const handleConfirmExport = useCallback(async () => {
        setExportando(true);
        try {
            if (exportType === 'excel') {
                const nombreArchivo = `reporte_${activeTab}_${filtros.fechaInicio}_${filtros.fechaFin}`;
                exportarCSV(null, nombreArchivo);
            } else if (exportType === 'pdf') {
                exportarPDF();
            }
            
            setShowExportModal(false);
            
        } catch (error) {
            console.error('Error al exportar:', error);
            toast.error('Error al exportar reporte');
        } finally {
            setExportando(false);
        }
    }, [exportType, activeTab, filtros, exportarCSV, exportarPDF]);

    // Configuraciones de gráficos con datos reales
    const ventasChartData = {
        labels: reporteVentas?.ventas_por_periodo?.map(v => 
            new Date(v.periodo).toLocaleDateString('es', { 
                month: 'short', 
                day: 'numeric' 
            })
        ) || [],
        datasets: [
            {
                label: 'Ventas ($)',
                data: reporteVentas?.ventas_por_periodo?.map(v => 
                    parseFloat(v.total_ventas)
                ) || [],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.1)',
                tension: 0.4,
                fill: true
            },
            {
                label: 'Pedidos',
                data: reporteVentas?.ventas_por_periodo?.map(v => 
                    parseInt(v.total_pedidos)
                ) || [],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.1)',
                tension: 0.4,
                yAxisID: 'y1',
                fill: false
            }
        ]
    };

    const productosChartData = {
        labels: reporteProductos?.productos?.slice(0, 8).map(p => 
            p.producto?.nombre || 'Sin nombre'
        ) || [],
        datasets: [{
            label: 'Ingresos ($)',
            data: reporteProductos?.productos?.slice(0, 8).map(p => 
                parseFloat(p.ingresos_totales || 0)
            ) || [],
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

    const mozosChartData = {
        labels: reporteMozos?.mozos?.map(m => 
            (m.mozo?.nombre || 'Sin nombre').split(' ')[0]
        ) || [],
        datasets: [
            {
                label: 'Ventas ($)',
                data: reporteMozos?.mozos?.map(m => 
                    parseFloat(m.total_ventas || 0)
                ) || [],
                backgroundColor: 'rgba(54, 162, 235, 0.8)'
            },
            {
                label: 'Pedidos',
                data: reporteMozos?.mozos?.map(m => 
                    parseInt(m.total_pedidos || 0)
                ) || [],
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
                                disabled={loading || exportando}
                            >
                                <i className="fas fa-file-excel me-1"></i>
                                Excel
                            </Button>
                            <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleExportar('pdf')}
                                disabled={loading || exportando}
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

            {/* Error Alert */}
            {error && (
                <Alert variant="danger" className="mb-4" dismissible onClose={() => setError(null)}>
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            )}

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

            {/* Loading State */}
            {loading && (
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Cargando reportes...</p>
                </div>
            )}

            {/* Tabs de reportes */}
            {!loading && (
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
                        {reporteVentas ? (
                            <>
                                {/* Métricas de ventas */}
                                <Row className="mb-4">
                                    <Col md={3}>
                                        <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                            <Card.Body className="text-center">
                                                <i className="fas fa-dollar-sign fa-2x text-success mb-2"></i>
                                                <div className="h4 mb-0 text-success">
                                                    ${parseFloat(reporteVentas.resumen_total?.total_ventas || 0).toFixed(2)}
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
                                                    {reporteVentas.resumen_total?.total_pedidos || 0}
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
                                                    ${parseFloat(reporteVentas.resumen_total?.promedio_pedido || 0).toFixed(2)}
                                                </div>
                                                <div className="text-muted small">Promedio por Pedido</div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                    <Col md={3}>
                                        <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                            <Card.Body className="text-center">
                                                <i className="fas fa-calendar fa-2x text-warning mb-2"></i>
                                                <div className="h4 mb-0 text-warning">
                                                    {reporteVentas.ventas_por_periodo?.length || 0}
                                                </div>
                                                <div className="text-muted small">Días Analizados</div>
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
                                                    {reporteVentas.ventas_por_periodo?.length > 0 ? (
                                                        <Line data={ventasChartData} options={ventasChartOptions} />
                                                    ) : (
                                                        <div className="d-flex align-items-center justify-content-center h-100">
                                                            <div className="text-center text-muted">
                                                                <i className="fas fa-chart-line fa-3x mb-3"></i>
                                                                <p>No hay datos de ventas en el período seleccionado</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Tabla detallada */}
                                {reporteVentas.ventas_por_periodo?.length > 0 && (
                                    <Row>
                                        <Col>
                                            <Card className="border-0 shadow-sm">
                                                <Card.Header className="bg-white border-0">
                                                    <h5 className="mb-0">Detalle por Período</h5>
                                                </Card.Header>
                                                <Card.Body className="p-0">
                                                    <Table responsive className="mb-0">
                                                        <thead className="bg-light">
                                                            <tr>
                                                                <th>Período</th>
                                                                <th>Ventas</th>
                                                                <th>Pedidos</th>
                                                                <th>Promedio</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reporteVentas.ventas_por_periodo.map((periodo, index) => (
                                                                <tr key={index}>
                                                                    <td>{new Date(periodo.periodo).toLocaleDateString()}</td>
                                                                    <td>
                                                                        <strong className="text-success">
                                                                            ${parseFloat(periodo.total_ventas).toFixed(2)}
                                                                        </strong>
                                                                    </td>
                                                                    <td>
                                                                        <Badge bg="primary">{periodo.total_pedidos}</Badge>
                                                                    </td>
                                                                    <td>${parseFloat(periodo.promedio_pedido).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-5">
                                <i className="fas fa-chart-line fa-3x text-muted mb-3"></i>
                                <p className="text-muted">No hay datos de ventas disponibles</p>
                            </div>
                        )}
                    </Tab>

                    {/* Reporte de Productos */}
                    <Tab eventKey="productos" title={
                        <span>
                            <i className="fas fa-utensils me-2"></i>
                            Productos
                        </span>
                    }>
                        {reporteProductos ? (
                            <>
                                {/* Gráfico de productos */}
                                <Row className="mb-4">
                                    <Col>
                                        <Card className="border-0 shadow-sm">
                                            <Card.Header className="bg-white border-0">
                                                <h5 className="mb-0">Top Productos por Ingresos</h5>
                                            </Card.Header>
                                            <Card.Body>
                                                <div style={{ height: '350px' }}>
                                                    {reporteProductos.productos?.length > 0 ? (
                                                        <Bar data={productosChartData} options={chartOptions} />
                                                    ) : (
                                                        <div className="d-flex align-items-center justify-content-center h-100">
                                                            <div className="text-center text-muted">
                                                                <i className="fas fa-utensils fa-3x mb-3"></i>
                                                                <p>No hay datos de productos en el período seleccionado</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Tabla de productos */}
                                {reporteProductos.productos?.length > 0 && (
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
                                                                <th>Cantidad</th>
                                                                <th>Ingresos</th>
                                                                <th>Veces Pedido</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reporteProductos.productos.map((producto, index) => (
                                                                <tr key={index}>
                                                                    <td>
                                                                        <Badge bg={index < 3 ? 'warning' : 'light'} text={index < 3 ? 'dark' : 'dark'}>
                                                                            #{index + 1}
                                                                        </Badge>
                                                                    </td>
                                                                    <td>
                                                                        <div className="d-flex align-items-center">
                                                                            {index === 0 && <i className="fas fa-crown text-warning me-2"></i>}
                                                                            <strong>{producto.producto?.nombre || 'Sin nombre'}</strong>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <Badge bg="primary">{producto.total_vendido || 0}</Badge>
                                                                    </td>
                                                                    <td>
                                                                        <strong className="text-success">
                                                                            ${parseFloat(producto.ingresos_totales || 0).toFixed(2)}
                                                                        </strong>
                                                                    </td>
                                                                    <td>
                                                                        <Badge bg="info">{producto.veces_pedido || 0}</Badge>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-5">
                                <i className="fas fa-utensils fa-3x text-muted mb-3"></i>
                                <p className="text-muted">No hay datos de productos disponibles</p>
                            </div>
                        )}
                    </Tab>

                    {/* Reporte de Mozos */}
                    <Tab eventKey="mozos" title={
                        <span>
                            <i className="fas fa-users me-2"></i>
                            Mozos
                        </span>
                    }>
                        {reporteMozos ? (
                            <>
                                {/* Gráfico de mozos */}
                                <Row className="mb-4">
                                    <Col>
                                        <Card className="border-0 shadow-sm">
                                            <Card.Header className="bg-white border-0">
                                                <h5 className="mb-0">Performance de Mozos</h5>
                                            </Card.Header>
                                            <Card.Body>
                                                <div style={{ height: '350px' }}>
                                                    {reporteMozos.mozos?.length > 0 ? (
                                                        <Bar data={mozosChartData} options={chartOptions} />
                                                    ) : (
                                                        <div className="d-flex align-items-center justify-content-center h-100">
                                                            <div className="text-center text-muted">
                                                                <i className="fas fa-users fa-3x mb-3"></i>
                                                                <p>No hay datos de mozos en el período seleccionado</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </Card.Body>
                                        </Card>
                                    </Col>
                                </Row>

                                {/* Tabla de mozos */}
                                {reporteMozos.mozos?.length > 0 && (
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
                                                                <th>Pedidos</th>
                                                                <th>Ventas</th>
                                                                <th>Promedio</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reporteMozos.mozos.map((mozo, index) => (
                                                                <tr key={index}>
                                                                    <td>
                                                                        <Badge bg={index < 3 ? 'warning' : 'light'} text={index < 3 ? 'dark' : 'dark'}>
                                                                            #{index + 1}
                                                                        </Badge>
                                                                    </td>
                                                                    <td>
                                                                        <div className="d-flex align-items-center">
                                                                            {index === 0 && <i className="fas fa-crown text-warning me-2"></i>}
                                                                            <strong>{mozo.mozo?.nombre || 'Sin nombre'}</strong>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <Badge bg="primary">{mozo.total_pedidos || 0}</Badge>
                                                                    </td>
                                                                    <td>
                                                                        <strong className="text-success">
                                                                            S/ ${parseFloat(mozo.total_ventas || 0).toFixed(2)}
                                                                        </strong>
                                                                    </td>
                                                                    <td>${parseFloat(mozo.promedio_por_pedido || 0).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-5">
                                <i className="fas fa-users fa-3x text-muted mb-3"></i>
                                <p className="text-muted">No hay datos de mozos disponibles</p>
                            </div>
                        )}
                    </Tab>

                    {/* Reporte de Mesas */}
                    <Tab eventKey="mesas" title={
                        <span>
                            <i className="fas fa-table me-2"></i>
                            Mesas
                        </span>
                    }>
                        {reporteMesas ? (
                            <>
                                {/* Tabla de mesas */}
                                {reporteMesas.mesas?.length > 0 && (
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
                                                                <th>Pedidos</th>
                                                                <th>Ingresos</th>
                                                                <th>Promedio</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {reporteMesas.mesas.map((mesa, index) => (
                                                                <tr key={index}>
                                                                    <td>
                                                                        <div className="d-flex align-items-center">
                                                                            {index === 0 && <i className="fas fa-crown text-warning me-2"></i>}
                                                                            <strong>Mesa {mesa.mesa?.numero || 'N/A'}</strong>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        <Badge bg="secondary">
                                                                            {mesa.mesa?.capacidad || 0} pers
                                                                        </Badge>
                                                                    </td>
                                                                    <td>
                                                                        <Badge bg="primary">{mesa.total_pedidos || 0}</Badge>
                                                                    </td>
                                                                    <td>
                                                                        <strong className="text-success">
                                                                            ${parseFloat(mesa.ingresos_totales || 0).toFixed(2)}
                                                                        </strong>
                                                                    </td>
                                                                    <td>${parseFloat(mesa.promedio_por_pedido || 0).toFixed(2)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </Table>
                                                </Card.Body>
                                            </Card>
                                        </Col>
                                    </Row>
                                )}
                            </>
                        ) : (
                            <div className="text-center py-5">
                                <i className="fas fa-table fa-3x text-muted mb-3"></i>
                                <p className="text-muted">No hay datos de mesas disponibles</p>
                            </div>
                        )}
                    </Tab>
                </Tabs>
            )}

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
                        <strong>Sección:</strong>
                        <div className="mt-2">
                            <Badge bg="success" className="me-2 mb-1">
                                <i className="fas fa-check me-1"></i>
                                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                            </Badge>
                        </div>
                    </div>

                    <Alert variant="info" className="small">
                        <i className="fas fa-info-circle me-2"></i>
                        {exportType === 'pdf' 
                            ? 'Se abrirá una nueva ventana para generar el PDF. Use Ctrl+P para guardarlo.'
                            : 'Se descargará un archivo CSV que puede abrir en Excel o Google Sheets.'
                        }
                    </Alert>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowExportModal(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleConfirmExport}
                        disabled={exportando}
                    >
                        {exportando ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Generando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-download me-2"></i>
                                Exportar {exportType.toUpperCase()}
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ReportesManagement;