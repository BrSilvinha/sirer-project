// 🔊 Sistema de notificaciones de audio para SIRER

class AudioNotifications {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.volume = 0.7;
        
        // Inicializar AudioContext cuando sea necesario
        this.initAudioContext();
    }

    initAudioContext() {
        try {
            // Crear AudioContext solo cuando se necesite
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (error) {
            console.warn('Audio no soportado:', error);
            this.enabled = false;
        }
    }

    // Generar tonos simples sin archivos externos
    playTone(frequency = 440, duration = 200, volume = 0.7) {
        if (!this.enabled || !this.audioContext) return;

        try {
            // Reanudar contexto si está suspendido
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }

            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);

            oscillator.frequency.value = frequency;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(volume * this.volume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration / 1000);

            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration / 1000);

        } catch (error) {
            console.warn('Error reproduciendo sonido:', error);
        }
    }

    // Sonido para nuevos pedidos en cocina (más urgente)
    playNewOrderSound() {
        // Doble beep agudo
        this.playTone(800, 150, 0.8);
        setTimeout(() => this.playTone(800, 150, 0.8), 200);
        setTimeout(() => this.playTone(600, 300, 0.6), 500);
    }

    // Sonido para pedidos listos en cocina
    playOrderReadySound() {
        // Triple beep suave
        this.playTone(500, 100, 0.5);
        setTimeout(() => this.playTone(600, 100, 0.5), 150);
        setTimeout(() => this.playTone(700, 200, 0.6), 300);
    }

    // Sonido para caja (cuenta solicitada)
    playCashierSound() {
        // Beep medio
        this.playTone(400, 200, 0.7);
        setTimeout(() => this.playTone(500, 200, 0.7), 250);
    }

    // Sonido para pago completado
    playPaymentSound() {
        // Sonido de éxito (ascendente)
        this.playTone(400, 100, 0.5);
        setTimeout(() => this.playTone(500, 100, 0.5), 100);
        setTimeout(() => this.playTone(600, 150, 0.6), 200);
    }

    // Controles de volumen y habilitación
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    isEnabled() {
        return this.enabled;
    }
}

// Instancia global
export const audioNotifications = new AudioNotifications();

// Funciones de utilidad
export const playNewOrderSound = () => audioNotifications.playNewOrderSound();
export const playOrderReadySound = () => audioNotifications.playOrderReadySound();
export const playCashierSound = () => audioNotifications.playCashierSound();
export const playPaymentSound = () => audioNotifications.playPaymentSound();

export default audioNotifications;