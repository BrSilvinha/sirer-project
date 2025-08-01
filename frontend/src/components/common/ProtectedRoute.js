import React from 'react';
import { Navigate } from 'react-router-dom';
import { Container, Row, Col, Spinner } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const { isAuthenticated, isLoading, user } = useAuth();

    // Mostrar spinner mientras se verifica la autenticación
    if (isLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Container>
                    <Row className="justify-content-center">
                        <Col xs="auto">
                            <div className="text-center">
                                <Spinner animation="border" variant="primary" style={{ width: '3rem', height: '3rem' }} />
                                <div className="mt-3">
                                    <h5 className="text-muted">Cargando...</h5>
                                    <p className="text-muted mb-0">Verificando autenticación</p>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }

    // Redirigir al login si no está autenticado
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Verificar roles si se especifican
    if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.rol)) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center bg-light">
                <Container>
                    <Row className="justify-content-center">
                        <Col md={6} className="text-center">
                            <div className="bg-white p-5 rounded shadow">
                                <i className="fas fa-lock text-warning" style={{ fontSize: '4rem' }}></i>
                                <h3 className="mt-3 mb-2">Acceso Denegado</h3>
                                <p className="text-muted mb-4">
                                    No tienes permisos para acceder a esta sección.
                                </p>
                                <p className="text-muted">
                                    <strong>Tu rol:</strong> {user.rol}<br />
                                    <strong>Roles permitidos:</strong> {allowedRoles.join(', ')}
                                </p>
                            </div>
                        </Col>
                    </Row>
                </Container>
            </div>
        );
    }

    return children;
};

export default ProtectedRoute;