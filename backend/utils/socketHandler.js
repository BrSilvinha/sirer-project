const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/associations');

const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
            return next(new Error('Token de autenticación requerido'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: { exclude: ['password'] }
        });

        if (!usuario || !usuario.activo) {
            return next(new Error('Usuario no válido'));
        }

        socket.usuario = usuario;
        next();
    } catch (error) {
        next(new Error('Token inválido'));
    }
};

const configureSocketIO = (io) => {
    // Middleware de autenticación para sockets
    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        const usuario = socket.usuario;
        console.log(`✅ Usuario conectado: ${usuario.nombre} (${usuario.rol}) - Socket: ${socket.id}`);
        
        // Unirse automáticamente a la sala de su rol
        socket.join(usuario.rol);
        console.log(`👤 Usuario ${usuario.nombre} se unió a sala: ${usuario.rol}`);
        
        // Eventos específicos por rol
        setupRoleSpecificEvents(socket, usuario);
        
        // Eventos generales
        setupGeneralEvents(socket, usuario, io);
        
        // Manejar desconexión
        socket.on('disconnect', (reason) => {
            console.log(`❌ Usuario desconectado: ${usuario.nombre} - Socket: ${socket.id}, razón: ${reason}`);
        });
    });
};

const setupRoleSpecificEvents = (socket, usuario) => {
    switch (usuario.rol) {
        case 'mozo':
            setupMozoEvents(socket, usuario);
            break;
        case 'administrador':
            setupAdminEvents(socket, usuario);
            break;
    }
};

const setupMozoEvents = (socket, usuario) => {
    // Evento para solicitar productos disponibles
    socket.on('solicitar-productos-disponibles', () => {
        // Aquí podrías emitir los productos disponibles
        socket.emit('productos-disponibles-actualizados', {
            timestamp: new Date().toISOString()
        });
    });

    // Evento para marcar pedido como entregado
    socket.on('pedido-entregado', (data) => {
        socket.to('administrador').emit('pedido-entregado-notificacion', {
            pedido_id: data.pedido_id,
            mesa_numero: data.mesa_numero,
            mozo: usuario.nombre,
            timestamp: new Date().toISOString()
        });
    });
};

const setupAdminEvents = (socket, usuario) => {
    // Evento para solicitar estadísticas en tiempo real
    socket.on('solicitar-estadisticas', () => {
        // Emitir estadísticas actuales
        socket.emit('estadisticas-actualizadas', {
            timestamp: new Date().toISOString()
        });
    });

    // Evento para broadcast a todos
    socket.on('admin-broadcast', (data) => {
        socket.broadcast.emit('admin-mensaje', {
            mensaje: data.mensaje,
            tipo: data.tipo || 'info',
            enviado_por: usuario.nombre,
            timestamp: new Date().toISOString()
        });
    });
};

const setupGeneralEvents = (socket, usuario, io) => {
    // Evento para unirse a salas específicas
    socket.on('join-room', (room) => {
        socket.join(room);
        console.log(`🏠 Usuario ${usuario.nombre} se unió a sala: ${room}`);
    });

    // Evento para salir de salas específicas  
    socket.on('leave-room', (room) => {
        socket.leave(room);
        console.log(`🚪 Usuario ${usuario.nombre} salió de sala: ${room}`);
    });

    // Evento de ping/pong para mantener conexión
    socket.on('ping', () => {
        socket.emit('pong', {
            timestamp: new Date().toISOString()
        });
    });

    // Evento para obtener usuarios conectados por rol
    socket.on('obtener-usuarios-conectados', () => {
        const sockets = io.sockets.sockets;
        const usuariosConectados = {};

        sockets.forEach((s) => {
            if (s.usuario) {
                const rol = s.usuario.rol;
                if (!usuariosConectados[rol]) {
                    usuariosConectados[rol] = [];
                }
                usuariosConectados[rol].push({
                    id: s.usuario.id,
                    nombre: s.usuario.nombre,
                    socket_id: s.id
                });
            }
        });

        socket.emit('usuarios-conectados', usuariosConectados);
    });
};

// Función para emitir eventos desde los controladores
const emitirEvento = (io, evento, data, sala = null) => {
    if (sala) {
        io.to(sala).emit(evento, data);
    } else {
        io.emit(evento, data);
    }
};

// Eventos predefinidos del sistema
const EVENTOS = {
    // Pedidos
    NUEVO_PEDIDO: 'nuevo-pedido',
    PEDIDO_ESTADO_CAMBIADO: 'pedido-estado-cambiado',
    PEDIDO_PREPARADO: 'pedido-preparado',
    PEDIDO_ENTREGADO: 'pedido-entregado',
    
    // Mesas
    MESA_ESTADO_CAMBIADO: 'mesa-estado-cambiado',
    MESA_LIBERADA: 'mesa-liberada',

    // Sistema
    NOTIFICACION_GENERAL: 'notificacion-general',
    ESTADISTICAS_ACTUALIZADAS: 'estadisticas-actualizadas'
};

module.exports = {
    configureSocketIO,
    emitirEvento,
    EVENTOS
};