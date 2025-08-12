const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { Usuario } = require('../models/associations');

class SocketManager {
    constructor() {
        this.io = null;
        this.connectedUsers = new Map(); // userId -> { socket, user }
        this.roomUsers = {
            administrador: new Set(),
            mozo: new Set(),
            cocina: new Set(),
            cajero: new Set()
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
        console.log(`✅ Usuario conectado: S/{user.nombre} (S/{user.rol}) - Socket: S/{socket.id}`);

        // Registrar usuario conectado
        this.connectedUsers.set(user.id, { socket, user });
        this.roomUsers[user.rol].add(user.id);

        // Unir al usuario a su sala de rol
        socket.join(user.rol);
        socket.join(`user_S/{user.id}`);

        // Emitir estadísticas de conexión
        this.emitConnectionStats();

        // Configurar eventos específicos por rol
        this.setupRoleEvents(socket, user);

        // Manejar desconexión
        socket.on('disconnect', (reason) => {
            console.log(`❌ Usuario desconectado: S/{user.nombre} - Razón: S/{reason}`);
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
            case 'cocina':
                this.setupCocinaEvents(socket, user);
                break;
            case 'cajero':
                this.setupCajeroEvents(socket, user);
                break;
            case 'administrador':
                this.setupAdminEvents(socket, user);
                break;
        }
    }

    setupMozoEvents(socket, user) {
        // Evento cuando el mozo marca un pedido como entregado
        socket.on('pedido-entregado', (data) => {
            console.log(`📋 Mozo S/{user.nombre} marcó pedido S/{data.pedidoId} como entregado`);
            
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
            console.log(`💳 Mozo S/{user.nombre} solicitó cuenta para mesa S/{data.mesa}`);
            
            this.emitToRole('cajero', 'cuenta-solicitada', {
                mesa: data.mesa,
                pedidos: data.pedidos,
                total: data.total,
                mozo: user.nombre,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupCocinaEvents(socket, user) {
        // Evento cuando cocina toma un pedido
        socket.on('tomar-pedido', (data) => {
            console.log(`👨‍🍳 Cocina tomó pedido S/{data.pedidoId}`);
            
            this.emitToRole('mozo', 'pedido-tomado-cocina', {
                pedidoId: data.pedidoId,
                mesa: data.mesa,
                timestamp: new Date().toISOString()
            });
        });

        // Evento cuando cocina marca pedido como preparado
        socket.on('pedido-preparado', (data) => {
            console.log(`🔔 Pedido S/{data.pedidoId} preparado por cocina`);
            
            // Notificar al mozo específico
            if (data.mozoId) {
                this.emitToUser(data.mozoId, 'pedido-listo', {
                    pedidoId: data.pedidoId,
                    mesa: data.mesa,
                    productos: data.productos,
                    timestamp: new Date().toISOString()
                });
            }

            // Notificar a todos los mozos como respaldo
            this.emitToRole('mozo', 'pedido-disponible-para-entregar', {
                pedidoId: data.pedidoId,
                mesa: data.mesa,
                timestamp: new Date().toISOString()
            });
        });

        // Evento cuando cambia disponibilidad de producto
        socket.on('cambiar-disponibilidad-producto', (data) => {
            console.log(`🥘 Producto S/{data.productoNombre} marcado como S/{data.disponible ? 'disponible' : 'agotado'}`);
            
            // Notificar a todos los mozos
            this.emitToRole('mozo', 'producto-disponibilidad-actualizada', {
                productoId: data.productoId,
                productoNombre: data.productoNombre,
                disponible: data.disponible,
                timestamp: new Date().toISOString()
            });

            // Notificar a administradores
            this.emitToRole('administrador', 'inventario-actualizado', {
                productoId: data.productoId,
                disponible: data.disponible,
                actualizadoPor: user.nombre,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupCajeroEvents(socket, user) {
        // Evento cuando se procesa un pago
        socket.on('pago-procesado', (data) => {
            console.log(`💰 Cajero S/{user.nombre} procesó pago mesa S/{data.mesa}`);
            
            // Notificar a todos sobre mesa liberada
            this.io.emit('mesa-liberada', {
                mesa: data.mesa,
                total: data.total,
                metodoPago: data.metodoPago,
                cajero: user.nombre,
                timestamp: new Date().toISOString()
            });

            // Actualizar estadísticas en tiempo real
            this.emitToRole('administrador', 'venta-realizada', {
                mesa: data.mesa,
                total: data.total,
                metodoPago: data.metodoPago,
                timestamp: new Date().toISOString()
            });
        });
    }

    setupAdminEvents(socket, user) {
        // Evento para broadcast general
        socket.on('admin-broadcast', (data) => {
            console.log(`📢 Admin S/{user.nombre} envió broadcast: S/{data.mensaje}`);
            
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
            console.log(`🏠 S/{user.nombre} se unió a sala: S/{room}`);
        });

        // Evento para salir de salas
        socket.on('leave-room', (room) => {
            socket.leave(room);
            console.log(`🚪 S/{user.nombre} salió de sala: S/{room}`);
        });
    }

    handleDisconnection(socket, user) {
        // Remover de registros
        this.connectedUsers.delete(user.id);
        this.roomUsers[user.rol].delete(user.id);

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
                mozo: this.roomUsers.mozo.size,
                cocina: this.roomUsers.cocina.size,
                cajero: this.roomUsers.cajero.size
            },
            timestamp: new Date().toISOString()
        };

        this.emitToRole('administrador', 'connection-stats', stats);
    }

    // Métodos para uso desde controladores
    notifyNewOrder(pedidoData) {
        console.log(`🔔 Nuevo pedido S/{pedidoData.id} para mesa S/{pedidoData.mesa.numero}`);
        
        this.emitToRole('cocina', 'nuevo-pedido', {
            pedido: pedidoData,
            sonido: true, // Trigger para sonido en frontend
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