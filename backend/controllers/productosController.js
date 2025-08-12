const { Producto, Categoria } = require('../models/associations');

// Obtener todos los productos
const obtenerProductos = async (req, res) => {
    try {
        const { categoria_id, disponible } = req.query;
        
        const whereClause = { activo: true };
        
        if (categoria_id) {
            whereClause.categoria_id = categoria_id;
        }
        
        if (disponible !== undefined) {
            whereClause.disponible = disponible === 'true';
        }

        const productos = await Producto.findAll({
            where: whereClause,
            include: [{
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
            }],
            order: [['nombre', 'ASC']]
        });

        res.json({
            success: true,
            data: productos,
            total: productos.length
        });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
};

// Obtener productos por categoría
const obtenerProductosPorCategoria = async (req, res) => {
    try {
        const { categoria_id } = req.params;
        
        const productos = await Producto.findAll({
            where: { 
                categoria_id, 
                activo: true 
            },
            include: [{
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
            }],
            order: [['nombre', 'ASC']]
        });

        res.json({
            success: true,
            data: productos,
            total: productos.length,
            categoria_id
        });
    } catch (error) {
        console.error('Error obteniendo productos por categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener producto por ID
const obtenerProductoPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const producto = await Producto.findByPk(id, {
            include: [{
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
            }]
        });
        
        if (!producto || !producto.activo) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        res.json({
            success: true,
            data: producto
        });
    } catch (error) {
        console.error('Error obteniendo producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Crear nuevo producto
const crearProducto = async (req, res) => {
    try {
        const { nombre, descripcion, precio, categoria_id, disponible } = req.body;

        // Verificar que la categoría existe
        const categoria = await Categoria.findByPk(categoria_id);
        if (!categoria || !categoria.activa) {
            return res.status(400).json({
                success: false,
                error: 'Categoría no válida'
            });
        }

        const nuevoProducto = await Producto.create({
            nombre,
            descripcion,
            precio,
            categoria_id,
            disponible: disponible !== undefined ? disponible : true
        });

        // Obtener el producto completo con la categoría
        const productoCompleto = await Producto.findByPk(nuevoProducto.id, {
            include: [{
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
            }]
        });

        res.status(201).json({
            success: true,
            message: 'Producto creado exitosamente',
            data: productoCompleto
        });
    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar producto
const actualizarProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion, precio, categoria_id, disponible } = req.body;

        const producto = await Producto.findByPk(id);
        
        if (!producto || !producto.activo) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        // Si se está cambiando la categoría, verificar que existe
        if (categoria_id && categoria_id !== producto.categoria_id) {
            const categoria = await Categoria.findByPk(categoria_id);
            if (!categoria || !categoria.activa) {
                return res.status(400).json({
                    success: false,
                    error: 'Categoría no válida'
                });
            }
        }

        const disponibleAnterior = producto.disponible;

        await producto.update({
            ...(nombre && { nombre }),
            ...(descripcion !== undefined && { descripcion }),
            ...(precio && { precio }),
            ...(categoria_id && { categoria_id }),
            ...(disponible !== undefined && { disponible })
        });

        // Emitir evento de Socket.io si cambió la disponibilidad
        if (disponible !== undefined && disponible !== disponibleAnterior && req.io) {
            req.io.to('mozo').emit('producto-disponibilidad-actualizada', {
                producto: producto.toJSON(),
                disponibleAnterior,
                timestamp: new Date().toISOString()
            });
        }

        // Obtener el producto completo actualizado
        const productoActualizado = await Producto.findByPk(id, {
            include: [{
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre']
            }]
        });

        res.json({
            success: true,
            message: 'Producto actualizado exitosamente',
            data: productoActualizado
        });
    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Cambiar disponibilidad de producto
const cambiarDisponibilidadProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const { disponible } = req.body;

        if (typeof disponible !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El campo disponible debe ser true o false'
            });
        }

        const producto = await Producto.findByPk(id);
        
        if (!producto || !producto.activo) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        const disponibleAnterior = producto.disponible;
        await producto.update({ disponible });

        // Emitir evento de Socket.io
        if (req.io) {
            req.io.to('mozo').emit('producto-disponibilidad-actualizada', {
                producto: producto.toJSON(),
                disponibleAnterior,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: `Producto S/{disponible ? 'habilitado' : 'deshabilitado'} exitosamente`,
            data: producto
        });
    } catch (error) {
        console.error('Error cambiando disponibilidad de producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar producto (soft delete)
const eliminarProducto = async (req, res) => {
    try {
        const { id } = req.params;

        const producto = await Producto.findByPk(id);
        
        if (!producto || !producto.activo) {
            return res.status(404).json({
                success: false,
                error: 'Producto no encontrado'
            });
        }

        await producto.update({ activo: false });

        res.json({
            success: true,
            message: 'Producto eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando producto:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener productos disponibles (para mozos)
const obtenerProductosDisponibles = async (req, res) => {
    try {
        const productos = await Producto.findAll({
            where: { 
                activo: true,
                disponible: true 
            },
            include: [{
                model: Categoria,
                as: 'categoria',
                attributes: ['id', 'nombre'],
                where: { activa: true }
            }],
            order: [
                [{ model: Categoria, as: 'categoria' }, 'nombre', 'ASC'],
                ['nombre', 'ASC']
            ]
        });

        // Agrupar por categoría
        const productosPorCategoria = productos.reduce((acc, producto) => {
            const categoriaNombre = producto.categoria.nombre;
            if (!acc[categoriaNombre]) {
                acc[categoriaNombre] = {
                    categoria: producto.categoria,
                    productos: []
                };
            }
            acc[categoriaNombre].productos.push(producto);
            return acc;
        }, {});

        res.json({
            success: true,
            data: Object.values(productosPorCategoria),
            total: productos.length
        });
    } catch (error) {
        console.error('Error obteniendo productos disponibles:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
    obtenerProductos,
    obtenerProductosPorCategoria,
    obtenerProductoPorId,
    crearProducto,
    actualizarProducto,
    cambiarDisponibilidadProducto,
    eliminarProducto,
    obtenerProductosDisponibles
};