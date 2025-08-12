import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Modal, Form, 
    Spinner, Alert, Table, ButtonGroup, InputGroup,
    OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { productosService, categoriasService } from '../../services/api';
import toast from 'react-hot-toast';

const ProductosManagement = () => {
    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showCategoriaModal, setShowCategoriaModal] = useState(false);
    const [editingProducto, setEditingProducto] = useState(null);
    const [view, setView] = useState('grid');
    const [filtros, setFiltros] = useState({
        categoria: 'todas',
        disponibilidad: 'todos',
        busqueda: ''
    });
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        precio: '',
        categoria_id: '',
        disponible: true
    });
    const [categoriaForm, setCategoriaForm] = useState({
        nombre: '',
        descripcion: ''
    });
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        disponibles: 0,
        agotados: 0,
        por_categoria: []
    });
    const [error, setError] = useState(null);

    // ✅ Función para cargar productos
    const fetchProductos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await productosService.getAll();
            const productosData = response.data.data || [];
            
            setProductos(productosData);
            
        } catch (error) {
            console.error('Error fetching productos:', error);
            setError('Error al cargar productos. Verifique la conexión.');
            toast.error('Error al cargar productos');
            setProductos([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // ✅ Función para cargar categorías
    const fetchCategorias = useCallback(async () => {
        try {
            const response = await categoriasService.getAll();
            setCategorias(response.data.data || []);
        } catch (error) {
            console.error('Error fetching categorías:', error);
            toast.error('Error al cargar categorías');
            setCategorias([]);
        }
    }, []);

    // ✅ Función para calcular estadísticas
    const calcularEstadisticas = useCallback((productosData, categoriasData) => {
        const stats = {
            total: productosData.length,
            disponibles: productosData.filter(p => p.disponible).length,
            agotados: productosData.filter(p => !p.disponible).length,
            por_categoria: categoriasData.map(cat => ({
                categoria: cat.nombre,
                cantidad: productosData.filter(p => p.categoria?.id === cat.id).length
            })).filter(stat => stat.cantidad > 0)
        };
        setEstadisticas(stats);
    }, []);

    // ✅ Efecto principal para cargar datos
    useEffect(() => {
        const loadData = async () => {
            await Promise.all([fetchProductos(), fetchCategorias()]);
        };
        loadData();
    }, [fetchProductos, fetchCategorias]);

    // ✅ Efecto para recalcular estadísticas
    useEffect(() => {
        if (productos.length >= 0 && categorias.length >= 0) {
            calcularEstadisticas(productos, categorias);
        }
    }, [productos, categorias, calcularEstadisticas]);

    // ✅ Función para mostrar modal
    const handleShowModal = useCallback((producto = null) => {
        if (producto) {
            setEditingProducto(producto);
            setFormData({
                nombre: producto.nombre || '',
                descripcion: producto.descripcion || '',
                precio: producto.precio?.toString() || '',
                categoria_id: producto.categoria_id?.toString() || '',
                disponible: Boolean(producto.disponible)
            });
        } else {
            setEditingProducto(null);
            setFormData({
                nombre: '',
                descripcion: '',
                precio: '',
                categoria_id: '',
                disponible: true
            });
        }
        setShowModal(true);
    }, []);

    // ✅ Función para cerrar modal
    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setEditingProducto(null);
        setFormData({
            nombre: '',
            descripcion: '',
            precio: '',
            categoria_id: '',
            disponible: true
        });
    }, []);

    // ✅ Función para guardar producto - CORREGIDO: Se agregó la función faltante
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        // Validaciones mejoradas
        if (!formData.nombre?.trim()) {
            toast.error('El nombre es requerido');
            return;
        }
        
        const precio = parseFloat(formData.precio);
        if (!formData.precio || isNaN(precio) || precio <= 0) {
            toast.error('El precio debe ser un número mayor a 0');
            return;
        }
        
        if (!formData.categoria_id) {
            toast.error('Selecciona una categoría');
            return;
        }

        try {
            const productoData = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || '',
                precio: precio,
                categoria_id: parseInt(formData.categoria_id),
                disponible: Boolean(formData.disponible)
            };

            if (editingProducto) {
                await productosService.update(editingProducto.id, productoData);
                toast.success('Producto actualizado exitosamente');
            } else {
                await productosService.create(productoData);
                toast.success('Producto creado exitosamente');
            }
            
            handleCloseModal();
            await fetchProductos();
        } catch (error) {
            console.error('Error saving producto:', error);
            const errorMessage = error.response?.data?.error || 'Error al guardar producto';
            toast.error(errorMessage);
        }
    }, [formData, editingProducto, handleCloseModal, fetchProductos]);

    // ✅ Función para eliminar producto
    const handleDelete = useCallback(async (producto) => {
        if (!window.confirm(`¿Estás seguro de eliminar el producto "S/{producto.nombre}"?`)) {
            return;
        }

        try {
            await productosService.delete(producto.id);
            toast.success('Producto eliminado exitosamente');
            await fetchProductos();
        } catch (error) {
            console.error('Error deleting producto:', error);
            const errorMessage = error.response?.data?.error || 'Error al eliminar producto';
            toast.error(errorMessage);
        }
    }, [fetchProductos]);

    // ✅ Función para cambiar disponibilidad
    const handleToggleDisponibilidad = useCallback(async (producto) => {
        try {
            const nuevoEstado = !producto.disponible;
            await productosService.changeAvailability(producto.id, nuevoEstado);
            
            toast.success(
                `S/{producto.nombre} marcado como S/{nuevoEstado ? 'disponible' : 'agotado'}`
            );
            
            await fetchProductos();
        } catch (error) {
            console.error('Error updating availability:', error);
            const errorMessage = error.response?.data?.error || 'Error al cambiar disponibilidad';
            toast.error(errorMessage);
        }
    }, [fetchProductos]);

    // ✅ Función para crear categoría
    const handleCrearCategoria = useCallback(async (e) => {
        e.preventDefault();
        
        if (!categoriaForm.nombre?.trim()) {
            toast.error('El nombre de la categoría es requerido');
            return;
        }

        try {
            const categoriaData = {
                nombre: categoriaForm.nombre.trim(),
                descripcion: categoriaForm.descripcion?.trim() || ''
            };
            
            await categoriasService.create(categoriaData);
            toast.success('Categoría creada exitosamente');
            
            setCategoriaForm({ nombre: '', descripcion: '' });
            setShowCategoriaModal(false);
            await fetchCategorias();
        } catch (error) {
            console.error('Error creating categoria:', error);
            const errorMessage = error.response?.data?.error || 'Error al crear categoría';
            toast.error(errorMessage);
        }
    }, [categoriaForm, fetchCategorias]);

    // ✅ Función para cambiar filtros
    const handleFiltroChange = useCallback((campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }));
    }, []);

    // ✅ Función para limpiar filtros
    const handleLimpiarFiltros = useCallback(() => {
        setFiltros({
            categoria: 'todas',
            disponibilidad: 'todos',
            busqueda: ''
        });
    }, []);

    // ✅ Función para obtener color de categoría
    const getCategoriaColor = useCallback((categoriaId) => {
        const colors = ['primary', 'success', 'warning', 'info', 'secondary', 'dark'];
        const index = categoriaId ? (categoriaId % colors.length) : 0;
        return colors[index];
    }, []);

    // ✅ Función para filtrar productos (Memoizada)
    const productosFiltrados = React.useMemo(() => {
        let resultado = [...productos];

        // Filtro por categoría
        if (filtros.categoria !== 'todas') {
            resultado = resultado.filter(p => 
                p.categoria?.id === parseInt(filtros.categoria)
            );
        }

        // Filtro por disponibilidad
        if (filtros.disponibilidad !== 'todos') {
            resultado = resultado.filter(p => 
                filtros.disponibilidad === 'disponibles' ? p.disponible : !p.disponible
            );
        }

        // Filtro de búsqueda
        if (filtros.busqueda?.trim()) {
            const busqueda = filtros.busqueda.toLowerCase();
            resultado = resultado.filter(producto => 
                producto.nombre?.toLowerCase().includes(busqueda) ||
                producto.categoria?.nombre?.toLowerCase().includes(busqueda) ||
                producto.descripcion?.toLowerCase().includes(busqueda)
            );
        }

        return resultado;
    }, [productos, filtros]);

    // ✅ Manejo de errores en el render
    if (loading && productos.length === 0) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Cargando productos...</p>
                </div>
            </Container>
        );
    }

    if (error && productos.length === 0) {
        return (
            <Container>
                <Alert variant="danger" className="mt-3">
                    <Alert.Heading>Error</Alert.Heading>
                    <p>{error}</p>
                    <Button variant="outline-danger" onClick={fetchProductos}>
                        Reintentar
                    </Button>
                </Alert>
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
                            <h2 className="mb-1">Gestión de Productos</h2>
                            <p className="text-muted mb-0">
                                Administra el menú del restaurante
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <Button 
                                variant="outline-success"
                                size="sm"
                                onClick={() => setShowCategoriaModal(true)}
                            >
                                <i className="fas fa-tags me-1"></i>
                                Categorías
                            </Button>
                            <ButtonGroup size="sm">
                                <Button 
                                    variant={view === 'grid' ? 'primary' : 'outline-primary'}
                                    onClick={() => setView('grid')}
                                >
                                    <i className="fas fa-th-large"></i>
                                </Button>
                                <Button 
                                    variant={view === 'table' ? 'primary' : 'outline-primary'}
                                    onClick={() => setView('table')}
                                >
                                    <i className="fas fa-list"></i>
                                </Button>
                            </ButtonGroup>
                            <Button 
                                variant="success" 
                                onClick={() => handleShowModal()}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Nuevo Producto
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Estadísticas */}
            <Row className="mb-4">
                <Col md={3}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="bg-primary rounded-circle p-3 me-3">
                                    <i className="fas fa-utensils text-white"></i>
                                </div>
                                <div>
                                    <div className="text-muted small">Total Productos</div>
                                    <div className="h4 mb-0">{estadisticas.total}</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="bg-success rounded-circle p-3 me-3">
                                    <i className="fas fa-check-circle text-white"></i>
                                </div>
                                <div>
                                    <div className="text-muted small">Disponibles</div>
                                    <div className="h4 mb-0">{estadisticas.disponibles}</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="bg-danger rounded-circle p-3 me-3">
                                    <i className="fas fa-times-circle text-white"></i>
                                </div>
                                <div>
                                    <div className="text-muted small">Agotados</div>
                                    <div className="h4 mb-0">{estadisticas.agotados}</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm">
                        <Card.Body>
                            <div className="d-flex align-items-center">
                                <div className="bg-info rounded-circle p-3 me-3">
                                    <i className="fas fa-tags text-white"></i>
                                </div>
                                <div>
                                    <div className="text-muted small">Categorías</div>
                                    <div className="h4 mb-0">{categorias.length}</div>
                                </div>
                            </div>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Filtros */}
            <Card className="border-0 shadow-sm mb-4">
                <Card.Body>
                    <Row className="g-3">
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Categoría</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.categoria}
                                    onChange={(e) => handleFiltroChange('categoria', e.target.value)}
                                >
                                    <option value="todas">Todas las categorías</option>
                                    {categorias.map(categoria => (
                                        <option key={categoria.id} value={categoria.id}>
                                            {categoria.nombre}
                                        </option>
                                    ))}
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={3}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Disponibilidad</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.disponibilidad}
                                    onChange={(e) => handleFiltroChange('disponibilidad', e.target.value)}
                                >
                                    <option value="todos">Todos</option>
                                    <option value="disponibles">Solo disponibles</option>
                                    <option value="agotados">Solo agotados</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Buscar</Form.Label>
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

            {/* Vista Grid */}
            {view === 'grid' && (
                <Row>
                    {productosFiltrados.map((producto) => (
                        <Col lg={3} md={4} sm={6} key={producto.id} className="mb-4">
                            <Card 
                                className={`h-100 border-0 shadow-sm S/{
                                    !producto.disponible ? 'opacity-75' : ''
                                }`}
                            >
                                <Card.Body>
                                    <div className="d-flex justify-content-between align-items-start mb-3">
                                        <Badge 
                                            bg={getCategoriaColor(producto.categoria?.id)}
                                            className="mb-2"
                                        >
                                            {producto.categoria?.nombre || 'Sin categoría'}
                                        </Badge>
                                        <Badge 
                                            bg={producto.disponible ? "success" : "danger"}
                                        >
                                            {producto.disponible ? "Disponible" : "Agotado"}
                                        </Badge>
                                    </div>
                                    
                                    <h5 className="mb-2">{producto.nombre}</h5>
                                    
                                    {producto.descripcion && (
                                        <p className="text-muted small mb-3">
                                            {producto.descripcion}
                                        </p>
                                    )}
                                    
                                    <div className="mb-3">
                                        <span className="h4 text-success mb-0">
                                            S/ {parseFloat(producto.precio || 0).toFixed(2)}
                                        </span>
                                    </div>

                                    <div className="d-flex gap-1">
                                        <OverlayTrigger
                                            overlay={<Tooltip>Cambiar disponibilidad</Tooltip>}
                                        >
                                            <Button
                                                variant={producto.disponible ? "outline-warning" : "outline-success"}
                                                size="sm"
                                                onClick={() => handleToggleDisponibilidad(producto)}
                                            >
                                                <i className={`fas S/{
                                                    producto.disponible ? 'fa-eye-slash' : 'fa-eye'
                                                }`}></i>
                                            </Button>
                                        </OverlayTrigger>
                                        
                                        <Button
                                            variant="outline-primary"
                                            size="sm"
                                            onClick={() => handleShowModal(producto)}
                                        >
                                            <i className="fas fa-edit"></i>
                                        </Button>
                                        
                                        <Button
                                            variant="outline-danger"
                                            size="sm"
                                            onClick={() => handleDelete(producto)}
                                        >
                                            <i className="fas fa-trash"></i>
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Vista Tabla */}
            {view === 'table' && (
                <Card className="border-0 shadow-sm">
                    <Card.Body>
                        <Table responsive hover>
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Categoría</th>
                                    <th>Precio</th>
                                    <th>Estado</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {productosFiltrados.map((producto) => (
                                    <tr key={producto.id} className={!producto.disponible ? 'opacity-75' : ''}>
                                        <td>
                                            <div>
                                                <strong>{producto.nombre}</strong>
                                                {producto.descripcion && (
                                                    <div className="text-muted small">
                                                        {producto.descripcion}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <Badge bg={getCategoriaColor(producto.categoria?.id)}>
                                                {producto.categoria?.nombre || 'Sin categoría'}
                                            </Badge>
                                        </td>
                                        <td>
                                            <strong className="text-success">
                                                S/ {parseFloat(producto.precio || 0).toFixed(2)}
                                            </strong>
                                        </td>
                                        <td>
                                            <Badge bg={producto.disponible ? "success" : "danger"}>
                                                <i className={`fas S/{
                                                    producto.disponible ? 'fa-check-circle' : 'fa-times-circle'
                                                } me-1`}></i>
                                                {producto.disponible ? "Disponible" : "Agotado"}
                                            </Badge>
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <Button
                                                    variant={producto.disponible ? "outline-warning" : "outline-success"}
                                                    size="sm"
                                                    onClick={() => handleToggleDisponibilidad(producto)}
                                                >
                                                    <i className={`fas S/{
                                                        producto.disponible ? 'fa-eye-slash' : 'fa-eye'
                                                    }`}></i>
                                                </Button>
                                                
                                                <Button
                                                    variant="outline-primary"
                                                    size="sm"
                                                    onClick={() => handleShowModal(producto)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </Button>
                                                
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(producto)}
                                                >
                                                    <i className="fas fa-trash"></i>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Mensaje si no hay productos */}
            {productosFiltrados.length === 0 && !loading && (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="text-center py-5">
                        <i className="fas fa-utensils fa-4x text-muted mb-4"></i>
                        <h4>No hay productos</h4>
                        <p className="text-muted mb-3">
                            {filtros.categoria !== 'todas' || filtros.disponibilidad !== 'todos' || filtros.busqueda
                                ? 'No se encontraron productos con los filtros seleccionados.'
                                : 'Comienza agregando productos al menú.'}
                        </p>
                        {(filtros.categoria !== 'todas' || filtros.disponibilidad !== 'todos' || filtros.busqueda) ? (
                            <Button variant="outline-primary" onClick={handleLimpiarFiltros}>
                                Mostrar todos los productos
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={() => handleShowModal()}>
                                <i className="fas fa-plus me-2"></i>
                                Agregar Primer Producto
                            </Button>
                        )}
                    </Card.Body>
                </Card>
            )}

            {/* Modal para Crear/Editar Producto */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingProducto ? 'Editar Producto' : 'Nuevo Producto'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nombre del Producto *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            nombre: e.target.value
                                        })}
                                        required
                                        placeholder="Ej: Pizza Margarita"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Precio *</Form.Label>
                                    <InputGroup>
                                        <InputGroup.Text>S/</InputGroup.Text>
                                        <Form.Control
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={formData.precio}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                precio: e.target.value
                                            })}
                                            required
                                            placeholder="0.00"
                                        />
                                    </InputGroup>
                                </Form.Group>
                            </Col>
                        </Row>

                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={3}
                                value={formData.descripcion}
                                onChange={(e) => setFormData({
                                    ...formData,
                                    descripcion: e.target.value
                                })}
                                placeholder="Descripción del producto..."
                            />
                        </Form.Group>

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Categoría *</Form.Label>
                                    <Form.Select
                                        value={formData.categoria_id}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            categoria_id: e.target.value
                                        })}
                                        required
                                    >
                                        <option value="">Selecciona una categoría</option>
                                        {categorias.map(categoria => (
                                            <option key={categoria.id} value={categoria.id}>
                                                {categoria.nombre}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Estado</Form.Label>
                                    <div className="mt-2">
                                        <Form.Check
                                            type="switch"
                                            id="disponible-switch"
                                            label={formData.disponible ? "Disponible" : "No disponible"}
                                            checked={formData.disponible}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                disponible: e.target.checked
                                            })}
                                        />
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit">
                            {editingProducto ? 'Actualizar' : 'Crear'} Producto
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal para Crear Categoría */}
            <Modal show={showCategoriaModal} onHide={() => setShowCategoriaModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Nueva Categoría</Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleCrearCategoria}>
                    <Modal.Body>
                        <Form.Group className="mb-3">
                            <Form.Label>Nombre de la Categoría *</Form.Label>
                            <Form.Control
                                type="text"
                                value={categoriaForm.nombre}
                                onChange={(e) => setCategoriaForm({
                                    ...categoriaForm,
                                    nombre: e.target.value
                                })}
                                required
                                placeholder="Ej: Bebidas, Platos Principales..."
                            />
                        </Form.Group>

                        <Form.Group className="mb-3">
                            <Form.Label>Descripción</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={2}
                                value={categoriaForm.descripcion}
                                onChange={(e) => setCategoriaForm({
                                    ...categoriaForm,
                                    descripcion: e.target.value
                                })}
                                placeholder="Descripción opcional..."
                            />
                        </Form.Group>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowCategoriaModal(false)}>
                            Cancelar
                        </Button>
                        <Button variant="success" type="submit">
                            Crear Categoría
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default ProductosManagement;