import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, 
    Spinner, Modal, ButtonGroup, Dropdown
} from 'react-bootstrap';
import { pedidosService, productosService } from '../../services/api';
import toast from 'react-hot-toast';

const PedidosCocina = () => {
    const [pedidos, setPedidos] = useState([]);
    const [productos, setProductos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('activos'); // 'activos', 'todos'
    const [ordenamiento, setOrdenamiento] = useState('mas_antiguos'); // 'mas_antiguos', 'mas_recientes'
    const [showDisponibilidadModal, setShowDisponibilidadModal] = useState(false);
    const [actualizandoEstado, setActualizandoEstado] = useState(null);
    const [estadisticas, setEstadisticas] = useState({
        nuevos: 0,
        en_cocina: 0,
        preparados: 0,
        total_activos: 0
    });

    // Sonidos de notificación (simulados con logs por ahora)
    const playNotificationSound = useCallback(() => {
        // En producción, aquí iría la lógica para reproducir sonido
        console.log('🔔 Nuevo pedido recibido - Sonido de notificación');
    }, []);

    const fetchPedidos = useCallback(async () => {
        try {
            const response = await pedidosService.getCocina();
            let pedidosData = response.data.data;

            // Aplicar filtros
            if (filtroEstado === 'activos') {
                pedidosData = pedidosData.filter(p => 
                    ['nuevo', 'en_cocina', 'preparado'].includes(p.estado)
                );
            }

            // Aplicar ordenamiento
            if (ordenamiento === 'mas_antiguos') {
                pedidosData.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            } else {
                pedidosData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            }

            // Detectar nuevos pedidos para notificación
            const pedidosAnteriores = pedidos.map(p => p.id);
            const nuevosIds = pedidosData
                .filter(p => p.estado === 'nuevo' && !pedidosAnteriores.includes(p.id))
                .map(p => p.id);

            if (nuevosIds.length > 0 && pedidos.length > 0) {
                playNotificationSound();
                toast.success(`S/{nuevosIds.length} nuevo(s) pedido(s) recibido(s)!`, {
                    duration: 6000,
                    icon: '🔔'
                });
            }

            setPedidos(pedidosData);
            
            // Calcular estadísticas
            const stats = {
                nuevos: pedidosData.filter(p => p.estado === 'nuevo').length,
                en_cocina: pedidosData.filter(p => p.estado === 'en_cocina').length,
                preparados: pedidosData.filter(p => p.estado === 'preparado').length,
                total_activos: pedidosData.filter(p => 
                    ['nuevo', 'en_cocina', 'preparado'].includes(p.estado)
                ).length
            };
            setEstadisticas(stats);

        } catch (error) {
            console.error('Error fetching pedidos cocina:', error);
            toast.error('Error al cargar pedidos');
        } finally {
            setLoading(false);
        }
    }, [filtroEstado, ordenamiento, pedidos, playNotificationSound]);

    const fetchProductos = useCallback(async () => {
        try {
            const response = await productosService.getAll();
            setProductos(response.data.data);
        } catch (error) {
            console.error('Error fetching productos:', error);
        }
    }, []);

    useEffect(() => {
        fetchPedidos();
        fetchProductos();
        
        // Auto-refresh cada 10 segundos para cocina
        const interval = setInterval(fetchPedidos, 10000);
        return () => clearInterval(interval);
    }, [fetchPedidos, fetchProductos]);

    const handleCambiarEstadoPedido = useCallback(async (pedidoId, nuevoEstado) => {
        setActualizandoEstado(pedidoId);
        try {
            await pedidosService.changeStatus(pedidoId, nuevoEstado);
            
            const mensajes = {
                en_cocina: 'Pedido tomado - En preparación',
                preparado: 'Pedido listo - Avisar al mozo',
                entregado: 'Pedido marcado como entregado'
            };
            
            toast.success(mensajes[nuevoEstado] || 'Estado actualizado');
            fetchPedidos();
        } catch (error) {
            console.error('Error updating pedido status:', error);
            toast.error('Error al actualizar el estado del pedido');
        } finally {
            setActualizandoEstado(null);
        }
    }, [fetchPedidos]);

    const handleCambiarDisponibilidadProducto = useCallback(async (productoId, disponible) => {
        try {
            await productosService.changeAvailability(productoId, disponible);
            const producto = productos.find(p => p.id === productoId);
            
            toast.success(
                `S/{producto?.nombre} marcado como S/{disponible ? 'disponible' : 'agotado'}`,
                { duration: 4000 }
            );
            
            fetchProductos();
            setShowDisponibilidadModal(false);
        } catch (error) {
            console.error('Error updating product availability:', error);
            toast.error('Error al actualizar disponibilidad del producto');
        }
    }, [productos, fetchProductos]);

    const getEstadoColor = useCallback((estado) => {
        const colors = {
            nuevo: 'danger',      // Rojo - Urgente
            en_cocina: 'warning', // Amarillo - En proceso
            preparado: 'success', // Verde - Listo
            entregado: 'secondary' // Gris - Completado
        };
        return colors[estado] || 'secondary';
    }, []);

    const getEstadoIcon = useCallback((estado) => {
        const icons = {
            nuevo: 'fa-exclamation-circle',
            en_cocina: 'fa-fire',
            preparado: 'fa-check-circle',
            entregado: 'fa-handshake'
        };
        return icons[estado] || 'fa-circle';
    }, []);

    const getEstadoText = useCallback((estado) => {
        const texts = {
            nuevo: 'NUEVO',
            en_cocina: 'EN COCINA',
            preparado: 'PREPARADO',
            entregado: 'ENTREGADO'
        };
        return texts[estado] || estado.toUpperCase();
    }, []);

    const calcularTiempoTranscurrido = useCallback((fecha) => {
        const ahora = new Date();
        const inicio = new Date(fecha);
        const diferencia = Math.floor((ahora - inicio) / 1000 / 60); // minutos
        
        if (diferencia < 1) return 'Recién llegado';
        if (diferencia < 60) return `S/{diferencia} min`;
        
        const horas = Math.floor(diferencia / 60);
        const minutos = diferencia % 60;
        return `S/{horas}h S/{minutos}m`;
    }, []);

    const getProximoEstado = useCallback((estadoActual) => {
        const flujo = {
            nuevo: 'en_cocina',
            en_cocina: 'preparado',
            preparado: 'entregado'
        };
        return flujo[estadoActual];
    }, []);

    const getTextoBotonAccion = useCallback((estado) => {
        const textos = {
            nuevo: 'Tomar Pedido',
            en_cocina: 'Marcar Listo',
            preparado: 'Confirmar Entrega'
        };
        return textos[estado] || 'Procesar';
    }, []);

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="warning" size="lg" />
                    <p className="mt-3 h5">Cargando pedidos de cocina...</p>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid>
            {/* Header con estadísticas */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h2 className="mb-1">
                                <i className="fas fa-fire text-warning me-2"></i>
                                Cocina - Pedidos Activos
                            </h2>
                            <p className="text-muted mb-0">
                                Gestiona todos los pedidos en preparación
                            </p>
                        </div>
                        
                        <div className="d-flex gap-2">
                            <Button
                                variant="outline-info"
                                size="sm"
                                onClick={() => setShowDisponibilidadModal(true)}
                            >
                                <i className="fas fa-utensils me-1"></i>
                                Productos
                            </Button>
                            
                            <Dropdown>
                                <Dropdown.Toggle variant="outline-secondary" size="sm">
                                    <i className="fas fa-filter me-1"></i>
                                    {filtroEstado === 'activos' ? 'Activos' : 'Todos'}
                                </Dropdown.Toggle>
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={() => setFiltroEstado('activos')}>
                                        <i className="fas fa-fire text-warning me-2"></i>
                                        Solo Activos
                                    </Dropdown.Item>
                                    <Dropdown.Item onClick={() => setFiltroEstado('todos')}>
                                        <i className="fas fa-list me-2"></i>
                                        Todos los Pedidos
                                    </Dropdown.Item>
                                </Dropdown.Menu>
                            </Dropdown>
                            
                            <ButtonGroup size="sm">
                                <Button 
                                    variant={ordenamiento === 'mas_antiguos' ? 'primary' : 'outline-primary'}
                                    onClick={() => setOrdenamiento('mas_antiguos')}
                                >
                                    <i className="fas fa-sort-numeric-up me-1"></i>
                                    Más Antiguos
                                </Button>
                                <Button 
                                    variant={ordenamiento === 'mas_recientes' ? 'primary' : 'outline-primary'}
                                    onClick={() => setOrdenamiento('mas_recientes')}
                                >
                                    <i className="fas fa-sort-numeric-down me-1"></i>
                                    Más Recientes
                                </Button>
                            </ButtonGroup>
                        </div>
                    </div>

                    {/* Estadísticas rápidas */}
                    <Row>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-exclamation-circle fa-2x text-danger mb-2"></i>
                                    <div className="h3 mb-0 text-danger">{estadisticas.nuevos}</div>
                                    <div className="small text-muted">Pedidos Nuevos</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-fire fa-2x text-warning mb-2"></i>
                                    <div className="h3 mb-0 text-warning">{estadisticas.en_cocina}</div>
                                    <div className="small text-muted">En Cocina</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                                    <div className="h3 mb-0 text-success">{estadisticas.preparados}</div>
                                    <div className="small text-muted">Preparados</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-clipboard-list fa-2x text-primary mb-2"></i>
                                    <div className="h3 mb-0 text-primary">{estadisticas.total_activos}</div>
                                    <div className="small text-muted">Total Activos</div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Lista de pedidos */}
            {pedidos.length === 0 ? (
                <Row>
                    <Col>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center py-5">
                                <i className="fas fa-utensils fa-4x text-muted mb-4"></i>
                                <h4>¡Todo al día! 🎉</h4>
                                <p className="text-muted mb-0">
                                    No hay pedidos pendientes en cocina.
                                </p>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Row>
                    {pedidos.map((pedido) => (
                        <Col lg={4} md={6} key={pedido.id} className="mb-4">
                            <Card 
                                className={`h-100 border-0 shadow-sm border-S/{getEstadoColor(pedido.estado)} border-3`}
                                style={{ 
                                    borderStyle: 'solid !important',
                                    borderWidth: '3px !important'
                                }}
                            >
                                <Card.Header className={`bg-S/{getEstadoColor(pedido.estado)} text-white`}>
                                    <Row className="align-items-center">
                                        <Col>
                                            <div className="d-flex align-items-center">
                                                <i className={`fas S/{getEstadoIcon(pedido.estado)} me-2`}></i>
                                                <div>
                                                    <h6 className="mb-0">
                                                        Pedido #{pedido.id} - Mesa {pedido.mesa?.numero}
                                                    </h6>
                                                    <small className="opacity-75">
                                                        {calcularTiempoTranscurrido(pedido.created_at)}
                                                    </small>
                                                </div>
                                            </div>
                                        </Col>
                                        <Col xs="auto">
                                            <Badge 
                                                bg="light" 
                                                text="dark" 
                                                className="px-2 py-1"
                                            >
                                                {getEstadoText(pedido.estado)}
                                            </Badge>
                                        </Col>
                                    </Row>
                                </Card.Header>

                                <Card.Body>
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong className="text-muted small">PRODUCTOS:</strong>
                                            <span className="badge bg-light text-dark">
                                                {pedido.detalles?.length || 0} items
                                            </span>
                                        </div>

                                        <div className="bg-light p-3 rounded">
                                            {pedido.detalles?.map((detalle, index) => (
                                                <div key={index} className="d-flex justify-content-between align-items-center mb-1">
                                                    <div>
                                                        <strong>{detalle.cantidad}x</strong>{' '}
                                                        <span className="text-dark">{detalle.producto?.nombre}</span>
                                                    </div>
                                                    <small className="text-muted">
                                                        S/{parseFloat(detalle.subtotal || 0).toFixed(2)}
                                                    </small>
                                                </div>
                                            )) || (
                                                <div className="text-muted text-center">
                                                    <i className="fas fa-box-open me-2"></i>
                                                    Sin detalles disponibles
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {pedido.observaciones && (
                                        <div className="mb-3">
                                            <strong className="text-muted small">OBSERVACIONES:</strong>
                                            <div className="bg-warning bg-opacity-10 p-2 rounded mt-1">
                                                <i className="fas fa-sticky-note text-warning me-2"></i>
                                                <span className="text-dark">{pedido.observaciones}</span>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between">
                                            <strong className="text-muted small">MOZO:</strong>
                                            <span>{pedido.mozo?.nombre || 'N/A'}</span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <strong className="text-muted small">TOTAL:</strong>
                                            <span className="h6 text-success mb-0">
                                                S/{parseFloat(pedido.total || 0).toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="d-flex justify-content-between">
                                            <strong className="text-muted small">HORA:</strong>
                                            <span>{new Date(pedido.created_at).toLocaleTimeString()}</span>
                                        </div>
                                    </div>

                                    {/* Botón de acción */}
                                    {getProximoEstado(pedido.estado) && (
                                        <div className="d-grid">
                                            <Button
                                                variant={getEstadoColor(getProximoEstado(pedido.estado))}
                                                size="lg"
                                                disabled={actualizandoEstado === pedido.id}
                                                onClick={() => handleCambiarEstadoPedido(
                                                    pedido.id, 
                                                    getProximoEstado(pedido.estado)
                                                )}
                                                className="fw-bold"
                                            >
                                                {actualizandoEstado === pedido.id ? (
                                                    <>
                                                        <Spinner animation="border" size="sm" className="me-2" />
                                                        Procesando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <i className={`fas S/{
                                                            getEstadoIcon(getProximoEstado(pedido.estado))
                                                        } me-2`}></i>
                                                        {getTextoBotonAccion(pedido.estado)}
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    )}
                                </Card.Body>

                                {/* Indicador de tiempo crítico */}
                                {pedido.estado === 'nuevo' && (
                                    <div className="position-absolute top-0 end-0 p-2">
                                        <div className="bg-danger rounded-circle" style={{ 
                                            width: '12px', 
                                            height: '12px',
                                            animation: 'pulse 2s infinite'
                                        }}></div>
                                    </div>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Modal de gestión de productos */}
            <Modal 
                show={showDisponibilidadModal} 
                onHide={() => setShowDisponibilidadModal(false)} 
                size="lg"
            >
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-utensils me-2"></i>
                        Gestión de Productos
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
                    <p className="text-muted mb-3">
                        Cambia la disponibilidad de productos cuando se agoten los ingredientes
                    </p>
                    
                    <Row>
                        {productos.map((producto) => (
                            <Col lg={6} key={producto.id} className="mb-3">
                                <Card className={`border-0 shadow-sm S/{
                                    producto.disponible ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'
                                }`}>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="mb-1">{producto.nombre}</h6>
                                                <small className="text-muted">
                                                    {producto.categoria?.nombre} - S/{producto.precio}
                                                </small>
                                            </div>
                                            <div className="d-flex align-items-center gap-2">
                                                <Badge 
                                                    bg={producto.disponible ? 'success' : 'danger'}
                                                    className="px-2 py-1"
                                                >
                                                    {producto.disponible ? 'Disponible' : 'Agotado'}
                                                </Badge>
                                                <Button
                                                    variant={producto.disponible ? 'outline-danger' : 'outline-success'}
                                                    size="sm"
                                                    onClick={() => handleCambiarDisponibilidadProducto(
                                                        producto.id,
                                                        !producto.disponible
                                                    )}
                                                >
                                                    <i className={`fas S/{
                                                        producto.disponible ? 'fa-times' : 'fa-check'
                                                    }`}></i>
                                                </Button>
                                            </div>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDisponibilidadModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* Estilos CSS para animaciones */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes pulse {
                        0% { opacity: 1; }
                        50% { opacity: 0.5; }
                        100% { opacity: 1; }
                    }
                    
                    .border-3 {
                        border-width: 3px !important;
                    }
                `
            }} />
        </Container>
    );
};

export default PedidosCocina;