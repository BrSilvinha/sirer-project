const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/associations');

const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { id: userId },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );

    const refreshToken = jwt.sign(
        { id: userId },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Buscar usuario por email
        const usuario = await Usuario.findOne({ 
            where: { email, activo: true }
        });

        if (!usuario) {
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Validar contraseña
        const isValidPassword = await usuario.validarPassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Generar tokens
        const { accessToken, refreshToken } = generateTokens(usuario.id);

        // Respuesta sin la contraseña
        const { password: _, ...usuarioSinPassword } = usuario.toJSON();

        res.json({
            message: 'Login exitoso',
            usuario: usuarioSinPassword,
            accessToken,
            refreshToken
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const register = async (req, res) => {
    try {
        const { nombre, email, password, rol } = req.body;

        // Verificar si ya existe un usuario con ese email
        const usuarioExistente = await Usuario.findOne({ where: { email } });
        if (usuarioExistente) {
            return res.status(400).json({ 
                error: 'Ya existe un usuario con ese email' 
            });
        }

        // Crear usuario
        const nuevoUsuario = await Usuario.create({
            nombre,
            email,
            password,
            rol: rol || 'mozo'
        });

        // Respuesta sin la contraseña
        const { password: _, ...usuarioSinPassword } = nuevoUsuario.toJSON();

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            usuario: usuarioSinPassword
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getProfile = async (req, res) => {
    try {
        const { password: _, ...usuarioSinPassword } = req.user.toJSON();
        res.json({ usuario: usuarioSinPassword });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({ error: 'Refresh token requerido' });
        }

        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.id);

        res.json({
            accessToken,
            refreshToken: newRefreshToken
        });

    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(403).json({ error: 'Refresh token inválido' });
    }
};

module.exports = {
    login,
    register,
    getProfile,
    refreshToken
};