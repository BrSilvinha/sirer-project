import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';

const CocinaHome = () => (
    <Container>
        <Row className="mb-4">
            <Col>
                <h2>Panel de Cocina</h2>
                <p className="text-muted">Gestiona los pedidos en preparación</p>
            </Col>
        </Row>
        
        <Row>
            <Col md={6} className="mb-4">
                <Card className="text-center border-warning">
                    <Card.Body>
                        <i className="fas fa-fire fa-2x text-warning mb-3"></i>
                        <Card.Title>Pedidos Activos</Card.Title>
                        <Card.Text>Ve todos los pedidos en preparación</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
            
            <Col md={6} className="mb-4">
                <Card className="text-center border-danger">
                    <Card.Body>
                        <i className="fas fa-utensils fa-2x text-danger mb-3"></i>
                        <Card.Title>Productos</Card.Title>
                        <Card.Text>Gestiona disponibilidad de productos</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </Container>
);

const CocinaPedidos = () => (
    <div>
        <h3>Pedidos en Cocina</h3>
        <p>Aquí verás todos los pedidos que necesitas preparar.</p>
    </div>
);

const CocinaProductos = () => (
    <div>
        <h3>Gestión de Productos</h3>
        <p>Cambia la disponibilidad de productos cuando se agoten.</p>
    </div>
);

const CocinaDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<CocinaHome />} />
            <Route path="/productos" element={<CocinaProductos />} />
        </Routes>
    );
};

export default CocinaDashboard;