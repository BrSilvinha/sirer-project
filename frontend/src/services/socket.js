// Socket service simplificado - para evitar errores por ahora
class SocketService {
    constructor() {
        this.socket = null;
        this.connected = false;
    }

    connect(token) {
        console.log('Socket connection disabled temporarily');
        return null;
    }

    disconnect() {
        console.log('Socket disconnection disabled temporarily');
    }

    on(event, callback) {
        // Método vacío por ahora
    }

    emit(event, data) {
        // Método vacío por ahora
    }

    joinRole(role) {
        console.log(`Would join role: ${role}`);
    }

    isConnected() {
        return false;
    }
}

const socketService = new SocketService();
export default socketService;