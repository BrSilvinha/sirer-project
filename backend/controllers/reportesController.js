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
        const pedidosRaw = await Pedido.findAll({
            attributes: ['estado'],
            where: {
                created_at: {
                    [Op.between]: [inicioHoy, finHoy]
                }
            },
            raw: true
        });

        const pedidosPorEstado = pedidosRaw.reduce((acc, pedido) => {
            const existente = acc.find(p => p.estado === pedido.estado);
            if (existente) {
                existente.cantidad += 1;
            } else {
                acc.push({ estado: pedido.estado, cantidad: 1 });
            }
            return acc;
        }, []);

        // Estado de mesas
        const mesasRaw = await Mesa.findAll({
            attributes: ['estado'],
            where: { activa: true },
            raw: true
        });

        const estadoMesas = mesasRaw.reduce((acc, mesa) => {
            const existente = acc.find(m => m.estado === mesa.estado);
            if (existente) {
                existente.cantidad += 1;
            } else {
                acc.push({ estado: mesa.estado, cantidad: 1 });
            }
            return acc;
        }, []);

        // Productos más vendidos hoy
        const detallesHoy = await DetallePedido.findAll({
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
            attributes: ['producto_id', 'cantidad', 'subtotal'],
            raw: true
        });

        const productosAgrupados = detallesHoy.reduce((acc, detalle) => {
            const key = detalle.producto_id;
            if (!acc[key]) {
                acc[key] = {
                    producto: {
                        id: detalle['producto.id'],
                        nombre: detalle['producto.nombre'],
                        precio: detalle['producto.precio']
                    },
                    total_vendido: 0,
                    ingresos: 0
                };
            }
            acc[key].total_vendido += detalle.cantidad;
            acc[key].ingresos += parseFloat(detalle.subtotal);
            return acc;
        }, {});

        const productosMasVendidos = Object.values(productosAgrupados)
            .sort((a, b) => b.total_vendido - a.total_vendido)
            .slice(0, 10);

        // Mozos más activos
        const pedidosMozos = await Pedido.findAll({
            include: [{
                model: Usuario,
                as: 'mozo',
                attributes: ['id', 'nombre']
            }],
            attributes: ['usuario_id', 'total'],
            where: {
                created_at: {
                    [Op.between]: [inicioHoy, finHoy]
                }
            },
            raw: true
        });

        const mozosAgrupados = pedidosMozos.reduce((acc, pedido) => {
            const key = pedido.usuario_id;
            if (!acc[key]) {
                acc[key] = {
                    mozo: {
                        id: pedido['mozo.id'],
                        nombre: pedido['mozo.nombre']
                    },
                    total_pedidos: 0,
                    total_ventas: 0
                };
            }
            acc[key].total_pedidos += 1;
            acc[key].total_ventas += parseFloat(pedido.total);
            return acc;
        }, {});

        const mozosActivos = Object.values(mozosAgrupados)
            .sort((a, b) => b.total_pedidos - a.total_pedidos)
            .slice(0, 5);

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
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

        // Validar fechas
        if (isNaN(fechaInicio.getTime()) || isNaN(fechaFin.getTime())) {
            return res.status(400).json({
                success: false,
                error: 'Fechas inválidas'
            });
        }

        // Obtener pedidos del período
        const pedidos = await Pedido.findAll({
            where: {
                estado: 'pagado',
                created_at: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            attributes: ['id', 'total', 'created_at'],
            raw: true
        });

        // Procesar ventas por período
        const ventasPorPeriodo = {};
        
        pedidos.forEach(pedido => {
            const fecha = new Date(pedido.created_at);
            let clave;
            
            switch (agrupar_por) {
                case 'hora':
                    clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')} ${String(fecha.getHours()).padStart(2, '0')}:00:00`;
                    break;
                case 'dia':
                    clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
                    break;
                case 'mes':
                    clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                    break;
                default:
                    clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
            }
            
            if (!ventasPorPeriodo[clave]) {
                ventasPorPeriodo[clave] = {
                    periodo: clave,
                    total_pedidos: 0,
                    total_ventas: 0
                };
            }
            
            ventasPorPeriodo[clave].total_pedidos += 1;
            ventasPorPeriodo[clave].total_ventas += parseFloat(pedido.total);
        });

        // Convertir a array y agregar promedio
        const ventasArray = Object.values(ventasPorPeriodo).map(venta => ({
            ...venta,
            total_ventas: parseFloat(venta.total_ventas).toFixed(2),
            promedio_pedido: venta.total_pedidos > 0 ? 
                (venta.total_ventas / venta.total_pedidos).toFixed(2) : '0.00'
        }));

        // Calcular resumen total
        const totalPedidos = pedidos.length;
        const totalVentas = pedidos.reduce((sum, p) => sum + parseFloat(p.total), 0);
        const promedioGeneral = totalPedidos > 0 ? totalVentas / totalPedidos : 0;

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0],
                    agrupar_por
                },
                resumen_total: {
                    total_pedidos: totalPedidos,
                    total_ventas: totalVentas.toFixed(2),
                    promedio_pedido: promedioGeneral.toFixed(2)
                },
                ventas_por_periodo: ventasArray.sort((a, b) => a.periodo.localeCompare(b.periodo))
            }
        });
    } catch (error) {
        console.error('Error obteniendo reporte de ventas:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
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

        const detalles = await DetallePedido.findAll({
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
            attributes: ['producto_id', 'cantidad', 'subtotal'],
            raw: true
        });

        const productosAgrupados = detalles.reduce((acc, detalle) => {
            const key = detalle.producto_id;
            if (!acc[key]) {
                acc[key] = {
                    producto: {
                        id: detalle['producto.id'],
                        nombre: detalle['producto.nombre'],
                        precio: detalle['producto.precio'],
                        categoria: {
                            id: detalle['producto.categoria.id'],
                            nombre: detalle['producto.categoria.nombre']
                        }
                    },
                    total_vendido: 0,
                    ingresos_totales: 0,
                    veces_pedido: 0
                };
            }
            acc[key].total_vendido += detalle.cantidad;
            acc[key].ingresos_totales += parseFloat(detalle.subtotal);
            acc[key].veces_pedido += 1;
            return acc;
        }, {});

        const productos = Object.values(productosAgrupados)
            .map(item => ({
                ...item,
                ingresos_totales: parseFloat(item.ingresos_totales).toFixed(2),
                promedio_por_pedido: (item.total_vendido / item.veces_pedido).toFixed(2)
            }))
            .sort((a, b) => b.total_vendido - a.total_vendido)
            .slice(0, parseInt(limite));

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                productos
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

        const pedidosMesas = await Pedido.findAll({
            include: [{
                model: Mesa,
                as: 'mesa',
                attributes: ['id', 'numero', 'capacidad']
            }],
            attributes: ['mesa_id', 'total'],
            where: {
                estado: 'pagado',
                created_at: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            raw: true
        });

        const mesasAgrupadas = pedidosMesas.reduce((acc, pedido) => {
            const key = pedido.mesa_id;
            if (!acc[key]) {
                acc[key] = {
                    mesa: {
                        id: pedido['mesa.id'],
                        numero: pedido['mesa.numero'],
                        capacidad: pedido['mesa.capacidad']
                    },
                    total_pedidos: 0,
                    ingresos_totales: 0
                };
            }
            acc[key].total_pedidos += 1;
            acc[key].ingresos_totales += parseFloat(pedido.total);
            return acc;
        }, {});

        const mesas = Object.values(mesasAgrupadas)
            .map(item => ({
                ...item,
                ingresos_totales: parseFloat(item.ingresos_totales).toFixed(2),
                promedio_por_pedido: (item.ingresos_totales / item.total_pedidos).toFixed(2),
                ingresos_por_capacidad: (item.ingresos_totales / item.mesa.capacidad).toFixed(2)
            }))
            .sort((a, b) => b.ingresos_totales - a.ingresos_totales);

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                mesas
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

        const pedidosMozos = await Pedido.findAll({
            include: [{
                model: Usuario,
                as: 'mozo',
                attributes: ['id', 'nombre', 'email'],
                where: {
                    rol: 'mozo',
                    activo: true
                }
            }],
            attributes: ['usuario_id', 'total'],
            where: {
                created_at: {
                    [Op.between]: [fechaInicio, fechaFin]
                }
            },
            raw: true
        });

        const mozosAgrupados = pedidosMozos.reduce((acc, pedido) => {
            const key = pedido.usuario_id;
            if (!acc[key]) {
                acc[key] = {
                    mozo: {
                        id: pedido['mozo.id'],
                        nombre: pedido['mozo.nombre'],
                        email: pedido['mozo.email']
                    },
                    total_pedidos: 0,
                    total_ventas: 0
                };
            }
            acc[key].total_pedidos += 1;
            acc[key].total_ventas += parseFloat(pedido.total);
            return acc;
        }, {});

        const mozos = Object.values(mozosAgrupados)
            .map(item => ({
                ...item,
                total_ventas: parseFloat(item.total_ventas).toFixed(2),
                promedio_por_pedido: (item.total_ventas / item.total_pedidos).toFixed(2)
            }))
            .sort((a, b) => b.total_ventas - a.total_ventas);

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                mozos
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

        const detalles = await DetallePedido.findAll({
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
            attributes: ['cantidad', 'subtotal'],
            raw: true
        });

        const categoriasAgrupadas = detalles.reduce((acc, detalle) => {
            const key = detalle['producto.categoria.id'];
            const nombre = detalle['producto.categoria.nombre'];
            
            if (!acc[key]) {
                acc[key] = {
                    categoria: {
                        id: key,
                        nombre: nombre
                    },
                    total_vendido: 0,
                    ingresos_totales: 0
                };
            }
            acc[key].total_vendido += detalle.cantidad;
            acc[key].ingresos_totales += parseFloat(detalle.subtotal);
            return acc;
        }, {});

        const categorias = Object.values(categoriasAgrupadas)
            .map(item => ({
                ...item,
                ingresos_totales: parseFloat(item.ingresos_totales).toFixed(2)
            }))
            .sort((a, b) => b.ingresos_totales - a.ingresos_totales);

        res.json({
            success: true,
            data: {
                periodo: {
                    desde: fechaInicio.toISOString().split('T')[0],
                    hasta: fechaFin.toISOString().split('T')[0]
                },
                categorias
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