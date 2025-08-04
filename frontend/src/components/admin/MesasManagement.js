import React, { useState, useEffect } from 'react';
import { 
    Container, Row, Col, Card, Button, Modal, Form, Badge, 
    Spinner, Table, Dropdown, ButtonGroup 
} from 'react-bootstrap';
import { mesasService } from '../../services/api';
import toast from 'react-hot-toast';

const MesasManagement = () => {
    const [mesas, setMesas] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingMesa, setEditingMesa] = useState(null);
    const [formData, setFormData] = useState({
        numero: '',
        capacidad: 4
    });
    const [view, setView] = useState('grid'); // 'grid' o 'table'

    useEffect(() => {
        fetchMesas();
        fetchEstadisticas();
        // Auto-refresh cada 30 segundos
        const interval = setInterval(() => {
            fetchMesas();
            fetchEstadisticas();
        }, 30000);
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

    const handleShowModal = (mesa = null) => {
        if (mesa) {
            setEditingMesa(mesa);
            setFormData({
                numero: mesa.numero,
                capacidad: mesa.capacidad
            });
        } else {
            setEditingMesa(null);
            setFormData({
                numero: '',
                capacidad: 4
            });
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingMesa(null);
        setFormData({ numero: '', capacidad: 4 });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        try {
            if (editingMesa) {
                await mesasService.update(editingMesa.id, formData);
                toast.success('Mesa actualizada exitosamente');
            } else {
                await mesasService.create(formData);
                toast.success('Mesa creada exitosamente');
            }
            
            handleCloseModal();
            fetchMesas();
            fetchEstadisticas();
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Error al guardar mesa';
            toast.error(errorMessage);
        }
    };

    const handleDelete = async (mesa) => {
        if (window.confirm(`¿Estás seguro de eliminar la Mesa ${mesa.numero}?`)) {
            try {
                await mesasService.delete(mesa.id);
                toast.success('Mesa eliminada exitosamente');
                fetchMesas();
                fetchEstadisticas();
            } catch (error) {
                const errorMessage = error.response?.data?.error || 'Error al eliminar mesa';
                toast.error(errorMessage);
            }
        }
    };

    const handleChangeStatus = async (mesa, nuevoEstado) => {
        try {
            await mesasService.changeStatus(mesa.id, nuevoEstado);
            toast.success(`Mesa ${mesa.numero} marcada como ${nuevoEstado}`);
            fetchMesas();
            fetchEstadisticas();
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Error al cambiar estado';
            toast.error(errorMessage);
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
                            <h2 className="mb-1">Gestión de Mesas</h2>
                            <p className="text-muted mb-0">
                                Administra las mesas del restaurante
                            </p>
                        </div>
                        <div className="d-flex gap-2">
                            <ButtonGroup>
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
                                Nueva Mesa
                            </Button>
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Estadísticas */}
            {estadisticas && (
                <Row className="mb-4">
                    <Col md={3}>
                        <Card className="border-0 shadow-sm">
                            <Card.Body>
                                <div className="d-flex align-items-center">
                                    <div className="bg-danger rounded-circle p-3 me-3">
                                        <i className="fas fa-users text-white"></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small">Ocupadas</div>
                                        <div className="h4 mb-0">{estadisticas.ocupadas}</div>
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
                                        <i className="fas fa-percentage text-white"></i>
                                    </div>
                                    <div>
                                        <div className="text-muted small">Ocupación</div>
                                        <div className="h4 mb-0">{estadisticas.porcentaje_ocupacion}%</div>
                                    </div>
                                </div>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Vista Grid */}
            {view === 'grid' && (
                <Row>
                    {mesas.map((mesa) => (
                        <Col lg={3} md={4} sm={6} key={mesa.id} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm">
                                <Card.Body className="text-center">
                                    <div className="mb-3">
                                        <div 
                                            className={`rounded-circle mx-auto d-flex align-items-center justify-content-center bg-${getEstadoColor(mesa.estado)}`}
                                            style={{ width: '80px', height: '80px' }}
                                        >
                                            <i className={`fas ${getEstadoIcon(mesa.estado)} text-white fa-2x`}></i>
                                        </div>
                                    </div>
                                    
                                    <h5 className="mb-2">Mesa {mesa.numero}</h5>
                                    <p className="text-muted mb-2">
                                        <i className="fas fa-users me-1"></i>
                                        {mesa.capacidad} personas
                                    </p>
                                    
                                    <Badge 
                                        bg={getEstadoColor(mesa.estado)} 
                                        className="mb-3"
                                    >
                                        {getEstadoText(mesa.estado)}
                                    </Badge>

                                    <div className="d-grid gap-2">
                                        <Dropdown>
                                            <Dropdown.Toggle 
                                                variant="outline-primary" 
                                                size="sm" 
                                                className="w-100"
                                            >
                                                Cambiar Estado
                                            </Dropdown.Toggle>
                                            <Dropdown.Menu>
                                                <Dropdown.Item
                                                    onClick={() => handleChangeStatus(mesa, 'libre')}
                                                    disabled={mesa.estado === 'libre'}
                                                >
                                                    <i className="fas fa-check-circle text-success me-2"></i>
                                                    Libre
                                                </Dropdown.Item>
                                                <Dropdown.Item
                                                    onClick={() => handleChangeStatus(mesa, 'ocupada')}
                                                    disabled={mesa.estado === 'ocupada'}
                                                >
                                                    <i className="fas fa-users text-danger me-2"></i>
                                                    Ocupada
                                                </Dropdown.Item>
                                                <Dropdown.Item
                                                    onClick={() => handleChangeStatus(mesa, 'cuenta_solicitada')}
                                                    disabled={mesa.estado === 'cuenta_solicitada'}
                                                >
                                                    <i className="fas fa-credit-card text-warning me-2"></i>
                                                    Cuenta Solicitada
                                                </Dropdown.Item>
                                            </Dropdown.Menu>
                                        </Dropdown>

                                        <div className="d-flex gap-1">
                                            <Button
                                                variant="outline-secondary"
                                                size="sm"
                                                className="flex-fill"
                                                onClick={() => handleShowModal(mesa)}
                                            >
                                                <i className="fas fa-edit"></i>
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                className="flex-fill"
                                                onClick={() => handleDelete(mesa)}
                                                disabled={mesa.estado !== 'libre'}
                                            >
                                                <i className="fas fa-trash"></i>
                                            </Button>
                                        </div>
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
                                    <th>Mesa</th>
                                    <th>Capacidad</th>
                                    <th>Estado</th>
                                    <th>Última Actualización</th>
                                    <th>Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mesas.map((mesa) => (
                                    <tr key={mesa.id}>
                                        <td>
                                            <strong>Mesa {mesa.numero}</strong>
                                        </td>
                                        <td>
                                            <i className="fas fa-users me-1 text-muted"></i>
                                            {mesa.capacidad} personas
                                        </td>
                                        <td>
                                            <Badge bg={getEstadoColor(mesa.estado)}>
                                                <i className={`fas ${getEstadoIcon(mesa.estado)} me-1`}></i>
                                                {getEstadoText(mesa.estado)}
                                            </Badge>
                                        </td>
                                        <td className="text-muted">
                                            {new Date(mesa.updatedAt).toLocaleString()}
                                        </td>
                                        <td>
                                            <div className="d-flex gap-1">
                                                <Dropdown>
                                                    <Dropdown.Toggle 
                                                        variant="outline-primary" 
                                                        size="sm"
                                                    >
                                                        Estado
                                                    </Dropdown.Toggle>
                                                    <Dropdown.Menu>
                                                        <Dropdown.Item
                                                            onClick={() => handleChangeStatus(mesa, 'libre')}
                                                            disabled={mesa.estado === 'libre'}
                                                        >
                                                            Libre
                                                        </Dropdown.Item>
                                                        <Dropdown.Item
                                                            onClick={() => handleChangeStatus(mesa, 'ocupada')}
                                                            disabled={mesa.estado === 'ocupada'}
                                                        >
                                                            Ocupada
                                                        </Dropdown.Item>
                                                        <Dropdown.Item
                                                            onClick={() => handleChangeStatus(mesa, 'cuenta_solicitada')}
                                                            disabled={mesa.estado === 'cuenta_solicitada'}
                                                        >
                                                            Cuenta Solicitada
                                                        </Dropdown.Item>
                                                    </Dropdown.Menu>
                                                </Dropdown>

                                                <Button
                                                    variant="outline-secondary"
                                                    size="sm"
                                                    onClick={() => handleShowModal(mesa)}
                                                >
                                                    <i className="fas fa-edit"></i>
                                                </Button>
                                                <Button
                                                    variant="outline-danger"
                                                    size="sm"
                                                    onClick={() => handleDelete(mesa)}
                                                    disabled={mesa.estado !== 'libre'}
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

            {/* Modal para Crear/Editar Mesa */}
            <Modal show={showModal} onHide={handleCloseModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        {editingMesa ? 'Editar Mesa' : 'Nueva Mesa'}
                    </Modal.Title>
                </Modal.Header>
                <Form onSubmit={handleSubmit}>
                    <Modal.Body>
                        <Row>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Número de Mesa</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={formData.numero}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            numero: parseInt(e.target.value) || ''
                                        })}
                                        required
                                        min="1"
                                        max="999"
                                    />
                                </Form.Group>
                            </Col>
                            <Col md={6}>
                                <Form.Group className="mb-3">
                                    <Form.Label>Capacidad</Form.Label>
                                    <Form.Select
                                        value={formData.capacidad}
                                        onChange={(e) => setFormData({
                                            ...formData,
                                            capacidad: parseInt(e.target.value)
                                        })}
                                        required
                                    >
                                        {[1,2,3,4,5,6,7,8,9,10,12,14,16,18,20].map(num => (
                                            <option key={num} value={num}>
                                                {num} persona{num !== 1 ? 's' : ''}
                                            </option>
                                        ))}
                                    </Form.Select>
                                </Form.Group>
                            </Col>
                        </Row>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={handleCloseModal}>
                            Cancelar
                        </Button>
                        <Button variant="primary" type="submit">
                            {editingMesa ? 'Actualizar' : 'Crear'} Mesa
                        </Button>
                    </Modal.Footer>
                </Form>
            </Modal>
        </Container>
    );
};

export default MesasManagement;