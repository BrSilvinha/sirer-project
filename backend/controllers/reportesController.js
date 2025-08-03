const { Pedido, DetallePedido, Mesa, Usuario, Producto, Categoria } = require('../models/associations');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Dashboard principal con métricas del día
const obtenerDashboard = async (req, res) => {
    try {
        const hoy = new Date();
        const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000);

        // Ventas del día
        const ventasHoy = await Pedido.sum('total', {
            where: {
                estado: 'pagado',
                created_at: {
                    [Op.between]: [inicioHoy, finHoy]
                }
            }
        }) || 0;

        // Pedidos del día
        const pedidosHoy = await Pedido.count({
            where: {
                created_at: {
                    [Op.between]: [inicioHoy, finHoy]
                }
            }
        });

        // Pedidos por estado
        const pedidosPorEstado = await Pedido.findAll({
            attributes: [
                'estado',
                [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
            ],
            where: {
                created_at: {
                    [Op.between]: [inicioHoy, finHoy]
                }
            },
            group: ['estado'],
            raw: true
        });

        // Estado de mesas
        const estadoMesas = await Mesa.findAll({
            attributes: [
                'estado',
                [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
            ],
            where: { activa: true },
            group: ['estado'],
            raw: true
        });

        // Productos más vendidos hoy
        const productosMasVendidos = await DetallePedido.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('cantidad')), 'total_vendido'],
                [sequelize.fn('SUM', sequelize.col('subtotal')), 'ingresos']
            ],
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['id', 'nombre', 'precio']
                },
                {
                    model: Pedido,
                    as: 'pedido',
                    attributes: [],
                    where: {
                        created_at: {
                            [Op.between]: [inicioHoy, finHoy]
                        },
                        estado: 'pagado'
                    }
                }
            ],
            group: ['producto.id', 'producto.nombre', 'producto.precio'],
            order: [[sequelize.fn('SUM', sequelize.col('cantidad')), 'DESC']],
            limit: 10
        });

        // Mozos más activos
        const mozosActivos = await Pedido.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('Pedido.id')), 'total_pedidos'],
                [sequelize.fn('SUM', sequelize.col('total')), 'total_ventas']
            ],
            include: [{
                model: Usuario,
                as: 'mozo',
                attributes: ['id', 'nombre']
            }],
            where: {
                created_at: {
                    [Op.between]: [inicioHoy, finHoy]
                }
            },
            group: ['mozo.id', 'mozo.nombre'],
            order: [[sequelize.fn('COUNT', sequelize.col('Pedido.id')), 'DESC']],
            limit: 5
        });

        res.json({
            success: true,
            data: {
                fecha: hoy.toISOString().split('T')[0],
                resumen: {
                    ventas_hoy: parseFloat(ventasHoy).toFixed(2),
                    pedidos_hoy: pedidosHoy,
                    promedio_por_pedido: pedidosHoy > 0 ? (ventasHoy / pedidosHoy).toFixed(2) : '0.00'
                },
                pedidos_por_estado: pedidosPorEstado,
                estado_mesas: estadoMesas,
                productos_mas_vendidos: productosMasVendidos,
                mozos_activos: mozosActivos
            }
        });
    } catch (error) {
        console.error('Error obteniendo dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Reporte de ventas por período
const obtenerReporteVentas = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, agrupar_por = 'dia' } = req.query;

        let fechaInicio, fechaFin;
        
        if (fecha_desde && fecha_hasta) {
            fechaInicio = new Date(fecha_desde);
            fechaFin = new Date(fecha_hasta);
        } else {
            // Por defecto últimos 7 días
            fechaFin = new Date();
            fechaInicio = new Date(fechaFin.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        // Formato de agrupación según el parámetro
        let formatoFecha;
        switch (agrupar_por) {
            case 'hora':
                formatoFecha = sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d %H:00:00');
                break;
            case 'dia':
                formatoFecha = sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d');
                break;
            case 'mes':
                formatoFecha = sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m');
                break;
            default:
                formatoFecha = sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m-%d');
        }

        const ventasPorPeriodo = await Pedido.findAll({
            attributes: [
                [formatoFecha, 'periodo'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_pedidos'],
                [sequelize.fn('SUM', sequelize.col('total')), 'total_ventas'],
                [sequelize.fn('AVG', sequelize.col('total')), 'promedio_pedido']
            ],
            where: {
                estado: 'pagado',
                created_at: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            group: [formatoFecha],
            order: [[formatoFecha, 'ASC']],
            raw: true
        });

        // Resumen total del período
        const resumenTotal = await Pedido.findOne({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'total_pedidos'],
                [sequelize.fn('SUM', sequelize.col('total')), 'total_ventas'],
                [sequelize.fn('AVG', sequelize.col('total')), 'promedio_pedido']
            ],
            where: {
                estado: 'pagado',
                created_at: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            raw: true
        });

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0],
                    agrupar_por
                },
                resumen_total: {
                    total_pedidos: parseInt(resumenTotal.total_pedidos) || 0,
                    total_ventas: parseFloat(resumenTotal.total_ventas || 0).toFixed(2),
                    promedio_pedido: parseFloat(resumenTotal.promedio_pedido || 0).toFixed(2)
                },
                ventas_por_periodo: ventasPorPeriodo.map(venta => ({
                    periodo: venta.periodo,
                    total_pedidos: parseInt(venta.total_pedidos),
                    total_ventas: parseFloat(venta.total_ventas).toFixed(2),
                    promedio_pedido: parseFloat(venta.promedio_pedido).toFixed(2)
                }))
            }
        });
    } catch (error) {
        console.error('Error obteniendo reporte de ventas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Reporte de productos más vendidos
const obtenerProductosMasVendidos = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta, limite = 20 } = req.query;

        let fechaInicio, fechaFin;
        
        if (fecha_desde && fecha_hasta) {
            fechaInicio = new Date(fecha_desde);
            fechaFin = new Date(fecha_hasta);
        } else {
            // Por defecto último mes
            fechaFin = new Date();
            fechaInicio = new Date(fechaFin.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const productosMasVendidos = await DetallePedido.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('cantidad')), 'total_vendido'],
                [sequelize.fn('SUM', sequelize.col('subtotal')), 'ingresos_totales'],
                [sequelize.fn('COUNT', sequelize.col('DetallePedido.id')), 'veces_pedido']
            ],
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: ['id', 'nombre', 'precio'],
                    include: [{
                        model: Categoria,
                        as: 'categoria',
                        attributes: ['id', 'nombre']
                    }]
                },
                {
                    model: Pedido,
                    as: 'pedido',
                    attributes: [],
                    where: {
                        created_at: {
                            [Op.between]: [fechaInicio, fechaFin]
                        },
                        estado: 'pagado'
                    }
                }
            ],
            group: ['producto.id', 'producto.nombre', 'producto.precio', 'producto.categoria.id', 'producto.categoria.nombre'],
            order: [[sequelize.fn('SUM', sequelize.col('cantidad')), 'DESC']],
            limit: parseInt(limite)
        });

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                productos: productosMasVendidos.map(item => ({
                    producto: item.producto,
                    total_vendido: parseInt(item.get('total_vendido')),
                    ingresos_totales: parseFloat(item.get('ingresos_totales')).toFixed(2),
                    veces_pedido: parseInt(item.get('veces_pedido')),
                    promedio_por_pedido: (parseInt(item.get('total_vendido')) / parseInt(item.get('veces_pedido'))).toFixed(2)
                }))
            }
        });
    } catch (error) {
        console.error('Error obteniendo productos más vendidos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Reporte de rendimiento de mesas
const obtenerReporteMesas = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;

        let fechaInicio, fechaFin;
        
        if (fecha_desde && fecha_hasta) {
            fechaInicio = new Date(fecha_desde);
            fechaFin = new Date(fecha_hasta);
        } else {
            // Por defecto últimos 7 días
            fechaFin = new Date();
            fechaInicio = new Date(fechaFin.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const rendimientoMesas = await Pedido.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('Pedido.id')), 'total_pedidos'],
                [sequelize.fn('SUM', sequelize.col('total')), 'ingresos_totales'],
                [sequelize.fn('AVG', sequelize.col('total')), 'promedio_por_pedido']
            ],
            include: [{
                model: Mesa,
                as: 'mesa',
                attributes: ['id', 'numero', 'capacidad']
            }],
            where: {
                estado: 'pagado',
                created_at: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            group: ['mesa.id', 'mesa.numero', 'mesa.capacidad'],
            order: [[sequelize.fn('SUM', sequelize.col('total')), 'DESC']]
        });

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                mesas: rendimientoMesas.map(item => ({
                    mesa: item.mesa,
                    total_pedidos: parseInt(item.get('total_pedidos')),
                    ingresos_totales: parseFloat(item.get('ingresos_totales')).toFixed(2),
                    promedio_por_pedido: parseFloat(item.get('promedio_por_pedido')).toFixed(2),
                    ingresos_por_capacidad: (parseFloat(item.get('ingresos_totales')) / item.mesa.capacidad).toFixed(2)
                }))
            }
        });
    } catch (error) {
        console.error('Error obteniendo reporte de mesas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Reporte de rendimiento de mozos
const obtenerReporteMozos = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;

        let fechaInicio, fechaFin;
        
        if (fecha_desde && fecha_hasta) {
            fechaInicio = new Date(fecha_desde);
            fechaFin = new Date(fecha_hasta);
        } else {
            // Por defecto últimos 7 días
            fechaFin = new Date();
            fechaInicio = new Date(fechaFin.getTime() - 7 * 24 * 60 * 60 * 1000);
        }

        const rendimientoMozos = await Pedido.findAll({
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('Pedido.id')), 'total_pedidos'],
                [sequelize.fn('SUM', sequelize.col('total')), 'total_ventas'],
                [sequelize.fn('AVG', sequelize.col('total')), 'promedio_por_pedido']
            ],
            include: [{
                model: Usuario,
                as: 'mozo',
                attributes: ['id', 'nombre', 'email'],
                where: {
                    rol: 'mozo',
                    activo: true
                }
            }],
            where: {
                created_at: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            group: ['mozo.id', 'mozo.nombre', 'mozo.email'],
            order: [[sequelize.fn('SUM', sequelize.col('total')), 'DESC']]
        });

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                mozos: rendimientoMozos.map(item => ({
                    mozo: item.mozo,
                    total_pedidos: parseInt(item.get('total_pedidos')),
                    total_ventas: parseFloat(item.get('total_ventas')).toFixed(2),
                    promedio_por_pedido: parseFloat(item.get('promedio_por_pedido')).toFixed(2)
                }))
            }
        });
    } catch (error) {
        console.error('Error obteniendo reporte de mozos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Reporte de ventas por categoría
const obtenerVentasPorCategoria = async (req, res) => {
    try {
        const { fecha_desde, fecha_hasta } = req.query;

        let fechaInicio, fechaFin;
        
        if (fecha_desde && fecha_hasta) {
            fechaInicio = new Date(fecha_desde);
            fechaFin = new Date(fecha_hasta);
        } else {
            // Por defecto último mes
            fechaFin = new Date();
            fechaInicio = new Date(fechaFin.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const ventasPorCategoria = await DetallePedido.findAll({
            attributes: [
                [sequelize.fn('SUM', sequelize.col('cantidad')), 'total_vendido'],
                [sequelize.fn('SUM', sequelize.col('subtotal')), 'ingresos_totales']
            ],
            include: [
                {
                    model: Producto,
                    as: 'producto',
                    attributes: [],
                    include: [{
                        model: Categoria,
                        as: 'categoria',
                        attributes: ['id', 'nombre']
                    }]
                },
                {
                    model: Pedido,
                    as: 'pedido',
                    attributes: [],
                    where: {
                        created_at: {
                            [Op.between]: [fechaInicio, fechaFin]
                        },
                        estado: 'pagado'
                    }
                }
            ],
            group: ['producto.categoria.id', 'producto.categoria.nombre'],
            order: [[sequelize.fn('SUM', sequelize.col('subtotal')), 'DESC']]
        });

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                categorias: ventasPorCategoria.map(item => ({
                    categoria: item.producto.categoria,
                    total_vendido: parseInt(item.get('total_vendido')),
                    ingresos_totales: parseFloat(item.get('ingresos_totales')).toFixed(2)
                }))
            }
        });
    } catch (error) {
        console.error('Error obteniendo ventas por categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
    obtenerDashboard,
    obtenerReporteVentas,
    obtenerProductosMasVendidos,
    obtenerReporteMesas,
    obtenerReporteMozos,
    obtenerVentasPorCategoria
};