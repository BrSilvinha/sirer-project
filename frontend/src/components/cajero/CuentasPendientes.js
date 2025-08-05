import React, { useState, useEffect, useCallback } from 'react';
import { 
    Container, Row, Col, Card, Badge, Button, Modal, 
    Form, Table, Spinner, InputGroup, ButtonGroup, Alert
} from 'react-bootstrap';
import { pedidosService, mesasService } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
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
    const [socketConnected, setSocketConnected] = useState(false);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [estadisticas, setEstadisticas] = useState({
        total_mesas: 0,
        total_a_cobrar: 0,
        promedio_cuenta: 0,
        mesa_mayor: null
    });

    // 🔌 Hook de Socket.io
    const { isConnected, on, off, emit } = useSocket();

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
                setLastUpdate(new Date().toLocaleTimeString());
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

            setLastUpdate(new Date().toLocaleTimeString());
            console.log(`✅ ${mesasConCuentasData.length} mesas con cuentas encontradas`);

        } catch (error) {
            console.error('Error fetching mesas con cuentas:', error);
            toast.error('Error al cargar las cuentas pendientes');
        } finally {
            setLoading(false);
        }
    }, [filtroMonto, verificarCuentasMesas]);

    // 🔌 Configurar eventos de Socket.io
    useEffect(() => {
        if (!isConnected) {
            setSocketConnected(false);
            return;
        }

        setSocketConnected(true);
        console.log('🔌 Cajero conectado a Socket.io');

        // ✅ EVENTO: Nuevo pedido creado
        const handleNuevoPedido = (data) => {
            console.log('🆕 Nuevo pedido detectado:', data);
            toast.success(`🆕 Nueva actividad en Mesa ${data.mesa?.numero || data.pedido?.mesa?.numero}`, {
                duration: 4000,
                icon: '📋'
            });
            
            // Actualizar cuentas después de un breve delay
            setTimeout(() => {
                fetchMesasConCuentas();
            }, 2000);
        };

        // ✅ EVENTO: Pedido listo para cobrar
        const handlePedidoListoCobrar = (data) => {
            console.log('💰 Pedido listo para cobrar:', data);
            
            // Notificación prominente
            toast.success(
                `💰 Mesa ${data.mesa} lista para cobrar - $${parseFloat(data.total).toFixed(2)}`,
                { 
                    duration: 8000,
                    icon: '💳',
                    style: {
                        background: '#28a745',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }
                }
            );
            
            // Actualizar lista inmediatamente
            fetchMesasConCuentas();
        };

        // ✅ EVENTO: Cuenta solicitada por mozo
        const handleCuentaSolicitada = (data) => {
            console.log('🧾 Cuenta solicitada:', data);
            
            toast.success(
                `🧾 Mesa ${data.mesa} solicita la cuenta`,
                { 
                    duration: 6000,
                    icon: '🧾',
                    style: {
                        background: '#ffc107',
                        color: '#212529'
                    }
                }
            );
            
            // Actualizar lista
            fetchMesasConCuentas();
        };

        // ✅ EVENTO: Cuenta actualizada (productos agregados)
        const handleCuentaActualizada = (data) => {
            console.log('🔄 Cuenta actualizada:', data);
            
            toast.info(
                `🔄 Mesa ${data.mesa?.numero} - Se agregaron ${data.productos_agregados} producto(s). Nuevo total: $${parseFloat(data.nuevo_total).toFixed(2)}`,
                { 
                    duration: 6000,
                    icon: '🔄'
                }
            );
            
            // Si es la mesa que estamos viendo, actualizar
            if (cuentaSeleccionada && cuentaSeleccionada.mesa.id === data.mesa?.id) {
                // Cerrar modal para evitar inconsistencias
                setShowPagoModal(false);
                resetFormularioPago();
                toast.info('💡 Mesa actualizada. Por favor, vuelve a abrir la cuenta.');
            }
            
            // Actualizar lista
            fetchMesasConCuentas();
        };

        // ✅ EVENTO: Mesa liberada (pago procesado)
        const handleMesaLiberada = (data) => {
            console.log('🏠 Mesa liberada:', data);
            
            toast.success(
                `✅ Mesa ${data.mesa} liberada - Pago procesado correctamente`,
                { 
                    duration: 4000,
                    icon: '✅'
                }
            );
            
            // Actualizar lista
            fetchMesasConCuentas();
        };

        // ✅ EVENTO: Estado de mesa actualizado
        const handleMesaEstadoActualizada = (data) => {
            console.log('🏠 Estado de mesa actualizado:', data);
            
            // Solo actualizar si es relevante para cajero
            if (data.nuevo_estado === 'cuenta_solicitada' || data.nuevo_estado === 'libre') {
                fetchMesasConCuentas();
            }
        };

        // ✅ EVENTO: Actividad general de mesa
        const handleActividadMesa = (data) => {
            console.log('📊 Actividad de mesa:', data);
            
            if (data.accion === 'nuevo_pedido') {
                // Actualizar después de un delay para dar tiempo a que se procese
                setTimeout(() => {
                    fetchMesasConCuentas();
                }, 1500);
            }
        };

        // ✅ EVENTO: Pedido entregado
        const handlePedidoEntregado = (data) => {
            console.log('✅ Pedido entregado:', data);
            
            if (data.listo_para_cobrar) {
                toast.success(
                    `✅ Mesa ${data.mesa} - Pedido entregado, listo para cobrar`,
                    { 
                        duration: 6000,
                        icon: '✅'
                    }
                );
                
                fetchMesasConCuentas();
            }
        };

        // ✅ REGISTRAR TODOS LOS EVENTOS
        on('actividad-mesa', handleActividadMesa);
        on('pedido-listo-para-cobrar', handlePedidoListoCobrar);
        on('cuenta-solicitada', handleCuentaSolicitada);
        on('cuenta-actualizada', handleCuentaActualizada);
        on('mesa-liberada', handleMesaLiberada);
        on('mesa-estado-actualizada', handleMesaEstadoActualizada);
        on('pedido-entregado', handlePedidoEntregado);
        on('nuevo-pedido', handleNuevoPedido);
        on('pedido-creado', handleNuevoPedido);

        // ✅ SOLICITAR ACTUALIZACIÓN AL CONECTARSE
        emit('solicitar-cuentas-pendientes');

        // Cleanup
        return () => {
            off('actividad-mesa', handleActividadMesa);
            off('pedido-listo-para-cobrar', handlePedidoListoCobrar);
            off('cuenta-solicitada', handleCuentaSolicitada);
            off('cuenta-actualizada', handleCuentaActualizada);
            off('mesa-liberada', handleMesaLiberada);
            off('mesa-estado-actualizada', handleMesaEstadoActualizada);
            off('pedido-entregado', handlePedidoEntregado);
            off('nuevo-pedido', handleNuevoPedido);
            off('pedido-creado', handleNuevoPedido);
        };
    }, [isConnected, on, off, emit, fetchMesasConCuentas, cuentaSeleccionada, resetFormularioPago]);

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
            
            // ✅ Emitir evento de socket
            if (emit) {
                emit('pago-procesado', {
                    mesa: cuentaSeleccionada.mesa.numero,
                    total: totalAPagar,
                    metodoPago: metodoPago,
                    cambio: cambio
                });
            }
            
            toast.success(
                `✅ Pago procesado correctamente. ${cambio > 0 ? `Cambio: $${cambio.toFixed(2)}` : ''}`,
                { duration: 8000 }
            );

            setShowPagoModal(false);
            resetFormularioPago();
            
            // Actualizar lista después de un breve delay
            setTimeout(() => {
                fetchMesasConCuentas();
            }, 1000);

        } catch (error) {
            console.error('Error processing payment:', error);
            toast.error('Error al procesar el pago');
        } finally {
            setProcesandoPago(false);
        }
    }, [cuentaSeleccionada, metodoPago, montoRecibido, observacionesPago, resetFormularioPago, fetchMesasConCuentas, emit]);

    const calcularCambio = useCallback(() => {
        if (!cuentaSeleccionada || metodoPago !== 'efectivo') return 0;
        const total = parseFloat(cuentaSeleccionada.cuenta.resumen.total_general);
        const recibido = parseFloat(montoRecibido) || 0;
        return Math.max(0, recibido - total);
    }, [cuentaSeleccionada, metodoPago, montoRecibido]);

    // ✅ Cargar datos inicial y configurar auto-refresh
    useEffect(() => {
        fetchMesasConCuentas();
        
        // Auto-refresh cada 30 segundos (reducido porque Socket.io maneja updates)
        const interval = setInterval(fetchMesasConCuentas, 30000);
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
                                {/* ✅ Indicador de conexión Socket.io */}
                                <Badge 
                                    bg={socketConnected ? 'success' : 'warning'} 
                                    className="ms-2 small"
                                >
                                    <i className={`fas ${socketConnected ? 'fa-wifi' : 'fa-wifi-slash'} me-1`}></i>
                                    {socketConnected ? 'Tiempo Real' : 'Sin conexión'}
                                </Badge>
                            </h2>
                            <p className="text-muted mb-0">
                                Procesa los pagos de las mesas con cuenta solicitada
                                {lastUpdate && (
                                    <small className="ms-2 text-info">
                                        • Última actualización: {lastUpdate}
                                    </small>
                                )}
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
                                disabled={loading}
                            >
                                <i className="fas fa-sync-alt me-1"></i>
                                Actualizar
                            </Button>
                        </div>
                    </div>

                    {/* ✅ Alerta de estado de conexión */}
                    {!socketConnected && (
                        <Alert variant="warning" className="mb-3">
                            <Alert.Heading className="h6">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Conexión en tiempo real no disponible
                            </Alert.Heading>
                            <p className="small mb-0">
                                Las actualizaciones automáticas están limitadas. Los cambios se mostrarán cada 30 segundos.
                            </p>
                        </Alert>
                    )}

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
                                    ✅ Sistema {socketConnected ? 'conectado en tiempo real' : 'actualizado'} - Verificación automática de mesas
                                </small>
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            ) : (
                <Row>
                    {mesasConCuentas.map((mesaConCuenta) => (
                        <Col lg={4} md={6} key={mesaConCuenta.mesa.id} className="mb-4">
                            <Card className="h-100 border-0 shadow-sm border-success border-2 hover-menu">
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
                                        <div className="d-flex flex-column align-items-end">
                                            <Badge 
                                                bg={mesaConCuenta.mesa.estado === 'cuenta_solicitada' ? 'warning' : 'info'}
                                                className="px-2 py-1 mb-1"
                                            >
                                                {mesaConCuenta.mesa.estado === 'cuenta_solicitada' ? 
                                                    'Cuenta Solicitada' : 'Ocupada'
                                                }
                                            </Badge>
                                            {socketConnected && (
                                                <Badge bg="light" text="dark" className="small">
                                                    <i className="fas fa-wifi text-success me-1"></i>
                                                    En vivo
                                                </Badge>
                                            )}
                                        </div>
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
                                            className="fw-bold pulse-menu"
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
            <Modal show={showPagoModal} onHide={() => setShowPagoModal(false)} size="lg" className="modal-menu">
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
                                <Table size="sm" className="table-menu mb-0">
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
                                            className="form-select-menu"
                                        >
                                            <option value="efectivo">💵 Efectivo</option>
                                            <option value="tarjeta_debito">💳 Tarjeta de Débito</option>
                                            <option value="tarjeta_credito">💳 Tarjeta de Crédito</option>
                                            <option value="transferencia">📱 Transferencia</option>
                                            <option value="yape">📱 Yape</option>
                                            <option value="plin">📱 Plin</option>
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
                                                    className="form-control-menu"
                                                />
                                            </InputGroup>
                                        </Form.Group>
                                    </Col>
                                )}
                            </Row>

                            {metodoPago === 'efectivo' && montoRecibido && (
                                <div className="alert alert-menu-info mb-3">
                                    <div className="d-flex justify-content-between align-items-center">
                                        <strong>
                                            <i className="fas fa-calculator me-2"></i>
                                            Cambio a entregar:
                                        </strong>
                                        <span className="h4 mb-0 text-success">
                                            ${calcularCambio().toFixed(2)}
                                        </span>
                                    </div>
                                    {calcularCambio() < 0 && (
                                        <div className="mt-2 text-danger small">
                                            <i className="fas fa-exclamation-triangle me-1"></i>
                                            El monto recibido es insuficiente
                                        </div>
                                    )}
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
                                    className="form-control-menu"
                                />
                            </Form.Group>

                            {/* ✅ Información adicional */}
                            <div className="bg-menu-light-gold p-3 rounded mb-3">
                                <h6 className="text-menu-dark mb-2">
                                    <i className="fas fa-info-circle me-2"></i>
                                    Información de la Mesa
                                </h6>
                                <Row>
                                    <Col md={6}>
                                        <small>
                                            <strong>Mesa:</strong> {cuentaSeleccionada.mesa.numero}<br />
                                            <strong>Capacidad:</strong> {cuentaSeleccionada.mesa.capacidad} personas<br />
                                            <strong>Estado:</strong> {cuentaSeleccionada.mesa.estado}
                                        </small>
                                    </Col>
                                    <Col md={6}>
                                        <small>
                                            <strong>Total Pedidos:</strong> {cuentaSeleccionada.cuenta.resumen.total_pedidos}<br />
                                            <strong>Total Items:</strong> {cuentaSeleccionada.cuenta.resumen.total_items}<br />
                                            <strong>Cuenta generada:</strong> {new Date(cuentaSeleccionada.cuenta.fecha_generacion).toLocaleString()}
                                        </small>
                                    </Col>
                                </Row>
                            </div>

                            {/* ✅ Estado de conexión en modal */}
                            {socketConnected && (
                                <div className="alert alert-menu-success small mb-3">
                                    <i className="fas fa-wifi me-2"></i>
                                    <strong>Conexión en tiempo real activa:</strong> Esta cuenta se actualizará automáticamente si se agregan más productos.
                                </div>
                            )}
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
                        disabled={procesandoPago}
                    >
                        Cancelar
                    </Button>
                    <Button 
                        variant="success" 
                        onClick={handleProcesarPago}
                        disabled={
                            procesandoPago || 
                            (metodoPago === 'efectivo' && (!montoRecibido || parseFloat(montoRecibido) < parseFloat(cuentaSeleccionada?.cuenta.resumen.total_general || 0)))
                        }
                        size="lg"
                        className="btn-menu-primary"
                    >
                        {procesandoPago ? (
                            <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Procesando pago...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-check me-2"></i>
                                Confirmar Pago ({metodoPago === 'efectivo' ? `${montoRecibido || '0.00'}` : `${parseFloat(cuentaSeleccionada?.cuenta.resumen.total_general || 0).toFixed(2)}`})
                            </>
                        )}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* ✅ Modal de conexión perdida */}
            <Modal show={!socketConnected && !loading} backdrop="static">
                <Modal.Header>
                    <Modal.Title>
                        <i className="fas fa-wifi-slash text-warning me-2"></i>
                        Conexión en tiempo real interrumpida
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <div className="text-center">
                        <i className="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                        <h5>Reconectando...</h5>
                        <p className="text-muted">
                            La conexión en tiempo real se interrumpió. Las actualizaciones automáticas están temporalmente deshabilitadas.
                        </p>
                        <div className="d-flex justify-content-center">
                            <Spinner animation="border" variant="warning" />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <Button 
                        variant="outline-warning" 
                        onClick={() => window.location.reload()}
                    >
                        <i className="fas fa-sync-alt me-2"></i>
                        Recargar Página
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default CuentasPendientes;