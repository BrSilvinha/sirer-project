const { Pedido, DetallePedido, Mesa, Usuario, Producto, Categoria } = require('../models/associations');
const { sequelize } = require('../config/database');

// Obtener todos los pedidos
const obtenerPedidos = async (req, res) => {
    try {
        const { estado, mesa_id, fecha_desde, fecha_hasta } = req.query;
        
        const whereClause = {};
        
        if (estado) {
            whereClause.estado = estado;
        }
        
        if (mesa_id) {
            whereClause.mesa_id = mesa_id;
        }
        
        if (fecha_desde && fecha_hasta) {
            whereClause.created_at = {
                [sequelize.Sequelize.Op.between]: [fecha_desde, fecha_hasta]
            };
        }

        const pedidos = await Pedido.findAll({
            where: whereClause,
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad', 'estado']
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
                        attributes: ['id', 'nombre', 'precio']
                    }]
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: pedidos,
            total: pedidos.length
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
        
        const pedidos = await Pedido.findAll({
            where: { 
                mesa_id,
                estado: ['nuevo', 'en_cocina', 'preparado', 'entregado'] // Excluir pagados
            },
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero', 'capacidad', 'estado']
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

        // Calcular total de la cuenta
        const totalCuenta = pedidos.reduce((total, pedido) => {
            return total + parseFloat(pedido.total || 0);
        }, 0);

        res.json({
            success: true,
            data: pedidos,
            total_pedidos: pedidos.length,
            total_cuenta: totalCuenta.toFixed(2)
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
                estado: ['nuevo', 'en_cocina'] 
            },
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero']
                },
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre']
                    }]
                }
            ],
            order: [['created_at', 'ASC']] // Los más antiguos primero
        });

        res.json({
            success: true,
            data: pedidos,
            total: pedidos.length
        });
    } catch (error) {
        console.error('Error obteniendo pedidos para cocina:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Crear nuevo pedido
const crearPedido = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { mesa_id, productos, observaciones } = req.body;
        const usuario_id = req.user.id;

        // Verificar que la mesa existe y está disponible
        const mesa = await Mesa.findByPk(mesa_id);
        if (!mesa || !mesa.activa) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        // Crear el pedido
        const nuevoPedido = await Pedido.create({
            mesa_id,
            usuario_id,
            observaciones,
            estado: 'nuevo'
        }, { transaction });

        let totalPedido = 0;
        const detallesCreados = [];

        // Crear detalles del pedido
        for (const item of productos) {
            const { producto_id, cantidad } = item;

            // Verificar que el producto existe y está disponible
            const producto = await Producto.findByPk(producto_id);
            if (!producto || !producto.activo || !producto.disponible) {
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    error: `Producto ${producto?.nombre || producto_id} no está disponible`
                });
            }

            const subtotal = parseFloat(producto.precio) * cantidad;
            totalPedido += subtotal;

            const detalle = await DetallePedido.create({
                pedido_id: nuevoPedido.id,
                producto_id,
                cantidad,
                precio_unitario: producto.precio,
                subtotal
            }, { transaction });

            detallesCreados.push(detalle);
        }

        // Actualizar el total del pedido
        await nuevoPedido.update({ total: totalPedido }, { transaction });

        // Cambiar estado de la mesa a ocupada si estaba libre
        if (mesa.estado === 'libre') {
            await mesa.update({ estado: 'ocupada' }, { transaction });
        }

        await transaction.commit();

        // Obtener el pedido completo
        const pedidoCompleto = await Pedido.findByPk(nuevoPedido.id, {
            include: [
                {
                    model: Mesa,
                    as: 'mesa',
                    attributes: ['id', 'numero']
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
                        attributes: ['id', 'nombre', 'precio']
                    }]
                }
            ]
        });

        // Emitir eventos de Socket.io
        if (req.io) {
            // Notificar a cocina sobre nuevo pedido
            req.io.to('cocina').emit('nuevo-pedido', {
                pedido: pedidoCompleto.toJSON(),
                timestamp: new Date().toISOString()
            });

            // Notificar a administradores
            req.io.to('administrador').emit('nuevo-pedido-admin', {
                pedido: pedidoCompleto.toJSON(),
                timestamp: new Date().toISOString()
            });

            // Notificar cambio de estado de mesa
            req.io.emit('mesa-estado-cambiado', {
                mesa: mesa.toJSON(),
                timestamp: new Date().toISOString()
            });
        }

        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: pedidoCompleto
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error creando pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Cambiar estado del pedido
const cambiarEstadoPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['nuevo', 'en_cocina', 'preparado', 'entregado', 'pagado'];
        
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
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre']
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

        // Emitir eventos de Socket.io según el cambio de estado
        if (req.io) {
            if (estado === 'preparado') {
                // Notificar a mozos que el pedido está listo
                req.io.to('mozo').emit('pedido-preparado', {
                    pedido: pedido.toJSON(),
                    timestamp: new Date().toISOString()
                });
            }
            
            if (estado === 'pagado') {
                // Si todos los pedidos de la mesa están pagados, liberar mesa
                const pedidosPendientes = await Pedido.count({
                    where: {
                        mesa_id: pedido.mesa_id,
                        estado: ['nuevo', 'en_cocina', 'preparado', 'entregado']
                    }
                });

                if (pedidosPendientes === 0) {
                    await pedido.mesa.update({ estado: 'libre' });
                    
                    req.io.emit('mesa-liberada', {
                        mesa: pedido.mesa.toJSON(),
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // Notificación general de cambio de estado
            req.io.emit('pedido-estado-cambiado', {
                pedido: pedido.toJSON(),
                estadoAnterior,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: `Pedido marcado como ${estado}`,
            data: pedido
        });
    } catch (error) {
        console.error('Error cambiando estado del pedido:', error);
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

// Obtener resumen de cuenta por mesa (para cajeros)
const obtenerCuentaMesa = async (req, res) => {
    try {
        const { mesa_id } = req.params;

        const pedidos = await Pedido.findAll({
            where: { 
                mesa_id,
                estado: ['entregado'] // Solo pedidos entregados pendientes de pago
            },
            include: [
                {
                    model: DetallePedido,
                    as: 'detalles',
                    include: [{
                        model: Producto,
                        as: 'producto',
                        attributes: ['id', 'nombre', 'precio']
                    }]
                }
            ]
        });

        const totalCuenta = pedidos.reduce((total, pedido) => {
            return total + parseFloat(pedido.total || 0);
        }, 0);

        // Agrupar productos para mostrar cantidades totales
        const resumenProductos = {};
        pedidos.forEach(pedido => {
            pedido.detalles.forEach(detalle => {
                const productoId = detalle.producto.id;
                if (!resumenProductos[productoId]) {
                    resumenProductos[productoId] = {
                        producto: detalle.producto,
                        cantidad: 0,
                        subtotal: 0
                    };
                }
                resumenProductos[productoId].cantidad += detalle.cantidad;
                resumenProductos[productoId].subtotal += parseFloat(detalle.subtotal);
            });
        });

        res.json({
            success: true,
            data: {
                mesa_id,
                pedidos,
                resumen_productos: Object.values(resumenProductos),
                total_cuenta: totalCuenta.toFixed(2),
                fecha_cuenta: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Error obteniendo cuenta de mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Marcar pedidos como pagados (procesar pago)
const procesarPagoMesa = async (req, res) => {
    const transaction = await sequelize.transaction();
    
    try {
        const { mesa_id } = req.params;
        const { metodo_pago = 'efectivo' } = req.body;

        // Obtener todos los pedidos entregados de la mesa
        const pedidos = await Pedido.findAll({
            where: { 
                mesa_id,
                estado: 'entregado'
            }
        }, { transaction });

        if (pedidos.length === 0) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                error: 'No hay pedidos pendientes de pago en esta mesa'
            });
        }

        // Marcar todos los pedidos como pagados
        await Pedido.update(
            { estado: 'pagado' },
            { 
                where: { 
                    mesa_id,
                    estado: 'entregado'
                },
                transaction
            }
        );

        // Liberar la mesa
        const mesa = await Mesa.findByPk(mesa_id);
        await mesa.update({ estado: 'libre' }, { transaction });

        await transaction.commit();

        // Calcular total pagado
        const totalPagado = pedidos.reduce((total, pedido) => {
            return total + parseFloat(pedido.total || 0);
        }, 0);

        // Emitir eventos de Socket.io
        if (req.io) {
            req.io.emit('pago-procesado', {
                mesa_id,
                total_pagado: totalPagado.toFixed(2),
                metodo_pago,
                timestamp: new Date().toISOString()
            });

            req.io.emit('mesa-liberada', {
                mesa: mesa.toJSON(),
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Pago procesado exitosamente',
            data: {
                mesa_id,
                pedidos_pagados: pedidos.length,
                total_pagado: totalPagado.toFixed(2),
                metodo_pago
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error procesando pago:', error);
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
    procesarPagoMesa
};