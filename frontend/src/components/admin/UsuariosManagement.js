import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Modal, Form, 
    Table, Spinner, Alert, InputGroup, Dropdown, ButtonGroup,
    OverlayTrigger, Tooltip
} from 'react-bootstrap';
import { authService } from '../../services/api';
import toast from 'react-hot-toast';

const UsuariosManagement = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [usuariosOriginales, setUsuariosOriginales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingUsuario, setEditingUsuario] = useState(null);
    const [view, setView] = useState('table'); // 'table' o 'cards'
    const [filtros, setFiltros] = useState({
        rol: 'todos',
        estado: 'todos',
        busqueda: ''
    });
    const [formData, setFormData] = useState({
        nombre: '',
        email: '',
        password: '',
        rol: 'mozo',
        activo: true
    });
    const [estadisticas, setEstadisticas] = useState({
        total: 0,
        administradores: 0,
        mozos: 0,
        cocina: 0,
        cajeros: 0,
        activos: 0,
        inactivos: 0
    });
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        usuarioId: null,
        nuevaPassword: '',
        confirmarPassword: ''
    });

    // Mock de usuarios para desarrollo
    const generateMockUsuarios = useCallback(() => {
        return [
            {
                id: 1,
                nombre: 'Administrador',
                email: 'admin@sirer.com',
                rol: 'administrador',
                activo: true,
                created_at: '2024-01-15T10:00:00Z',
                updated_at: '2024-01-15T10:00:00Z',
                ultimo_acceso: new Date().toISOString()
            },
            {
                id: 2,
                nombre: 'Juan Pérez',
                email: 'juan.perez@sirer.com',
                rol: 'mozo',
                activo: true,
                created_at: '2024-01-16T09:30:00Z',
                updated_at: '2024-01-16T09:30:00Z',
                ultimo_acceso: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 horas atrás
            },
            {
                id: 3,
                nombre: 'María González',
                email: 'maria.gonzalez@sirer.com',
                rol: 'mozo',
                activo: true,
                created_at: '2024-01-17T11:15:00Z',
                updated_at: '2024-01-17T11:15:00Z',
                ultimo_acceso: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 min atrás
            },
            {
                id: 4,
                nombre: 'Chef García',
                email: 'chef.garcia@sirer.com',
                rol: 'cocina',
                activo: true,
                created_at: '2024-01-18T08:00:00Z',
                updated_at: '2024-01-18T08:00:00Z',
                ultimo_acceso: new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 min atrás
            },
            {
                id: 5,
                nombre: 'Ana López',
                email: 'ana.lopez@sirer.com',
                rol: 'cajero',
                activo: true,
                created_at: '2024-01-19T07:45:00Z',
                updated_at: '2024-01-19T07:45:00Z',
                ultimo_acceso: new Date(Date.now() - 15 * 60 * 1000).toISOString() // 15 min atrás
            },
            {
                id: 6,
                nombre: 'Carlos Ruiz',
                email: 'carlos.ruiz@sirer.com',
                rol: 'mozo',
                activo: false,
                created_at: '2024-01-20T14:20:00Z',
                updated_at: '2024-01-25T16:30:00Z',
                ultimo_acceso: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 días atrás
            },
            {
                id: 7,
                nombre: 'Sofia Martín',
                email: 'sofia.martin@sirer.com',
                rol: 'cajero',
                activo: true,
                created_at: '2024-01-21T16:10:00Z',
                updated_at: '2024-01-21T16:10:00Z',
                ultimo_acceso: new Date(Date.now() - 45 * 60 * 1000).toISOString() // 45 min atrás
            },
            {
                id: 8,
                nombre: 'Luis Torres',
                email: 'luis.torres@sirer.com',
                rol: 'cocina',
                activo: true,
                created_at: '2024-01-22T12:30:00Z',
                updated_at: '2024-01-22T12:30:00Z',
                ultimo_acceso: new Date(Date.now() - 20 * 60 * 1000).toISOString() // 20 min atrás
            }
        ];
    }, []);

    const aplicarFiltros = useCallback(() => {
        let usuariosFiltrados = [...usuariosOriginales];

        // Filtro por rol
        if (filtros.rol !== 'todos') {
            usuariosFiltrados = usuariosFiltrados.filter(u => u.rol === filtros.rol);
        }

        // Filtro por estado
        if (filtros.estado !== 'todos') {
            usuariosFiltrados = usuariosFiltrados.filter(u => 
                filtros.estado === 'activos' ? u.activo : !u.activo
            );
        }

        // Filtro por búsqueda
        if (filtros.busqueda) {
            usuariosFiltrados = usuariosFiltrados.filter(u => 
                u.nombre.toLowerCase().includes(filtros.busqueda.toLowerCase()) ||
                u.email.toLowerCase().includes(filtros.busqueda.toLowerCase())
            );
        }

        setUsuarios(usuariosFiltrados);
    }, [filtros, usuariosOriginales]);

    const fetchUsuarios = useCallback(async () => {
        try {
            setLoading(true);
            
            // Simular delay de API
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const usuariosData = generateMockUsuarios();
            setUsuariosOriginales(usuariosData);
            
            // Calcular estadísticas
            const stats = {
                total: usuariosData.length,
                administradores: usuariosData.filter(u => u.rol === 'administrador').length,
                mozos: usuariosData.filter(u => u.rol === 'mozo').length,
                cocina: usuariosData.filter(u => u.rol === 'cocina').length,
                cajeros: usuariosData.filter(u => u.rol === 'cajero').length,
                activos: usuariosData.filter(u => u.activo).length,
                inactivos: usuariosData.filter(u => !u.activo).length
            };
            setEstadisticas(stats);
            
        } catch (error) {
            console.error('Error fetching usuarios:', error);
            toast.error('Error al cargar usuarios');
        } finally {
            setLoading(false);
        }
    }, [generateMockUsuarios]);

    useEffect(() => {
        fetchUsuarios();
    }, [fetchUsuarios]);

    useEffect(() => {
        aplicarFiltros();
    }, [aplicarFiltros]);

    const handleShowModal = useCallback((usuario = null) => {
        if (usuario) {
            setEditingUsuario(usuario);
            setFormData({
                nombre: usuario.nombre,
                email: usuario.email,
                password: '', // No mostrar password actual
                rol: usuario.rol,
                activo: usuario.activo
            });
        } else {
            setEditingUsuario(null);
            setFormData({
                nombre: '',
                email: '',
                password: '',
                rol: 'mozo',
                activo: true
            });
        }
        setShowModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setEditingUsuario(null);
        setFormData({
            nombre: '',
            email: '',
            password: '',
            rol: 'mozo',
            activo: true
        });
    }, []);

    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        
        // Validaciones
        if (!formData.nombre.trim()) {
            toast.error('El nombre es requerido');
            return;
        }
        if (!formData.email.trim()) {
            toast.error('El email es requerido');
            return;
        }
        if (!editingUsuario && !formData.password) {
            toast.error('La contraseña es requerida para nuevos usuarios');
            return;
        }

        try {
            if (editingUsuario) {
                // Actualizar usuario existente
                const usuarioActualizado = {
                    ...editingUsuario,
                    ...formData,
                    updated_at: new Date().toISOString()
                };
                
                setUsuariosOriginales(prev => 
                    prev.map(u => u.id === editingUsuario.id ? usuarioActualizado : u)
                );
                
                toast.success('Usuario actualizado exitosamente');
            } else {
                // Crear nuevo usuario
                const nuevoUsuario = {
                    id: Date.now(), // ID temporal
                    ...formData,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    ultimo_acceso: null
                };
                
                setUsuariosOriginales(prev => [...prev, nuevoUsuario]);
                
                // Actualizar estadísticas
                setEstadisticas(prev => ({
                    ...prev,
                    total: prev.total + 1,
                    [formData.rol + 's']: prev[formData.rol + 's'] + 1,
                    activos: formData.activo ? prev.activos + 1 : prev.activos,
                    inactivos: !formData.activo ? prev.inactivos + 1 : prev.inactivos
                }));
                
                toast.success('Usuario creado exitosamente');
            }
            
            handleCloseModal();
        } catch (error) {
            console.error('Error saving usuario:', error);
            toast.error('Error al guardar usuario');
        }
    }, [formData, editingUsuario, handleCloseModal]);

    const handleToggleEstado = useCallback(async (usuario) => {
        try {
            const nuevoEstado = !usuario.activo;
            
            const usuarioActualizado = {
                ...usuario,
                activo: nuevoEstado,
                updated_at: new Date().toISOString()
            };
            
            setUsuariosOriginales(prev => 
                prev.map(u => u.id === usuario.id ? usuarioActualizado : u)
            );
            
            // Actualizar estadísticas
            setEstadisticas(prev => ({
                ...prev,
                activos: nuevoEstado ? prev.activos + 1 : prev.activos - 1,
                inactivos: nuevoEstado ? prev.inactivos - 1 : prev.inactivos + 1
            }));
            
            toast.success(`Usuario ${nuevoEstado ? 'activado' : 'desactivado'} exitosamente`);
        } catch (error) {
            toast.error('Error al cambiar estado del usuario');
        }
    }, []);

    const handleShowPasswordModal = useCallback((usuario) => {
        setPasswordData({
            usuarioId: usuario.id,
            nuevaPassword: '',
            confirmarPassword: ''
        });
        setShowPasswordModal(true);
    }, []);

    const handleChangePassword = useCallback(async () => {
        if (!passwordData.nuevaPassword) {
            toast.error('La nueva contraseña es requerida');
            return;
        }
        if (passwordData.nuevaPassword !== passwordData.confirmarPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }
        if (passwordData.nuevaPassword.length < 6) {
            toast.error('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        try {
            // Simular cambio de contraseña
            toast.success('Contraseña actualizada exitosamente');
            setShowPasswordModal(false);
            setPasswordData({
                usuarioId: null,
                nuevaPassword: '',
                confirmarPassword: ''
            });
        } catch (error) {
            toast.error('Error al cambiar contraseña');
        }
    }, [passwordData]);

    const handleFiltroChange = useCallback((campo, valor) => {
        setFiltros(prev => ({ ...prev, [campo]: valor }));
    }, []);

    const handleLimpiarFiltros = useCallback(() => {
        setFiltros({
            rol: 'todos',
            estado: 'todos',
            busqueda: ''
        });
    }, []);

    const getRolColor = useCallback((rol) => {
        const colors = {
            administrador: 'danger',
            mozo: 'success',
            cocina: 'warning',
            cajero: 'info'
        };
        return colors[rol] || 'secondary';
    }, []);

    const getRolIcon = useCallback((rol) => {
        const icons = {
            administrador: 'fa-crown',
            mozo: 'fa-user-tie',
            cocina: 'fa-hat-chef',
            cajero: 'fa-calculator'
        };
        return icons[rol] || 'fa-user';
    }, []);

    const getRolText = useCallback((rol) => {
        const texts = {
            administrador: 'Administrador',
            mozo: 'Mozo',
            cocina: 'Cocina',
            cajero: 'Cajero'
        };
        return texts[rol] || rol;
    }, []);

    const formatearTiempo = useCallback((fecha) => {
        if (!fecha) return 'Nunca';
        
        const ahora = new Date();
        const fechaAcceso = new Date(fecha);
        const diferencia = Math.floor((ahora - fechaAcceso) / 1000 / 60); // minutos
        
        if (diferencia < 1) return 'Ahora mismo';
        if (diferencia < 60) return `Hace ${diferencia} min`;
        
        const horas = Math.floor(diferencia / 60);
        if (horas < 24) return `Hace ${horas}h`;
        
        const dias = Math.floor(horas / 24);
        return `Hace ${dias} día${dias !== 1 ? 's' : ''}`;
    }, []);

    const getEstadoConexion = useCallback((ultimoAcceso) => {
        if (!ultimoAcceso) return { texto: 'Nunca', color: 'secondary' };
        
        const ahora = new Date();
        const fechaAcceso = new Date(ultimoAcceso);
        const diferencia = Math.floor((ahora - fechaAcceso) / 1000 / 60); // minutos
        
        if (diferencia < 5) return { texto: 'En línea', color: 'success' };
        if (diferencia < 30) return { texto: 'Reciente', color: 'warning' };
        return { texto: 'Desconectado', color: 'secondary' };
    }, []);

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3">Cargando usuarios...</p>
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
                                <i className="fas fa-users text-primary me-2"></i>
                                Gestión de Usuarios
                            </h2>
                            <p className="text-muted mb-0">
                                Administra el personal del restaurante
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <ButtonGroup size="sm">
                                <Button 
                                    variant={view === 'table' ? 'primary' : 'outline-primary'}
                                    onClick={() => setView('table')}
                                >
                                    <i className="fas fa-list"></i>
                                </Button>
                                <Button 
                                    variant={view === 'cards' ? 'primary' : 'outline-primary'}
                                    onClick={() => setView('cards')}
                                >
                                    <i className="fas fa-th-large"></i>
                                </Button>
                            </ButtonGroup>
                            <Button 
                                variant="success" 
                                onClick={() => handleShowModal()}
                            >
                                <i className="fas fa-plus me-2"></i>
                                Nuevo Usuario
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
                            <i className="fas fa-users fa-2x text-primary mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.total}</div>
                            <div className="text-muted small">Total Usuarios</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                        <Card.Body className="text-center">
                            <i className="fas fa-check-circle fa-2x text-success mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.activos}</div>
                            <div className="text-muted small">Activos</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                        <Card.Body className="text-center">
                            <i className="fas fa-user-tie fa-2x text-warning mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.mozos}</div>
                            <div className="text-muted small">Mozos</div>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                        <Card.Body className="text-center">
                            <i className="fas fa-hat-chef fa-2x text-info mb-2"></i>
                            <div className="h4 mb-0">{estadisticas.cocina + estadisticas.cajeros}</div>
                            <div className="text-muted small">Staff</div>
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
                                <Form.Label className="small fw-bold">Rol</Form.Label>
                                <Form.Select
                                    size="sm"
                                    value={filtros.rol}
                                    onChange={(e) => handleFiltroChange('rol', e.target.value)}
                                >
                                    <option value="todos">Todos los roles</option>
                                    <option value="administrador">Administradores</option>
                                    <option value="mozo">Mozos</option>
                                    <option value="cocina">Cocina</option>
                                    <option value="cajero">Cajeros</option>
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
                                    <option value="activos">Solo activos</option>
                                    <option value="inactivos">Solo inactivos</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={4}>
                            <Form.Group>
                                <Form.Label className="small fw-bold">Buscar</Form.Label>
                                <InputGroup size="sm">
                                    <Form.Control
                                        placeholder="Nombre o email..."
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

            {/* Vista Tabla */}
            {view === 'table' && (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="p-0">
                        <Table responsive hover className="mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th>Usuario</th>
                                    <th>Rol</th>
                                    <th>Estado</th>
                                    <th>Último Acceso</th>
                                    <th>Conexión</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {usuarios.map((usuario) => {
                                    const estadoConexion = getEstadoConexion(usuario.ultimo_acceso);
                                    return (
                                        <tr key={usuario.id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <div 
                                                        className={`rounded-circle me-3 d-flex align-items-center justify-content-center bg-${getRolColor(usuario.rol)} bg-opacity-15`}
                                                        style={{ width: '40px', height: '40px' }}
                                                    >
                                                        <i className={`fas ${getRolIcon(usuario.rol)} text-${getRolColor(usuario.rol)}`}></i>
                                                    </div>
                                                    <div>
                                                        <div className="fw-bold">{usuario.nombre}</div>
                                                        <div className="text-muted small">{usuario.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <Badge bg={getRolColor(usuario.rol)}>
                                                    <i className={`fas ${getRolIcon(usuario.rol)} me-1`}></i>
                                                    {getRolText(usuario.rol)}
                                                </Badge>
                                            </td>
                                            <td>
                                                <Badge bg={usuario.activo ? 'success' : 'danger'}>
                                                    <i className={`fas ${usuario.activo ? 'fa-check-circle' : 'fa-times-circle'} me-1`}></i>
                                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div>
                                                    <div className="small">{formatearTiempo(usuario.ultimo_acceso)}</div>
                                                    {usuario.ultimo_acceso && (
                                                        <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                                            {new Date(usuario.ultimo_acceso).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td>
                                                <Badge bg={estadoConexion.color}>
                                                    <i className="fas fa-circle me-1" style={{ fontSize: '0.5rem' }}></i>
                                                    {estadoConexion.texto}
                                                </Badge>
                                            </td>
                                            <td>
                                                <div className="d-flex gap-1">
                                                    <OverlayTrigger overlay={<Tooltip>Editar usuario</Tooltip>}>
                                                        <Button
                                                            variant="outline-primary"
                                                            size="sm"
                                                            onClick={() => handleShowModal(usuario)}
                                                        >
                                                            <i className="fas fa-edit"></i>
                                                        </Button>
                                                    </OverlayTrigger>
                                                    
                                                    <OverlayTrigger overlay={<Tooltip>Cambiar contraseña</Tooltip>}>
                                                        <Button
                                                            variant="outline-warning"
                                                            size="sm"
                                                            onClick={() => handleShowPasswordModal(usuario)}
                                                        >
                                                            <i className="fas fa-key"></i>
                                                        </Button>
                                                    </OverlayTrigger>
                                                    
                                                    <OverlayTrigger overlay={<Tooltip>{usuario.activo ? 'Desactivar' : 'Activar'}</Tooltip>}>
                                                        <Button
                                                            variant={usuario.activo ? "outline-danger" : "outline-success"}
                                                            size="sm"
                                                            onClick={() => handleToggleEstado(usuario)}
                                                        >
                                                            <i className={`fas ${usuario.activo ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                                                        </Button>
                                                    </OverlayTrigger>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </Card.Body>
                </Card>
            )}

            {/* Vista Cards */}
            {view === 'cards' && (
                <Row>
                    {usuarios.map((usuario) => {
                        const estadoConexion = getEstadoConexion(usuario.ultimo_acceso);
                        return (
                            <Col lg={4} md={6} key={usuario.id} className="mb-4">
                                <Card className={`h-100 border-0 shadow-sm ${!usuario.activo ? 'opacity-75' : ''}`}>
                                    <Card.Body>
                                        <div className="d-flex justify-content-between align-items-start mb-3">
                                            <div 
                                                className={`rounded-circle d-flex align-items-center justify-content-center bg-${getRolColor(usuario.rol)} bg-opacity-15`}
                                                style={{ width: '60px', height: '60px' }}
                                            >
                                                <i className={`fas ${getRolIcon(usuario.rol)} text-${getRolColor(usuario.rol)} fa-lg`}></i>
                                            </div>
                                            <div className="d-flex flex-column gap-1">
                                                <Badge bg={usuario.activo ? 'success' : 'danger'}>
                                                    {usuario.activo ? 'Activo' : 'Inactivo'}
                                                </Badge>
                                                <Badge bg={estadoConexion.color}>
                                                    {estadoConexion.texto}
                                                </Badge>
                                            </div>
                                        </div>
                                        
                                        <h5 className="mb-2">{usuario.nombre}</h5>
                                        <p className="text-muted mb-2">{usuario.email}</p>
                                        
                                        <Badge bg={getRolColor(usuario.rol)} className="mb-3">
                                            <i className={`fas ${getRolIcon(usuario.rol)} me-1`}></i>
                                            {getRolText(usuario.rol)}
                                        </Badge>

                                        <div className="mb-3">
                                            <small className="text-muted">
                                                <strong>Último acceso:</strong><br />
                                                {formatearTiempo(usuario.ultimo_acceso)}
                                            </small>
                                        </div>

                                        <div className="d-flex gap-1">
                                            <Button
                                                variant="outline-primary"
                                                size="sm"
                                                onClick={() => handleShowModal(usuario)}
                                                className="flex-fill"
                                            >
                                                <i className="fas fa-edit"></i>
                                            </Button>
                                            
                                            <Button
                                                variant="outline-warning"
                                                size="sm"
                                                onClick={() => handleShowPasswordModal(usuario)}
                                                className="flex-fill"
                                            >
                                                <i className="fas fa-key"></i>
                                            </Button>
                                            
                                            <Button
                                                variant={usuario.activo ? "outline-danger" : "outline-success"}
                                                size="sm"
                                                onClick={() => handleToggleEstado(usuario)}
                                                className="flex-fill"
                                            >
                                                <i className={`fas ${usuario.activo ? 'fa-user-slash' : 'fa-user-check'}`}></i>
                                            </Button>
                                        </div>
                                    </Card.Body>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            )}

            {/* Mensaje si no hay usuarios */}
            {usuarios.length === 0 && (
                <Card className="border-0 shadow-sm">
                    <Card.Body className="text-center py-5">
                        <i className="fas fa-users fa-4x text-muted mb-4"></i>
                        <h4>No hay usuarios</h4>
                        <p className="text-muted mb-3">
                            {filtros.rol !== 'todos' || filtros.estado !== 'todos' || filtros.busqueda
                                ? 'No se encontraron usuarios con los filtros seleccionados.'
                                : 'Comienza agregando usuarios al sistema.'}
                        </p>
                        {(filtros.rol !== 'todos' || filtros.estado !== 'todos' || filtros.busqueda) ? (
                            <Button variant="outline-primary" onClick={handleLimpiarFiltros}>
                                Mostrar todos los usuarios
                            </Button>
                        ) : (
                            <Button variant="primary" onClick={() => handleShowModal()}>
                                <i className="fas fa-plus me-2"></i>
                                Agregar Primer Usuario
                            </Button>
                        )}
                    </Card.Body>
                </Card>
            )}

            {/* Modal para Crear/Editar Usuario */}
            <Modal show={showModal} onHide={handleCloseModal} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-user me-2"></i>
                        {editingUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Nombre Completo *</Form.Label>
                                    <Form.Control
                                        type="text"
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            nombre: e.target.value
                                        })}
                                        required
                                        placeholder="Ej: Juan Pérez"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Email *</Form.Label>
                                    <Form.Control
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            email: e.target.value
                                        })}
                                        required
                                        placeholder="ejemplo@sirer.com"
                                    />
                                </Form.Group>
                            </Col>
                        </Row>

                        {!editingUsuario && (
                            <Row>
                                <Col md={12}>
                                    <Form.Group className="mb-3">
                                        <Form.Label>Contraseña *</Form.Label>
                                        <Form.Control
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                password: e.target.value
                                            })}
                                            required={!editingUsuario}
                                            placeholder="Mínimo 6 caracteres"
                                            minLength="6"
                                        />
                                        <Form.Text className="text-muted">
                                            {editingUsuario 
                                                ? 'Deja en blanco para mantener la contraseña actual'
                                                : 'La contraseña debe tener al menos 6 caracteres'
                                            }
                                        </Form.Text>
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}

                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Rol *</Form.Label>
                                    <Form.Select
                                        value={formData.rol}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            rol: e.target.value
                                        })}
                                        required
                                    >
                                        <option value="mozo">🍽️ Mozo</option>
                                        <option value="cocina">👨‍🍳 Cocina</option>
                                        <option value="cajero">💰 Cajero</option>
                                        <option value="administrador">👑 Administrador</option>
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Estado</Form.Label>
                                    <div className="mt-2">
                                        <Form.Check
                                            type="switch"
                                            id="activo-switch"
                                            label={formData.activo ? "Usuario Activo" : "Usuario Inactivo"}
                                            checked={formData.activo}
                                            onChange={(e) => setFormData({
                                                ...formData,
                                                activo: e.target.checked
                                            })}
                                        />
                                    </div>
                                </Form.Group>
                            </Col>
                        </Row>

                        {/* Información adicional para usuarios existentes */}
                        {editingUsuario && (
                            <div className="bg-light p-3 rounded">
                                <h6 className="mb-2">Información del Usuario</h6>
                                <Row>
                                    <Col md={6}>
                                        <small className="text-muted">
                                            <strong>Creado:</strong><br />
                                            {new Date(editingUsuario.created_at).toLocaleString()}
                                        </small>
                                    </Col>
                                    <Col md={6}>
                                        <small className="text-muted">
                                            <strong>Última modificación:</strong><br />
                                            {new Date(editingUsuario.updated_at).toLocaleString()}
                                        </small>
                                    </Col>
                                </Row>
                                {editingUsuario.ultimo_acceso && (
                                    <div className="mt-2">
                                        <small className="text-muted">
                                            <strong>Último acceso:</strong> {formatearTiempo(editingUsuario.ultimo_acceso)}
                                        </small>
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit">
                            <i className="fas fa-save me-2"></i>
                            {editingUsuario ? 'Actualizar' : 'Crear'} Usuario
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>

            {/* Modal para Cambiar Contraseña */}
            <Modal show={showPasswordModal} onHide={() => setShowPasswordModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-key me-2"></i>
                        Cambiar Contraseña
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <strong>Usuario:</strong> {usuarios.find(u => u.id === passwordData.usuarioId)?.nombre}
                    </div>
                    
                    <Form.Group className="mb-3">
                        <Form.Label>Nueva Contraseña *</Form.Label>
                        <Form.Control
                            type="password"
                            value={passwordData.nuevaPassword}
                            onChange={(e) => setPasswordData({
                                ...passwordData,
                                nuevaPassword: e.target.value
                            })}
                            placeholder="Mínimo 6 caracteres"
                            minLength="6"
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Confirmar Contraseña *</Form.Label>
                        <Form.Control
                            type="password"
                            value={passwordData.confirmarPassword}
                            onChange={(e) => setPasswordData({
                                ...passwordData,
                                confirmarPassword: e.target.value
                            })}
                            placeholder="Repite la nueva contraseña"
                            minLength="6"
                        />
                    </Form.Group>

                    {passwordData.nuevaPassword && passwordData.confirmarPassword && 
                     passwordData.nuevaPassword !== passwordData.confirmarPassword && (
                        <Alert variant="danger" className="small">
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            Las contraseñas no coinciden
                        </Alert>
                    )}

                    {passwordData.nuevaPassword && passwordData.nuevaPassword.length < 6 && (
                        <Alert variant="warning" className="small">
                            <i className="fas fa-info-circle me-1"></i>
                            La contraseña debe tener al menos 6 caracteres
                        </Alert>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
                        Cancelar
                    </Button>
                    <Button 
                        variant="warning" 
                        onClick={handleChangePassword}
                        disabled={
                            !passwordData.nuevaPassword || 
                            !passwordData.confirmarPassword ||
                            passwordData.nuevaPassword !== passwordData.confirmarPassword ||
                            passwordData.nuevaPassword.length < 6
                        }
                    >
                        <i className="fas fa-key me-2"></i>
                        Cambiar Contraseña
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default UsuariosManagement;