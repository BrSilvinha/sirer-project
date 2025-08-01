import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Badge, Button, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { mesasService } from '../../services/api';
import toast from 'react-hot-toast';

const MesasView = () => {
    const [mesas, setMesas] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMesas();
        fetchEstadisticas();
        
        // Auto-refresh cada 15 segundos para mozos
        const interval = setInterval(() => {
            fetchMesas();
            fetchEstadisticas();
        }, 15000);
        
        return () => clearInterval(interval);
    }, []);

    const fetchMesas = async () => {
        try {
            const response = await mesasService.getAll();
            setMesas(response.data.data);
        } catch (error) {
            console.error('Error fetching mesas:', error);
            toast.error('Error al cargar las mesas');
        } finally {
            setLoading(false);
        }
    };

    const fetchEstadisticas = async () => {
        try {
            const response = await mesasService.getStats();
            setEstadisticas(response.data.data);
        } catch (error) {
            console.error('Error fetching estadísticas:', error);
        }
    };

    const handleTomarPedido = (mesa) => {
        if (mesa.estado === 'libre') {
            // Cambiar estado a ocupada primero
            mesasService.changeStatus(mesa.id, 'ocupada')
                .then(() => {
                    navigate(`/dashboard/mozo/pedidos/${mesa.id}`);
                })
                .catch(error => {
                    toast.error('Error al ocupar la mesa');
                });
        } else {
            navigate(`/dashboard/mozo/pedidos/${mesa.id}`);
        }
    };

    const getEstadoColor = (estado) => {
        const colors = {
            libre: 'success',
            ocupada: 'danger',
            cuenta_solicitada: 'warning'
        };
        return colors[estado] || 'secondary';
    };

    const getEstadoIcon = (estado) => {
        const icons = {
            libre: 'fa-check-circle',
            ocupada: 'fa-users',
            cuenta_solicitada: 'fa-credit-card'
        };
        return icons[estado] || 'fa-question-circle';
    };

    const getEstadoText = (estado) => {
        const texts = {
            libre: 'Libre',
            ocupada: 'Ocupada',
            cuenta_solicitada: 'Cuenta Solicitada'
        };
        return texts[estado] || estado;
    };

    const getActionButton = (mesa) => {
        switch (mesa.estado) {
            case 'libre':
                return (
                    <Button 
                        variant="success" 
                        size="sm" 
                        className="w-100"
                        onClick={() => handleTomarPedido(mesa)}
                    >
                        <i className="fas fa-plus me-1"></i>
                        Tomar Pedido
                    </Button>
                );
            case 'ocupada':
                return (
                    <Button 
                        variant="primary" 
                        size="sm" 
                        className="w-100"
                        onClick={() => handleTomarPedido(mesa)}
                    >
                        <i className="fas fa-edit me-1"></i>
                        Ver Pedidos
                    </Button>
                );
            case 'cuenta_solicitada':
                return (
                    <Button 
                        variant="warning" 
                        size="sm" 
                        className="w-100"
                        onClick={() => handleTomarPedido(mesa)}
                    >
                        <i className="fas fa-eye me-1"></i>
                        Ver Cuenta
                    </Button>
                );
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Cargando mesas...</p>
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
                            <h2 className="mb-1">Estado de Mesas</h2>
                            <p className="text-muted mb-0">
                                Selecciona una mesa para atender
                            </p>
                        </div>
                        <Badge bg="info" className="px-3 py-2">
                            <i className="fas fa-sync-alt me-1"></i>
                            Auto-actualización
                        </Badge>
                    </div>
                </Col>
            </Row>

            {/* Estadísticas rápidas */}
            {estadisticas && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                                <div className="h4 mb-0">{estadisticas.libres}</div>
                                <div className="text-muted small">Mesas Libres</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-users fa-2x text-danger mb-2"></i>
                                <div className="h4 mb-0">{estadisticas.ocupadas}</div>
                                <div className="text-muted small">Mesas Ocupadas</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-credit-card fa-2x text-warning mb-2"></i>
                                <div className="h4 mb-0">{estadisticas.cuenta_solicitada}</div>
                                <div className="text-muted small">Cuentas Pendientes</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-percentage fa-2x text-info mb-2"></i>
                                <div className="h4 mb-0">{estadisticas.porcentaje_ocupacion}%</div>
                                <div className="text-muted small">Ocupación</div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Mesas Grid */}
            <Row>
                {mesas.map((mesa) => (
                    <Col lg={3} md={4} sm={6} key={mesa.id} className="mb-4">
                        <Card 
                            className={`h-100 border-0 shadow-sm cursor-pointer ${
                                mesa.estado === 'libre' ? 'border-success' : 
                                mesa.estado === 'ocupada' ? 'border-danger' : 
                                'border-warning'
                            }`}
                            style={{ 
                                borderWidth: '2px',
                                borderStyle: 'solid',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            <Card.Body className="text-center">
                                {/* Icono y número de mesa */}
                                <div className="mb-3">
                                    <div 
                                        className={`rounded-circle mx-auto d-flex align-items-center justify-content-center bg-${getEstadoColor(mesa.estado)} bg-opacity-15`}
                                        style={{ width: '80px', height: '80px' }}
                                    >
                                        <div className="text-center">
                                            <i className={`fas ${getEstadoIcon(mesa.estado)} text-${getEstadoColor(mesa.estado)} fa-2x`}></i>
                                            <div className={`mt-1 small fw-bold text-${getEstadoColor(mesa.estado)}`}>
                                                #{mesa.numero}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Información de la mesa */}
                                <h5 className="mb-2">Mesa {mesa.numero}</h5>
                                <p className="text-muted mb-2">
                                    <i className="fas fa-users me-1"></i>
                                    Hasta {mesa.capacidad} personas
                                </p>
                                
                                {/* Badge de estado */}
                                <Badge 
                                    bg={getEstadoColor(mesa.estado)} 
                                    className="mb-3"
                                >
                                    {getEstadoText(mesa.estado)}
                                </Badge>

                                {/* Botón de acción */}
                                <div className="d-grid">
                                    {getActionButton(mesa)}
                                </div>

                                {/* Información adicional */}
                                {mesa.estado !== 'libre' && (
                                    <div className="mt-2">
                                        <small className="text-muted">
                                            Actualizada: {new Date(mesa.updatedAt).toLocaleTimeString()}
                                        </small>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Mensaje si no hay mesas */}
            {mesas.length === 0 && (
                <Row>
                    <Col>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center py-5">
                                <i className="fas fa-table fa-3x text-muted mb-3"></i>
                                <h4>No hay mesas disponibles</h4>
                                <p className="text-muted">
                                    Contacta con el administrador para configurar las mesas.
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}
        </Container>
    );
};

export default MesasView;