import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Spinner } from 'react-bootstrap';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const { login, isAuthenticated, isLoading, error, clearError } = useAuth();
    const navigate = useNavigate();

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (isAuthenticated && !isLoading) {
            navigate('/dashboard', { replace: true });
        }
    }, [isAuthenticated, isLoading, navigate]);

    // Limpiar errores al montar
    useEffect(() => {
        clearError();
    }, [clearError]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (isSubmitting || !email || !password) {
            return;
        }

        setIsSubmitting(true);

        try {
            const result = await login(email, password);
            
            if (result.success) {
                // El useEffect se encargará de la redirección
                console.log('Login exitoso');
            }
        } catch (err) {
            console.error('Error en login:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    const fillCredentials = (userEmail, userPassword) => {
        setEmail(userEmail);
        setPassword(userPassword);
        clearError();
    };

    // Mostrar spinner mientras verifica autenticación inicial
    if (isLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" variant="primary" />
            </div>
        );
    }

    return (
        <div className="min-vh-100 d-flex align-items-center" style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <Container>
                <Row className="justify-content-center">
                    <Col md={8} lg={6} xl={5}>
                        <Card className="shadow-lg border-0">
                            <Card.Body className="p-5">
                                <div className="text-center mb-4">
                                    <h1 className="h3 mb-3 fw-bold text-primary">
                                        🍽️ SIRER
                                    </h1>
                                    <p className="text-muted">
                                        Sistema Integral para Restaurantes
                                    </p>
                                </div>

                                {error && (
                                    <Alert variant="danger" className="mb-4">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        {error}
                                    </Alert>
                                )}

                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>
                                            <i className="fas fa-envelope me-2"></i>
                                            Email
                                        </Form.Label>
                                        <Form.Control
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Ingresa tu email"
                                            required
                                            disabled={isSubmitting}
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label>
                                            <i className="fas fa-lock me-2"></i>
                                            Contraseña
                                        </Form.Label>
                                        <div className="position-relative">
                                            <Form.Control
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Ingresa tu contraseña"
                                                required
                                                disabled={isSubmitting}
                                            />
                                            <Button
                                                variant="link"
                                                className="position-absolute top-50 end-0 translate-middle-y pe-3 text-muted"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ border: 'none', background: 'none' }}
                                                type="button"
                                            >
                                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </Button>
                                        </div>
                                    </Form.Group>

                                    <Button
                                        type="submit"
                                        variant="primary"
                                        size="lg"
                                        className="w-100 mb-3"
                                        disabled={isSubmitting || !email || !password}
                                    >
                                        {isSubmitting ? (
                                            <>
                                                <Spinner animation="border" size="sm" className="me-2" />
                                                Iniciando sesión...
                                            </>
                                        ) : (
                                            <>
                                                <i className="fas fa-sign-in-alt me-2"></i>
                                                Iniciar Sesión
                                            </>
                                        )}
                                    </Button>
                                </Form>

                                <div className="mt-4">
                                    <hr />
                                    <p className="text-center text-muted mb-3">
                                        <small>Usuarios de prueba:</small>
                                    </p>
                                    <Row className="g-2">
                                        <Col xs={6}>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                className="w-100"
                                                onClick={() => fillCredentials('admin@sirer.com', 'admin123')}
                                                disabled={isSubmitting}
                                            >
                                                Administrador
                                            </Button>
                                        </Col>
                                        <Col xs={6}>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                className="w-100"
                                                onClick={() => fillCredentials('mozo@sirer.com', 'mozo123')}
                                                disabled={isSubmitting}
                                            >
                                                Mozo
                                            </Button>
                                        </Col>
                                        <Col xs={6}>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                className="w-100"
                                                onClick={() => fillCredentials('cocina@sirer.com', 'cocina123')}
                                                disabled={isSubmitting}
                                            >
                                                Cocina
                                            </Button>
                                        </Col>
                                        <Col xs={6}>
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                className="w-100"
                                                onClick={() => fillCredentials('cajero@sirer.com', 'cajero123')}
                                                disabled={isSubmitting}
                                            >
                                                Cajero
                                            </Button>
                                        </Col>
                                    </Row>
                                </div>

                                <div className="text-center mt-4">
                                    <small className="text-muted">
                                        © 2025 SIRER - Sistema de Gestión de Restaurantes
                                    </small>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default Login;