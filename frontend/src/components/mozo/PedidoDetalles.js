import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, 
    Spinner, Alert, ListGroup, Modal, Form 
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { pedidosService } from '../../services/api';
import toast from 'react-hot-toast';

const PedidoDetalles = () => {
    const { pedidoId } = useParams();
    const navigate = useNavigate();
    
    const [pedido, setPedido] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCambiarEstadoModal, setShowCambiarEstadoModal] = useState(false);
    const [nuevoEstado, setNuevoEstado] = useState('');
    const [actualizando, setActualizando] = useState(false);

    useEffect(() => {
        fetchPedidoDetalles();
    }, [pedidoId]);

    const fetchPedidoDetalles = async () => {
        try {
            setLoading(true);
            
            // Mock data por ahora - en producción sería: await pedidosService.getById(pedidoId)
            const mockPedido = {
                id: parseInt(pedidoId),
                mesa: {
                    id: 1,
                    numero: 5,
                    capacidad: 4
                },
                mozo: {
                    id: 1,
                    nombre: 'Juan Pérez'
                },
                estado: 'en_cocina',
                fecha: new Date().toISOString(),
                productos: [
                    {
                        id: 1,
                        nombre: 'Pizza Margarita',
                        precio: 25.90,
                        cantidad: 1,
                        subtotal: 25.90,
                        categoria: 'Platos Principales'
                    },
                    {
                        id: 2,
                        nombre: 'Coca Cola',
                        precio: 3.50,
                        cantidad: 2,
                        subtotal: 7.00,
                        categoria: 'Bebidas'
                    }
                ],
                total: 32.90,
                observaciones: 'Sin cebolla en la pizza',
                tiempos: {
                    creado: new Date().toISOString(),
                    enviado_cocina: new Date(Date.now() - 10 * 60000).toISOString(), // 10 min ago
                    preparado: null,
                    entregado: null,
                    pagado: null
                }
            };

            setPedido(mockPedido);
            setError(null);
        } catch (err) {
            console.error('Error fetching pedido:', err);
            setError('Error al cargar los detalles del pedido');
        } finally {
            setLoading(false);
        }
    };

    const handleCambiarEstado = async () => {
        if (!nuevoEstado) return;

        setActualizando(true);
        try {
            // En producción: await pedidosService.changeStatus(pedidoId, nuevoEstado)
            
            // Mock update
            setPedido({
                ...pedido,
                estado: nuevoEstado,
                tiempos: {
                    ...pedido.tiempos,
                    [nuevoEstado]: new Date().toISOString()
                }
            });

            toast.success(`Pedido marcado como S/{getEstadoText(nuevoEstado).toLowerCase()}`);
            setShowCambiarEstadoModal(false);
            setNuevoEstado('');
        } catch (error) {
            toast.error('Error al actualizar el estado del pedido');
        } finally {
            setActualizando(false);
        }
    };

    const getEstadoColor = (estado) => {
        const colors = {
            nuevo: 'primary',
            en_cocina: 'warning',
            preparado: 'info',
            entregado: 'success',
            pagado: 'secondary'
        };
        return colors[estado] || 'secondary';
    };

    const getEstadoText = (estado) => {
        const texts = {
            nuevo: 'Nuevo',
            en_cocina: 'En Cocina',
            preparado: 'Preparado',
            entregado: 'Entregado',
            pagado: 'Pagado'
        };
        return texts[estado] || estado;
    };

    const getEstadoIcon = (estado) => {
        const icons = {
            nuevo: 'fa-plus-circle',
            en_cocina: 'fa-fire',
            preparado: 'fa-check-circle',
            entregado: 'fa-handshake',
            pagado: 'fa-credit-card'
        };
        return icons[estado] || 'fa-circle';
    };

    const getPosiblesEstados = (estadoActual) => {
        const flujo = {
            nuevo: ['en_cocina'],
            en_cocina: ['preparado'],
            preparado: ['entregado'],
            entregado: ['pagado'],
            pagado: []
        };
        return flujo[estadoActual] || [];
    };

    const calcularTiempoTranscurrido = (fechaInicio) => {
        if (!fechaInicio) return null;
        
        const ahora = new Date();
        const inicio = new Date(fechaInicio);
        const diferencia = Math.floor((ahora - inicio) / 1000 / 60); // minutos
        
        if (diferencia < 1) return 'Recién';
        if (diferencia < 60) return `S/{diferencia} min`;
        
        const horas = Math.floor(diferencia / 60);
        const minutos = diferencia % 60;
        return `S/{horas}h S/{minutos}m`;
    };

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Cargando detalles del pedido...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container>
                <Alert variant="danger" className="mt-4">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="outline-danger" onClick={() => navigate('/dashboard/mozo/historial')}>
                        Volver al Historial
                    </Button>
                </Alert>
            </Container>
        );
    }

    if (!pedido) {
        return (
            <Container>
                <Alert variant="warning" className="mt-4">
                    <Alert.Heading>Pedido no encontrado</Alert.Heading>
                    <p>El pedido solicitado no existe o no tienes permisos para verlo.</p>
                    <Button variant="outline-warning" onClick={() => navigate('/dashboard/mozo/historial')}>
                        Volver al Historial
                    </Button>
                </Alert>
            </Container>
        );
    }

    const posiblesEstados = getPosiblesEstados(pedido.estado);

    return (
        <Container fluid>
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center">
                        <div>
                            <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => navigate('/dashboard/mozo/historial')}
                                className="me-3"
                            >
                                <i className="fas fa-arrow-left me-1"></i>
                                Volver
                            </Button>
                            <span>
                                <h2 className="d-inline mb-0">Pedido #{pedido.id}</h2>
                                <Badge bg={getEstadoColor(pedido.estado)} className="ms-3">
                                    <i className={`fas S/{getEstadoIcon(pedido.estado)} me-1`}></i>
                                    {getEstadoText(pedido.estado)}
                                </Badge>
                            </span>
                        </div>
                        {posiblesEstados.length > 0 && (
                            <Button 
                                variant="primary"
                                onClick={() => setShowCambiarEstadoModal(true)}
                            >
                                <i className="fas fa-edit me-2"></i>
                                Cambiar Estado
                            </Button>
                        )}
                    </div>
                </Col>
            </Row>

            <Row>
                {/* Información General */}
                <Col lg={8}>
                    {/* Información del pedido */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-info-circle me-2 text-primary"></i>
                                Información del Pedido
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <Row>
                                <Col md={6}>
                                    <div className="mb-3">
                                        <strong>Mesa:</strong>
                                        <Badge bg="outline-primary" className="ms-2">
                                            Mesa {pedido.mesa.numero}
                                        </Badge>
                                        <span className="text-muted ms-2">
                                            ({pedido.mesa.capacidad} personas)
                                        </span>
                                    </div>
                                    <div className="mb-3">
                                        <strong>Mozo:</strong> {pedido.mozo.nombre}
                                    </div>
                                    <div className="mb-3">
                                        <strong>Fecha y Hora:</strong><br/>
                                        <span className="text-muted">
                                            {new Date(pedido.fecha).toLocaleString()}
                                        </span>
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="mb-3">
                                        <strong>Estado Actual:</strong>
                                        <Badge bg={getEstadoColor(pedido.estado)} className="ms-2">
                                            <i className={`fas S/{getEstadoIcon(pedido.estado)} me-1`}></i>
                                            {getEstadoText(pedido.estado)}
                                        </Badge>
                                    </div>
                                    <div className="mb-3">
                                        <strong>Total:</strong>
                                        <span className="text-success h5 ms-2">
                                            S/{pedido.total.toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="mb-3">
                                        <strong>Tiempo en {getEstadoText(pedido.estado)}:</strong>
                                        <span className="text-info ms-2">
                                            {calcularTiempoTranscurrido(pedido.tiempos[pedido.estado] || pedido.fecha)}
                                        </span>
                                    </div>
                                </Col>
                            </Row>

                            {pedido.observaciones && (
                                <div className="mt-3 pt-3 border-top">
                                    <strong>Observaciones:</strong>
                                    <div className="bg-light p-3 rounded mt-2">
                                        <i className="fas fa-sticky-note text-warning me-2"></i>
                                        {pedido.observaciones}
                                    </div>
                                </div>
                            )}
                        </Card.Body>
                    </Card>

                    {/* Productos del pedido */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-utensils me-2 text-success"></i>
                                Productos ({pedido.productos.length})
                            </h5>
                        </Card.Header>
                        <Card.Body className="p-0">
                            <ListGroup variant="flush">
                                {pedido.productos.map((producto, index) => (
                                    <ListGroup.Item key={index}>
                                        <Row className="align-items-center">
                                            <Col md={6}>
                                                <div>
                                                    <h6 className="mb-1">{producto.nombre}</h6>
                                                    <small className="text-muted">
                                                        <i className="fas fa-tag me-1"></i>
                                                        {producto.categoria}
                                                    </small>
                                                </div>
                                            </Col>
                                            <Col md={2} className="text-center">
                                                <Badge bg="light" text="dark" className="px-3 py-2">
                                                    {producto.cantidad}x
                                                </Badge>
                                            </Col>
                                            <Col md={2} className="text-center">
                                                <span className="text-muted">
                                                    S/{producto.precio.toFixed(2)}
                                                </span>
                                            </Col>
                                            <Col md={2} className="text-end">
                                                <strong className="text-success">
                                                    S/{producto.subtotal.toFixed(2)}
                                                </strong>
                                            </Col>
                                        </Row>
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>
                            <div className="p-3 bg-light border-top">
                                <div className="d-flex justify-content-between align-items-center">
                                    <strong className="text-lg">Total del Pedido:</strong>
                                    <strong className="text-success h4 mb-0">
                                        S/{pedido.total.toFixed(2)}
                                    </strong>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Panel lateral */}
                <Col lg={4}>
                    {/* Timeline del pedido */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-clock me-2 text-info"></i>
                                Timeline del Pedido
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="timeline">
                                {[
                                    { estado: 'nuevo', texto: 'Pedido Creado', tiempo: pedido.tiempos.creado },
                                    { estado: 'en_cocina', texto: 'Enviado a Cocina', tiempo: pedido.tiempos.enviado_cocina },
                                    { estado: 'preparado', texto: 'Preparado', tiempo: pedido.tiempos.preparado },
                                    { estado: 'entregado', texto: 'Entregado', tiempo: pedido.tiempos.entregado },
                                    { estado: 'pagado', texto: 'Pagado', tiempo: pedido.tiempos.pagado }
                                ].map((item, index) => {
                                    const esActual = pedido.estado === item.estado;
                                    const yaCompletado = item.tiempo !== null;
                                    const esPendiente = !yaCompletado && !esActual;

                                    return (
                                        <div key={index} className={`timeline-item S/{esActual ? 'active' : ''} S/{yaCompletado ? 'completed' : ''}`}>
                                            <div className={`timeline-marker S/{
                                                yaCompletado ? 'bg-success' : 
                                                esActual ? 'bg-primary' : 
                                                'bg-light'
                                            }`}>
                                                <i className={`fas S/{
                                                    yaCompletado ? 'fa-check' : 
                                                    esActual ? getEstadoIcon(item.estado) : 
                                                    'fa-circle'
                                                } text-white`}></i>
                                            </div>
                                            <div className="timeline-content">
                                                <h6 className={`mb-1 S/{esPendiente ? 'text-muted' : ''}`}>
                                                    {item.texto}
                                                </h6>
                                                {item.tiempo && (
                                                    <small className="text-muted">
                                                        {new Date(item.tiempo).toLocaleTimeString()}
                                                        <span className="ms-2">
                                                            ({calcularTiempoTranscurrido(item.tiempo)})
                                                        </span>
                                                    </small>
                                                )}
                                                {esActual && !item.tiempo && (
                                                    <small className="text-primary">
                                                        <i className="fas fa-clock me-1"></i>
                                                        En proceso...
                                                    </small>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Acciones rápidas */}
                    <Card className="border-0 shadow-sm">
                        <Card.Header className="bg-white border-0">
                            <h5 className="mb-0">
                                <i className="fas fa-bolt me-2 text-warning"></i>
                                Acciones Rápidas
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            <div className="d-grid gap-2">
                                {posiblesEstados.map(estado => (
                                    <Button
                                        key={estado}
                                        variant={`outline-S/{getEstadoColor(estado)}`}
                                        onClick={() => {
                                            setNuevoEstado(estado);
                                            setShowCambiarEstadoModal(true);
                                        }}
                                    >
                                        <i className={`fas S/{getEstadoIcon(estado)} me-2`}></i>
                                        Marcar como {getEstadoText(estado)}
                                    </Button>
                                ))}
                                
                                <Button
                                    variant="outline-secondary"
                                    onClick={() => navigate(`/dashboard/mozo/pedidos/S/{pedido.mesa.id}`)}
                                >
                                    <i className="fas fa-plus me-2"></i>
                                    Agregar Items
                                </Button>
                                
                                <Button
                                    variant="outline-info"
                                    onClick={() => window.print()}
                                >
                                    <i className="fas fa-print me-2"></i>
                                    Imprimir Pedido
                                </Button>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modal para cambiar estado */}
            <Modal show={showCambiarEstadoModal} onHide={() => setShowCambiarEstadoModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Cambiar Estado del Pedido</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>¿Estás seguro de que quieres cambiar el estado del pedido?</p>
                    
                    <div className="mb-3">
                        <strong>Estado actual:</strong>
                        <Badge bg={getEstadoColor(pedido.estado)} className="ms-2">
                            {getEstadoText(pedido.estado)}
                        </Badge>
                    </div>

                    <Form.Group>
                        <Form.Label><strong>Nuevo estado:</strong></Form.Label>
                        <Form.Select
                            value={nuevoEstado}
                            onChange={(e) => setNuevoEstado(e.target.value)}
                        >
                            <option value="">Selecciona un estado...</option>
                            {posiblesEstados.map(estado => (
                                <option key={estado} value={estado}>
                                    {getEstadoText(estado)}
                                </option>
                            ))}
                        </Form.Select>
                    </Form.Group>

                    {nuevoEstado && (
                        <div className="mt-3 p-3 bg-light rounded">
                            <strong>Nuevo estado:</strong>
                            <Badge bg={getEstadoColor(nuevoEstado)} className="ms-2">
                                <i className={`fas S/{getEstadoIcon(nuevoEstado)} me-1`}></i>
                                {getEstadoText(nuevoEstado)}
                            </Badge>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowCambiarEstadoModal(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleCambiarEstado}
                        disabled={!nuevoEstado || actualizando}
                    >
                        {actualizando ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Actualizando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check me-2"></i>
                                Confirmar Cambio
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Estilos para el timeline */}
            <style jsx>{`
                .timeline {
                    position: relative;
                    padding-left: 30px;
                }

                .timeline::before {
                    content: '';
                    position: absolute;
                    left: 15px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background: #dee2e6;
                }

                .timeline-item {
                    position: relative;
                    margin-bottom: 20px;
                }

                .timeline-marker {
                    position: absolute;
                    left: -22px;
                    top: 0;
                    width: 30px;
                    height: 30px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #fff;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }

                .timeline-content {
                    margin-left: 15px;
                }

                .timeline-item.active .timeline-marker {
                    animation: pulse 2s infinite;
                }

                @keyframes pulse {
                    0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.7); }
                    70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
                }
            `}</style>
        </Container>
    );
};

export default PedidoDetalles;