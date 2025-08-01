import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect(token) {
        if (this.socket && this.connected) {
            return this.socket;
        }

        this.socket = io(SOCKET_URL, {
            auth: {
                token: token
            },
            transports: ['websocket', 'polling']
        });

        this.setupEventListeners();
        return this.socket;
    }

    setupEventListeners() {
        this.socket.on('connect', () => {
            console.log('✅ Conectado al servidor WebSocket');
            this.connected = true;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Desconectado del servidor WebSocket:', reason);
            this.connected = false;
        });

        this.socket.on('connect_error', (error) => {
            console.error('❌ Error de conexión WebSocket:', error);
            if (error.message === 'Token inválido') {
                toast.error('Sesión expirada. Por favor, inicia sesión nuevamente.');
            }
        });

        // Eventos específicos del sistema
        this.setupSystemEvents();
    }

    setupSystemEvents() {
        // Eventos de pedidos
        this.socket.on('nuevo-pedido', (data) => {
            toast.success(`Nuevo pedido recibido - Mesa ${data.pedido.mesa.numero}`);
        });

        this.socket.on('pedido-preparado', (data) => {
            toast.success(`Pedido listo para entregar - Mesa ${data.pedido.mesa.numero}`);
        });

        this.socket.on('pedido-estado-cambiado', (data) => {
            console.log('Estado de pedido actualizado:', data);
        });

        // Eventos de mesas
        this.socket.on('mesa-estado-cambiado', (data) => {
            console.log('Estado de mesa actualizado:', data);
        });

        this.socket.on('mesa-liberada', (data) => {
            toast.success(`Mesa ${data.mesa.numero} liberada`);
        });

        // Eventos de productos
        this.socket.on('producto-disponibilidad-actualizada', (data) => {
            const mensaje = data.producto.disponible ? 'disponible' : 'agotado';
            toast.info(`${data.producto.nombre} ahora está ${mensaje}`);
        });

        // Eventos de pagos
        this.socket.on('pago-procesado', (data) => {
            toast.success(`Pago procesado - Mesa ${data.mesa_id}: $${data.total_pagado}`);
        });

        // Notificaciones generales
        this.socket.on('notificacion-general', (data) => {
            switch (data.tipo) {
                case 'success':
                    toast.success(data.mensaje);
                    break;
                case 'error':
                    toast.error(data.mensaje);
                    break;
                case 'warning':
                    toast.warning(data.mensaje);
                    break;
                default:
                    toast(data.mensaje);
            }
        });
    }

    // Métodos para emitir eventos
    joinRole(role) {
        if (this.socket && this.connected) {
            this.socket.emit('join-role', role);
        }
    }

    joinRoom(room) {
        if (this.socket && this.connected) {
            this.socket.emit('join-room', room);
        }
    }

    leaveRoom(room) {
        if (this.socket && this.connected) {
            this.socket.emit('leave-room', room);
        }
    }

    // Eventos específicos por rol
    emitNuevoPedido(pedido) {
        if (this.socket && this.connected) {
            this.socket.emit('nuevo-pedido', pedido);
        }
    }

    emitCambioEstadoPedido(pedidoId, estado, mesaNumero) {
        if (this.socket && this.connected) {
            this.socket.emit('pedido-estado-cocina', {
                pedido_id: pedidoId,
                estado,
                mesa_numero: mesaNumero
            });
        }
    }

    emitCambioDisponibilidadProducto(productoId, disponible) {
        if (this.socket && this.connected) {
            this.socket.emit('cambiar-disponibilidad-producto', {
                producto_id: productoId,
                disponible
            });
        }
    }

    emitSolicitarCuentaMesa(mesaId, mesaNumero) {
        if (this.socket && this.connected) {
            this.socket.emit('solicitar-cuenta-mesa', {
                mesa_id: mesaId,
                mesa_numero: mesaNumero
            });
        }
    }

    emitPagoProcesado(mesaId, total, metodoPago) {
        if (this.socket && this.connected) {
            this.socket.emit('pago-procesado', {
                mesa_id: mesaId,
                total,
                metodo_pago: metodoPago
            });
        }
    }

    // Suscribirse a eventos específicos
    on(event, callback) {
        if (this.socket) {
            this.socket.on(event, callback);
        }
    }

    off(event, callback) {
        if (this.socket) {
            this.socket.off(event, callback);
        }
    }

    // Obtener usuarios conectados
    getConnectedUsers(callback) {
        if (this.socket && this.connected) {
            this.socket.emit('obtener-usuarios-conectados');
            this.socket.on('usuarios-conectados', callback);
        }
    }

    // Ping para mantener conexión
    ping() {
        if (this.socket && this.connected) {
            this.socket.emit('ping');
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }

    isConnected() {
        return this.connected;
    }
}

export default new SocketService();