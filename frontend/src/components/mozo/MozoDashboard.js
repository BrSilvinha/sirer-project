import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container, Row, Col, Card } from 'react-bootstrap';

const MozoHome = () => (
    <Container>
        <Row className="mb-4">
            <Col>
                <h2>Panel de Mozo</h2>
                <p className="text-muted">Gestiona tus mesas y pedidos</p>
            </Col>
        </Row>
        
        <Row>
            <Col md={4} className="mb-4">
                <Card className="text-center border-success">
                    <Card.Body>
                        <i className="fas fa-table fa-2x text-success mb-3"></i>
                        <Card.Title>Mis Mesas</Card.Title>
                        <Card.Text>Ve el estado de tus mesas asignadas</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
            
            <Col md={4} className="mb-4">
                <Card className="text-center border-primary">
                    <Card.Body>
                        <i className="fas fa-plus-circle fa-2x text-primary mb-3"></i>
                        <Card.Title>Tomar Pedido</Card.Title>
                        <Card.Text>Registra nuevos pedidos</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
            
            <Col md={4} className="mb-4">
                <Card className="text-center border-info">
                    <Card.Body>
                        <i className="fas fa-history fa-2x text-info mb-3"></i>
                        <Card.Title>Historial</Card.Title>
                        <Card.Text>Revisa pedidos anteriores</Card.Text>
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    </Container>
);

const MozoMesas = () => (
    <div>
        <h3>Estado de Mesas</h3>
        <p>Aquí verás todas las mesas y su estado actual.</p>
    </div>
);

const MozoPedidos = () => (
    <div>
        <h3>Tomar Pedido</h3>
        <p>Selecciona una mesa y registra el pedido del cliente.</p>
    </div>
);

const MozoHistorial = () => (
    <div>
        <h3>Historial de Pedidos</h3>
        <p>Revisa todos los pedidos que has tomado.</p>
    </div>
);

const MozoDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<MozoHome />} />
            <Route path="/pedidos" element={<MozoPedidos />} />
            <Route path="/historial" element={<MozoHistorial />} />
        </Routes>
    );
};

export default MozoDashboard;