const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/associations');

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({ 
                error: 'Token de acceso requerido' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscar el usuario en la base de datos
        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: { exclude: ['password'] }
        });

        if (!usuario || !usuario.activo) {
            return res.status(401).json({ 
                error: 'Usuario no válido o inactivo' 
            });
        }

        req.user = usuario;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token inválido' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(403).json({ error: 'Token expirado' });
        }
        
        console.error('Error en autenticación:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }

        if (!roles.includes(req.user.rol)) {
            return res.status(403).json({ 
                error: `Acceso denegado. Rol requerido: ${roles.join(' o ')}` 
            });
        }

        next();
    };
};

module.exports = { authenticateToken, authorizeRoles };