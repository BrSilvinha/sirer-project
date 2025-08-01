import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Form, 
    Table, Pagination, Spinner, InputGroup, Modal 
} from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { pedidosService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const PedidosHistorial = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [pedidos, setPedidos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtros, setFiltros] = useState({
        estado: 'todos',
        fecha: 'todos', // Cambiado de 'hoy' a 'todos'
        busqueda: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [estadisticas, setEstadisticas] = useState(null);
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    const itemsPerPage = 10;

    // Mock data generator con datos más consistentes
    const generateMockPedidos = useCallback(async () => {
        const estados = ['nuevo', 'en_cocina', 'preparado', 'entregado', 'pagado'];
        const productos = [
            { nombre: 'Pizza Margarita', precio: 25.90 },
            { nombre: 'Hamburguesa', precio: 18.50 },
            { nombre: 'Coca Cola', precio: 3.50 },
            { nombre: 'Pasta Carbonara', precio: 22.00 },
            { nombre: 'Ensalada César', precio: 12.00 },
            { nombre: 'Café', precio: 4.00 },
            { nombre: 'Tiramisú', precio: 8.50 },
            { nombre: 'Agua Mineral', precio: 2.00 }
        ];

        const pedidos = [];
        
        // Generar pedidos más realistas con fechas distribuidas
        for (let i = 1; i <= 50; i++) {
            const fecha = new Date();
            const diasAtras = Math.floor(i / 5); // Distribuir en los últimos 10 días
            fecha.setDate(fecha.getDate() - diasAtras);
            fecha.setHours(10 + Math.floor(Math.random() * 12)); // Entre 10 AM y 10 PM
            fecha.setMinutes(Math.floor(Math.random() * 60));
            
            const numProductos = Math.floor(Math.random() * 4) + 1;
            const productosSeleccionados = [];
            let total = 0;

            // Seleccionar productos únicos para cada pedido
            const productosUsados = new Set();
            for (let j = 0; j < numProductos; j++) {
                let producto;
                do {
                    producto = productos[Math.floor(Math.random() * productos.length)];
                } while (productosUsados.has(producto.nombre) && productosUsados.size < productos.length);
                
                productosUsados.add(producto.nombre);
                const cantidad = Math.floor(Math.random() * 3) + 1;
                productosSeleccionados.push({
                    ...producto,
                    cantidad,
                    subtotal: producto.precio * cantidad
                });
                total += producto.precio * cantidad;
            }

            // Distribuir estados de forma más realista
            let estado;
            if (diasAtras === 0) {
                // Pedidos de hoy: mezcla de estados
                estado = estados[Math.floor(Math.random() * estados.length)];
            } else if (diasAtras <= 2) {
                // Pedidos recientes: principalmente pagados
                estado = Math.random() < 0.8 ? 'pagado' : estados[Math.floor(Math.random() * estados.length)];
            } else {
                // Pedidos antiguos: todos pagados
                estado = 'pagado';
            }

            pedidos.push({
                id: i,
                mesa: Math.floor(Math.random() * 10) + 1,
                estado: estado,
                fecha: fecha.toISOString(),
                productos: productosSeleccionados,
                total: total,
                observaciones: Math.random() > 0.8 ? 
                    ['Sin cebolla', 'Extra salsa', 'Término medio', 'Sin azúcar'][Math.floor(Math.random() * 4)] : 
                    null,
                mozo: user.nombre
            });
        }

        return pedidos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    }, [user.nombre]);

    const fetchPedidos = useCallback(async () => {
        try {
            setLoading(true);
            
            // Generar datos mock consistentes
            const pedidosData = await generateMockPedidos();
            
            // Aplicar filtros
            let pedidosFiltrados = pedidosData;
            
            if (filtros.estado !== 'todos') {
                pedidosFiltrados = pedidosFiltrados.filter(p => p.estado === filtros.estado);
            }
            
            if (filtros.fecha !== 'todos') {
                const ahora = new Date();
                if (filtros.fecha === 'hoy') {
                    const hoy = ahora.toDateString();
                    pedidosFiltrados = pedidosFiltrados.filter(p => 
                        new Date(p.fecha).toDateString() === hoy
                    );
                } else if (filtros.fecha === 'semana') {
                    const hace7Dias = new Date();
                    hace7Dias.setDate(hace7Dias.getDate() - 7);
                    pedidosFiltrados = pedidosFiltrados.filter(p => 
                        new Date(p.fecha) >= hace7Dias
                    );
                } else if (filtros.fecha === 'mes') {
                    const hace30Dias = new Date();
                    hace30Dias.setDate(hace30Dias.getDate() - 30);
                    pedidosFiltrados = pedidosFiltrados.filter(p => 
                        new Date(p.fecha) >= hace30Dias
                    );
                }
            }
            
            if (filtros.busqueda) {
                pedidosFiltrados = pedidosFiltrados.filter(p => 
                    p.mesa.toString().includes(filtros.busqueda) ||
                    p.id.toString().includes(filtros.busqueda)
                );
            }
            
            // Paginación
            const startIndex = (currentPage - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pedidosPaginados = pedidosFiltrados.slice(startIndex, endIndex);
            
            setPedidos(pedidosPaginados);
            setTotalPages(Math.ceil(pedidosFiltrados.length / itemsPerPage));
            
        } catch (error) {
            console.error('Error fetching pedidos:', error);
            toast.error('Error al cargar el historial');
        } finally {
            setLoading(false);
        }
    }, [filtros, currentPage, generateMockPedidos]);

    const fetchEstadisticas = useCallback(async () => {
        try {
            // Simular estadísticas realistas
            const pedidosData = await generateMockPedidos();
            const hoy = new Date().toDateString();
            const pedidosHoy = pedidosData.filter(p => 
                new Date(p.fecha).toDateString() === hoy
            );
            
            const completadosHoy = pedidosHoy.filter(p => 
                ['entregado', 'pagado'].includes(p.estado)
            ).length;
            
            const enProceso = pedidosHoy.filter(p => 
                ['nuevo', 'en_cocina', 'preparado'].includes(p.estado)
            ).length;
            
            const ingresosHoy = pedidosHoy
                .filter(p => p.estado === 'pagado')
                .reduce((sum, p) => sum + p.total, 0);

            setEstadisticas({
                total_hoy: pedidosHoy.length,
                completados_hoy: completadosHoy,
                en_proceso: enProceso,
                ingresos_hoy: ingresosHoy.toFixed(2)
            });
        } catch (error) {
            console.error('Error fetching estadísticas:', error);
        }
    }, [generateMockPedidos]);

    useEffect(() => {
        fetchPedidos();
        fetchEstadisticas();
    }, [fetchPedidos, fetchEstadisticas]);

    const handleVerDetalles = (pedido) => {
        setPedidoSeleccionado(pedido);
        setShowDetallesModal(true);
    };

    const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
        try {
            // Simular cambio de estado
            setPedidos(pedidos.map(p => 
                p.id === pedidoId ? { ...p, estado: nuevoEstado } : p
            ));
            toast.success('Estado actualizado correctamente');
        } catch (error) {
            toast.error('Error al actualizar estado');
        }
    };

    const handleFiltroChange = (campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }));
        setCurrentPage(1); // Resetear a la primera página
    };

    const handleLimpiarFiltros = () => {
        setFiltros({
            estado: 'todos',
            fecha: 'todos',
            busqueda: ''
        });
        setCurrentPage(1);
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

    if (loading && pedidos.length === 0) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Cargando historial...</p>
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
                            <h2 className="mb-1">Historial de Pedidos</h2>
                            <p className="text-muted mb-0">
                                Gestiona todos tus pedidos realizados
                            </p>
                        </div>
                        <Button 
                            variant="outline-primary" 
                            onClick={() => navigate('/dashboard/mozo')}
                        >
                            <i className="fas fa-arrow-left me-2"></i>
                            Volver a Mesas
                        </Button>
                    </div>
                </Col>
            </Row>

            {/* Estadísticas */}
            {estadisticas && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-receipt fa-2x text-primary mb-2"></i>
                                <div className="h4 mb-0">{estadisticas.total_hoy}</div>
                                <div className="text-muted small">Pedidos Hoy</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                                <div className="h4 mb-0">{estadisticas.completados_hoy}</div>
                                <div className="text-muted small">Completados</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-clock fa-2x text-warning mb-2"></i>
                                <div className="h4 mb-0">{estadisticas.en_proceso}</div>
                                <div className="text-muted small">En Proceso</div>
                            </Card.Body>
                        </Card>
                    </Col>
                    <Col md={3}>
                        <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                            <Card.Body className="text-center">
                                <i className="fas fa-dollar-sign fa-2x text-info mb-2"></i>
                                <div className="h4 mb-0">${estadisticas.ingresos_hoy}</div>
                                <div className="text-muted small">Ingresos Hoy</div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Filtros */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Estado</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.estado}
                                    onChange={(e) => handleFiltroChange('estado', e.target.value)}
                                >
                                    <option value="todos">Todos los estados</option>
                                    <option value="nuevo">Nuevos</option>
                                    <option value="en_cocina">En Cocina</option>
                                    <option value="preparado">Preparados</option>
                                    <option value="entregado">Entregados</option>
                                    <option value="pagado">Pagados</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Período</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.fecha}
                                    onChange={(e) => handleFiltroChange('fecha', e.target.value)}
                                >
                                    <option value="todos">Todos los pedidos</option>
                                    <option value="hoy">Hoy</option>
                                    <option value="semana">Última semana</option>
                                    <option value="mes">Último mes</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Buscar</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control
                                        placeholder="Mesa o ID de pedido..."
                                        value={filtros.busqueda}
                                        onChange={(e) => handleFiltroChange('busqueda', e.target.value)}
                                    />
                                    <Button variant="outline-secondary">
                                        <i className="fas fa-search"></i>
                                    </Button>
                                </InputGroup>
                            </Form.Group>
                        </Col>
                        <Col md={2} className="d-flex align-items-end">
                            <Button 
                                variant="outline-primary" 
                                size="sm" 
                                className="w-100"
                                onClick={handleLimpiarFiltros}
                            >
                                <i className="fas fa-undo me-1"></i>
                                Limpiar
                            </Button>
                        </Col>
                    </Row>
                </Card.Body>
            </Card>

            {/* Tabla de pedidos */}
            <Card className="border-0 shadow-sm">
                <Card.Header className="bg-white border-0">
                    <h5 className="mb-0">
                        <i className="fas fa-list me-2"></i>
                        Pedidos ({pedidos.length})
                    </h5>
                </Card.Header>
                <Card.Body className="p-0">
                    {loading ? (
                        <div className="text-center py-4">
                            <Spinner animation="border" size="sm" />
                            <span className="ms-2">Actualizando...</span>
                        </div>
                    ) : pedidos.length > 0 ? (
                        <div className="table-responsive">
                            <Table hover className="mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Mesa</th>
                                        <th>Estado</th>
                                        <th>Fecha/Hora</th>
                                        <th>Items</th>
                                        <th>Total</th>
                                        <th>Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidos.map((pedido) => (
                                        <tr key={pedido.id}>
                                            <td>
                                                <strong>#{pedido.id}</strong>
                                            </td>
                                            <td>
                                                <Badge bg="outline-primary">
                                                    Mesa {pedido.mesa}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={getEstadoColor(pedido.estado)}>
                                                    <i className={`fas ${getEstadoIcon(pedido.estado)} me-1`}></i>
                                                    {getEstadoText(pedido.estado)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div>
                                                    <div>{new Date(pedido.fecha).toLocaleDateString()}</div>
                                                    <small className="text-muted">
                                                        {new Date(pedido.fecha).toLocaleTimeString()}
                                                    </small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark">
                                                    {pedido.productos.length} item{pedido.productos.length !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td>
                                                <strong className="text-success">
                                                    ${pedido.total.toFixed(2)}
                                                </strong>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <Button
                                                        variant="outline-primary"
                                                        size="sm"
                                                        onClick={() => handleVerDetalles(pedido)}
                                                    >
                                                        <i className="fas fa-eye"></i>
                                                    </Button>
                                                    {pedido.estado === 'preparado' && (
                                                        <Button
                                                            variant="outline-success"
                                                            size="sm"
                                                            onClick={() => handleCambiarEstado(pedido.id, 'entregado')}
                                                        >
                                                            <i className="fas fa-check"></i>
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    ) : (
                        <div className="text-center py-5">
                            <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                            <h5>No hay pedidos</h5>
                            <p className="text-muted">No se encontraron pedidos con los filtros seleccionados.</p>
                            <Button variant="outline-primary" onClick={handleLimpiarFiltros}>
                                Mostrar todos los pedidos
                            </Button>
                        </div>
                    )}
                </Card.Body>
            </Card>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                        <Pagination.Prev 
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                        />
                        {[...Array(Math.min(5, totalPages))].map((_, index) => {
                            const startPage = Math.max(1, currentPage - 2);
                            const pageNumber = startPage + index;
                            
                            if (pageNumber <= totalPages) {
                                return (
                                    <Pagination.Item
                                        key={pageNumber}
                                        active={pageNumber === currentPage}
                                        onClick={() => setCurrentPage(pageNumber)}
                                    >
                                        {pageNumber}
                                    </Pagination.Item>
                                );
                            }
                            return null;
                        })}
                        <Pagination.Next 
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(currentPage + 1)}
                        />
                    </Pagination>
                </div>
            )}

            {/* Modal de detalles */}
            <Modal show={showDetallesModal} onHide={() => setShowDetallesModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-receipt me-2"></i>
                        Pedido #{pedidoSeleccionado?.id}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {pedidoSeleccionado && (
                        <>
                            <Row className="mb-4">
                                <Col md={6}>
                                    <div className="mb-3">
                                        <strong>Mesa:</strong> {pedidoSeleccionado.mesa}
                                    </div>
                                    <div className="mb-3">
                                        <strong>Estado:</strong>{' '}
                                        <Badge bg={getEstadoColor(pedidoSeleccionado.estado)}>
                                            {getEstadoText(pedidoSeleccionado.estado)}
                                        </Badge>
                                    </div>
                                    <div className="mb-3">
                                        <strong>Mozo:</strong> {pedidoSeleccionado.mozo}
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="mb-3">
                                        <strong>Fecha:</strong> {new Date(pedidoSeleccionado.fecha).toLocaleString()}
                                    </div>
                                    <div className="mb-3">
                                        <strong>Total:</strong>{' '}
                                        <span className="text-success h5">
                                            ${pedidoSeleccionado.total.toFixed(2)}
                                        </span>
                                    </div>
                                </Col>
                            </Row>

                            <h6>Productos:</h6>
                            <Table size="sm" className="mb-4">
                                <thead>
                                    <tr>
                                        <th>Producto</th>
                                        <th>Cantidad</th>
                                        <th>Precio</th>
                                        <th>Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pedidoSeleccionado.productos.map((producto, index) => (
                                        <tr key={index}>
                                            <td>{producto.nombre}</td>
                                            <td>{producto.cantidad}</td>
                                            <td>${producto.precio}</td>
                                            <td>${producto.subtotal.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>

                            {pedidoSeleccionado.observaciones && (
                                <div>
                                    <h6>Observaciones:</h6>
                                    <p className="text-muted">{pedidoSeleccionado.observaciones}</p>
                                </div>
                            )}
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDetallesModal(false)}>
                        Cerrar
                    </Button>
                    {pedidoSeleccionado?.estado === 'preparado' && (
                        <Button 
                            variant="success"
                            onClick={() => {
                                handleCambiarEstado(pedidoSeleccionado.id, 'entregado');
                                setShowDetallesModal(false);
                            }}
                        >
                            <i className="fas fa-check me-2"></i>
                            Marcar como Entregado
                        </Button>
                    )}
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default PedidosHistorial;