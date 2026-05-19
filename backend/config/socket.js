const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/associations');

class SocketManager {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> { socket, user }
        this.roomUsers = {
            administrador: new Set(),
            mozo: new Set()
        };
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.SOCKET_ORIGIN || "http://localhost:3000",
                methods: ["GET", "POST"],
                credentials: true
            },
            transports: ['websocket', 'polling']
        });

        this.setupMiddleware();
        this.setupEventHandlers();
        
        console.log('🔌 Socket.io configurado correctamente');
        return this.io;
    }

    setupMiddleware() {
        // Middleware de autenticación para sockets
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                
                if (!token) {
                    throw new Error('Token de autenticación requerido');
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const usuario = await Usuario.findByPk(decoded.id, {
                    attributes: { exclude: ['password'] }
                });

                if (!usuario || !usuario.activo) {
                    throw new Error('Usuario no válido o inactivo');
                }

                socket.userId = usuario.id;
                socket.user = usuario;
                next();
            } catch (error) {
                console.error('❌ Error autenticación socket:', error.message);
                next(new Error('Autenticación fallida'));
            }
        });
    }

    setupEventHandlers() {
        this.io.on('connection', (socket) => {
            this.handleConnection(socket);
        });
    }

    handleConnection(socket) {
        const user = socket.user;
        console.log(`✅ Usuario conectado: ${user.nombre} (${user.rol}) - Socket: ${socket.id}`);

        // Registrar usuario conectado
        this.connectedUsers.set(user.id, { socket, user });
        this.roomUsers[user.rol].add(user.id);

        // Unir al usuario a su sala de rol
        socket.join(user.rol);
        socket.join(`user_${user.id}`);

        // Emitir estadísticas de conexión
        this.emitConnectionStats();

        // Configurar eventos específicos por rol
        this.setupRoleEvents(socket, user);

        // Manejar desconexión
        socket.on('disconnect', (reason) => {
            console.log(`❌ Usuario desconectado: ${user.nombre} - Razón: ${reason}`);
            this.handleDisconnection(socket, user);
        });

        // Eventos generales
        this.setupGeneralEvents(socket, user);
    }

    setupRoleEvents(socket, user) {
        switch (user.rol) {
            case 'mozo':
                this.setupMozoEvents(socket, user);
                break;
            case 'administrador':
                this.setupAdminEvents(socket, user);
                break;
        }
    }

    setupMozoEvents(socket, user) {
        // Evento cuando el mozo marca un pedido como entregado
        socket.on('pedido-entregado', (data) => {
            console.log(`📋 Mozo ${user.nombre} marcó pedido ${data.pedidoId} como entregado`);
            
            // Notificar a cajeros
            this.emitToRole('cajero', 'pedido-listo-para-cobrar', {
                pedidoId: data.pedidoId,
                mesa: data.mesa,
                total: data.total,
                mozo: user.nombre,
                timestamp: new Date().toISOString()
            });

            // Notificar a administradores
            this.emitToRole('administrador', 'pedido-estado-actualizado', {
                pedidoId: data.pedidoId,
                nuevoEstado: 'entregado',
                mozo: user.nombre,
                timestamp: new Date().toISOString()
            });
        });

        // Evento cuando mozo solicita cuenta
        socket.on('solicitar-cuenta', (data) => {
            console.log(`💳 Mozo ${user.nombre} solicitó cuenta para mesa ${data.mesa}`);
            
            this.emitToRole('cajero', 'cuenta-solicitada', {
                mesa: data.mesa,
                pedidos: data.pedidos,
                total: data.total,
                mozo: user.nombre,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupAdminEvents(socket, user) {
        // Evento para broadcast general
        socket.on('admin-broadcast', (data) => {
            console.log(`📢 Admin ${user.nombre} envió broadcast: ${data.mensaje}`);
            
            this.io.emit('admin-mensaje', {
                tipo: data.tipo || 'info',
                mensaje: data.mensaje,
                admin: user.nombre,
                timestamp: new Date().toISOString()
            });
        });

        // Evento para solicitar estadísticas en tiempo real
        socket.on('solicitar-estadisticas', () => {
            this.emitConnectionStats();
        });
    }

    setupGeneralEvents(socket, user) {
        // Ping/Pong para mantener conexión
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: new Date().toISOString() });
        });

        // Evento para unirse a salas específicas
        socket.on('join-room', (room) => {
            socket.join(room);
            console.log(`🏠 ${user.nombre} se unió a sala: ${room}`);
        });

        // Evento para salir de salas
        socket.on('leave-room', (room) => {
            socket.leave(room);
            console.log(`🚪 ${user.nombre} salió de sala: ${room}`);
        });
    }

    handleDisconnection(socket, user) {
        this.connectedUsers.delete(user.id);
        if (this.roomUsers[user.rol]) this.roomUsers[user.rol].delete(user.id);

        // Emitir estadísticas actualizadas
        this.emitConnectionStats();
    }

    // Métodos de utilidad para emitir eventos
    emitToRole(role, event, data) {
        this.io.to(role).emit(event, data);
    }

    emitToUser(userId, event, data) {
        const userConnection = this.connectedUsers.get(userId);
        if (userConnection) {
            userConnection.socket.emit(event, data);
        }
    }

    emitToAll(event, data) {
        this.io.emit(event, data);
    }

    emitConnectionStats() {
        const stats = {
            totalConnected: this.connectedUsers.size,
            byRole: {
                administrador: this.roomUsers.administrador.size,
                mozo: this.roomUsers.mozo.size
            },
            timestamp: new Date().toISOString()
        };

        this.emitToRole('administrador', 'connection-stats', stats);
    }

    // Métodos para uso desde controladores
    notifyNewOrder(pedidoData) {
        this.emitToAll('nuevo-pedido', {
            pedido: pedidoData,
            timestamp: new Date().toISOString()
        });
    }

    notifyOrderStatusChange(pedidoId, nuevoEstado, data = {}) {
        this.emitToAll('pedido-estado-actualizado', {
            pedidoId,
            nuevoEstado,
            ...data,
            timestamp: new Date().toISOString()
        });
    }

    notifyProductAvailabilityChange(productoData) {
        this.emitToRole('mozo', 'producto-disponibilidad-actualizada', {
            ...productoData,
            timestamp: new Date().toISOString()
        });
    }

    notifyTableStatusChange(mesaData) {
        this.emitToAll('mesa-estado-actualizada', {
            ...mesaData,
            timestamp: new Date().toISOString()
        });
    }

    // Getter para usar en controladores
    getIO() {
        return this.io;
    }

    getConnectedUsers() {
        return Array.from(this.connectedUsers.values()).map(conn => ({
            id: conn.user.id,
            nombre: conn.user.nombre,
            rol: conn.user.rol,
            socketId: conn.socket.id
        }));
    }
}

// Singleton instance
const socketManager = new SocketManager();

module.exports = socketManager;