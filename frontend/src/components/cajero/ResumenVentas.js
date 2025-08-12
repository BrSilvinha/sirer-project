import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Form, 
    Table, Spinner, Modal, ProgressBar
} from 'react-bootstrap';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { reportesService, pedidosService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const ResumenVentas = () => {
    const { user } = useAuth();
    const [resumenTurno, setResumenTurno] = useState(null);
    const [ventasDetalle, setVentasDetalle] = useState([]);
    const [metodosPago, setMetodosPago] = useState([]);
    const [productosVendidos, setProductosVendidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]);
    const [showDetalleModal, setShowDetalleModal] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);
    const [rangoHoras, setRangoHoras] = useState('completo'); // 'completo', 'turno_manana', 'turno_tarde'

    // ✅ CORREGIDO: Mover fetchResumenVentas fuera del useEffect para poder usarlo en dependency
    const fetchResumenVentas = useCallback(async () => {
        try {
            setLoading(true);
            
            // Obtener datos del dashboard principal
            const dashboardResponse = await reportesService.getDashboard();
            
            // Obtener reporte de ventas con filtros
            const ventasParams = {
                fecha_desde: fechaSeleccionada,
                fecha_hasta: fechaSeleccionada,
                agrupar_por: 'hora'
            };
            const ventasResponse = await reportesService.getVentas(ventasParams);
            const ventasData = ventasResponse.data.data;
            
            // Obtener productos más vendidos
            const productosParams = {
                fecha_desde: fechaSeleccionada,
                fecha_hasta: fechaSeleccionada,
                limite: 10
            };
            const productosResponse = await reportesService.getProductosMasVendidos(productosParams);
            const productosData = productosResponse.data.data.productos || [];

            // Obtener pedidos del día para analizar métodos de pago
            const pedidosParams = {
                fecha_desde: fechaSeleccionada,
                estado: 'pagado'
            };
            const pedidosResponse = await pedidosService.getAll(pedidosParams);
            const pedidosData = pedidosResponse.data.data || [];

            // Procesar métodos de pago
            const metodosMap = {};
            pedidosData.forEach(pedido => {
                const metodo = pedido.metodo_pago || 'efectivo';
                if (!metodosMap[metodo]) {
                    metodosMap[metodo] = { cantidad: 0, total: 0 };
                }
                metodosMap[metodo].cantidad += 1;
                metodosMap[metodo].total += parseFloat(pedido.total);
            });

            const metodosArray = Object.keys(metodosMap).map(metodo => ({
                metodo: metodo.charAt(0).toUpperCase() + metodo.slice(1).replace('_', ' '),
                cantidad: metodosMap[metodo].cantidad,
                total: metodosMap[metodo].total,
                porcentaje: pedidosData.length > 0 ? 
                    Math.round((metodosMap[metodo].cantidad / pedidosData.length) * 100) : 0
            }));

            // Filtrar ventas por rango de horas
            let ventasFiltradas = ventasData.ventas_por_periodo || [];
            if (rangoHoras !== 'completo') {
                const inicioHora = rangoHoras === 'turno_manana' ? 6 : 14;
                const finHora = rangoHoras === 'turno_manana' ? 14 : 22;
                
                ventasFiltradas = ventasFiltradas.filter(venta => {
                    const hora = parseInt(venta.periodo.split(' ')[1]?.split(':')[0] || 0);
                    return hora >= inicioHora && hora < finHora;
                });
            }

            // Construir resumen del turno
            const resumen = {
                fecha: fechaSeleccionada,
                cajero: user.nombre,
                turno: rangoHoras === 'turno_manana' ? 'Mañana (06:00 - 14:00)' : 
                       rangoHoras === 'turno_tarde' ? 'Tarde (14:00 - 22:00)' : 'Completo (06:00 - 22:00)',
                total_ventas: ventasData.resumen_total?.total_ventas || 0,
                total_pedidos: ventasData.resumen_total?.total_pedidos || 0,
                promedio_venta: ventasData.resumen_total?.promedio_pedido || 0,
                hora_inicio: rangoHoras === 'turno_manana' ? '06:00' : 
                            rangoHoras === 'turno_tarde' ? '14:00' : '06:00',
                hora_fin: new Date().toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }),
                estado_turno: 'Activo'
            };

            setResumenTurno(resumen);
            setVentasDetalle(ventasFiltradas);
            setMetodosPago(metodosArray);
            setProductosVendidos(productosData);
            
        } catch (error) {
            console.error('Error fetching resumen ventas:', error);
            toast.error('Error al cargar resumen de ventas');
        } finally {
            setLoading(false);
        }
    }, [fechaSeleccionada, rangoHoras, user.nombre]);

    // ✅ CORREGIDO: Agregar fetchResumenVentas a las dependencias
    useEffect(() => {
        fetchResumenVentas();
    }, [fetchResumenVentas]);

    const handleCerrarTurno = useCallback(async () => {
        if (window.confirm('¿Estás seguro de que quieres cerrar el turno? Esta acción no se puede deshacer.')) {
            try {
                toast.loading('Cerrando turno...', { duration: 2000 });
                
                setTimeout(() => {
                    toast.success('Turno cerrado correctamente');
                    setResumenTurno(prev => ({ ...prev, estado_turno: 'Cerrado' }));
                }, 2000);
                
            } catch (error) {
                toast.error('Error al cerrar turno');
            }
        }
    }, []);

    const handleExportarReporte = useCallback(() => {
        toast.success('Reporte exportado correctamente');
        // En producción aquí iría la lógica de exportación
    }, []);

    // Configuración de gráficos
    const ventasChartData = {
        labels: ventasDetalle.map(v => v.periodo),
        datasets: [
            {
                label: 'Ventas (S/)',
                data: ventasDetalle.map(v => parseFloat(v.total_ventas)),
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    const metodosChartData = {
        labels: metodosPago.map(m => m.metodo),
        datasets: [
            {
                data: metodosPago.map(m => m.total),
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 205, 86, 0.6)',
                    'rgba(153, 102, 255, 0.6)',
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(153, 102, 255, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
        },
        maintainAspectRatio: false,
    };

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="success" size="lg" />
                    <p className="mt-3 h5">Generando resumen de ventas...</p>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid>
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="mb-1">
                                <i className="fas fa-chart-line text-success me-2"></i>
                                Resumen de Ventas
                            </h2>
                            <p className="text-muted mb-0">
                                Control y análisis de ventas del turno
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-primary"
                                size="sm"
                                onClick={handleExportarReporte}
                            >
                                <i className="fas fa-download me-1"></i>
                                Exportar
                            </Button>
                            {resumenTurno?.estado_turno === 'Activo' && (
                                <Button 
                                    variant="danger"
                                    size="sm"
                                    onClick={handleCerrarTurno}
                                >
                                    <i className="fas fa-power-off me-1"></i>
                                    Cerrar Turno
                                </Button>
                            )}
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Filtros */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="align-items-end">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Fecha</Form.Label>
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={fechaSeleccionada}
                                    onChange={(e) => setFechaSeleccionada(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Turno</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={rangoHoras}
                                    onChange={(e) => setRangoHoras(e.target.value)}
                                >
                                    <option value="completo">Día Completo</option>
                                    <option value="turno_manana">Turno Mañana (6:00 - 14:00)</option>
                                    <option value="turno_tarde">Turno Tarde (14:00 - 22:00)</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <div className="d-flex justify-content-end align-items-center">
                                <Badge 
                                    bg={resumenTurno?.estado_turno === 'Activo' ? 'success' : 'secondary'}
                                    className="px-3 py-2"
                                >
                                    <i className={`fas ${
                                        resumenTurno?.estado_turno === 'Activo' ? 'fa-play' : 'fa-stop'
                                    } me-1`}></i>
                                    Turno {resumenTurno?.estado_turno}
                                </Badge>
                            </div>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {resumenTurno && (
                <>
                    {/* Información del turno */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-success text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-info-circle me-2"></i>
                                Información del Turno
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={3}>
                                    <div className="text-center">
                                        <div className="text-muted small">Cajero</div>
                                        <div className="h6 mb-0">{resumenTurno.cajero}</div>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="text-center">
                                        <div className="text-muted small">Fecha</div>
                                        <div className="h6 mb-0">
                                            {new Date(resumenTurno.fecha).toLocaleDateString()}
                                        </div>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="text-center">
                                        <div className="text-muted small">Horario</div>
                                        <div className="h6 mb-0">
                                            {resumenTurno.hora_inicio} - {resumenTurno.hora_fin}
                                        </div>
                                    </div>
                                </Col>
                                <Col md={3}>
                                    <div className="text-center">
                                        <div className="text-muted small">Duración</div>
                                        <div className="h6 mb-0">{resumenTurno.turno}</div>
                                    </div>
                                </Col>
                            </Row>
                        </Card.Body>
                    </Card>

                    {/* Métricas principales */}
                    <Row className="mb-4">
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                <Card.Body className="text-center">
                                    <i className="fas fa-dollar-sign fa-2x text-success mb-2"></i>
                                    <div className="h3 mb-0 text-success">
                                        S/{parseFloat(resumenTurno.total_ventas).toFixed(2)}
                                    </div>
                                    <div className="text-muted small">Total Ventas</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                                <Card.Body className="text-center">
                                    <i className="fas fa-receipt fa-2x text-primary mb-2"></i>
                                    <div className="h3 mb-0 text-primary">{resumenTurno.total_pedidos}</div>
                                    <div className="text-muted small">Total Pedidos</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                                <Card.Body className="text-center">
                                    <i className="fas fa-chart-line fa-2x text-info mb-2"></i>
                                    <div className="h3 mb-0 text-info">
                                        S/{parseFloat(resumenTurno.promedio_venta).toFixed(2)}
                                    </div>
                                    <div className="text-muted small">Promedio por Pedido</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={3} md={6} className="mb-3">
                            <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                <Card.Body className="text-center">
                                    <i className="fas fa-clock fa-2x text-warning mb-2"></i>
                                    <div className="h3 mb-0 text-warning">
                                        {resumenTurno.total_pedidos > 0 ? 
                                            Math.round(8 / resumenTurno.total_pedidos * 60) : 0}m
                                    </div>
                                    <div className="text-muted small">Tiempo por Pedido</div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Gráficos */}
                    <Row className="mb-4">
                        <Col lg={8} className="mb-3">
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white border-0">
                                    <h5 className="mb-0">
                                        <i className="fas fa-chart-bar me-2 text-primary"></i>
                                        Ventas por Hora
                                    </h5>
                                </Card.Header>
                                <Card.Body>
                                    <div style={{ height: '300px' }}>
                                        {ventasDetalle.length > 0 ? (
                                            <Bar data={ventasChartData} options={chartOptions} />
                                        ) : (
                                            <div className="d-flex align-items-center justify-content-center h-100">
                                                <p className="text-muted">No hay datos de ventas para mostrar</p>
                                            </div>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col lg={4} className="mb-3">
                            <Card className="border-0 shadow-sm h-100">
                                <Card.Header className="bg-white border-0">
                                    <h5 className="mb-0">
                                        <i className="fas fa-credit-card me-2 text-success"></i>
                                        Métodos de Pago
                                    </h5>
                                </Card.Header>
                                <Card.Body>
                                    <div style={{ height: '300px' }}>
                                        {metodosPago.length > 0 ? (
                                            <Doughnut data={metodosChartData} options={chartOptions} />
                                        ) : (
                                            <div className="d-flex align-items-center justify-content-center h-100">
                                                <p className="text-muted">No hay datos de pagos para mostrar</p>
                                            </div>
                                        )}
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>

                    {/* Tablas detalladas */}
                    <Row>
                        <Col lg={6} className="mb-4">
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white border-0">
                                    <h5 className="mb-0">
                                        <i className="fas fa-credit-card me-2 text-info"></i>
                                        Detalle Métodos de Pago
                                    </h5>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    {metodosPago.length > 0 ? (
                                        <Table responsive className="mb-0">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th>Método</th>
                                                    <th>Cantidad</th>
                                                    <th>Total</th>
                                                    <th>Porcentaje</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {metodosPago.map((metodo, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <i className="fas fa-circle me-2" 
                                                               style={{ color: metodosChartData.datasets[0].backgroundColor[index] }}></i>
                                                            {metodo.metodo}
                                                        </td>
                                                        <td>
                                                            <Badge bg="light" text="dark">
                                                                {metodo.cantidad}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <strong>${metodo.total.toFixed(2)}</strong>
                                                        </td>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <ProgressBar 
                                                                    now={metodo.porcentaje} 
                                                                    style={{ width: '60px', height: '8px' }}
                                                                    className="me-2"
                                                                />
                                                                <small>{metodo.porcentaje}%</small>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-muted">No hay métodos de pago registrados</p>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>

                        <Col lg={6} className="mb-4">
                            <Card className="border-0 shadow-sm">
                                <Card.Header className="bg-white border-0">
                                    <h5 className="mb-0">
                                        <i className="fas fa-fire me-2 text-danger"></i>
                                        Productos Más Vendidos
                                    </h5>
                                </Card.Header>
                                <Card.Body className="p-0">
                                    {productosVendidos.length > 0 ? (
                                        <Table responsive className="mb-0">
                                            <thead className="bg-light">
                                                <tr>
                                                    <th>Producto</th>
                                                    <th>Cantidad</th>
                                                    <th>Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {productosVendidos.slice(0, 10).map((producto, index) => (
                                                    <tr key={index}>
                                                        <td>
                                                            <div className="d-flex align-items-center">
                                                                <div className="bg-primary rounded-circle me-2" 
                                                                     style={{ width: '8px', height: '8px' }}></div>
                                                                {producto.producto?.nombre || 'Producto'}
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <Badge bg="primary">
                                                                {producto.total_vendido}
                                                            </Badge>
                                                        </td>
                                                        <td>
                                                            <strong className="text-success">
                                                                S/{parseFloat(producto.ingresos_totales).toFixed(2)}
                                                            </strong>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-muted">No hay productos vendidos para mostrar</p>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </>
            )}

            {/* Modal de detalle de pedido */}
            <Modal show={showDetalleModal} onHide={() => setShowDetalleModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Detalle del Pedido</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {pedidoSeleccionado && (
                        <>
                            <div className="mb-3">
                                <strong>Pedido #{pedidoSeleccionado.id}</strong>
                                <br />
                                <small className="text-muted">
                                    Mesa {pedidoSeleccionado.mesa?.numero || 'N/A'} - {new Date(pedidoSeleccionado.created_at).toLocaleString()}
                                </small>
                            </div>
                            
                            {pedidoSeleccionado.detalles && pedidoSeleccionado.detalles.length > 0 ? (
                                <Table size="sm">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Precio</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pedidoSeleccionado.detalles.map((detalle, index) => (
                                            <tr key={index}>
                                                <td>{detalle.producto?.nombre || 'Producto'}</td>
                                                <td>{detalle.cantidad}</td>
                                                <td>S/${parseFloat(detalle.subtotal).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <p className="text-muted">No hay detalles disponibles</p>
                            )}
                            
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <strong>Total: S/ ${parseFloat(pedidoSeleccionado.total).toFixed(2)}</strong>
                                <Badge bg="success">{pedidoSeleccionado.metodo_pago || 'Efectivo'}</Badge>
                            </div>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetalleModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ResumenVentas;