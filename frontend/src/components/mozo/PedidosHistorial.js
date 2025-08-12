import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Form, 
    Table, Pagination, Spinner, InputGroup, Modal, Alert
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
    const [error, setError] = useState(null);
    const [filtros, setFiltros] = useState({
        estado: 'todos',
        fecha: 'todos',
        busqueda: ''
    });
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [estadisticas, setEstadisticas] = useState(null);
    const [showDetallesModal, setShowDetallesModal] = useState(false);
    const [pedidoSeleccionado, setPedidoSeleccionado] = useState(null);

    const itemsPerPage = 10;

    const fetchPedidos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🔍 Fetching pedidos para usuario:', user.nombre, user.rol);
            
            // Construir parámetros de consulta
            const params = {
                page: currentPage,
                limit: itemsPerPage
            };

            // ✅ IMPORTANTE: Solo agregar mozo_id si NO somos administrador
            if (user.rol !== 'administrador') {
                params.mozo_id = user.id;
            }

            // Aplicar filtros
            if (filtros.estado !== 'todos') {
                params.estado = filtros.estado;
            }

            if (filtros.fecha !== 'todos') {
                const ahora = new Date();
                if (filtros.fecha === 'hoy') {
                    params.fecha_desde = ahora.toISOString().split('T')[0];
                } else if (filtros.fecha === 'semana') {
                    const hace7Dias = new Date();
                    hace7Dias.setDate(hace7Dias.getDate() - 7);
                    params.fecha_desde = hace7Dias.toISOString().split('T')[0];
                } else if (filtros.fecha === 'mes') {
                    const hace30Dias = new Date();
                    hace30Dias.setDate(hace30Dias.getDate() - 30);
                    params.fecha_desde = hace30Dias.toISOString().split('T')[0];
                }
            }

            if (filtros.busqueda) {
                params.busqueda = filtros.busqueda;
            }

            console.log('📤 Enviando params:', params);

            const response = await pedidosService.getAll(params);
            const data = response.data;
            
            console.log('📥 Respuesta recibida:', data);
            
            if (data.success) {
                setPedidos(data.data || []);
                setTotalPages(data.pagination?.totalPages || 1);
                setTotalRecords(data.pagination?.total || 0);
                
                console.log(`✅ S/{data.data?.length || 0} pedidos cargados`);
            } else {
                setError('Error en la respuesta del servidor');
            }
            
        } catch (error) {
            console.error('❌ Error fetching pedidos:', error);
            setError(error.response?.data?.error || 'Error al cargar pedidos');
            
            // Si es error 403, mostrar mensaje específico
            if (error.response?.status === 403) {
                setError('No tienes permisos para ver estos pedidos');
            }
            
            setPedidos([]);
        } finally {
            setLoading(false);
        }
    }, [filtros, currentPage, user.id, user.rol, user.nombre]);

    const fetchEstadisticas = useCallback(async () => {
        try {
            // Obtener estadísticas simples basadas en los pedidos cargados
            const params = {
                fecha_desde: new Date().toISOString().split('T')[0]
            };

            // Solo agregar mozo_id si no somos administrador
            if (user.rol !== 'administrador') {
                params.mozo_id = user.id;
            }

            const response = await pedidosService.getAll(params);
            const pedidosHoy = response.data.data || [];
            
            const completadosHoy = pedidosHoy.filter(p => 
                ['entregado', 'pagado'].includes(p.estado)
            ).length;
            
            const enProceso = pedidosHoy.filter(p => 
                ['nuevo', 'en_cocina', 'preparado'].includes(p.estado)
            ).length;
            
            const ingresosHoy = pedidosHoy
                .filter(p => p.estado === 'pagado')
                .reduce((sum, p) => sum + parseFloat(p.total), 0);

            setEstadisticas({
                total_hoy: pedidosHoy.length,
                completados_hoy: completadosHoy,
                en_proceso: enProceso,
                ingresos_hoy: ingresosHoy.toFixed(2)
            });
        } catch (error) {
            console.error('Error fetching estadísticas:', error);
            // No mostrar error, las estadísticas son opcionales
        }
    }, [user.id, user.rol]);

    useEffect(() => {
        console.log('🔄 useEffect triggered, usuario:', user);
        if (user && user.id) {
            fetchPedidos();
            fetchEstadisticas();
        }
    }, [fetchPedidos, fetchEstadisticas, user]);

    const handleVerDetalles = (pedido) => {
        setPedidoSeleccionado(pedido);
        setShowDetallesModal(true);
    };

    const handleCambiarEstado = async (pedidoId, nuevoEstado) => {
        try {
            await pedidosService.changeStatus(pedidoId, nuevoEstado);
            setPedidos(pedidos.map(p => 
                p.id === pedidoId ? { ...p, estado: nuevoEstado } : p
            ));
            toast.success('Estado actualizado correctamente');
            
            // Actualizar estadísticas
            fetchEstadisticas();
        } catch (error) {
            console.error('Error updating status:', error);
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

    const handlePageChange = (page) => {
        setCurrentPage(page);
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
                    <small className="text-muted">Usuario: {user.nombre} ({user.rol})</small>
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

            {/* Mostrar error si existe */}
            {error && (
                <Alert variant="danger" className="mb-4">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="outline-danger" onClick={fetchPedidos}>
                        Reintentar
                    </Button>
                </Alert>
            )}

            {/* Debug info en desarrollo */}
            {process.env.NODE_ENV === 'development' && (
                <Alert variant="info" className="mb-4">
                    <small>
                        <strong>Debug:</strong> Usuario: {user.nombre} ({user.rol}) | 
                        Total pedidos: {totalRecords} | 
                        Página: {currentPage}/{totalPages}
                    </small>
                </Alert>
            )}

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
                                <div className="h4 mb-0">S/{estadisticas.ingresos_hoy}</div>
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
                    <div className="d-flex justify-content-between align-items-center">
                        <h5 className="mb-0">
                            <i className="fas fa-list me-2"></i>
                            Pedidos ({totalRecords})
                        </h5>
                        {loading && (
                            <Spinner animation="border" size="sm" />
                        )}
                    </div>
                </Card.Header>
                <Card.Body className="p-0">
                    {!error && pedidos.length > 0 ? (
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
                                                    Mesa {pedido.mesa?.numero || 'N/A'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={getEstadoColor(pedido.estado)}>
                                                    <i className={`fas S/{getEstadoIcon(pedido.estado)} me-1`}></i>
                                                    {getEstadoText(pedido.estado)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div>
                                                    <div>{new Date(pedido.created_at).toLocaleDateString()}</div>
                                                    <small className="text-muted">
                                                        {new Date(pedido.created_at).toLocaleTimeString()}
                                                    </small>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark">
                                                    {pedido.detalles?.length || 0} item{(pedido.detalles?.length || 0) !== 1 ? 's' : ''}
                                                </span>
                                            </td>
                                            <td>
                                                <strong className="text-success">
                                                    S/{parseFloat(pedido.total).toFixed(2)}
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
                                                    <Button
                                                        variant="outline-info"
                                                        size="sm"
                                                        onClick={() => navigate(`/dashboard/mozo/pedido/S/{pedido.id}`)}
                                                    >
                                                        <i className="fas fa-external-link-alt"></i>
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    ) : !error ? (
                        <div className="text-center py-5">
                            <i className="fas fa-clipboard-list fa-3x text-muted mb-3"></i>
                            <h5>No hay pedidos</h5>
                            <p className="text-muted">No se encontraron pedidos con los filtros seleccionados.</p>
                            <Button variant="outline-primary" onClick={handleLimpiarFiltros}>
                                Mostrar todos los pedidos
                            </Button>
                        </div>
                    ) : null}
                </Card.Body>
            </Card>

            {/* Paginación */}
            {totalPages > 1 && (
                <div className="d-flex justify-content-center mt-4">
                    <Pagination>
                        <Pagination.Prev 
                            disabled={currentPage === 1}
                            onClick={() => handlePageChange(currentPage - 1)}
                        />
                        {[...Array(Math.min(5, totalPages))].map((_, index) => {
                            const startPage = Math.max(1, currentPage - 2);
                            const pageNumber = startPage + index;
                            
                            if (pageNumber <= totalPages) {
                                return (
                                    <Pagination.Item
                                        key={pageNumber}
                                        active={pageNumber === currentPage}
                                        onClick={() => handlePageChange(pageNumber)}
                                    >
                                        {pageNumber}
                                    </Pagination.Item>
                                );
                            }
                            return null;
                        })}
                        <Pagination.Next 
                            disabled={currentPage === totalPages}
                            onClick={() => handlePageChange(currentPage + 1)}
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
                                        <strong>Mesa:</strong> {pedidoSeleccionado.mesa?.numero || 'N/A'}
                                    </div>
                                    <div className="mb-3">
                                        <strong>Estado:</strong>{' '}
                                        <Badge bg={getEstadoColor(pedidoSeleccionado.estado)}>
                                            {getEstadoText(pedidoSeleccionado.estado)}
                                        </Badge>
                                    </div>
                                    <div className="mb-3">
                                        <strong>Mozo:</strong> {pedidoSeleccionado.mozo?.nombre || user.nombre}
                                    </div>
                                </Col>
                                <Col md={6}>
                                    <div className="mb-3">
                                        <strong>Fecha:</strong> {new Date(pedidoSeleccionado.created_at).toLocaleString()}
                                    </div>
                                    <div className="mb-3">
                                        <strong>Total:</strong>{' '}
                                        <span className="text-success h5">
                                            S/ S/{parseFloat(pedidoSeleccionado.total).toFixed(2)}
                                        </span>
                                    </div>
                                </Col>
                            </Row>

                            <h6>Productos:</h6>
                            {pedidoSeleccionado.detalles && pedidoSeleccionado.detalles.length > 0 ? (
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
                                        {pedidoSeleccionado.detalles.map((detalle, index) => (
                                            <tr key={index}>
                                                <td>{detalle.producto?.nombre || 'Producto'}</td>
                                                <td>{detalle.cantidad}</td>
                                                <td>S/{parseFloat(detalle.precio_unitario).toFixed(2)}</td>
                                                <td>S/S/{parseFloat(detalle.subtotal).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            ) : (
                                <p className="text-muted">No hay detalles disponibles</p>
                            )}

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