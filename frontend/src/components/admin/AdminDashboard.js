import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Row, Col, Card, Spinner, Alert, Badge } from 'react-bootstrap';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { reportesService, mesasService } from '../../services/api';
import MesasManagement from './MesasManagement';

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement
);

const AdminHome = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [mesasStats, setMesasStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchDashboardData();
        // Actualizar cada 30 segundos
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [dashboardResponse, mesasResponse] = await Promise.all([
                reportesService.getDashboard(),
                mesasService.getStats()
            ]);

            setDashboardData(dashboardResponse.data.data);
            setMesasStats(mesasResponse.data.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching dashboard data:', err);
            setError('Error al cargar los datos del dashboard');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Cargando dashboard...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Alert variant="danger" className="mt-3">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                </Alert>
            </Container>
        );
    }

    // Configuración de gráficos
    const ventasChartData = {
        labels: ['Hoy'],
        datasets: [
            {
                label: 'Ventas ($)',
                data: [dashboardData?.resumen?.ventas_hoy || 0],
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    const mesasChartData = {
        labels: ['Libres', 'Ocupadas', 'Cuenta Solicitada'],
        datasets: [
            {
                data: [
                    mesasStats?.libres || 0,
                    mesasStats?.ocupadas || 0,
                    mesasStats?.cuenta_solicitada || 0,
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(255, 205, 86, 0.6)',
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)',
                    'rgba(255, 205, 86, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const pedidosChartData = {
        labels: dashboardData?.pedidos_por_estado?.map(p => p.estado.replace('_', ' ').toUpperCase()) || [],
        datasets: [
            {
                label: 'Cantidad de Pedidos',
                data: dashboardData?.pedidos_por_estado?.map(p => parseInt(p.cantidad)) || [],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.5)',
                    'rgba(54, 162, 235, 0.5)',
                    'rgba(255, 205, 86, 0.5)',
                    'rgba(75, 192, 192, 0.5)',
                    'rgba(153, 102, 255, 0.5)',
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 205, 86, 1)',
                    'rgba(75, 192, 192, 1)',
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

    return (
        <Container fluid>
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <h2 className="mb-1">Dashboard Administrativo</h2>
                            <p className="text-muted mb-0">
                                Última actualización: {new Date().toLocaleTimeString()}
                            </p>
                        </div>
                        <Badge bg="success" className="px-3 py-2">
                            <i className="fas fa-circle me-1"></i>
                            Sistema Activo
                        </Badge>
                    </div>
                </Col>
            </Row>

            {/* Métricas principales */}
            <Row className="mb-4">
                <Col lg={3} md={6} className="mb-3">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-primary bg-gradient rounded-circle p-3">
                                        <i className="fas fa-dollar-sign text-white fa-lg"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <div className="text-muted small">Ventas Hoy</div>
                                    <div className="h4 mb-0">
                                        ${dashboardData?.resumen?.ventas_hoy || '0.00'}
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-success bg-gradient rounded-circle p-3">
                                        <i className="fas fa-receipt text-white fa-lg"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <div className="text-muted small">Pedidos Hoy</div>
                                    <div className="h4 mb-0">
                                        {dashboardData?.resumen?.pedidos_hoy || 0}
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-info bg-gradient rounded-circle p-3">
                                        <i className="fas fa-chart-line text-white fa-lg"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <div className="text-muted small">Promedio por Pedido</div>
                                    <div className="h4 mb-0">
                                        ${dashboardData?.resumen?.promedio_por_pedido || '0.00'}
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={3} md={6} className="mb-3">
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="flex-shrink-0">
                                    <div className="bg-warning bg-gradient rounded-circle p-3">
                                        <i className="fas fa-percentage text-white fa-lg"></i>
                                    </div>
                                </div>
                                <div className="flex-grow-1 ms-3">
                                    <div className="text-muted small">Ocupación Mesas</div>
                                    <div className="h4 mb-0">
                                        {mesasStats?.porcentaje_ocupacion || 0}%
                                    </div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Gráficos */}
            <Row className="mb-4">
                <Col lg={4} className="mb-3">
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-table me-2 text-primary"></i>
                                Estado de Mesas
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                <Doughnut data={mesasChartData} options={chartOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4} className="mb-3">
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-clipboard-list me-2 text-success"></i>
                                Pedidos por Estado
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                <Bar data={pedidosChartData} options={chartOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={4} className="mb-3">
                    <Card className="border-0 shadow-sm h-100">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-chart-bar me-2 text-info"></i>
                                Ventas del Día
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                <Bar data={ventasChartData} options={chartOptions} />
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Productos más vendidos y mozos activos */}
            <Row>
                <Col lg={6} className="mb-3">
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-fire me-2 text-danger"></i>
                                Productos Más Vendidos Hoy
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData?.productos_mas_vendidos?.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Producto</th>
                                                <th>Vendidos</th>
                                                <th>Ingresos</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.productos_mas_vendidos.slice(0, 5).map((producto, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="bg-primary rounded-circle me-2" 
                                                                 style={{ width: '8px', height: '8px' }}></div>
                                                            {producto.producto.nombre}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge bg="primary">
                                                            {producto.total_vendido}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-success fw-bold">
                                                        ${parseFloat(producto.ingresos).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-muted">
                                    <i className="fas fa-box-open fa-2x mb-3"></i>
                                    <p>No hay datos de productos hoy</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>

                <Col lg={6} className="mb-3">
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-users me-2 text-warning"></i>
                                Mozos Más Activos Hoy
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {dashboardData?.mozos_activos?.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm">
                                        <thead>
                                            <tr>
                                                <th>Mozo</th>
                                                <th>Pedidos</th>
                                                <th>Ventas</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {dashboardData.mozos_activos.map((mozo, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <div className="bg-warning rounded-circle me-2" 
                                                                 style={{ width: '8px', height: '8px' }}></div>
                                                            {mozo.mozo.nombre}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge bg="warning">
                                                            {mozo.total_pedidos}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-success fw-bold">
                                                        ${parseFloat(mozo.total_ventas || 0).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-muted">
                                    <i className="fas fa-user-friends fa-2x mb-3"></i>
                                    <p>No hay datos de mozos hoy</p>
                                </div>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
};

// Componentes para las otras rutas
const AdminMesas = () => <MesasManagement />;

const AdminProductos = () => (
    <Container>
        <h3>Gestión de Productos</h3>
        <p>Módulo de productos en desarrollo...</p>
    </Container>
);

const AdminReportes = () => (
    <Container>
        <h3>Reportes Avanzados</h3>
        <p>Módulo de reportes en desarrollo...</p>
    </Container>
);

const AdminUsuarios = () => (
    <Container>
        <h3>Gestión de Usuarios</h3>
        <p>Módulo de usuarios en desarrollo...</p>
    </Container>
);

const AdminDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<AdminHome />} />
            <Route path="/mesas" element={<AdminMesas />} />
            <Route path="/productos" element={<AdminProductos />} />
            <Route path="/reportes" element={<AdminReportes />} />
            <Route path="/usuarios" element={<AdminUsuarios />} />
        </Routes>
    );
};

export default AdminDashboard;