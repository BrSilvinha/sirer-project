const { Mesa } = require('../models/associations');

// Obtener todas las mesas
const obtenerMesas = async (req, res) => {
    try {
        const mesas = await Mesa.findAll({
            where: { activa: true },
            order: [['numero', 'ASC']]
        });

        res.json({
            success: true,
            data: mesas,
            total: mesas.length
        });
    } catch (error) {
        console.error('Error obteniendo mesas:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error interno del servidor' 
        });
    }
};

// Obtener mesa por ID
const obtenerMesaPorId = async (req, res) => {
    try {
        const { id } = req.params;
        
        const mesa = await Mesa.findByPk(id);
        
        if (!mesa || !mesa.activa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        res.json({
            success: true,
            data: mesa
        });
    } catch (error) {
        console.error('Error obteniendo mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Crear nueva mesa
const crearMesa = async (req, res) => {
    try {
        const { numero, capacidad } = req.body;

        // Verificar si ya existe una mesa con ese número
        const mesaExistente = await Mesa.findOne({ 
            where: { numero, activa: true } 
        });
        
        if (mesaExistente) {
            return res.status(400).json({
                success: false,
                error: 'Ya existe una mesa con ese número'
            });
        }

        const nuevaMesa = await Mesa.create({
            numero,
            capacidad: capacidad || 4
        });

        res.status(201).json({
            success: true,
            message: 'Mesa creada exitosamente',
            data: nuevaMesa
        });
    } catch (error) {
        console.error('Error creando mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Actualizar mesa
const actualizarMesa = async (req, res) => {
    try {
        const { id } = req.params;
        const { numero, capacidad, estado } = req.body;

        const mesa = await Mesa.findByPk(id);
        
        if (!mesa || !mesa.activa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        // Si se está cambiando el número, verificar que no exista
        if (numero && numero !== mesa.numero) {
            const mesaExistente = await Mesa.findOne({ 
                where: { numero, activa: true } 
            });
            
            if (mesaExistente) {
                return res.status(400).json({
                    success: false,
                    error: 'Ya existe una mesa con ese número'
                });
            }
        }

        await mesa.update({
            ...(numero && { numero }),
            ...(capacidad && { capacidad }),
            ...(estado && { estado })
        });

        // Emitir evento de Socket.io si hay cambio de estado
        if (estado && req.io) {
            req.io.emit('mesa-actualizada', {
                mesa: mesa.toJSON(),
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Mesa actualizada exitosamente',
            data: mesa
        });
    } catch (error) {
        console.error('Error actualizando mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Cambiar estado de mesa
const cambiarEstadoMesa = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        const estadosValidos = ['libre', 'ocupada', 'cuenta_solicitada'];
        
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({
                success: false,
                error: 'Estado inválido. Debe ser: libre, ocupada o cuenta_solicitada'
            });
        }

        const mesa = await Mesa.findByPk(id);
        
        if (!mesa || !mesa.activa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        const estadoAnterior = mesa.estado;
        await mesa.update({ estado });

        // Emitir evento de Socket.io
        if (req.io) {
            req.io.emit('mesa-estado-cambiado', {
                mesa: mesa.toJSON(),
                estadoAnterior,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            success: true,
            message: 'Estado de mesa actualizado exitosamente',
            data: mesa
        });
    } catch (error) {
        console.error('Error cambiando estado de mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Eliminar mesa (soft delete)
const eliminarMesa = async (req, res) => {
    try {
        const { id } = req.params;

        const mesa = await Mesa.findByPk(id);
        
        if (!mesa || !mesa.activa) {
            return res.status(404).json({
                success: false,
                error: 'Mesa no encontrada'
            });
        }

        // Verificar que la mesa no esté ocupada
        if (mesa.estado !== 'libre') {
            return res.status(400).json({
                success: false,
                error: 'No se puede eliminar una mesa ocupada'
            });
        }

        await mesa.update({ activa: false });

        res.json({
            success: true,
            message: 'Mesa eliminada exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando mesa:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
};

// Obtener estadísticas de mesas
const obtenerEstadisticasMesas = async (req, res) => {
    try {
        const total = await Mesa.count({ where: { activa: true } });
        const libres = await Mesa.count({ where: { activa: true, estado: 'libre' } });
        const ocupadas = await Mesa.count({ where: { activa: true, estado: 'ocupada' } });
        const cuentaSolicitada = await Mesa.count({ where: { activa: true, estado: 'cuenta_solicitada' } });

        res.json({
            success: true,
            data: {
                total,
                libres,
                ocupadas,
                cuenta_solicitada: cuentaSolicitada,
                porcentaje_ocupacion: total > 0 ? Math.round(((ocupadas + cuentaSolicitada) / total) * 100) : 0
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

module.exports = {
    obtenerMesas,
    obtenerMesaPorId,
    crearMesa,
    actualizarMesa,
    cambiarEstadoMesa,
    eliminarMesa,
    obtenerEstadisticasMesas
};