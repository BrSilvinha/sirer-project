import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Spinner, 
    Modal, ListGroup, Alert, Dropdown, ButtonGroup 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { mesasService, pedidosService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

const MesasView = () => {
    const [mesas, setMesas] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showPedidosModal, setShowPedidosModal] = useState(false);
    const [mesaSeleccionada, setMesaSeleccionada] = useState(null);
    const [pedidosMesa, setPedidosMesa] = useState([]);
    const [loadingPedidos, setLoadingPedidos] = useState(false);
    const [view, setView] = useState('grid');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    
    const navigate = useNavigate();
    const { on, off } = useSocket();

    const fetchMesas = useCallback(async () => {
        try {
            const response = await mesasService.getAll();
            let mesasData = response.data.data;
            
            // Aplicar filtro de estado
            if (filtroEstado !== 'todos') {
                mesasData = mesasData.filter(mesa => mesa.estado === filtroEstado);
            }
            
            setMesas(mesasData);
        } catch (error) {
            console.error('Error fetching mesas:', error);
            toast.error('Error al cargar las mesas');
        } finally {
            setLoading(false);
        }
    }, [filtroEstado]);

    const fetchEstadisticas = useCallback(async () => {
        try {
            const response = await mesasService.getStats();
            setEstadisticas(response.data.data);
        } catch (error) {
            console.error('Error fetching estadísticas:', error);
        }
    }, []);

    useEffect(() => {
        fetchMesas();
        fetchEstadisticas();
        
        // Auto-refresh cada 30 segundos
        const interval = setInterval(() => {
            fetchMesas();
            fetchEstadisticas();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchMesas, fetchEstadisticas]);

    // ✅ Listeners de WebSocket para actualizaciones en tiempo real
    useEffect(() => {
        const handleMesaLiberada = (data) => {
            console.log('🏠 Mesa liberada:', data);
            toast.success(`Mesa ${data.mesa} liberada - Total: S/ ${data.total}`);
            fetchMesas();
            fetchEstadisticas();
        };

        const handleMesaEstadoActualizada = (data) => {
            console.log('🔄 Mesa estado actualizado:', data);
            fetchMesas();
            fetchEstadisticas();
        };

        const handleNuevoPedido = (data) => {
            console.log('📝 Nuevo pedido:', data);
            fetchMesas();
            fetchEstadisticas();
        };

        const handlePedidoActualizado = (data) => {
            console.log('📋 Pedido actualizado:', data);
            fetchMesas();
            fetchEstadisticas();
        };

        // Registrar listeners
        on('mesa-liberada', handleMesaLiberada);
        on('mesa-estado-actualizada', handleMesaEstadoActualizada);
        on('nuevo-pedido', handleNuevoPedido);
        on('pedido-actualizado', handlePedidoActualizado);

        return () => {
            // Cleanup listeners
            off('mesa-liberada', handleMesaLiberada);
            off('mesa-estado-actualizada', handleMesaEstadoActualizada);
            off('nuevo-pedido', handleNuevoPedido);
            off('pedido-actualizado', handlePedidoActualizado);
        };
    }, [on, off, fetchMesas, fetchEstadisticas]);

    const fetchPedidosMesa = useCallback(async (mesaId) => {
        try {
            setLoadingPedidos(true);
            const response = await pedidosService.getByMesa(mesaId);
            setPedidosMesa(response.data.data || []);
        } catch (error) {
            console.error('Error fetching pedidos mesa:', error);
            toast.error('Error al cargar pedidos de la mesa');
            setPedidosMesa([]);
        } finally {
            setLoadingPedidos(false);
        }
    }, []);

    const handleVerPedidos = useCallback(async (mesa) => {
        setMesaSeleccionada(mesa);
        setShowPedidosModal(true);
        await fetchPedidosMesa(mesa.id);
    }, [fetchPedidosMesa]);

    const handleTomarPedido = useCallback((mesa) => {
        if (mesa.estado === 'libre') {
            // Cambiar estado a ocupada primero
            mesasService.changeStatus(mesa.id, 'ocupada')
                .then(() => {
                    navigate(`/dashboard/mozo/pedidos/${mesa.id}`);
                })
                .catch(error => {
                    console.error('Error changing mesa status:', error);
                    toast.error('Error al ocupar la mesa');
                });
        } else {
            navigate(`/dashboard/mozo/pedidos/${mesa.id}`);
        }
    }, [navigate]);

    const handleCambiarEstadoMesa = useCallback(async (mesaId, nuevoEstado) => {
        try {
            await mesasService.changeStatus(mesaId, nuevoEstado);
            toast.success(`Mesa actualizada a ${getEstadoText(nuevoEstado)}`);
            fetchMesas();
            fetchEstadisticas();
        } catch (error) {
            console.error('Error changing mesa status:', error);
            toast.error('Error al cambiar estado de mesa');
        }
    }, [fetchMesas, fetchEstadisticas]);

    const getEstadoColor = useCallback((estado) => {
        const colors = {
            libre: 'success',
            ocupada: 'danger',
            cuenta_solicitada: 'warning'
        };
        return colors[estado] || 'secondary';
    }, []);

    const getEstadoIcon = useCallback((estado) => {
        const icons = {
            libre: 'fa-check-circle',
            ocupada: 'fa-users',
            cuenta_solicitada: 'fa-credit-card'
        };
        return icons[estado] || 'fa-question-circle';
    }, []);

    const getEstadoText = useCallback((estado) => {
        const texts = {
            libre: 'Libre',
            ocupada: 'Ocupada',
            cuenta_solicitada: 'Cuenta Solicitada'
        };
        return texts[estado] || estado;
    }, []);

    const getActionButton = useCallback((mesa) => {
        switch (mesa.estado) {
            case 'libre':
                return (
                    <Button 
                        variant="success" 
                        size="sm" 
                        className="w-100 mb-1"
                        onClick={() => handleTomarPedido(mesa)}
                    >
                        <i className="fas fa-plus me-1"></i>
                        Tomar Pedido
                    </Button>
                );
            case 'ocupada':
                return (
                    <>
                        <Button 
                            variant="primary" 
                            size="sm" 
                            className="w-100 mb-1"
                            onClick={() => handleTomarPedido(mesa)}
                        >
                            <i className="fas fa-edit me-1"></i>
                            Agregar Items
                        </Button>
                        <Button 
                            variant="outline-info" 
                            size="sm" 
                            className="w-100"
                            onClick={() => handleVerPedidos(mesa)}
                        >
                            <i className="fas fa-eye me-1"></i>
                            Ver Pedidos
                        </Button>
                    </>
                );
            case 'cuenta_solicitada':
                return (
                    <>
                        <Button 
                            variant="warning" 
                            size="sm" 
                            className="w-100 mb-1"
                            onClick={() => handleVerPedidos(mesa)}
                        >
                            <i className="fas fa-eye me-1"></i>
                            Ver Cuenta
                        </Button>
                        <Button 
                            variant="outline-success" 
                            size="sm" 
                            className="w-100"
                            onClick={() => handleCambiarEstadoMesa(mesa.id, 'libre')}
                        >
                            <i className="fas fa-check me-1"></i>
                            Marcar Libre
                        </Button>
                    </>
                );
            default:
                return null;
        }
    }, [handleTomarPedido, handleVerPedidos, handleCambiarEstadoMesa]);

    const getEstadoBadgeVariant = useCallback((estado) => {
        switch (estado) {
            case 'nuevo': return 'primary';
            case 'en_cocina': return 'warning';
            case 'preparado': return 'info';
            case 'entregado': return 'success';
            case 'pagado': return 'secondary';
            default: return 'secondary';
        }
    }, []);

    const getEstadoPedidoText = useCallback((estado) => {
        const texts = {
            nuevo: 'Nuevo',
            en_cocina: 'En Cocina',
            preparado: 'Preparado',
            entregado: 'Entregado',
            pagado: 'Pagado'
        };
        return texts[estado] || estado;
    }, []);

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
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <div className="mb-3 mb-md-0">
                            <h2 className="mb-1 fs-3 fs-md-2">Estado de Mesas</h2>
                            <p className="text-muted mb-0 small">
                                <span className="d-none d-sm-inline">Selecciona una mesa para atender</span>
                                <span className="d-sm-none">Selecciona mesa</span>
                            </p>
                        </div>
                        <div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
                            <ButtonGroup className="flex-fill flex-md-shrink-0">
                                <Button 
                                    variant={view === 'grid' ? 'primary' : 'outline-primary'}
                                    size="sm"
                                    onClick={() => setView('grid')}
                                    className="flex-fill"
                                >
                                    <i className="fas fa-th-large me-1"></i>
                                    <span className="d-none d-sm-inline">Grid</span>
                                </Button>
                                <Button 
                                    variant={view === 'list' ? 'primary' : 'outline-primary'}
                                    size="sm"
                                    onClick={() => setView('list')}
                                    className="flex-fill"
                                >
                                    <i className="fas fa-list me-1"></i>
                                    <span className="d-none d-sm-inline">Lista</span>
                                </Button>
                            </ButtonGroup>
                            
                            <Dropdown className="flex-fill flex-sm-shrink-0">
                                <Dropdown.Toggle variant="outline-secondary" size="sm" className="w-100 w-sm-auto">
                                    <i className="fas fa-filter me-1"></i>
                                    <span className="d-none d-sm-inline">
                                        {filtroEstado === 'todos' ? 'Todas' : getEstadoText(filtroEstado)}
                                    </span>
                                    <span className="d-sm-none">Filtro</span>
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => setFiltroEstado('todos')}>
                                        Todas las mesas
                                    </Dropdown.Item>
                                    <Dropdown.Divider />
                                    <Dropdown.Item onClick={() => setFiltroEstado('libre')}>
                                        <i className="fas fa-check-circle text-success me-2"></i>
                                        Libres
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setFiltroEstado('ocupada')}>
                                        <i className="fas fa-users text-danger me-2"></i>
                                        Ocupadas
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setFiltroEstado('cuenta_solicitada')}>
                                        <i className="fas fa-credit-card text-warning me-2"></i>
                                        Cuenta Solicitada
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                            
                            <Button 
                                variant="info" 
                                size="sm"
                                onClick={() => navigate('/dashboard/mozo/historial')}
                                className="flex-fill flex-sm-shrink-0"
                            >
                                <i className="fas fa-history me-1"></i>
                                <span className="d-none d-sm-inline">Historial</span>
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Estadísticas rápidas */}
            {estadisticas && (
                <Row className="mb-4">
                    <Col xs={6} md={3} className="mb-3">
                        <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                            <Card.Body className="text-center py-3">
                                <i className="fas fa-check-circle fa-lg fa-md-2x text-success mb-2"></i>
                                <div className="h5 h4-md mb-0">{estadisticas.libres}</div>
                                <div className="text-muted small d-none d-sm-block">Mesas Libres</div>
                                <div className="text-muted small d-sm-none">Libres</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} md={3} className="mb-3">
                        <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
                            <Card.Body className="text-center py-3">
                                <i className="fas fa-users fa-lg fa-md-2x text-danger mb-2"></i>
                                <div className="h5 h4-md mb-0">{estadisticas.ocupadas}</div>
                                <div className="text-muted small d-none d-sm-block">Mesas Ocupadas</div>
                                <div className="text-muted small d-sm-none">Ocupadas</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} md={3} className="mb-3">
                        <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                            <Card.Body className="text-center py-3">
                                <i className="fas fa-credit-card fa-lg fa-md-2x text-warning mb-2"></i>
                                <div className="h5 h4-md mb-0">{estadisticas.cuenta_solicitada}</div>
                                <div className="text-muted small d-none d-sm-block">Cuentas Pendientes</div>
                                <div className="text-muted small d-sm-none">Pendientes</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col xs={6} md={3} className="mb-3">
                        <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                            <Card.Body className="text-center py-3">
                                <i className="fas fa-percentage fa-lg fa-md-2x text-info mb-2"></i>
                                <div className="h5 h4-md mb-0">{estadisticas.porcentaje_ocupacion}%</div>
                                <div className="text-muted small d-none d-sm-block">Ocupación</div>
                                <div className="text-muted small d-sm-none">%</div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Vista Grid */}
            {view === 'grid' && (
                <Row>
                    {mesas.map((mesa) => (
                        <Col xs={12} sm={6} md={4} lg={3} key={mesa.id} className="mb-4">
                            <Card 
                                className={`h-100 border-0 shadow-sm ${
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
                                    <h5 className="mb-2 fs-6 fs-md-5">Mesa {mesa.numero}</h5>
                                    <p className="text-muted mb-2 small">
                                        <i className="fas fa-users me-1"></i>
                                        <span className="d-none d-sm-inline">Hasta {mesa.capacidad} personas</span>
                                        <span className="d-sm-none">{mesa.capacidad} pers.</span>
                                    </p>
                                    
                                    {/* Badge de estado */}
                                    <Badge 
                                        bg={getEstadoColor(mesa.estado)} 
                                        className="mb-3"
                                    >
                                        {getEstadoText(mesa.estado)}
                                    </Badge>

                                    {/* Botones de acción */}
                                    <div className="d-grid gap-1">
                                        {getActionButton(mesa)}
                                    </div>

                                    {/* Información adicional */}
                                    {mesa.estado !== 'libre' && (
                                        <div className="mt-2 d-none d-sm-block">
                                            <small className="text-muted">
                                                Actualizada: {new Date(mesa.updated_at).toLocaleTimeString()}
                                            </small>
                                        </div>
                                    )}
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Vista Lista */}
            {view === 'list' && (
                <Row>
                    {mesas.map((mesa) => (
                        <Col key={mesa.id} className="mb-3">
                            <Card className="border-0 shadow-sm">
                                <Card.Body>
                                    <Row className="align-items-center">
                                        <Col md={2}>
                                            <div className="d-flex align-items-center">
                                                <div 
                                                    className={`rounded-circle me-3 d-flex align-items-center justify-content-center bg-${getEstadoColor(mesa.estado)} bg-opacity-15`}
                                                    style={{ width: '50px', height: '50px' }}
                                                >
                                                    <i className={`fas ${getEstadoIcon(mesa.estado)} text-${getEstadoColor(mesa.estado)}`}></i>
                                                </div>
                                                <div>
                                                    <h5 className="mb-0">Mesa {mesa.numero}</h5>
                                                    <small className="text-muted">{mesa.capacidad} personas</small>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col md={2}>
                                            <Badge bg={getEstadoColor(mesa.estado)}>
                                                {getEstadoText(mesa.estado)}
                                            </Badge>
                                        </Col>
                                        <Col md={3}>
                                            <small className="text-muted">
                                                Actualizada: {new Date(mesa.updated_at).toLocaleTimeString()}
                                            </small>
                                        </Col>
                                        <Col md={5}>
                                            <div className="d-flex gap-2 justify-content-end">
                                                {mesa.estado === 'libre' && (
                                                    <Button 
                                                        variant="success" 
                                                        size="sm"
                                                        onClick={() => handleTomarPedido(mesa)}
                                                    >
                                                        <i className="fas fa-plus me-1"></i>
                                                        Tomar Pedido
                                                    </Button>
                                                )}
                                                {mesa.estado === 'ocupada' && (
                                                    <>
                                                        <Button 
                                                            variant="primary" 
                                                            size="sm"
                                                            onClick={() => handleTomarPedido(mesa)}
                                                        >
                                                            <i className="fas fa-edit me-1"></i>
                                                            Agregar Items
                                                        </Button>
                                                        <Button 
                                                            variant="outline-info" 
                                                            size="sm"
                                                            onClick={() => handleVerPedidos(mesa)}
                                                        >
                                                            <i className="fas fa-eye me-1"></i>
                                                            Ver Pedidos
                                                        </Button>
                                                    </>
                                                )}
                                                {mesa.estado === 'cuenta_solicitada' && (
                                                    <>
                                                        <Button 
                                                            variant="warning" 
                                                            size="sm"
                                                            onClick={() => handleVerPedidos(mesa)}
                                                        >
                                                            <i className="fas fa-eye me-1"></i>
                                                            Ver Cuenta
                                                        </Button>
                                                        <Button 
                                                            variant="outline-success" 
                                                            size="sm"
                                                            onClick={() => handleCambiarEstadoMesa(mesa.id, 'libre')}
                                                        >
                                                            <i className="fas fa-check me-1"></i>
                                                            Marcar Libre
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </Col>
                                    </Row>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Mensaje si no hay mesas */}
            {mesas.length === 0 && (
                <Row>
                    <Col>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center py-5">
                                <i className="fas fa-table fa-3x text-muted mb-3"></i>
                                <h4>No hay mesas disponibles</h4>
                                <p className="text-muted">
                                    {filtroEstado === 'todos' 
                                        ? 'Contacta con el administrador para configurar las mesas.'
                                        : `No hay mesas con estado "${getEstadoText(filtroEstado)}".`
                                    }
                                </p>
                                {filtroEstado !== 'todos' && (
                                    <Button 
                                        variant="outline-primary"
                                        onClick={() => setFiltroEstado('todos')}
                                    >
                                        Ver todas las mesas
                                    </Button>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Modal de pedidos de mesa */}
            <Modal 
                show={showPedidosModal} 
                onHide={() => setShowPedidosModal(false)} 
                size="lg"
                fullscreen="sm-down"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-table me-2"></i>
                        Mesa {mesaSeleccionada?.numero} - Pedidos
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {loadingPedidos ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" />
                            <p className="mt-2">Cargando pedidos...</p>
                        </div>
                    ) : pedidosMesa.length > 0 ? (
                        <>
                            <div className="mb-3">
                                <strong>Estado de la mesa:</strong>
                                <Badge bg={getEstadoColor(mesaSeleccionada?.estado)} className="ms-2">
                                    {getEstadoText(mesaSeleccionada?.estado)}
                                </Badge>
                            </div>
                            
                            <ListGroup>
                                {pedidosMesa.map((pedido) => (
                                    <ListGroup.Item key={pedido.id}>
                                        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start">
                                            <div className="flex-grow-1 w-100">
                                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center mb-2">
                                                    <h6 className="mb-1 mb-sm-0">
                                                        <i className="fas fa-receipt me-2"></i>
                                                        <span className="d-none d-sm-inline">Pedido #{pedido.id}</span>
                                                        <span className="d-sm-none">#{pedido.id}</span>
                                                    </h6>
                                                    <div className="d-flex flex-wrap gap-2">
                                                        <Badge bg={getEstadoBadgeVariant(pedido.estado)} className="text-nowrap">
                                                            {getEstadoPedidoText(pedido.estado)}
                                                        </Badge>
                                                        <span className="text-success fw-bold text-nowrap">
                                                            ${parseFloat(pedido.total).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                                
                                                <div className="mb-2">
                                                    <div className="d-flex flex-column flex-sm-row gap-1 gap-sm-3">
                                                        <small className="text-muted">
                                                            <i className="fas fa-clock me-1"></i>
                                                            <span className="d-none d-sm-inline">
                                                                {new Date(pedido.created_at).toLocaleString()}
                                                            </span>
                                                            <span className="d-sm-none">
                                                                {new Date(pedido.created_at).toLocaleTimeString()}
                                                            </span>
                                                        </small>
                                                        {pedido.mozo && (
                                                            <small className="text-muted">
                                                                <i className="fas fa-user me-1"></i>
                                                                <span className="text-truncate" style={{ maxWidth: '100px' }}>
                                                                    {pedido.mozo.nombre}
                                                                </span>
                                                            </small>
                                                        )}
                                                    </div>
                                                </div>

                                                {pedido.detalles && pedido.detalles.length > 0 && (
                                                    <div className="mb-2">
                                                        <strong className="small">Productos:</strong>
                                                        <div className="mt-1">
                                                            {pedido.detalles.slice(0, 3).map((detalle, index) => (
                                                                <div key={index} className="d-flex justify-content-between align-items-center small text-muted">
                                                                    <span className="text-truncate me-2">
                                                                        • {detalle.cantidad}x {detalle.producto.nombre}
                                                                    </span>
                                                                    <span className="text-nowrap">
                                                                        S/${parseFloat(detalle.subtotal).toFixed(2)}
                                                                    </span>
                                                                </div>
                                                            ))}
                                                            {pedido.detalles.length > 3 && (
                                                                <div className="small text-muted">
                                                                    <span className="d-none d-sm-inline">
                                                                        + {pedido.detalles.length - 3} productos más
                                                                    </span>
                                                                    <span className="d-sm-none">
                                                                        +{pedido.detalles.length - 3} más
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}

                                                {pedido.observaciones && (
                                                    <div className="small">
                                                        <strong>Observaciones:</strong> {pedido.observaciones}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {pedido.estado === 'preparado' && (
                                            <div className="mt-2">
                                                <Button
                                                    variant="success"
                                                    size="sm"
                                                    onClick={() => {
                                                        // Marcar como entregado
                                                        pedidosService.changeStatus(pedido.id, 'entregado')
                                                            .then(() => {
                                                                toast.success('Pedido marcado como entregado');
                                                                fetchPedidosMesa(mesaSeleccionada.id);
                                                            })
                                                            .catch(() => {
                                                                toast.error('Error al actualizar pedido');
                                                            });
                                                    }}
                                                >
                                                    <i className="fas fa-check me-1"></i>
                                                    Marcar como Entregado
                                                </Button>
                                            </div>
                                        )}
                                    </ListGroup.Item>
                                ))}
                            </ListGroup>

                            <div className="mt-3 p-3 bg-light rounded">
                                <div className="d-flex justify-content-between align-items-center">
                                    <strong>Total de pedidos:</strong>
                                    <span>{pedidosMesa.length}</span>
                                </div>
                                <div className="d-flex justify-content-between align-items-center">
                                    <strong>Total general:</strong>
                                    <strong className="text-success">
                                        ${pedidosMesa.reduce((sum, pedido) => sum + parseFloat(pedido.total), 0).toFixed(2)}
                                    </strong>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-4">
                            <i className="fas fa-clipboard fa-3x text-muted mb-3"></i>
                            <h5>No hay pedidos</h5>
                            <p className="text-muted">Esta mesa no tiene pedidos registrados.</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPedidosModal(false)}>
                        Cerrar
                    </Button>
                    {mesaSeleccionada && mesaSeleccionada.estado !== 'cuenta_solicitada' && (
                        <Button 
                            variant="primary" 
                            onClick={() => {
                                setShowPedidosModal(false);
                                handleTomarPedido(mesaSeleccionada);
                            }}
                        >
                            <i className="fas fa-plus me-2"></i>
                            {mesaSeleccionada.estado === 'libre' ? 'Tomar Pedido' : 'Agregar Items'}
                        </Button>
                    )}
                    {mesaSeleccionada && mesaSeleccionada.estado === 'cuenta_solicitada' && (
                        <Button 
                            variant="warning"
                            onClick={() => {
                                toast.info('Redirigiendo a cajero para procesar pago');
                                setShowPedidosModal(false);
                            }}
                        >
                            <i className="fas fa-credit-card me-2"></i>
                            Procesar Pago
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default MesasView;