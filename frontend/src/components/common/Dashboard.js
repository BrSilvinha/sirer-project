import React from 'react';
import { Container, Row, Col, Navbar, Nav, Dropdown } from 'react-bootstrap';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Importar componentes por rol
import AdminDashboard from '../admin/AdminDashboard';
import MozoDashboard from '../mozo/MozoDashboard';
import CocinaDashboard from '../cocina/CocinaDashboard';
import CajeroDashboard from '../cajero/CajeroDashboard';

const Dashboard = () => {
    const { user, logout, hasRole } = useAuth();
    const location = useLocation();

    // ✅ CORREGIDO: Mover la validación dentro del componente
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Configuración de navegación por rol
    const getNavigationItems = () => {
        const items = [];

        if (hasRole('administrador')) {
            items.push(
                { path: '/dashboard/admin', label: 'Panel Admin', icon: 'fa-tachometer-alt' },
                { path: '/dashboard/admin/mesas', label: 'Mesas', icon: 'fa-table' },
                { path: '/dashboard/admin/productos', label: 'Productos', icon: 'fa-utensils' },
                { path: '/dashboard/admin/reportes', label: 'Reportes', icon: 'fa-chart-bar' },
                { path: '/dashboard/admin/usuarios', label: 'Usuarios', icon: 'fa-users' }
            );
        } else if (hasRole('mozo')) {
            items.push(
                { path: '/dashboard/mozo', label: 'Mesas', icon: 'fa-table' },
                { path: '/dashboard/mozo/historial', label: 'Historial', icon: 'fa-history' }
            );
        } else if (hasRole('cocina')) {
            items.push(
                { path: '/dashboard/cocina', label: 'Pedidos', icon: 'fa-fire' },
                { path: '/dashboard/cocina/productos', label: 'Productos', icon: 'fa-utensils' }
            );
        } else if (hasRole('cajero')) {
            items.push(
                { path: '/dashboard/cajero', label: 'Cuentas', icon: 'fa-cash-register' },
                { path: '/dashboard/cajero/pagos', label: 'Procesar Pagos', icon: 'fa-credit-card' },
                { path: '/dashboard/cajero/reportes', label: 'Reportes', icon: 'fa-chart-line' }
            );
        }

        return items;
    };

    const navigationItems = getNavigationItems();

    const getRoleColor = (role) => {
        const colors = {
            administrador: 'primary',
            mozo: 'success',
            cocina: 'warning',
            cajero: 'info'
        };
        return colors[role] || 'secondary';
    };

    const getRoleIcon = (role) => {
        const icons = {
            administrador: 'fa-crown',
            mozo: 'fa-user-tie',
            cocina: 'fa-hat-chef',
            cajero: 'fa-calculator'
        };
        return icons[role] || 'fa-user';
    };

    return (
        <div className="min-vh-100 bg-light">
            {/* Navbar Superior */}
            <Navbar bg="white" variant="light" className="shadow-sm px-3">
                <Navbar.Brand as={Link} to="/dashboard" className="fw-bold">
                    🍽️ SIRER
                </Navbar.Brand>

                <Navbar.Collapse className="justify-content-end">
                    <Nav>
                        {/* Información del usuario */}
                        <Dropdown align="end">
                            <Dropdown.Toggle 
                                variant={getRoleColor(user.rol)} 
                                className="d-flex align-items-center"
                                style={{ border: 'none' }}
                            >
                                <i className={`fas ${getRoleIcon(user.rol)} me-2`}></i>
                                {user.nombre}
                            </Dropdown.Toggle>

                            <Dropdown.Menu>
                                <Dropdown.Header>
                                    <div className="text-center">
                                        <strong>{user.nombre}</strong>
                                        <br />
                                        <small className="text-muted">{user.email}</small>
                                        <br />
                                        <span className={`badge bg-${getRoleColor(user.rol)}`}>
                                            {user.rol.charAt(0).toUpperCase() + user.rol.slice(1)}
                                        </span>
                                    </div>
                                </Dropdown.Header>
                                <Dropdown.Divider />
                                <Dropdown.Item>
                                    <i className="fas fa-user me-2"></i>
                                    Mi Perfil
                                </Dropdown.Item>
                                <Dropdown.Item>
                                    <i className="fas fa-cog me-2"></i>
                                    Configuración
                                </Dropdown.Item>
                                <Dropdown.Divider />
                                <Dropdown.Item onClick={logout} className="text-danger">
                                    <i className="fas fa-sign-out-alt me-2"></i>
                                    Cerrar Sesión
                                </Dropdown.Item>
                            </Dropdown.Menu>
                        </Dropdown>
                    </Nav>
                </Navbar.Collapse>
            </Navbar>

            <Container fluid>
                <Row>
                    {/* Sidebar de Navegación */}
                    <Col lg={2} md={3} className="bg-white shadow-sm p-0" style={{ minHeight: 'calc(100vh - 76px)' }}>
                        <Nav className="flex-column p-3">
                            {navigationItems.map((item, index) => (
                                <Nav.Link
                                    key={index}
                                    as={Link}
                                    to={item.path}
                                    className={`py-2 px-3 mb-1 rounded ${
                                        location.pathname === item.path 
                                            ? `bg-${getRoleColor(user.rol)} text-white` 
                                            : 'text-dark hover-bg-light'
                                    }`}
                                >
                                    <i className={`fas ${item.icon} me-2`}></i>
                                    {item.label}
                                </Nav.Link>
                            ))}
                        </Nav>
                    </Col>

                    {/* Contenido Principal */}
                    <Col lg={10} md={9} className="p-4">
                        <Routes>
                            {/* Rutas por rol */}
                            {hasRole('administrador') && (
                                <>
                                    <Route path="/admin/*" element={<AdminDashboard />} />
                                    <Route path="/" element={<Navigate to="/dashboard/admin" replace />} />
                                </>
                            )}
                            {hasRole('mozo') && (
                                <>
                                    <Route path="/mozo/*" element={<MozoDashboard />} />
                                    <Route path="/" element={<Navigate to="/dashboard/mozo" replace />} />
                                </>
                            )}
                            {hasRole('cocina') && (
                                <>
                                    <Route path="/cocina/*" element={<CocinaDashboard />} />
                                    <Route path="/" element={<Navigate to="/dashboard/cocina" replace />} />
                                </>
                            )}
                            {hasRole('cajero') && (
                                <>
                                    <Route path="/cajero/*" element={<CajeroDashboard />} />
                                    <Route path="/" element={<Navigate to="/dashboard/cajero" replace />} />
                                </>
                            )}
                            
                            {/* Ruta por defecto */}
                            <Route path="*" element={
                                <div className="text-center py-5">
                                    <h3>¡Bienvenido al Sistema SIRER! 🍽️</h3>
                                    <p className="text-muted">Selecciona una opción del menú para comenzar.</p>
                                </div>
                            } />
                        </Routes>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Dashboard;