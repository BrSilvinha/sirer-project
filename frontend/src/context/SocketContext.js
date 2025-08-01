import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import socketService from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [isConnected, setIsConnected] = useState(false);
    const [connectionStats, setConnectionStats] = useState(null);
    const [lastActivity, setLastActivity] = useState(null);

    // 🔌 Conectar cuando el usuario se autentica
    useEffect(() => {
        if (isAuthenticated && user) {
            const token = localStorage.getItem('accessToken');
            if (token) {
                console.log('🚀 Iniciando conexión Socket.io...');
                socketService.connect(token, user);
                
                // Configurar listeners para el estado de conexión
                const interval = setInterval(() => {
                    setIsConnected(socketService.isConnected());
                    setConnectionStats(socketService.getConnectionStats());
                }, 2000);

                return () => clearInterval(interval);
            }
        } else {
            // Desconectar si no hay usuario autenticado
            if (socketService.isConnected()) {
                console.log('🔌 Desconectando Socket.io - usuario no autenticado');
                socketService.disconnect();
                setIsConnected(false);
                setConnectionStats(null);
            }
        }
    }, [isAuthenticated, user]);

    // 🧹 Limpiar al desmontar
    useEffect(() => {
        return () => {
            if (socketService.isConnected()) {
                socketService.disconnect();
            }
        };
    }, []);

    // 📡 Métodos para los componentes
    const emit = useCallback((event, data) => {
        socketService.emit(event, data);
        setLastActivity(new Date().toISOString());
    }, []);

    const on = useCallback((event, callback) => {
        socketService.on(event, callback);
    }, []);

    const off = useCallback((event, callback) => {
        socketService.off(event, callback);
    }, []);

    // 🎯 Métodos específicos por rol
    const mozoActions = {
        markOrderDelivered: (pedidoId, mesa, total) => {
            socketService.markOrderDelivered(pedidoId, mesa, total);
            setLastActivity(new Date().toISOString());
        },
        requestBill: (mesa, pedidos, total) => {
            socketService.requestBill(mesa, pedidos, total);
            setLastActivity(new Date().toISOString());
        }
    };

    const cocinaActions = {
        takeOrder: (pedidoId, mesa) => {
            socketService.takeOrder(pedidoId, mesa);
            setLastActivity(new Date().toISOString());
        },
        markOrderReady: (pedidoId, mesa, productos, mozoId) => {
            socketService.markOrderReady(pedidoId, mesa, productos, mozoId);
            setLastActivity(new Date().toISOString());
        },
        changeProductAvailability: (productoId, productoNombre, disponible) => {
            socketService.changeProductAvailability(productoId, productoNombre, disponible);
            setLastActivity(new Date().toISOString());
        }
    };

    const cajeroActions = {
        processPayment: (mesa, total, metodoPago) => {
            socketService.processPayment(mesa, total, metodoPago);
            setLastActivity(new Date().toISOString());
        }
    };

    const adminActions = {
        requestStats: () => {
            socketService.requestStats();
            setLastActivity(new Date().toISOString());
        },
        broadcast: (mensaje, tipo) => {
            socketService.adminBroadcast(mensaje, tipo);
            setLastActivity(new Date().toISOString());
        }
    };

    // 🔧 Utilidades
    const ping = useCallback(() => {
        socketService.ping();
    }, []);

    const getSocketInfo = useCallback(() => ({
        isConnected,
        user: user,
        socketId: socketService.getSocketId(),
        lastActivity,
        stats: connectionStats
    }), [isConnected, user, lastActivity, connectionStats]);

    const value = {
        // Estado
        isConnected,
        connectionStats,
        lastActivity,
        
        // Métodos generales
        emit,
        on,
        off,
        ping,
        getSocketInfo,
        
        // Acciones por rol
        mozo: mozoActions,
        cocina: cocinaActions,
        cajero: cajeroActions,
        admin: adminActions,
        
        // Instancia del servicio (para casos avanzados)
        socketService
    };

    return (
        <SocketContext.Provider value={value}>
            {children}
        </SocketContext.Provider>
    );
};

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket debe ser usado dentro de un SocketProvider');
    }
    return context;
};

export default SocketContext;