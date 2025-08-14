// 🍽️ ARCHIVO: backend/controllers/pedidosController.js - VERSIÓN COMPLETA CORREGIDA

const { Pedido, DetallePedido, Mesa, Usuario, Producto, Categoria } = require('../models/associations');
const { Op } = require('sequelize');

// Obtener todos los pedidos con filtros
const obtenerPedidos = async (req, res) => {
    try {
        const { 
            estado, 
            mesa_id, 
            fecha_desde, 
            fecha_hasta, 
            mozo_id,
            busqueda,
            page = 1, 
            limit = 10 
        } = req.query;

        const whereClause = {};
        const offset = (page - 1) * limit;

        // ✅ FILTRO POR MOZO: Si es mozo, solo ver sus pedidos
        if (req.user.rol === 'mozo') {
            whereClause.usuario_id = req.user.id;
        } else if (mozo_id) {
            whereClause.usuario_id = mozo_id;
        }

        // Filtros adicionales
        if (estado) {
            whereClause.estado = estado;
        }
        
        if (mesa_id) {
            whereClause.mesa_id = mesa_id;
        }

        // ✅ FILTRO DE FECHAS CORREGIDO
        if (fecha_desde) {
            if (!whereClause.created_at) whereClause.created_at = {};
            whereClause.created_at[Op.gte] = new Date(fecha_desde + 'T00:00:00');
        }
        if (fecha_hasta) {
            if (!whereClause.created_at) whereClause.created_at = {};
            whereClause.created_at[Op.lte] = new Date(fecha_hasta + 'T23:59:59');
        }

        // ✅ BÚSQUEDA por mesa o ID
        if (busqueda) {
            const searchConditions = [];
            
            // Buscar por ID de pedido
            if (!isNaN(busqueda)) {
                searchConditions.push({ id: parseInt(busqueda) });
            }
            
            // Buscar por número de mesa
            searchConditions.push({
                'S/mesa.numeroS/': {
                    [Op.like]: `%${busqueda}%`
                }
            });

            whereClause[Op.or] = searchConditions;
        }

        const { count, rows: pedidos } = await Pedido.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad']
                },
                {
                    model: Usuario,
                    as: 'mozo',
                    attributes: ['id', 'nombre', 'email']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio'],
                        include: [{
                            model: Categoria,
                            as: 'categoria',
                            attributes: ['id', 'nombre']
                        }]
                    }]
                }
            ],
            order: [['created_at', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

        res.json({
            success: true,
            data: pedidos,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        console.error('Error obteniendo pedidos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener pedidos por mesa
const obtenerPedidosPorMesa = async (req, res) => {
    try {
        const { mesa_id } = req.params;
        const { incluir_pagados = false } = req.query;

        const whereClause = { mesa_id };
        
        if (!incluir_pagados) {
            whereClause.estado = {
                [Op.ne]: 'pagado'
            };
        }

        const pedidos = await Pedido.findAll({
            where: whereClause,
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad']
                },
                {
                    model: Usuario,
                    as: 'mozo',
                    attributes: ['id', 'nombre']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio'],
                        include: [{
                            model: Categoria,
                            as: 'categoria',
                            attributes: ['id', 'nombre']
                        }]
                    }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: pedidos
        });
    } catch (error) {
        console.error('Error obteniendo pedidos por mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener pedidos para cocina
const obtenerPedidosCocina = async (req, res) => {
    try {
        const pedidos = await Pedido.findAll({
            where: {
                estado: {
                    [Op.in]: ['nuevo', 'preparando']
                }
            },
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad']
                },
                {
                    model: Usuario,
                    as: 'mozo',
                    attributes: ['id', 'nombre']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio'],
                        include: [{
                            model: Categoria,
                            as: 'categoria',
                            attributes: ['id', 'nombre']
                        }]
                    }]
                }
            ],
            order: [['created_at', 'ASC']] // Los más antiguos primero para cocina
        });

        res.json({
            success: true,
            data: pedidos
        });
    } catch (error) {
        console.error('Error obteniendo pedidos de cocina:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// ✅ CORREGIDO: Crear nuevo pedido con notificaciones Socket.io mejoradas
const crearPedido = async (req, res) => {
    try {
        const { mesa_id, productos, observaciones } = req.body;
        const usuario_id = req.user.id;

        console.log('🍽️ Creando pedido:', { mesa_id, productos, observaciones, usuario_id });

        // Verificar que la mesa existe
        const mesa = await Mesa.findByPk(mesa_id);
        if (!mesa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        // Validar productos
        if (!productos || productos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Debe incluir al menos un producto'
            });
        }

        // Calcular total y validar productos
        let total = 0;
        const productosValidados = [];

        for (const item of productos) {
            const producto = await Producto.findByPk(item.producto_id);
            if (!producto || !producto.activo) {
                return res.status(400).json({
                    success: false,
                    error: `Producto con ID ${item.producto_id} no encontrado o inactivo`
                });
            }

            if (!producto.disponible) {
                return res.status(400).json({
                    success: false,
                    error: `Producto "${producto.nombre}" no está disponible`
                });
            }

            const cantidad = parseInt(item.cantidad);
            if (cantidad <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'La cantidad debe ser mayor a 0'
                });
            }

            const subtotal = parseFloat(producto.precio) * cantidad;
            total += subtotal;

            productosValidados.push({
                producto_id: producto.id,
                cantidad,
                precio_unitario: producto.precio,
                subtotal
            });
        }

        // Crear pedido
        const nuevoPedido = await Pedido.create({
            mesa_id,
            usuario_id,
            observaciones,
            estado: 'nuevo',
            total
        });

        // Crear detalles del pedido
        const detallesCreados = [];
        for (const detalle of productosValidados) {
            const detalleCreado = await DetallePedido.create({
                pedido_id: nuevoPedido.id,
                ...detalle
            });
            detallesCreados.push(detalleCreado);
        }

        // Cambiar estado de mesa a ocupada si estaba libre
        if (mesa.estado === 'libre') {
            await mesa.update({ estado: 'ocupada' });
        }

        // Obtener pedido completo para respuesta
        const pedidoCompleto = await Pedido.findByPk(nuevoPedido.id, {
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad']
                },
                {
                    model: Usuario,
                    as: 'mozo',
                    attributes: ['id', 'nombre']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio'],
                        include: [{
                            model: Categoria,
                            as: 'categoria',
                            attributes: ['id', 'nombre']
                        }]
                    }]
                }
            ]
        });

        // ✅ CORREGIDO: Emitir eventos de socket correctamente
        if (req.io) {
            console.log('📡 Emitiendo eventos Socket.io para nuevo pedido...');
            
            // 1. Notificar a COCINA - NUEVO PEDIDO (Principal)
            req.io.to('cocina').emit('nuevo-pedido', {
                pedido: pedidoCompleto,
                sonido: true,
                timestamp: new Date().toISOString()
            });

            // 2. ✅ AGREGADO: Notificar a CAJEROS sobre nueva actividad en mesa
            req.io.to('cajero').emit('actividad-mesa', {
                mesa: pedidoCompleto.mesa,
                accion: 'nuevo_pedido',
                total: pedidoCompleto.total,
                mozo: pedidoCompleto.mozo.nombre,
                pedido_id: pedidoCompleto.id,
                productos: pedidoCompleto.detalles.length,
                timestamp: new Date().toISOString()
            });

            // 3. ✅ AGREGADO: Notificar a ADMINISTRADORES
            req.io.to('administrador').emit('pedido-creado', {
                pedido: pedidoCompleto,
                timestamp: new Date().toISOString()
            });

            // 4. ✅ AGREGADO: Notificar cambio de estado de mesa
            req.io.emit('mesa-estado-actualizada', {
                mesa_id: mesa.id,
                mesa_numero: mesa.numero,
                nuevo_estado: 'ocupada',
                timestamp: new Date().toISOString()
            });

            console.log('✅ Eventos Socket.io emitidos correctamente');
        } else {
            console.warn('⚠️ req.io no disponible, eventos no emitidos');
        }

        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: pedidoCompleto
        });

    } catch (error) {
        console.error('❌ Error creando pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// ✅ CORREGIDO: Cambiar estado de pedido con notificaciones mejoradas
const cambiarEstadoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['nuevo', 'preparando', 'listo', 'entregado', 'pagado'];
        
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido'
            });
        }

        const pedido = await Pedido.findByPk(id, {
            include: [
                {
                    model: Mesa,
                    as: 'mesa'
                },
                {
                    model: Usuario,
                    as: 'mozo'
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto'
                    }]
                }
            ]
        });
        
        if (!pedido) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        const estadoAnterior = pedido.estado;
        await pedido.update({ estado });

        // ✅ CORREGIDO: Emitir eventos específicos según el cambio de estado
        if (req.io) {
            console.log(`📡 Emitiendo evento por cambio de estado: ${estadoAnterior} → ${estado}`);

            switch (estado) {
                case 'preparando':
                    // Notificar que pedido fue tomado por cocina
                    req.io.to('mozo').emit('pedido-tomado-cocina', {
                        pedido_id: pedido.id,
                        mesa: pedido.mesa.numero,
                        timestamp: new Date().toISOString()
                    });
                    break;

                case 'listo':
                    // Notificar a mozos que pedido está listo
                    req.io.to('mozo').emit('pedido-listo', {
                        pedido: pedido.toJSON(),
                        estadoAnterior,
                        timestamp: new Date().toISOString()
                    });
                    
                    // También notificar pedido listo
                    req.io.to('mozo').emit('pedido-listo', {
                        pedidoId: pedido.id,
                        mesa: pedido.mesa.numero,
                        productos: pedido.detalles.map(d => d.producto.nombre).join(', '),
                        timestamp: new Date().toISOString()
                    });
                    break;

                case 'entregado':
                    // ✅ AGREGADO: Notificar a cajeros que pedido fue entregado - EVENTO PRINCIPAL
                    req.io.to('cajero').emit('pedido-entregado', {
                        pedido: pedido.toJSON(),
                        mesa: pedido.mesa.numero,
                        total: pedido.total,
                        listo_para_cobrar: true,
                        mozo: pedido.mozo.nombre,
                        timestamp: new Date().toISOString()
                    });
                    
                    // ✅ AGREGADO: También emitir evento específico de "listo para cobrar"
                    req.io.to('cajero').emit('pedido-listo-para-cobrar', {
                        pedidoId: pedido.id,
                        mesa: pedido.mesa.numero,
                        total: pedido.total,
                        mozo: pedido.mozo.nombre,
                        productos: pedido.detalles.length,
                        listo_para_cobrar: true,
                        timestamp: new Date().toISOString()
                    });

                    // ✅ AGREGADO: Actualizar contador de cuentas pendientes
                    req.io.to('cajero').emit('actualizar-cuentas-pendientes', {
                        accion: 'nuevo',
                        mesa: pedido.mesa.numero,
                        timestamp: new Date().toISOString()
                    });
                    break;

                case 'pagado':
                    // Notificar pago completado
                    req.io.emit('pedido-pagado', {
                        pedido_id: pedido.id,
                        mesa: pedido.mesa.numero,
                        total: pedido.total,
                        timestamp: new Date().toISOString()
                    });

                    // ✅ AGREGADO: Notificar a cajeros que una cuenta fue pagada
                    req.io.to('cajero').emit('cuenta-pagada', {
                        mesa: pedido.mesa.numero,
                        total: pedido.total,
                        timestamp: new Date().toISOString()
                    });
                    break;
            }

            // Evento genérico para todos
            req.io.emit('pedido-estado-actualizado', {
                pedidoId: pedido.id,
                nuevoEstado: estado,
                estadoAnterior,
                mesa: pedido.mesa.numero,
                timestamp: new Date().toISOString()
            });

            console.log('✅ Eventos de cambio de estado emitidos');
        }

        res.json({
            success: true,
            message: 'Estado de pedido actualizado exitosamente',
            data: pedido
        });
    } catch (error) {
        console.error('❌ Error cambiando estado de pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener pedido por ID
const obtenerPedidoPorId = async (req, res) => {
    try {
        const { id } = req.params;

        const pedido = await Pedido.findByPk(id, {
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad']
                },
                {
                    model: Usuario,
                    as: 'mozo',
                    attributes: ['id', 'nombre', 'email']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio'],
                        include: [{
                            model: Categoria,
                            as: 'categoria',
                            attributes: ['id', 'nombre']
                        }]
                    }]
                }
            ]
        });

        if (!pedido) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        res.json({
            success: true,
            data: pedido
        });
    } catch (error) {
        console.error('Error obteniendo pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener cuenta de mesa
const obtenerCuentaMesa = async (req, res) => {
    try {
        const { mesa_id } = req.params;

        // Verificar que la mesa existe
        const mesa = await Mesa.findByPk(mesa_id);
        if (!mesa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        // Obtener pedidos no pagados de la mesa
        const pedidos = await Pedido.findAll({
            where: {
                mesa_id,
                estado: {
                    [Op.ne]: 'pagado'
                }
            },
            include: [
                {
                    model: Usuario,
                    as: 'mozo',
                    attributes: ['id', 'nombre']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio'],
                        include: [{
                            model: Categoria,
                            as: 'categoria',
                            attributes: ['id', 'nombre']
                        }]
                    }]
                }
            ],
            order: [['created_at', 'ASC']]
        });

        if (pedidos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay pedidos pendientes para esta mesa'
            });
        }

        // Calcular totales
        const totalGeneral = pedidos.reduce((sum, pedido) => sum + parseFloat(pedido.total), 0);
        const totalItems = pedidos.reduce((sum, pedido) => {
            return sum + pedido.detalles.reduce((itemSum, detalle) => itemSum + detalle.cantidad, 0);
        }, 0);

        // Agrupar productos por nombre para el resumen
        const resumenProductos = {};
        pedidos.forEach(pedido => {
            pedido.detalles.forEach(detalle => {
                const key = detalle.producto.nombre;
                if (!resumenProductos[key]) {
                    resumenProductos[key] = {
                        producto: detalle.producto,
                        cantidad: 0,
                        subtotal: 0
                    };
                }
                resumenProductos[key].cantidad += detalle.cantidad;
                resumenProductos[key].subtotal += parseFloat(detalle.subtotal);
            });
        });

        const cuenta = {
            mesa: {
                id: mesa.id,
                numero: mesa.numero,
                capacidad: mesa.capacidad
            },
            pedidos,
            resumen: {
                total_pedidos: pedidos.length,
                total_items: totalItems,
                total_general: totalGeneral,
                productos: Object.values(resumenProductos)
            },
            fecha_generacion: new Date().toISOString()
        };

        res.json({
            success: true,
            data: cuenta
        });
    } catch (error) {
        console.error('Error obteniendo cuenta de mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// ✅ CORREGIDO: Procesar pago de mesa con notificaciones Socket.io
const procesarPagoMesa = async (req, res) => {
    try {
        const { mesa_id } = req.params;
        const { metodo_pago = 'efectivo', monto_recibido, observaciones_pago } = req.body;

        // Verificar que la mesa existe
        const mesa = await Mesa.findByPk(mesa_id);
        if (!mesa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        // Obtener pedidos pendientes de pago de la mesa
        const pedidos = await Pedido.findAll({
            where: {
                mesa_id,
                estado: {
                    [Op.ne]: 'pagado'
                }
            }
        });

        if (pedidos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay pedidos pendientes de pago para esta mesa'
            });
        }

        // Calcular total
        const totalAPagar = pedidos.reduce((sum, pedido) => sum + parseFloat(pedido.total), 0);

        // Validar monto recibido si se proporciona
        if (metodo_pago === 'efectivo' && monto_recibido) {
            if (parseFloat(monto_recibido) < totalAPagar) {
                return res.status(400).json({
                    success: false,
                    error: 'El monto recibido es insuficiente'
                });
            }
        }

        // Marcar todos los pedidos como pagados
        await Pedido.update(
            { 
                estado: 'pagado',
                metodo_pago,
                monto_recibido: monto_recibido || totalAPagar,
                observaciones_pago,
                fecha_pago: new Date()
            },
            {
                where: {
                    mesa_id,
                    estado: {
                        [Op.ne]: 'pagado'
                    }
                }
            }
        );

        // Liberar la mesa
        await mesa.update({ estado: 'libre' });

        // Calcular cambio si es efectivo
        const cambio = metodo_pago === 'efectivo' && monto_recibido ? 
            parseFloat(monto_recibido) - totalAPagar : 0;

        const resultadoPago = {
            mesa_id: mesa.id,
            mesa_numero: mesa.numero,
            total_pagado: totalAPagar,
            metodo_pago,
            monto_recibido: monto_recibido || totalAPagar,
            cambio,
            pedidos_pagados: pedidos.length,
            fecha_pago: new Date().toISOString(),
            cajero: req.user.nombre
        };

        // ✅ CORREGIDO: Emitir eventos de socket para pago procesado
        if (req.io) {
            console.log('📡 Emitiendo eventos de pago procesado...');
            
            // 1. Notificar a TODOS sobre mesa liberada
            req.io.emit('mesa-liberada', {
                mesa: mesa.numero,
                total: totalAPagar,
                metodoPago: metodo_pago,
                cajero: req.user.nombre,
                timestamp: new Date().toISOString()
            });

            // 2. Notificar cambio de estado de mesa
            req.io.emit('mesa-estado-actualizada', {
                mesa_id: mesa.id,
                mesa_numero: mesa.numero,
                nuevo_estado: 'libre',
                timestamp: new Date().toISOString()
            });

            // 3. ✅ AGREGADO: Notificar a otros cajeros sobre actualización
            req.io.to('cajero').emit('pago-procesado', {
                pago: resultadoPago,
                accion: 'cuenta_cerrada',
                timestamp: new Date().toISOString()
            });

            // 4. ✅ AGREGADO: Notificar a administradores sobre venta
            req.io.to('administrador').emit('venta-realizada', {
                mesa: mesa.numero,
                total: totalAPagar,
                metodoPago: metodo_pago,
                cajero: req.user.nombre,
                timestamp: new Date().toISOString()
            });

            // 5. ✅ AGREGADO: Actualizar estadísticas en tiempo real
            req.io.to('administrador').emit('estadisticas-actualizadas', {
                tipo: 'venta',
                data: resultadoPago,
                timestamp: new Date().toISOString()
            });

            console.log('✅ Eventos de pago emitidos correctamente');
        }

        res.json({
            success: true,
            message: 'Pago procesado exitosamente',
            data: resultadoPago
        });
    } catch (error) {
        console.error('❌ Error procesando pago:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener estadísticas de pedidos
const obtenerEstadisticasPedidos = async (req, res) => {
    try {
        const { fecha_desde = new Date().toDateString(), fecha_hasta } = req.query;
        
        const whereClause = {
            created_at: {
                [Op.gte]: new Date(fecha_desde)
            }
        };

        if (fecha_hasta) {
            whereClause.created_at[Op.lte] = new Date(fecha_hasta);
        }

        // Estadísticas generales
        const totalPedidos = await Pedido.count({ where: whereClause });
        
        const pedidosPorEstado = await Pedido.findAll({
            where: whereClause,
            attributes: [
                'estado',
                [Pedido.sequelize.fn('COUNT', Pedido.sequelize.col('id')), 'cantidad']
            ],
            group: ['estado'],
            raw: true
        });

        const ventasTotal = await Pedido.sum('total', {
            where: {
                ...whereClause,
                estado: 'pagado'
            }
        }) || 0;

        const promedioVenta = totalPedidos > 0 ? ventasTotal / totalPedidos : 0;

        // Pedidos por mozo
        const pedidosPorMozo = await Pedido.findAll({
            where: whereClause,
            include: [{
                model: Usuario,
                as: 'mozo',
                attributes: ['id', 'nombre']
            }],
            attributes: [
                [Pedido.sequelize.fn('COUNT', Pedido.sequelize.col('Pedido.id')), 'total_pedidos'],
                [Pedido.sequelize.fn('SUM', Pedido.sequelize.col('total')), 'total_ventas']
            ],
            group: ['mozo.id', 'mozo.nombre'],
            raw: true
        });

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fecha_desde,
                    hasta: fecha_hasta || 'presente'
                },
                resumen: {
                    total_pedidos: totalPedidos,
                    ventas_total: parseFloat(ventasTotal).toFixed(2),
                    promedio_venta: parseFloat(promedioVenta).toFixed(2)
                },
                pedidos_por_estado: pedidosPorEstado,
                pedidos_por_mozo: pedidosPorMozo
            }
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// ✅ CORREGIDO: Agregar productos a un pedido existente con notificaciones
const agregarProductosPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { productos } = req.body;

        // Verificar que el pedido existe y no está pagado
        const pedido = await Pedido.findByPk(id, {
            include: [
                {
                    model: Mesa,
                    as: 'mesa'
                },
                {
                    model: Usuario,
                    as: 'mozo'
                }
            ]
        });

        if (!pedido) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        if (pedido.estado === 'pagado') {
            return res.status(400).json({
                success: false,
                error: 'No se pueden agregar productos a un pedido pagado'
            });
        }

        // Validar productos
        if (!productos || productos.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Debe incluir al menos un producto'
            });
        }

        let totalAdicional = 0;
        const productosValidados = [];

        for (const item of productos) {
            const producto = await Producto.findByPk(item.producto_id);
            if (!producto || !producto.activo) {
                return res.status(400).json({
                    success: false,
                    error: `Producto con ID ${item.producto_id} no encontrado o inactivo`
                });
            }

            if (!producto.disponible) {
                return res.status(400).json({
                    success: false,
                    error: `Producto "${producto.nombre}" no está disponible`
                });
            }

            const cantidad = parseInt(item.cantidad);
            if (cantidad <= 0) {
                return res.status(400).json({
                    success: false,
                    error: 'La cantidad debe ser mayor a 0'
                });
            }

            const subtotal = parseFloat(producto.precio) * cantidad;
            totalAdicional += subtotal;

            productosValidados.push({
                producto_id: producto.id,
                cantidad,
                precio_unitario: producto.precio,
                subtotal
            });
        }

        // Crear detalles adicionales del pedido
        for (const detalle of productosValidados) {
            await DetallePedido.create({
                pedido_id: pedido.id,
                ...detalle
            });
        }

        // Actualizar total del pedido
        const nuevoTotal = parseFloat(pedido.total) + totalAdicional;
        await pedido.update({ 
            total: nuevoTotal,
            estado: pedido.estado === 'entregado' ? 'preparando' : pedido.estado // Si estaba entregado, volver a cocina
        });

        // Obtener pedido actualizado
        const pedidoActualizado = await Pedido.findByPk(pedido.id, {
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad']
                },
                {
                    model: Usuario,
                    as: 'mozo',
                    attributes: ['id', 'nombre']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio'],
                        include: [{
                            model: Categoria,
                            as: 'categoria',
                            attributes: ['id', 'nombre']
                        }]
                    }]
                }
            ]
        });

        // ✅ CORREGIDO: Emitir eventos de socket para productos agregados
        if (req.io) {
            console.log('📡 Emitiendo eventos por productos agregados...');
            
            // 1. Notificar a COCINA sobre actualización de pedido
            req.io.to('cocina').emit('pedido-actualizado', {
                pedido: pedidoActualizado,
                productos_agregados: productosValidados.length,
                total_adicional: totalAdicional,
                timestamp: new Date().toISOString()
            });

            // 2. ✅ AGREGADO: Notificar a CAJEROS sobre actualización de cuenta
            req.io.to('cajero').emit('cuenta-actualizada', {
                mesa: pedidoActualizado.mesa,
                pedido_id: pedidoActualizado.id,
                nuevo_total: nuevoTotal,
                productos_agregados: productosValidados.length,
                total_adicional: totalAdicional,
                timestamp: new Date().toISOString()
            });

            // 3. ✅ AGREGADO: Actualizar lista de cuentas pendientes
            req.io.to('cajero').emit('actualizar-cuentas-pendientes', {
                accion: 'actualizado',
                mesa: pedidoActualizado.mesa.numero,
                nuevo_total: nuevoTotal,
                timestamp: new Date().toISOString()
            });

            // 4. Notificar a administradores
            req.io.to('administrador').emit('pedido-modificado', {
                pedido: pedidoActualizado,
                accion: 'productos_agregados',
                cantidad: productosValidados.length,
                total_adicional: totalAdicional,
                timestamp: new Date().toISOString()
            });

            console.log('✅ Eventos de actualización emitidos');
        }

        res.json({
            success: true,
            message: `${productosValidados.length} producto(s) agregado(s) al pedido`,
            data: pedidoActualizado
        });

    } catch (error) {
        console.error('❌ Error agregando productos al pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// ✅ CORREGIDO: Cancelar pedido con notificaciones
const cancelarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        const pedido = await Pedido.findByPk(id, {
            include: [{
                model: Mesa,
                as: 'mesa'
            }]
        });

        if (!pedido) {
            return res.status(404).json({
                success: false,
                error: 'Pedido no encontrado'
            });
        }

        if (pedido.estado === 'pagado') {
            return res.status(400).json({
                success: false,
                error: 'No se puede cancelar un pedido pagado'
            });
        }

        if (pedido.estado === 'entregado') {
            return res.status(400).json({
                success: false,
                error: 'No se puede cancelar un pedido entregado'
            });
        }

        // Actualizar pedido como cancelado
        await pedido.update({ 
            estado: 'cancelado',
            observaciones: pedido.observaciones ? 
                `${pedido.observaciones} | CANCELADO: ${motivo}` : 
                `CANCELADO: ${motivo}`,
            fecha_cancelacion: new Date()
        });

        // Verificar si hay otros pedidos activos en la mesa
        const otrosPedidos = await Pedido.count({
            where: {
                mesa_id: pedido.mesa_id,
                estado: {
                    [Op.notIn]: ['pagado', 'cancelado']
                }
            }
        });

        // Si no hay otros pedidos activos, liberar la mesa
        if (otrosPedidos === 0) {
            await pedido.mesa.update({ estado: 'libre' });
        }

        // ✅ CORREGIDO: Emitir eventos de socket para cancelación
        if (req.io) {
            console.log('📡 Emitiendo eventos de cancelación de pedido...');
            
            // 1. Notificar a TODOS sobre pedido cancelado
            req.io.emit('pedido-cancelado', {
                pedido: pedido.toJSON(),
                motivo,
                timestamp: new Date().toISOString()
            });

            // 2. ✅ AGREGADO: Notificar a CAJEROS si afecta cuentas pendientes
            if (pedido.estado === 'entregado') {
                req.io.to('cajero').emit('cuenta-cancelada', {
                    mesa: pedido.mesa.numero,
                    pedido_id: pedido.id,
                    motivo,
                    timestamp: new Date().toISOString()
                });
            }

            // 3. ✅ AGREGADO: Actualizar estado de mesa si es necesario
            if (otrosPedidos === 0) {
                req.io.emit('mesa-estado-actualizada', {
                    mesa_id: pedido.mesa.id,
                    mesa_numero: pedido.mesa.numero,
                    nuevo_estado: 'libre',
                    timestamp: new Date().toISOString()
                });
            }

            console.log('✅ Eventos de cancelación emitidos');
        }

        res.json({
            success: true,
            message: 'Pedido cancelado exitosamente',
            data: pedido
        });

    } catch (error) {
        console.error('❌ Error cancelando pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
    obtenerPedidos,
    obtenerPedidosPorMesa,
    obtenerPedidosCocina,
    crearPedido,
    cambiarEstadoPedido,
    obtenerPedidoPorId,
    obtenerCuentaMesa,
    procesarPagoMesa,
    obtenerEstadisticasPedidos,
    agregarProductosPedido,
    cancelarPedido
};