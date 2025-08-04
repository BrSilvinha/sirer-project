// 🍽️ ARCHIVO: frontend/src/components/Login.js - VERSIÓN CLÁSICA

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
                console.log('Login exitoso');
            }
        } catch (err) {
            console.error('Error en login:', err);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Mostrar spinner mientras verifica autenticación inicial
    if (isLoading) {
        return (
            <div className="min-vh-100 d-flex align-items-center justify-content-center">
                <Spinner animation="border" className="spinner-menu" />
            </div>
        );
    }

    return (
        <div className="min-vh-100 d-flex align-items-center gradient-menu">
            <Container>
                <Row className="justify-content-center">
                    <Col md={6} lg={5} xl={4}>
                        <Card className="card-menu shadow-menu-lg border-0">
                            <Card.Body className="p-5">
                                {/* Header */}
                                <div className="text-center mb-4">
                                    <div className="mb-3">
                                        <div 
                                            className="rounded-circle mx-auto d-flex align-items-center justify-content-center bg-menu-gold"
                                            style={{ width: '70px', height: '70px' }}
                                        >
                                            <i className="fas fa-utensils fa-2x text-white"></i>
                                        </div>
                                    </div>
                                    <h1 className="h3 mb-2 fw-bold text-gradient-menu">
                                        🍽️ SIRER
                                    </h1>
                                    <p className="text-menu-muted mb-0">
                                        Sistema Integral para Restaurantes
                                    </p>
                                </div>

                                {/* Error Alert */}
                                {error && (
                                    <Alert className="alert-menu-danger mb-4">
                                        <i className="fas fa-exclamation-triangle me-2"></i>
                                        {error}
                                    </Alert>
                                )}

                                {/* Login Form */}
                                <Form onSubmit={handleSubmit}>
                                    <Form.Group className="mb-3">
                                        <Form.Label className="fw-bold text-menu-gold">
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
                                            className="form-control-menu"
                                        />
                                    </Form.Group>

                                    <Form.Group className="mb-4">
                                        <Form.Label className="fw-bold text-menu-purple">
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
                                                className="form-control-menu"
                                            />
                                            <Button
                                                variant="link"
                                                className="position-absolute top-50 end-0 translate-middle-y pe-3 text-menu-muted"
                                                onClick={() => setShowPassword(!showPassword)}
                                                style={{ border: 'none', background: 'none' }}
                                                type="button"
                                                disabled={isSubmitting}
                                            >
                                                <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                                            </Button>
                                        </div>
                                    </Form.Group>

                                    {/* Login Button */}
                                    <Button
                                        type="submit"
                                        size="lg"
                                        className="w-100 mb-4 btn-menu-primary"
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

                                {/* Footer */}
                                <div className="text-center">
                                    <small className="text-menu-muted">
                                        © 2025 <span className="text-menu-gold fw-bold">SIRER</span> - Sistema de Gestión de Restaurantes
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