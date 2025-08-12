import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.user = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.eventListeners = new Map();
        
        // URLs del servidor
        this.serverUrl = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';
    }

    // 🔌 Conectar al servidor Socket.io
    connect(token, user) {
        if (this.socket?.connected) {
            console.log('🔌 Ya conectado a Socket.io');
            return this.socket;
        }

        this.user = user;
        
        console.log(`🔄 Conectando a Socket.io como ${user.nombre} (${user.rol})...`);

        this.socket = io(this.serverUrl, {
            auth: { token },
            transports: ['websocket', 'polling'],
            timeout: 5000,
            reconnection: true,
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000
        });

        this.setupEventHandlers();
        return this.socket;
    }

    // 📡 Configurar manejadores de eventos del socket
    setupEventHandlers() {
        // Evento de conexión exitosa
        this.socket.on('connect', () => {
            this.connected = true;
            this.reconnectAttempts = 0;
            console.log(`✅ Conectado a Socket.io - ID: ${this.socket.id}`);
            
            // Unirse a la sala del rol
            this.joinRole(this.user.rol);
            
            // Notificación de conexión (solo en desarrollo)
            if (process.env.NODE_ENV === 'development') {
                toast.success(`🔌 Conectado en tiempo real`, { duration: 2000 });
            }
        });

        // Evento de desconexión
        this.socket.on('disconnect', (reason) => {
            this.connected = false;
            console.log(`❌ Desconectado de Socket.io: ${reason}`);
            
            if (reason === 'io server disconnect') {
                // Desconexión del servidor, reconectar manualmente
                this.socket.connect();
            }
        });

        // Eventos de reconexión
        this.socket.on('reconnect_attempt', (attemptNumber) => {
            this.reconnectAttempts = attemptNumber;
            console.log(`🔄 Intento de reconexión ${attemptNumber}/${this.maxReconnectAttempts}`);
        });

        this.socket.on('reconnect', (attemptNumber) => {
            this.connected = true;
            console.log(`✅ Reconectado después de ${attemptNumber} intentos`);
            toast.success('🔌 Reconectado al sistema', { duration: 3000 });
        });

        this.socket.on('reconnect_failed', () => {
            console.error('❌ Falló la reconexión');
            toast.error('❌ Error de conexión. Recarga la página.', { duration: 10000 });
        });

        // Eventos de error
        this.socket.on('connect_error', (error) => {
            console.error('❌ Error de conexión Socket.io:', error.message);
            
            if (error.message === 'Autenticación fallida') {
                toast.error('❌ Error de autenticación en tiempo real');
                this.disconnect();
            }
        });

        // Configurar eventos específicos por rol
        this.setupRoleSpecificEvents();
        
        // Configurar eventos generales
        this.setupGeneralEvents();
    }

    // 🎭 Configurar eventos específicos según el rol del usuario
    setupRoleSpecificEvents() {
        if (!this.user) return;

        switch (this.user.rol) {
            case 'mozo':
                this.setupMozoEvents();
                break;
            case 'cocina':
                this.setupCocinaEvents();
                break;
            case 'cajero':
                this.setupCajeroEvents();
                break;
            case 'administrador':
                this.setupAdminEvents();
                break;
            default:
                console.log(`Rol ${this.user.rol} no tiene eventos específicos configurados`);
                break;
        }
    }

    // 🍽️ Eventos para mozos
    setupMozoEvents() {
        // Pedido listo para entregar
        this.socket.on('pedido-listo', (data) => {
            console.log('🔔 Pedido listo para entregar:', data);
            
            // Notificación sonora + visual
            this.playNotificationSound();
            toast.success(
                `🍽️ Mesa ${data.mesa} - Pedido #${data.pedidoId} listo para entregar`,
                { 
                    duration: 8000,
                    icon: '🔔'
                }
            );
            
            // Callback personalizado si existe
            this.triggerCallback('pedido-listo', data);
        });

        // Pedido disponible para cualquier mozo
        this.socket.on('pedido-disponible-para-entregar', (data) => {
            console.log('📋 Pedido disponible para entregar:', data);
            
            toast(
                `📋 Mesa ${data.mesa} tiene un pedido listo`,
                { 
                    duration: 5000,
                    icon: '📋'
                }
            );
        });

        // Cambio en disponibilidad de productos
        this.socket.on('producto-disponibilidad-actualizada', (data) => {
            console.log('🥘 Producto actualizado:', data);
            
            const mensaje = data.disponible ? 
                `✅ ${data.productoNombre} ya está disponible` :
                `❌ ${data.productoNombre} se agotó`;
                
            toast(mensaje, {
                duration: 4000,
                icon: data.disponible ? '✅' : '❌'
            });
            
            this.triggerCallback('producto-disponibilidad-actualizada', data);
        });
    }

    // 👨‍🍳 Eventos para cocina
    setupCocinaEvents() {
        // Nuevo pedido recibido
        this.socket.on('nuevo-pedido', (data) => {
            console.log('🔔 Nuevo pedido recibido:', data);
            
            // Sonido de notificación
            if (data.sonido) {
                this.playNotificationSound();
            }
            
            // Notificación visual prominente
            toast.success(
                `🔥 NUEVO PEDIDO - Mesa ${data.pedido.mesa.numero}`,
                { 
                    duration: 10000,
                    icon: '🔔',
                    style: {
                        background: '#ff6b6b',
                        color: 'white',
                        fontSize: '16px',
                        fontWeight: 'bold'
                    }
                }
            );
            
            // Callback para actualizar UI
            this.triggerCallback('nuevo-pedido', data);
        });
    }

    // 💰 Eventos para cajeros
    setupCajeroEvents() {
        // Pedido listo para cobrar
        this.socket.on('pedido-listo-para-cobrar', (data) => {
            console.log('💳 Pedido listo para cobrar:', data);
            
            toast.success(
                `💳 Mesa ${data.mesa} lista para cobrar - S/${data.total}`,
                { 
                    duration: 6000,
                    icon: '💰'
                }
            );
            
            this.triggerCallback('pedido-listo-para-cobrar', data);
        });

        // Cuenta solicitada
        this.socket.on('cuenta-solicitada', (data) => {
            console.log('🧾 Cuenta solicitada:', data);
            
            toast.success(
                `🧾 Mesa ${data.mesa} solicita la cuenta - S/${data.total}`,
                { 
                    duration: 8000,
                    icon: '🧾'
                }
            );
            
            this.triggerCallback('cuenta-solicitada', data);
        });
    }

    // 👑 Eventos para administradores
    setupAdminEvents() {
        // Estadísticas de conexión
        this.socket.on('connection-stats', (data) => {
            console.log('📊 Stats de conexión:', data);
            this.triggerCallback('connection-stats', data);
        });

        // Venta realizada
        this.socket.on('venta-realizada', (data) => {
            console.log('💰 Venta realizada:', data);
            this.triggerCallback('venta-realizada', data);
        });

        // Inventario actualizado
        this.socket.on('inventario-actualizado', (data) => {
            console.log('📦 Inventario actualizado:', data);
            this.triggerCallback('inventario-actualizado', data);
        });
    }

    // 🌐 Eventos generales para todos los roles
    setupGeneralEvents() {
        // Mesa liberada
        this.socket.on('mesa-liberada', (data) => {
            console.log('🏠 Mesa liberada:', data);
            this.triggerCallback('mesa-liberada', data);
        });

        // Estado de mesa actualizado
        this.socket.on('mesa-estado-actualizada', (data) => {
            console.log('🏠 Mesa actualizada:', data);
            this.triggerCallback('mesa-estado-actualizada', data);
        });

        // Estado de pedido actualizado
        this.socket.on('pedido-estado-actualizado', (data) => {
            console.log('📋 Pedido actualizado:', data);
            this.triggerCallback('pedido-estado-actualizado', data);
        });

        // Mensaje del administrador
        this.socket.on('admin-mensaje', (data) => {
            console.log('📢 Mensaje del admin:', data);
            
            const toastConfig = {
                duration: 8000,
                style: {
                    background: data.tipo === 'error' ? '#ff4757' : 
                               data.tipo === 'warning' ? '#ffa502' : '#2ed573',
                    color: 'white'
                }
            };
            
            toast(
                `📢 ${data.admin}: ${data.mensaje}`,
                toastConfig
            );
        });

        // Pong response
        this.socket.on('pong', (data) => {
            console.log('🏓 Pong recibido:', data.timestamp);
        });
    }

    // 🔊 Reproducir sonido de notificación
    playNotificationSound() {
        try {
            // Crear audio desde data URL (evita problemas de archivos)
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch (error) {
            console.log('🔇 No se pudo reproducir sonido:', error.message);
        }
    }

    // 🏠 Unirse a sala específica
    joinRole(role) {
        if (this.socket?.connected) {
            this.socket.emit('join-room', role);
            console.log(`🏠 Unido a sala: ${role}`);
        }
    }

    // 📤 Emitir eventos al servidor
    emit(event, data) {
        if (this.socket?.connected) {
            this.socket.emit(event, data);
            console.log(`📤 Evento emitido: ${event}`, data);
        } else {
            console.warn('⚠️ Socket no conectado, evento no enviado:', event);
        }
    }

    // 🎣 Escuchar eventos personalizados
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    // 🔇 Dejar de escuchar eventos
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    // 🎯 Ejecutar callbacks personalizados
    triggerCallback(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error ejecutando callback para ${event}:`, error);
                }
            });
        }
    }

    // 🏓 Ping al servidor
    ping() {
        if (this.socket?.connected) {
            this.socket.emit('ping');
        }
    }

    // 📊 Solicitar estadísticas (solo admin)
    requestStats() {
        if (this.user?.rol === 'administrador') {
            this.emit('solicitar-estadisticas');
        }
    }

    // 🗣️ Broadcast mensaje (solo admin)
    adminBroadcast(mensaje, tipo = 'info') {
        if (this.user?.rol === 'administrador') {
            this.emit('admin-broadcast', { mensaje, tipo });
        }
    }

    // 🍽️ Métodos específicos para mozos
    markOrderDelivered(pedidoId, mesa, total) {
        if (this.user?.rol === 'mozo') {
            this.emit('pedido-entregado', { pedidoId, mesa, total });
        }
    }

    requestBill(mesa, pedidos, total) {
        if (this.user?.rol === 'mozo') {
            this.emit('solicitar-cuenta', { mesa, pedidos, total });
        }
    }

    // 👨‍🍳 Métodos específicos para cocina
    takeOrder(pedidoId, mesa) {
        if (this.user?.rol === 'cocina') {
            this.emit('tomar-pedido', { pedidoId, mesa });
        }
    }

    markOrderReady(pedidoId, mesa, productos, mozoId) {
        if (this.user?.rol === 'cocina') {
            this.emit('pedido-preparado', { pedidoId, mesa, productos, mozoId });
        }
    }

    changeProductAvailability(productoId, productoNombre, disponible) {
        if (this.user?.rol === 'cocina') {
            this.emit('cambiar-disponibilidad-producto', { 
                productoId, 
                productoNombre, 
                disponible 
            });
        }
    }

    // 💰 Métodos específicos para cajeros
    processPayment(mesa, total, metodoPago) {
        if (this.user?.rol === 'cajero') {
            this.emit('pago-procesado', { mesa, total, metodoPago });
        }
    }

    // 🔌 Desconectar
    disconnect() {
        if (this.socket) {
            console.log('🔌 Desconectando Socket.io...');
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
            this.user = null;
            this.eventListeners.clear();
        }
    }

    // 📊 Getters de estado
    isConnected() {
        return this.connected && this.socket?.connected;
    }

    getUser() {
        return this.user;
    }

    getSocketId() {
        return this.socket?.id;
    }

    getConnectionStats() {
        return {
            connected: this.connected,
            socketId: this.socket?.id,
            user: this.user,
            reconnectAttempts: this.reconnectAttempts
        };
    }
}

// Singleton instance
const socketService = new SocketService();

export default socketService;