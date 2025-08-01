import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';
import CuentasPendientes from './CuentasPendientes';

const CajeroHome = () => (
    <Container>
        <Row className="mb-4">
            <Col>
                <h2>Panel de Cajero</h2>
                <p className="text-muted">Gestiona pagos y facturación</p>
            </Col>
        </Row>
        
        <Row>
            <Col md={4} className="mb-4">
                <Card className="text-center border-info">
                    <Card.Body>
                        <i className="fas fa-cash-register fa-2x text-info mb-3"></i>
                        <Card.Title>Cuentas Pendientes</Card.Title>
                        <Card.Text>Ve las mesas listas para cobrar</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
            
            <Col md={4} className="mb-4">
                <Card className="text-center border-success">
                    <Card.Body>
                        <i className="fas fa-credit-card fa-2x text-success mb-3"></i>
                        <Card.Title>Procesar Pagos</Card.Title>
                        <Card.Text>Registra pagos y libera mesas</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
            
            <Col md={4} className="mb-4">
                <Card className="text-center border-primary">
                    <Card.Body>
                        <i className="fas fa-chart-line fa-2x text-primary mb-3"></i>
                        <Card.Title>Reportes</Card.Title>
                        <Card.Text>Ve estadísticas de ventas</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </Container>
);

const CajeroDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<CuentasPendientes />} />
            <Route path="/pagos" element={<CuentasPendientes />} />
            <Route path="/reportes" element={<CajeroHome />} />
        </Routes>
    );
};

export default CajeroDashboard;