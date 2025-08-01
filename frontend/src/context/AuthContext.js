import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Verificar autenticación al cargar
    useEffect(() => {
        const checkAuth = () => {
            try {
                const storedUser = authService.getCurrentUser();
                const hasToken = authService.isAuthenticated();

                if (storedUser && hasToken) {
                    setUser(storedUser);
                    setIsAuthenticated(true);
                }
            } catch (err) {
                console.error('Error checking auth:', err);
                // Limpiar datos corruptos
                authService.logout();
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            setIsLoading(true);
            setError(null);

            const response = await authService.login(email, password);
            const { usuario } = response;

            setUser(usuario);
            setIsAuthenticated(true);
            
            return { success: true, user: usuario };
        } catch (err) {
            const errorMessage = err.response?.data?.error || 'Error al iniciar sesión';
            setError(errorMessage);
            return { success: false, error: errorMessage };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const logout = useCallback(() => {
        authService.logout();
        setUser(null);
        setIsAuthenticated(false);
        setError(null);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const hasRole = useCallback((role) => {
        return user && user.rol === role;
    }, [user]);

    const hasAnyRole = useCallback((roles) => {
        return user && roles.includes(user.rol);
    }, [user]);

    const value = {
        user,
        isAuthenticated,
        isLoading,
        error,
        login,
        logout,
        hasRole,
        hasAnyRole,
        clearError
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
};

export default AuthContext;