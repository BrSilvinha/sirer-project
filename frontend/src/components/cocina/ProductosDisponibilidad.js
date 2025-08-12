import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Form, 
    Spinner, InputGroup, Modal
} from 'react-bootstrap';
import { productosService } from '../../services/api';
import toast from 'react-hot-toast';

const ProductosDisponibilidad = () => {
    const [productos, setProductos] = useState([]);
    const [productosOriginales, setProductosOriginales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        categoria: 'todas',
        estado: 'todos',
        busqueda: ''
    });
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        disponibles: 0,
        agotados: 0,
        cambios_hoy: 0
    });
    const [showHistorialModal, setShowHistorialModal] = useState(false);
    const [actualizando, setActualizando] = useState(new Set());

    // ✅ Definir funciones ANTES de los useEffect
    const fetchProductos = useCallback(async () => {
        try {
            setLoading(true);
            const response = await productosService.getAll();
            const productosData = response.data.data;
            
            setProductosOriginales(productosData);
            
            // Calcular estadísticas
            const stats = {
                total: productosData.length,
                disponibles: productosData.filter(p => p.disponible).length,
                agotados: productosData.filter(p => !p.disponible).length,
                cambios_hoy: Math.floor(Math.random() * 8) + 2 // Mock para demo
            };
            setEstadisticas(stats);
            
        } catch (error) {
            console.error('Error fetching productos:', error);
            toast.error('Error al cargar productos');
        } finally {
            setLoading(false);
        }
    }, []);

    const aplicarFiltros = useCallback(() => {
        let productosFiltrados = [...productosOriginales];

        // Filtro por categoría
        if (filtros.categoria !== 'todas') {
            productosFiltrados = productosFiltrados.filter(p => 
                p.categoria?.id.toString() === filtros.categoria
            );
        }

        // Filtro por estado
        if (filtros.estado !== 'todos') {
            productosFiltrados = productosFiltrados.filter(p => 
                filtros.estado === 'disponibles' ? p.disponible : !p.disponible
            );
        }

        // Filtro por búsqueda
        if (filtros.busqueda) {
            productosFiltrados = productosFiltrados.filter(p => 
                p.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase())
            );
        }

        setProductos(productosFiltrados);
    }, [filtros, productosOriginales]);

    // ✅ useEffect DESPUÉS de definir las funciones
    useEffect(() => {
        fetchProductos();
        // Auto-refresh cada 30 segundos
        const interval = setInterval(fetchProductos, 30000);
        return () => clearInterval(interval);
    }, [fetchProductos]);

    useEffect(() => {
        aplicarFiltros();
    }, [aplicarFiltros, productosOriginales]);

    const handleToggleDisponibilidad = useCallback(async (producto) => {
        const nuevoEstado = !producto.disponible;
        setActualizando(prev => new Set([...prev, producto.id]));
        
        try {
            await productosService.changeAvailability(producto.id, nuevoEstado);
            
            // Actualizar localmente
            setProductosOriginales(prev => 
                prev.map(p => 
                    p.id === producto.id 
                        ? { ...p, disponible: nuevoEstado }
                        : p
                )
            );

            // Actualizar estadísticas
            setEstadisticas(prev => ({
                ...prev,
                disponibles: nuevoEstado ? prev.disponibles + 1 : prev.disponibles - 1,
                agotados: nuevoEstado ? prev.agotados - 1 : prev.agotados + 1,
                cambios_hoy: prev.cambios_hoy + 1
            }));

            toast.success(
                `S/{producto.nombre} marcado como S/{nuevoEstado ? 'DISPONIBLE' : 'AGOTADO'}`,
                { 
                    duration: 4000,
                    icon: nuevoEstado ? '✅' : '❌'
                }
            );
            
        } catch (error) {
            console.error('Error updating availability:', error);
            toast.error('Error al actualizar disponibilidad');
        } finally {
            setActualizando(prev => {
                const newSet = new Set(prev);
                newSet.delete(producto.id);
                return newSet;
            });
        }
    }, []);

    const handleToggleMultiple = useCallback(async (productosIds, nuevoEstado) => {
        const promises = productosIds.map(id => {
            const producto = productosOriginales.find(p => p.id === id);
            if (producto && producto.disponible !== nuevoEstado) {
                return handleToggleDisponibilidad(producto);
            }
            return Promise.resolve();
        });

        try {
            await Promise.all(promises);
            toast.success(`S/{productosIds.length} productos actualizados`);
        } catch (error) {
            toast.error('Error actualizando productos');
        }
    }, [productosOriginales, handleToggleDisponibilidad]);

    const handleFiltroChange = useCallback((campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }));
    }, []);

    const handleLimpiarFiltros = useCallback(() => {
        setFiltros({
            categoria: 'todas',
            estado: 'todos',
            busqueda: ''
        });
    }, []);

    const getCategoriaColor = useCallback((categoria) => {
        const colors = {
            'Bebidas': 'info',
            'Entradas': 'warning',
            'Platos Principales': 'success',
            'Postres': 'secondary'
        };
        return colors[categoria] || 'primary';
    }, []);

    const getCategorias = useCallback(() => {
        const categoriasUnicas = [...new Set(
            productosOriginales.map(p => p.categoria?.nombre).filter(Boolean)
        )];
        return categoriasUnicas;
    }, [productosOriginales]);

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="warning" />
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
                            <h2 className="mb-1">
                                <i className="fas fa-utensils text-warning me-2"></i>
                                Control de Productos - Cocina
                            </h2>
                            <p className="text-muted mb-0">
                                Gestiona la disponibilidad de productos en tiempo real
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-info"
                                size="sm"
                                onClick={() => setShowHistorialModal(true)}
                            >
                                <i className="fas fa-history me-1"></i>
                                Historial
                            </Button>
                            <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={fetchProductos}
                            >
                                <i className="fas fa-sync-alt me-1"></i>
                                Actualizar
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Estadísticas */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                        <Card.Body className="text-center">
                            <i className="fas fa-utensils fa-2x text-primary mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.total}</div>
                            <div className="text-muted small">Total Productos</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                        <Card.Body className="text-center">
                            <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.disponibles}</div>
                            <div className="text-muted small">Disponibles</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-danger bg-opacity-10">
                        <Card.Body className="text-center">
                            <i className="fas fa-times-circle fa-2x text-danger mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.agotados}</div>
                            <div className="text-muted small">Agotados</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                        <Card.Body className="text-center">
                            <i className="fas fa-exchange-alt fa-2x text-warning mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.cambios_hoy}</div>
                            <div className="text-muted small">Cambios Hoy</div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filtros y acciones rápidas */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="align-items-end g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Categoría</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.categoria}
                                    onChange={(e) => handleFiltroChange('categoria', e.target.value)}
                                >
                                    <option value="todas">Todas las categorías</option>
                                    {getCategorias().map(categoria => (
                                        <option key={categoria} value={categoria}>
                                            {categoria}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Estado</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.estado}
                                    onChange={(e) => handleFiltroChange('estado', e.target.value)}
                                >
                                    <option value="todos">Todos</option>
                                    <option value="disponibles">Solo disponibles</option>
                                    <option value="agotados">Solo agotados</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Buscar producto</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control
                                        placeholder="Nombre del producto..."
                                        value={filtros.busqueda}
                                        onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                                    />
                                    <Button variant="outline-secondary">
                                        <i className="fas fa-search"></i>
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={2}>
                            <div className="d-grid gap-1">
                                <Button 
                                    variant="outline-primary" 
                                    size="sm"
                                    onClick={handleLimpiarFiltros}
                                >
                                    <i className="fas fa-undo me-1"></i>
                                    Limpiar
                                </Button>
                            </div>
                        </Col>
                    </Row>

                    {/* Acciones rápidas */}
                    <div className="mt-3 pt-3 border-top">
                        <div className="d-flex gap-2 flex-wrap">
                            <Button 
                                variant="outline-success" 
                                size="sm"
                                onClick={() => handleToggleMultiple(
                                    productos.filter(p => !p.disponible).map(p => p.id), 
                                    true
                                )}
                            >
                                <i className="fas fa-check-circle me-1"></i>
                                Marcar Todos Disponibles
                            </Button>
                            <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={() => handleToggleMultiple(
                                    productos.filter(p => p.disponible).map(p => p.id), 
                                    false
                                )}
                            >
                                <i className="fas fa-times-circle me-1"></i>
                                Marcar Todos Agotados
                            </Button>
                            <Badge bg="info" className="px-3 py-2">
                                <i className="fas fa-filter me-1"></i>
                                Mostrando {productos.length} de {estadisticas.total}
                            </Badge>
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Lista de productos */}
            {productos.length === 0 ? (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="text-center py-5">
                        <i className="fas fa-search fa-3x text-muted mb-3"></i>
                        <h4>No se encontraron productos</h4>
                        <p className="text-muted">
                            Ajusta los filtros para ver más productos
                        </p>
                        <Button variant="outline-primary" onClick={handleLimpiarFiltros}>
                            Mostrar todos los productos
                        </Button>
                    </Card.Body>
                </Card>
            ) : (
                <Row>
                    {productos.map((producto) => (
                        <Col lg={3} md={4} sm={6} key={producto.id} className="mb-4">
                            <Card 
                                className={`h-100 border-0 shadow-sm S/{
                                    producto.disponible 
                                        ? 'border-success border-2' 
                                        : 'border-danger border-2'
                                }`}
                                style={{ borderStyle: 'solid !important' }}
                            >
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <Badge 
                                            bg={getCategoriaColor(producto.categoria?.nombre)}
                                            className="mb-2"
                                        >
                                            {producto.categoria?.nombre}
                                        </Badge>
                                        <div className={`rounded-circle S/{
                                            producto.disponible ? 'bg-success' : 'bg-danger'
                                        }`} style={{ width: '12px', height: '12px' }}></div>
                                    </div>
                                    
                                    <h5 className="mb-2">{producto.nombre}</h5>
                                    
                                    {producto.descripcion && (
                                        <p className="text-muted small mb-3">
                                            {producto.descripcion}
                                        </p>
                                    )}
                                    
                                    <div className="mb-3">
                                        <span className="h5 text-success mb-0">
                                            S/{parseFloat(producto.precio).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="mb-3">
                                        <Badge 
                                            bg={producto.disponible ? "success" : "danger"}
                                            className="w-100 py-2"
                                        >
                                            <i className={`fas S/{
                                                producto.disponible ? 'fa-check-circle' : 'fa-times-circle'
                                            } me-2`}></i>
                                            {producto.disponible ? "DISPONIBLE" : "AGOTADO"}
                                        </Badge>
                                    </div>

                                    <div className="d-grid">
                                        <Button
                                            variant={producto.disponible ? "danger" : "success"}
                                            onClick={() => handleToggleDisponibilidad(producto)}
                                            disabled={actualizando.has(producto.id)}
                                            className="fw-bold"
                                        >
                                            {actualizando.has(producto.id) ? (
                                                <>
                                                    <Spinner animation="border" size="sm" className="me-2" />
                                                    Actualizando...
                                                </>
                                            ) : (
                                                <>
                                                    <i className={`fas S/{
                                                        producto.disponible ? 'fa-ban' : 'fa-check'
                                                    } me-2`}></i>
                                                    {producto.disponible ? 'Marcar Agotado' : 'Marcar Disponible'}
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Modal de historial (placeholder) */}
            <Modal show={showHistorialModal} onHide={() => setShowHistorialModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-history me-2"></i>
                        Historial de Cambios
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center py-4">
                        <i className="fas fa-clock fa-3x text-muted mb-3"></i>
                        <h5>Funcionalidad en desarrollo</h5>
                        <p className="text-muted">
                            Próximamente podrás ver el historial completo de cambios de disponibilidad.
                        </p>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowHistorialModal(false)}>
                        Cerrar
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default ProductosDisponibilidad;