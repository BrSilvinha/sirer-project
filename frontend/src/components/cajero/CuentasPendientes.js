import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Modal, 
    Form, Table, Spinner, InputGroup, ButtonGroup
} from 'react-bootstrap';
import { pedidosService, mesasService } from '../../services/api';
import toast from 'react-hot-toast';

const CuentasPendientes = () => {
    const [mesasConCuentas, setMesasConCuentas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showPagoModal, setShowPagoModal] = useState(false);
    const [cuentaSeleccionada, setCuentaSeleccionada] = useState(null);
    const [metodoPago, setMetodoPago] = useState('efectivo');
    const [montoRecibido, setMontoRecibido] = useState('');
    const [observacionesPago, setObservacionesPago] = useState('');
    const [procesandoPago, setProcesandoPago] = useState(false);
    const [filtroMonto, setFiltroMonto] = useState('todos');
    const [estadisticas, setEstadisticas] = useState({
        total_mesas: 0,
        total_a_cobrar: 0,
        promedio_cuenta: 0,
        mesa_mayor: null
    });

    const resetFormularioPago = useCallback(() => {
        setCuentaSeleccionada(null);
        setMetodoPago('efectivo');
        setMontoRecibido('');
        setObservacionesPago('');
    }, []);

    const verificarCuentasMesas = useCallback(async (mesas) => {
        const mesasConCuentasData = [];
        
        // Filtrar mesas que podrían tener cuentas pendientes
        const mesasCandidatas = mesas.filter(mesa => 
            mesa.estado === 'cuenta_solicitada' || mesa.estado === 'ocupada'
        );

        console.log(`🔍 Verificando ${mesasCandidatas.length} mesas candidatas de ${mesas.length} total`);

        // Procesar en lotes para reducir carga
        for (let i = 0; i < mesasCandidatas.length; i += 3) {
            const lote = mesasCandidatas.slice(i, i + 3);
            
            const promesasLote = lote.map(async (mesa) => {
                try {
                    const cuentaResponse = await pedidosService.getCuenta(mesa.id);
                    return {
                        mesa,
                        cuenta: cuentaResponse.data.data
                    };
                } catch (error) {
                    // Mesa sin cuenta pendiente - esto es normal
                    return null;
                }
            });

            const resultadosLote = await Promise.all(promesasLote);
            
            // Agregar solo las mesas con cuentas válidas
            resultadosLote.forEach(resultado => {
                if (resultado) {
                    mesasConCuentasData.push(resultado);
                }
            });

            // Pausa entre lotes para no sobrecargar
            if (i + 3 < mesasCandidatas.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return mesasConCuentasData;
    }, []);

    const fetchMesasConCuentas = useCallback(async () => {
        try {
            setLoading(true);
            
            // Obtener todas las mesas activas
            const mesasResponse = await mesasService.getAll();
            const todasLasMesas = mesasResponse.data.data;
            
            // Filtrar mesas activas que podrían tener cuentas
            const mesasPotenciales = todasLasMesas.filter(mesa => 
                mesa.activa && (mesa.estado === 'cuenta_solicitada' || mesa.estado === 'ocupada')
            );

            console.log(`📊 ${mesasPotenciales.length} mesas potenciales de ${todasLasMesas.length} total`);

            if (mesasPotenciales.length === 0) {
                setMesasConCuentas([]);
                setEstadisticas({
                    total_mesas: 0,
                    total_a_cobrar: 0,
                    promedio_cuenta: 0,
                    mesa_mayor: null
                });
                return;
            }

            // Verificar cuentas de forma optimizada
            const mesasConCuentasData = await verificarCuentasMesas(mesasPotenciales);

            // Aplicar filtros
            let mesasFiltradas = mesasConCuentasData;
            if (filtroMonto === 'menores') {
                mesasFiltradas = mesasConCuentasData.filter(m => m.cuenta.resumen.total_general < 50);
            } else if (filtroMonto === 'mayores') {
                mesasFiltradas = mesasConCuentasData.filter(m => m.cuenta.resumen.total_general >= 50);
            }

            setMesasConCuentas(mesasFiltradas);

            // Calcular estadísticas
            if (mesasConCuentasData.length > 0) {
                const totalACobrar = mesasConCuentasData.reduce((sum, m) => 
                    sum + parseFloat(m.cuenta.resumen.total_general), 0
                );
                const promedio = totalACobrar / mesasConCuentasData.length;
                const mesaMayor = mesasConCuentasData.reduce((max, current) => 
                    parseFloat(current.cuenta.resumen.total_general) > parseFloat(max.cuenta.resumen.total_general) 
                        ? current : max
                );

                setEstadisticas({
                    total_mesas: mesasConCuentasData.length,
                    total_a_cobrar: totalACobrar,
                    promedio_cuenta: promedio,
                    mesa_mayor: mesaMayor
                });
            } else {
                setEstadisticas({
                    total_mesas: 0,
                    total_a_cobrar: 0,
                    promedio_cuenta: 0,
                    mesa_mayor: null
                });
            }

            console.log(`✅ ${mesasConCuentasData.length} mesas con cuentas encontradas`);

        } catch (error) {
            console.error('Error fetching mesas con cuentas:', error);
            toast.error('Error al cargar las cuentas pendientes');
        } finally {
            setLoading(false);
        }
    }, [filtroMonto, verificarCuentasMesas]);

    const handleVerCuentaDetalle = useCallback((mesaConCuenta) => {
        setCuentaSeleccionada(mesaConCuenta);
        setShowPagoModal(true);
        setMontoRecibido(mesaConCuenta.cuenta.resumen.total_general.toString());
    }, []);

    const handleProcesarPago = useCallback(async () => {
        if (!cuentaSeleccionada) return;

        const totalAPagar = parseFloat(cuentaSeleccionada.cuenta.resumen.total_general);
        const montoRecibidoNum = parseFloat(montoRecibido);

        if (metodoPago === 'efectivo' && montoRecibidoNum < totalAPagar) {
            toast.error('El monto recibido es insuficiente');
            return;
        }

        setProcesandoPago(true);
        try {
            await pedidosService.procesarPago(cuentaSeleccionada.mesa.id, {
                metodo_pago: metodoPago,
                monto_recibido: metodoPago === 'efectivo' ? montoRecibidoNum : totalAPagar,
                observaciones_pago: observacionesPago
            });

            const cambio = metodoPago === 'efectivo' ? montoRecibidoNum - totalAPagar : 0;
            
            toast.success(
                `Pago procesado correctamente. ${cambio > 0 ? `Cambio: ${cambio.toFixed(2)}` : ''}`,
                { duration: 6000 }
            );

            setShowPagoModal(false);
            resetFormularioPago();
            fetchMesasConCuentas();

        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error('Error al procesar el pago');
        } finally {
            setProcesandoPago(false);
        }
    }, [cuentaSeleccionada, metodoPago, montoRecibido, observacionesPago, resetFormularioPago, fetchMesasConCuentas]);

    const calcularCambio = useCallback(() => {
        if (!cuentaSeleccionada || metodoPago !== 'efectivo') return 0;
        const total = parseFloat(cuentaSeleccionada.cuenta.resumen.total_general);
        const recibido = parseFloat(montoRecibido) || 0;
        return Math.max(0, recibido - total);
    }, [cuentaSeleccionada, metodoPago, montoRecibido]);

    useEffect(() => {
        fetchMesasConCuentas();
        
        // Auto-refresh cada 45 segundos
        const interval = setInterval(fetchMesasConCuentas, 45000);
        return () => clearInterval(interval);
    }, [fetchMesasConCuentas]);

    if (loading) {
        return (
            <Container>
                <div className="text-center py-5">
                    <Spinner animation="border" variant="success" size="lg" />
                    <p className="mt-3 h5">Cargando cuentas pendientes...</p>
                    <p className="text-muted">Verificando mesas con actividad...</p>
                </div>
            </Container>
        );
    }

    return (
        <Container fluid>
            {/* Header */}
            <Row className="mb-4">
                <Col>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <div>
                            <h2 className="mb-1">
                                <i className="fas fa-cash-register text-success me-2"></i>
                                Cuentas por Cobrar
                            </h2>
                            <p className="text-muted mb-0">
                                Procesa los pagos de las mesas con cuenta solicitada
                            </p>
                        </div>
                        
                        <div className="d-flex gap-2">
                            <ButtonGroup size="sm">
                                <Button 
                                    variant={filtroMonto === 'todos' ? 'success' : 'outline-success'}
                                    onClick={() => setFiltroMonto('todos')}
                                >
                                    Todas
                                </Button>
                                <Button 
                                    variant={filtroMonto === 'menores' ? 'success' : 'outline-success'}
                                    onClick={() => setFiltroMonto('menores')}
                                >
                                    &lt; $50
                                </Button>
                                <Button 
                                    variant={filtroMonto === 'mayores' ? 'success' : 'outline-success'}
                                    onClick={() => setFiltroMonto('mayores')}
                                >
                                    ≥ $50
                                </Button>
                            </ButtonGroup>
                            
                            <Button 
                                variant="outline-info" 
                                size="sm"
                                onClick={fetchMesasConCuentas}
                            >
                                <i className="fas fa-sync-alt me-1"></i>
                                Actualizar
                            </Button>
                        </div>
                    </div>

                    {/* Estadísticas */}
                    <Row>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-primary bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-table fa-2x text-primary mb-2"></i>
                                    <div className="h3 mb-0 text-primary">{estadisticas.total_mesas}</div>
                                    <div className="small text-muted">Mesas Pendientes</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-success bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-dollar-sign fa-2x text-success mb-2"></i>
                                    <div className="h3 mb-0 text-success">
                                        ${estadisticas.total_a_cobrar.toFixed(2)}
                                    </div>
                                    <div className="small text-muted">Total a Cobrar</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-info bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-chart-line fa-2x text-info mb-2"></i>
                                    <div className="h3 mb-0 text-info">
                                        ${estadisticas.promedio_cuenta.toFixed(2)}
                                    </div>
                                    <div className="small text-muted">Promedio por Mesa</div>
                                </Card.Body>
                            </Card>
                        </Col>
                        <Col md={3}>
                            <Card className="border-0 shadow-sm bg-warning bg-opacity-10">
                                <Card.Body className="text-center py-3">
                                    <i className="fas fa-crown fa-2x text-warning mb-2"></i>
                                    <div className="h3 mb-0 text-warning">
                                        {estadisticas.mesa_mayor ? 
                                            `Mesa ${estadisticas.mesa_mayor.mesa.numero}` : 
                                            'N/A'
                                        }
                                    </div>
                                    <div className="small text-muted">Cuenta Mayor</div>
                                </Card.Body>
                            </Card>
                        </Col>
                    </Row>
                </Col>
            </Row>

            {/* Lista de cuentas */}
            {mesasConCuentas.length === 0 ? (
                <Row>
                    <Col>
                        <Card className="border-0 shadow-sm">
                            <Card.Body className="text-center py-5">
                                <i className="fas fa-check-circle fa-4x text-success mb-4"></i>
                                <h4>¡Excelente trabajo! 🎉</h4>
                                <p className="text-muted mb-0">
                                    No hay cuentas pendientes por cobrar.
                                </p>
                                <small className="text-muted d-block mt-2">
                                    ✅ Sistema actualizado - Verificación automática de mesas
                                </small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Row>
                    {mesasConCuentas.map((mesaConCuenta) => (
                        <Col lg={4} md={6} key={mesaConCuenta.mesa.id} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm border-success border-2">
                                <Card.Header className="bg-success text-white">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <div>
                                            <h5 className="mb-0">
                                                <i className="fas fa-table me-2"></i>
                                                Mesa {mesaConCuenta.mesa.numero}
                                            </h5>
                                            <small className="opacity-75">
                                                {mesaConCuenta.mesa.capacidad} personas
                                            </small>
                                        </div>
                                        <Badge 
                                            bg={mesaConCuenta.mesa.estado === 'cuenta_solicitada' ? 'warning' : 'info'}
                                            className="px-2 py-1"
                                        >
                                            {mesaConCuenta.mesa.estado === 'cuenta_solicitada' ? 
                                                'Cuenta Solicitada' : 'Ocupada'
                                            }
                                        </Badge>
                                    </div>
                                </Card.Header>

                                <Card.Body>
                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <strong className="text-muted small">RESUMEN:</strong>
                                            <span className="badge bg-light text-dark">
                                                {mesaConCuenta.cuenta.resumen.total_pedidos} pedido(s)
                                            </span>
                                        </div>

                                        <div className="bg-light p-3 rounded">
                                            <div className="d-flex justify-content-between mb-1">
                                                <span>Items totales:</span>
                                                <span>{mesaConCuenta.cuenta.resumen.total_items}</span>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <span>Subtotal:</span>
                                                <span>${mesaConCuenta.cuenta.resumen.total_general}</span>
                                            </div>
                                            <hr className="my-2" />
                                            <div className="d-flex justify-content-between">
                                                <strong>TOTAL:</strong>
                                                <strong className="text-success h5 mb-0">
                                                    ${parseFloat(mesaConCuenta.cuenta.resumen.total_general).toFixed(2)}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <strong className="text-muted small">PRODUCTOS MÁS PEDIDOS:</strong>
                                        <div className="mt-1">
                                            {mesaConCuenta.cuenta.resumen.productos.slice(0, 3).map((producto, index) => (
                                                <div key={index} className="d-flex justify-content-between small">
                                                    <span>• {producto.producto.nombre}</span>
                                                    <span className="text-muted">
                                                        {producto.cantidad}x - ${parseFloat(producto.subtotal).toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                            {mesaConCuenta.cuenta.resumen.productos.length > 3 && (
                                                <small className="text-muted">
                                                    + {mesaConCuenta.cuenta.resumen.productos.length - 3} productos más...
                                                </small>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <div className="d-flex justify-content-between small">
                                            <strong className="text-muted">HORA SOLICITUD:</strong>
                                            <span>{new Date(mesaConCuenta.cuenta.fecha_generacion).toLocaleTimeString()}</span>
                                        </div>
                                    </div>

                                    <div className="d-grid">
                                        <Button
                                            variant="success"
                                            size="lg"
                                            onClick={() => handleVerCuentaDetalle(mesaConCuenta)}
                                            className="fw-bold"
                                        >
                                            <i className="fas fa-credit-card me-2"></i>
                                            Procesar Pago
                                        </Button>
                                    </div>
                                </Card.Body>
                            </Card>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Modal de procesamiento de pago */}
            <Modal show={showPagoModal} onHide={() => setShowPagoModal(false)} size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>
                        <i className="fas fa-cash-register me-2"></i>
                        Procesar Pago - Mesa {cuentaSeleccionada?.mesa.numero}
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {cuentaSeleccionada && (
                        <>
                            <div className="bg-light p-3 rounded mb-4">
                                <h6 className="mb-3">Resumen de la Cuenta:</h6>
                                <Table size="sm" className="mb-0">
                                    <thead>
                                        <tr>
                                            <th>Producto</th>
                                            <th>Cant.</th>
                                            <th>Precio</th>
                                            <th>Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cuentaSeleccionada.cuenta.resumen.productos.map((producto, index) => (
                                            <tr key={index}>
                                                <td>{producto.producto.nombre}</td>
                                                <td>{producto.cantidad}</td>
                                                <td>${parseFloat(producto.producto.precio).toFixed(2)}</td>
                                                <td>${parseFloat(producto.subtotal).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="table-success">
                                            <th colSpan="3">TOTAL:</th>
                                            <th>${parseFloat(cuentaSeleccionada.cuenta.resumen.total_general).toFixed(2)}</th>
                                        </tr>
                                    </tfoot>
                                </Table>
                            </div>

                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3">
                                        <Form.Label><strong>Método de Pago:</strong></Form.Label>
                                        <Form.Select
                                            value={metodoPago}
                                            onChange={(e) => setMetodoPago(e.target.value)}
                                        >
                                            <option value="efectivo">💵 Efectivo</option>
                                            <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                                            <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                                            <option value="transferencia">📱 Transferencia</option>
                                            <option value="otro">🔄 Otro</option>
                                        </Form.Select>
                                    </Form.Group>
                                </Col>
                                
                                {metodoPago === 'efectivo' && (
                                    <Col md={6}>
                                        <Form.Group className="mb-3">
                                            <Form.Label><strong>Monto Recibido:</strong></Form.Label>
                                            <InputGroup>
                                                <InputGroup.Text>$</InputGroup.Text>
                                                <Form.Control
                                                    type="number"
                                                    step="0.01"
                                                    value={montoRecibido}
                                                    onChange={(e) => setMontoRecibido(e.target.value)}
                                                    placeholder="0.00"
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                )}
                            </Row>

                            {metodoPago === 'efectivo' && montoRecibido && (
                                <div className="alert alert-info mb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <strong>Cambio a entregar:</strong>
                                        <span className="h5 mb-0 text-success">
                                            ${calcularCambio().toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            )}

                            <Form.Group className="mb-3">
                                <Form.Label><strong>Observaciones (opcional):</strong></Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={2}
                                    value={observacionesPago}
                                    onChange={(e) => setObservacionesPago(e.target.value)}
                                    placeholder="Notas adicionales sobre el pago..."
                                />
                            </Form.Group>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="secondary" 
                        onClick={() => {
                            setShowPagoModal(false);
                            resetFormularioPago();
                        }}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={handleProcesarPago}
                        disabled={procesandoPago || (metodoPago === 'efectivo' && !montoRecibido)}
                        size="lg"
                    >
                        {procesandoPago ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Procesando...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check me-2"></i>
                                Confirmar Pago
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CuentasPendientes;