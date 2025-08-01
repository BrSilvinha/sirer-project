// Controlador simplificado de pedidos
const { Pedido, DetallePedido, Mesa, Usuario, Producto } = require('../models/associations');

const crearPedido = async (req, res) => {
    try {
        const { mesa_id, productos, observaciones } = req.body;
        const usuario_id = req.user.id;

        console.log('Datos recibidos:', { mesa_id, productos, observaciones, usuario_id });

        // Verificar que la mesa existe
        const mesa = await Mesa.findByPk(mesa_id);
        if (!mesa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        // Calcular total
        let total = 0;
        for (const item of productos) {
            const producto = await Producto.findByPk(item.producto_id);
            if (producto) {
                total += parseFloat(producto.precio) * item.cantidad;
            }
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
        for (const item of productos) {
            const producto = await Producto.findByPk(item.producto_id);
            if (producto) {
                const subtotal = parseFloat(producto.precio) * item.cantidad;
                await DetallePedido.create({
                    pedido_id: nuevoPedido.id,
                    producto_id: item.producto_id,
                    cantidad: item.cantidad,
                    precio_unitario: producto.precio,
                    subtotal
                });
            }
        }

        // Cambiar estado de mesa a ocupada
        await mesa.update({ estado: 'ocupada' });

        res.status(201).json({
            success: true,
            message: 'Pedido creado exitosamente',
            data: {
                id: nuevoPedido.id,
                mesa_id,
                total: total.toFixed(2),
                estado: 'nuevo'
            }
        });

    } catch (error) {
        console.error('Error creando pedido:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Otros métodos simplificados
const obtenerPedidos = async (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Método en desarrollo'
    });
};

const obtenerPedidosPorMesa = async (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Método en desarrollo'
    });
};

const obtenerPedidosCocina = async (req, res) => {
    res.json({
        success: true,
        data: [],
        message: 'Método en desarrollo'
    });
};

const cambiarEstadoPedido = async (req, res) => {
    res.json({
        success: true,
        message: 'Método en desarrollo'
    });
};

const obtenerPedidoPorId = async (req, res) => {
    res.json({
        success: true,
        data: {},
        message: 'Método en desarrollo'
    });
};

const obtenerCuentaMesa = async (req, res) => {
    res.json({
        success: true,
        data: {},
        message: 'Método en desarrollo'
    });
};

const procesarPagoMesa = async (req, res) => {
    res.json({
        success: true,
        message: 'Método en desarrollo'
    });
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