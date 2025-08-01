import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, Button, Badge, Form, 
    ListGroup, Modal, Spinner, Alert 
} from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import { productosService, pedidosService, mesasService } from '../../services/api';
import toast from 'react-hot-toast';

const PedidosForm = () => {
    const { mesaId } = useParams();
    const navigate = useNavigate();
    
    const [mesa, setMesa] = useState(null);
    const [productos, setProductos] = useState([]);
    const [carrito, setCarrito] = useState([]);
    const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('all');
    const [loading, setLoading] = useState(true);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [observaciones, setObservaciones] = useState('');
    const [procesando, setProcesando] = useState(false);

    useEffect(() => {
        fetchMesa();
        fetchProductos();
    }, [mesaId]);

    const fetchMesa = async () => {
        try {
            const response = await mesasService.getById(mesaId);
            setMesa(response.data.data);
        } catch (error) {
            console.error('Error fetching mesa:', error);
            toast.error('Error al cargar información de la mesa');
            navigate('/dashboard/mozo');
        }
    };

    const fetchProductos = async () => {
        try {
            const response = await productosService.getAvailable();
            setProductos(response.data.data);
        } catch (error) {
            console.error('Error fetching productos:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const agregarAlCarrito = (producto) => {
        const itemExistente = carrito.find(item => item.id === producto.id);
        
        if (itemExistente) {
            setCarrito(carrito.map(item =>
                item.id === producto.id
                    ? { ...item, cantidad: item.cantidad + 1 }
                    : item
            ));
        } else {
            setCarrito([...carrito, { ...producto, cantidad: 1 }]);
        }
        
        toast.success(`${producto.nombre} agregado al pedido`);
    };

    const removerDelCarrito = (productoId) => {
        setCarrito(carrito.filter(item => item.id !== productoId));
    };

    const cambiarCantidad = (productoId, nuevaCantidad) => {
        if (nuevaCantidad <= 0) {
            removerDelCarrito(productoId);
            return;
        }
        
        setCarrito(carrito.map(item =>
            item.id === productoId
                ? { ...item, cantidad: nuevaCantidad }
                : item
        ));
    };

    const calcularTotal = () => {
        return carrito.reduce((total, item) => {
            return total + (parseFloat(item.precio) * item.cantidad);
        }, 0);
    };

    const handleConfirmarPedido = () => {
        if (carrito.length === 0) {
            toast.error('Agrega productos al pedido');
            return;
        }
        setShowConfirmModal(true);
    };

    const procesarPedido = async () => {
        setProcesando(true);
        
        try {
            const pedidoData = {
                mesa_id: parseInt(mesaId),
                productos: carrito.map(item => ({
                    producto_id: item.id,
                    cantidad: item.cantidad
                })),
                observaciones
            };

            await pedidosService.create(pedidoData);
            
            toast.success('Pedido enviado a cocina exitosamente');
            setShowConfirmModal(false);
            navigate('/dashboard/mozo');
            
        } catch (error) {
            console.error('Error creating pedido:', error);
            const errorMessage = error.response?.data?.error || 'Error al procesar pedido';
            toast.error(errorMessage);
        } finally {
            setProcesando(false);
        }
    };

    const getCategorias = () => {
        const categoriasUnicas = [...new Set(
            productos.flatMap(cat => cat.categoria ? [cat.categoria.nombre] : [])
        )];
        return categoriasUnicas;
    };

    const getProductosFiltrados = () => {
        if (categoriaSeleccionada === 'all') {
            return productos;
        }
        return productos.filter(cat => 
            cat.categoria && cat.categoria.nombre === categoriaSeleccionada
        );
    };

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Cargando productos...</p>
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
                            <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => navigate('/dashboard/mozo')}
                                className="me-3"
                            >
                                <i className="fas fa-arrow-left me-1"></i>
                                Volver
                            </Button>
                            <span>
                                <h2 className="d-inline mb-0">Mesa {mesa?.numero}</h2>
                                <Badge bg="info" className="ms-2">
                                    {mesa?.capacidad} personas
                                </Badge>
                            </span>
                        </div>
                        <Badge bg="success" className="px-3 py-2">
                            <i className="fas fa-utensils me-1"></i>
                            Tomar Pedido
                        </Badge>
                    </div>
                </Col>
            </Row>

            <Row>
                {/* Panel de productos */}
                <Col lg={8}>
                    {/* Filtros de categoría */}
                    <Card className="border-0 shadow-sm mb-4">
                        <Card.Body>
                            <div className="d-flex flex-wrap gap-2">
                                <Button
                                    variant={categoriaSeleccionada === 'all' ? 'primary' : 'outline-primary'}
                                    size="sm"
                                    onClick={() => setCategoriaSeleccionada('all')}
                                >
                                    Todos
                                </Button>
                                {getCategorias().map(categoria => (
                                    <Button
                                        key={categoria}
                                        variant={categoriaSeleccionada === categoria ? 'primary' : 'outline-primary'}
                                        size="sm"
                                        onClick={() => setCategoriaSeleccionada(categoria)}
                                    >
                                        {categoria}
                                    </Button>
                                ))}
                            </div>
                        </Card.Body>
                    </Card>

                    {/* Grid de productos */}
                    <Row>
                        {getProductosFiltrados().map(categoriaData => 
                            categoriaData.productos?.map(producto => (
                                <Col lg={4} md={6} key={producto.id} className="mb-3">
                                    <Card 
                                        className="h-100 border-0 shadow-sm cursor-pointer"
                                        onClick={() => agregarAlCarrito(producto)}
                                        style={{ transition: 'transform 0.2s' }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <Card.Body>
                                            <div className="d-flex justify-content-between align-items-start mb-2">
                                                <h6 className="mb-0">{producto.nombre}</h6>
                                                <Badge bg="success">${producto.precio}</Badge>
                                            </div>
                                            {producto.descripcion && (
                                                <p className="text-muted small mb-2">
                                                    {producto.descripcion}
                                                </p>
                                            )}
                                            <div className="text-center">
                                                <Button variant="outline-primary" size="sm">
                                                    <i className="fas fa-plus me-1"></i>
                                                    Agregar
                                                </Button>
                                            </div>
                                        </Card.Body>
                                    </Card>
                                </Col>
                            ))
                        )}
                    </Row>

                    {getProductosFiltrados().length === 0 && (
                        <Alert variant="info">
                            <i className="fas fa-info-circle me-2"></i>
                            No hay productos disponibles en esta categoría.
                        </Alert>
                    )}
                </Col>

                {/* Panel del carrito */}
                <Col lg={4}>
                    <Card className="border-0 shadow-sm sticky-top" style={{ top: '20px' }}>
                        <Card.Header className="bg-primary text-white">
                            <h5 className="mb-0">
                                <i className="fas fa-shopping-cart me-2"></i>
                                Pedido Mesa {mesa?.numero}
                            </h5>
                        </Card.Header>
                        <Card.Body>
                            {carrito.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    <i className="fas fa-cart-plus fa-2x mb-3"></i>
                                    <p>Selecciona productos para agregar al pedido</p>
                                </div>
                            ) : (
                                <>
                                    <ListGroup variant="flush">
                                        {carrito.map(item => (
                                            <ListGroup.Item key={item.id} className="px-0">
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <div className="flex-grow-1">
                                                        <h6 className="mb-1">{item.nombre}</h6>
                                                        <small className="text-muted">
                                                            ${item.precio} c/u
                                                        </small>
                                                    </div>
                                                    <div className="d-flex align-items-center">
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={() => cambiarCantidad(item.id, item.cantidad - 1)}
                                                        >
                                                            -
                                                        </Button>
                                                        <span className="mx-2 fw-bold">{item.cantidad}</span>
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            onClick={() => cambiarCantidad(item.id, item.cantidad + 1)}
                                                        >
                                                            +
                                                        </Button>
                                                        <Button
                                                            variant="outline-danger"
                                                            size="sm"
                                                            className="ms-2"
                                                            onClick={() => removerDelCarrito(item.id)}
                                                        >
                                                            <i className="fas fa-trash"></i>
                                                        </Button>
                                                    </div>
                                                </div>
                                                <div className="text-end mt-1">
                                                    <strong>${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</strong>
                                                </div>
                                            </ListGroup.Item>
                                        ))}
                                    </ListGroup>
                                    
                                    <hr />
                                    
                                    <div className="d-flex justify-content-between align-items-center mb-3">
                                        <h5 className="mb-0">Total:</h5>
                                        <h4 className="mb-0 text-primary">
                                            ${calcularTotal().toFixed(2)}
                                        </h4>
                                    </div>
                                    
                                    <Form.Group className="mb-3">
                                        <Form.Label>Observaciones</Form.Label>
                                        <Form.Control
                                            as="textarea"
                                            rows={2}
                                            placeholder="Notas especiales para cocina..."
                                            value={observaciones}
                                            onChange={(e) => setObservaciones(e.target.value)}
                                        />
                                    </Form.Group>
                                    
                                    <div className="d-grid gap-2">
                                        <Button
                                            variant="success"
                                            size="lg"
                                            onClick={handleConfirmarPedido}
                                        >
                                            <i className="fas fa-paper-plane me-2"></i>
                                            Enviar a Cocina
                                        </Button>
                                        <Button
                                            variant="outline-danger"
                                            onClick={() => setCarrito([])}
                                        >
                                            <i className="fas fa-trash me-2"></i>
                                            Limpiar Pedido
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Modal de confirmación */}
            <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirmar Pedido</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Mesa {mesa?.numero}</strong>
                        <br />
                        <small className="text-muted">
                            {carrito.length} producto{carrito.length !== 1 ? 's' : ''}
                        </small>
                    </div>
                    
                    <ListGroup variant="flush" className="mb-3">
                        {carrito.map(item => (
                            <ListGroup.Item key={item.id} className="px-0">
                                <div className="d-flex justify-content-between">
                                    <span>{item.cantidad}x {item.nombre}</span>
                                    <span>${(parseFloat(item.precio) * item.cantidad).toFixed(2)}</span>
                                </div>
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                    
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <strong>Total:</strong>
                        <strong className="text-primary">${calcularTotal().toFixed(2)}</strong>
                    </div>
                    
                    {observaciones && (
                        <div className="mb-3">
                            <strong>Observaciones:</strong>
                            <p className="text-muted mb-0">{observaciones}</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={procesarPedido}
                        disabled={procesando}
                    >
                        {procesando ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check me-2"></i>
                                Confirmar Pedido
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PedidosForm;