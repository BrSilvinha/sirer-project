const express = require('express');
const router = express.Router();
const { Usuario } = require('../models/associations');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Obtener todos los usuarios (solo admins)
router.get('/', authenticateToken, authorizeRoles('administrador'), async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            attributes: { exclude: ['password'] },
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            data: usuarios,
            total: usuarios.length
        });
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener usuario por ID
router.get('/:id', authenticateToken, authorizeRoles('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        
        const usuario = await Usuario.findByPk(id, {
            attributes: { exclude: ['password'] }
        });
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        res.json({
            success: true,
            data: usuario
        });
    } catch (error) {
        console.error('Error obteniendo usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Actualizar usuario
router.put('/:id', authenticateToken, authorizeRoles('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, email, rol, activo } = req.body;

        const usuario = await Usuario.findByPk(id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // Verificar email único si se está cambiando
        if (email && email !== usuario.email) {
            const emailExistente = await Usuario.findOne({ 
                where: { email },
                attributes: ['id']
            });
            
            if (emailExistente) {
                return res.status(400).json({
                    success: false,
                    error: 'El email ya está en uso'
                });
            }
        }

        await usuario.update({
            ...(nombre && { nombre }),
            ...(email && { email }),
            ...(rol && { rol }),
            ...(activo !== undefined && { activo })
        });

        // Respuesta sin contraseña
        const { password: _, ...usuarioActualizado } = usuario.toJSON();

        res.json({
            success: true,
            message: 'Usuario actualizado exitosamente',
            data: usuarioActualizado
        });
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Cambiar estado de usuario (activar/desactivar)
router.patch('/:id/status', authenticateToken, authorizeRoles('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { activo } = req.body;

        if (typeof activo !== 'boolean') {
            return res.status(400).json({
                success: false,
                error: 'El campo activo debe ser true o false'
            });
        }

        const usuario = await Usuario.findByPk(id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        await usuario.update({ activo });

        res.json({
            success: true,
            message: `Usuario ${activo ? 'activado' : 'desactivado'} exitosamente`,
            data: { id: usuario.id, activo }
        });
    } catch (error) {
        console.error('Error cambiando estado usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Cambiar contraseña de usuario
router.patch('/:id/password', authenticateToken, authorizeRoles('administrador'), async (req, res) => {
    try {
        const { id } = req.params;
        const { nuevaPassword } = req.body;

        if (!nuevaPassword || nuevaPassword.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'La contraseña debe tener al menos 6 caracteres'
            });
        }

        const usuario = await Usuario.findByPk(id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        await usuario.update({ password: nuevaPassword });

        res.json({
            success: true,
            message: 'Contraseña actualizada exitosamente'
        });
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Eliminar usuario (soft delete)
router.delete('/:id', authenticateToken, authorizeRoles('administrador'), async (req, res) => {
    try {
        const { id } = req.params;

        const usuario = await Usuario.findByPk(id);
        
        if (!usuario) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }

        // No permitir eliminar el propio usuario
        if (parseInt(id) === req.user.id) {
            return res.status(400).json({
                success: false,
                error: 'No puedes eliminar tu propio usuario'
            });
        }

        await usuario.update({ activo: false });

        res.json({
            success: true,
            message: 'Usuario eliminado exitosamente'
        });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;