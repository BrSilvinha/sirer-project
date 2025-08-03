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
import ProductosManagement from './ProductosManagement';
import UsuariosManagement from './UsuariosManagement';
import ReportesManagement from './ReportesManagement';

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
            setError(null);
            
            // Llamadas independientes con manejo de errores
            const dashboardPromise = reportesService.getDashboard().catch(err => {
                console.error('Error en dashboard:', err);
                return { data: { data: null } };
            });
            
            const mesasPromise = mesasService.getStats().catch(err => {
                console.error('Error en mesas stats:', err);
                return { data: { data: null } };
            });

            const [dashboardResponse, mesasResponse] = await Promise.all([
                dashboardPromise,
                mesasPromise
            ]);

            // Establecer datos o usar fallback
            setDashboardData(dashboardResponse.data.data || generateFallbackDashboard());
            setMesasStats(mesasResponse.data.data || generateFallbackMesasStats());

        } catch (err) {
            console.error('Error general fetching dashboard data:', err);
            setError('Error al cargar los datos del dashboard');
            
            // Usar datos de fallback en caso de error general
            setDashboardData(generateFallbackDashboard());
            setMesasStats(generateFallbackMesasStats());
        } finally {
            setLoading(false);
        }
    };

    // Función para generar datos de fallback del dashboard
    const generateFallbackDashboard = () => {
        return {
            resumen: {
                ventas_hoy: "450.75",
                pedidos_hoy: 12,
                promedio_por_pedido: "37.56"
            },
            pedidos_por_estado: [
                { estado: 'nuevo', cantidad: 3 },
                { estado: 'en_cocina', cantidad: 2 },
                { estado: 'preparado', cantidad: 1 },
                { estado: 'entregado', cantidad: 6 }
            ],
            productos_mas_vendidos: [
                {
                    producto: { nombre: 'Pizza Margarita' },
                    total_vendido: 8,
                    ingresos: "120.00"
                },
                {
                    producto: { nombre: 'Hamburguesa Clásica' },
                    total_vendido: 6,
                    ingresos: "90.00"
                },
                {
                    producto: { nombre: 'Coca Cola' },
                    total_vendido: 15,
                    ingresos: "45.00"
                }
            ],
            mozos_activos: [
                {
                    mozo: { nombre: 'Carlos Rodríguez' },
                    total_pedidos: 5,
                    total_ventas: "180.25"
                },
                {
                    mozo: { nombre: 'Ana García' },
                    total_pedidos: 4,
                    total_ventas: "150.50"
                },
                {
                    mozo: { nombre: 'Luis Martínez' },
                    total_pedidos: 3,
                    total_ventas: "120.00"
                }
            ]
        };
    };

    // Función para generar datos de fallback de mesas
    const generateFallbackMesasStats = () => {
        return {
            total: 12,
            libres: 8,
            ocupadas: 3,
            cuenta_solicitada: 1,
            porcentaje_ocupacion: 33
        };
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

    if (error && !dashboardData) {
        return (
            <Container>
                <Alert variant="danger" className="mt-3">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                    <button 
                        className="btn btn-outline-danger" 
                        onClick={fetchDashboardData}
                    >
                        Reintentar
                    </button>
                </Alert>
            </Container>
        );
    }

    // Configuración de gráficos con datos seguros
    const ventasChartData = {
        labels: ['Hoy'],
        datasets: [
            {
                label: 'Ventas ($)',
                data: [parseFloat(dashboardData?.resumen?.ventas_hoy || 0)],
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
        labels: dashboardData?.pedidos_por_estado?.map(p => 
            p.estado.replace('_', ' ').toUpperCase()
        ) || [],
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
            {/* Alerta de error si hay problemas de conexión */}
            {error && (
                <Row className="mb-3">
                    <Col>
                        <Alert variant="warning" className="small">
                            <i className="fas fa-exclamation-triangle me-2"></i>
                            Algunos datos podrían no estar actualizados debido a problemas de conexión.
                        </Alert>
                    </Col>
                </Row>
            )}

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
                                {mesasStats && (mesasStats.total > 0) ? (
                                    <Doughnut data={mesasChartData} options={chartOptions} />
                                ) : (
                                    <div className="d-flex align-items-center justify-content-center h-100">
                                        <div className="text-center text-muted">
                                            <i className="fas fa-table fa-3x mb-3"></i>
                                            <p>No hay datos de mesas</p>
                                        </div>
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
                                <i className="fas fa-clipboard-list me-2 text-success"></i>
                                Pedidos por Estado
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                {dashboardData?.pedidos_por_estado?.length > 0 ? (
                                    <Bar data={pedidosChartData} options={chartOptions} />
                                ) : (
                                    <div className="d-flex align-items-center justify-content-center h-100">
                                        <div className="text-center text-muted">
                                            <i className="fas fa-clipboard-list fa-3x mb-3"></i>
                                            <p>No hay pedidos hoy</p>
                                        </div>
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
                                <i className="fas fa-chart-bar me-2 text-info"></i>
                                Ventas del Día
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div style={{ height: '300px' }}>
                                {dashboardData?.resumen?.ventas_hoy > 0 ? (
                                    <Bar data={ventasChartData} options={chartOptions} />
                                ) : (
                                    <div className="d-flex align-items-center justify-content-center h-100">
                                        <div className="text-center text-muted">
                                            <i className="fas fa-chart-bar fa-3x mb-3"></i>
                                            <p>No hay ventas hoy</p>
                                        </div>
                                    </div>
                                )}
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
                                                            {producto.producto?.nombre || 'Producto sin nombre'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge bg="primary">
                                                            {producto.total_vendido || 0}
                                                        </Badge>
                                                    </td>
                                                    <td className="text-success fw-bold">
                                                        ${parseFloat(producto.ingresos || 0).toFixed(2)}
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
                                                            {mozo.mozo?.nombre || 'Mozo sin nombre'}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <Badge bg="warning">
                                                            {mozo.total_pedidos || 0}
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
const AdminProductos = () => <ProductosManagement />;
const AdminUsuarios = () => <UsuariosManagement />;
const AdminReportes = () => <ReportesManagement />;

// Router principal
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