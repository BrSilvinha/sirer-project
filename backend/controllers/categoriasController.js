const { Categoria, Producto } = require('../models/associations');

// Obtener todas las categorías
const obtenerCategorias = async (req, res) => {
    try {
        const categorias = await Categoria.findAll({
            where: { activa: true },
            include: [{
                model: Producto,
                as: 'productos',
                where: { activo: true },
                required: false // LEFT JOIN para incluir categorías sin productos
            }],
            order: [['nombre', 'ASC']]
        });

        res.json({
            success: true,
            data: categorias,
            total: categorias.length
        });
    } catch (error) {
        console.error('Error obteniendo categorías:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
};

// Obtener categoría por ID
const obtenerCategoriaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const categoria = await Categoria.findByPk(id, {
            include: [{
                model: Producto,
                as: 'productos',
                where: { activo: true },
                required: false
            }]
        });
        
        if (!categoria || !categoria.activa) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada'
            });
        }

        res.json({
            success: true,
            data: categoria
        });
    } catch (error) {
        console.error('Error obteniendo categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Crear nueva categoría
const crearCategoria = async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;

        // Verificar si ya existe una categoría con ese nombre
        const categoriaExistente = await Categoria.findOne({ 
            where: { nombre, activa: true } 
        });
        
        if (categoriaExistente) {
            return res.status(400).json({
                success: false,
                error: 'Ya existe una categoría con ese nombre'
            });
        }

        const nuevaCategoria = await Categoria.create({
            nombre,
            descripcion
        });

        res.status(201).json({
            success: true,
            message: 'Categoría creada exitosamente',
            data: nuevaCategoria
        });
    } catch (error) {
        console.error('Error creando categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar categoría
const actualizarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        const categoria = await Categoria.findByPk(id);
        
        if (!categoria || !categoria.activa) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada'
            });
        }

        // Si se está cambiando el nombre, verificar que no exista
        if (nombre && nombre !== categoria.nombre) {
            const categoriaExistente = await Categoria.findOne({ 
                where: { nombre, activa: true } 
            });
            
            if (categoriaExistente) {
                return res.status(400).json({
                    success: false,
                    error: 'Ya existe una categoría con ese nombre'
                });
            }
        }

        await categoria.update({
            ...(nombre && { nombre }),
            ...(descripcion !== undefined && { descripcion })
        });

        res.json({
            success: true,
            message: 'Categoría actualizada exitosamente',
            data: categoria
        });
    } catch (error) {
        console.error('Error actualizando categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar categoría (soft delete)
const eliminarCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        const categoria = await Categoria.findByPk(id);
        
        if (!categoria || !categoria.activa) {
            return res.status(404).json({
                success: false,
                error: 'Categoría no encontrada'
            });
        }

        // Verificar si tiene productos activos
        const productosActivos = await Producto.count({
            where: { categoria_id: id, activo: true }
        });

        if (productosActivos > 0) {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar una categoría que tiene productos activos'
            });
        }

        await categoria.update({ activa: false });

        res.json({
            success: true,
            message: 'Categoría eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando categoría:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

module.exports = {
    obtenerCategorias,
    obtenerCategoriaPorId,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
};