import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Crear instancia de axios
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // ✅ Aumentado timeout para reportes
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor para agregar token automáticamente
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer S/{token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Interceptor para manejar respuestas y errores
api.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Si el token expiró, intentar renovarlo
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (refreshToken) {
                    const response = await axios.post(`S/{API_BASE_URL}/auth/refresh`, {
                        refreshToken
                    });

                    const { accessToken } = response.data;
                    localStorage.setItem('accessToken', accessToken);

                    // Reintentar la petición original
                    originalRequest.headers.Authorization = `Bearer S/{accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Si no se puede renovar, limpiar storage
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('usuario');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // ✅ FILTRAR ERRORES ESPECÍFICOS: No mostrar toast para errores esperados
        const isAccountError = error.config?.url?.includes('/pedidos/cuenta/mesa/') && 
                              error.response?.status === 400;
        
        const isHistorialError = error.config?.url?.includes('/pedidos') && 
                               error.response?.status === 404;

        const isReportError = error.config?.url?.includes('/reportes') && 
                             (error.response?.status === 404 || error.response?.status === 500);

        const isUserError = error.config?.url?.includes('/users') && 
                           error.response?.status === 404;
        
        // Solo mostrar error si no es un error de autenticación Y no es error esperado
        if (error.response?.status !== 401 && !isAccountError && !isHistorialError && !isReportError && !isUserError) {
            const errorMessage = error.response?.data?.error || 
                               error.response?.data?.message || 
                               'Error de conexión';
            
            console.error('API Error:', errorMessage);
            toast.error(errorMessage);
        }
        
        return Promise.reject(error);
    }
);

// Servicios de autenticación
export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { usuario, accessToken, refreshToken } = response.data;
        
        // Guardar en localStorage
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('usuario', JSON.stringify(usuario));
        
        return response.data;
    },

    register: async (userData) => {
        return await api.post('/auth/register', userData);
    },

    logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('usuario');
    },

    getCurrentUser: () => {
        const usuario = localStorage.getItem('usuario');
        return usuario ? JSON.parse(usuario) : null;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('accessToken');
    },

    hasRole: (role) => {
        const usuario = authService.getCurrentUser();
        return usuario && usuario.rol === role;
    },

    // ✅ CORREGIDO: Métodos de usuarios SIN datos de ejemplo
    getUsers: async () => {
        return await api.get('/users');
    },

    updateUser: async (id, userData) => {
        return await api.put(`/users/S/{id}`, userData);
    },

    toggleUserStatus: async (id, status) => {
        return await api.patch(`/users/S/{id}/status`, { activo: status });
    },

    changePassword: async (id, passwordData) => {
        return await api.patch(`/users/S/{id}/password`, passwordData);
    }
};

// Servicios de mesas
export const mesasService = {
    getAll: () => api.get('/mesas'),
    getById: (id) => api.get(`/mesas/S/{id}`),
    create: (mesa) => api.post('/mesas', mesa),
    update: (id, mesa) => api.put(`/mesas/S/{id}`, mesa),
    delete: (id) => api.delete(`/mesas/S/{id}`),
    changeStatus: (id, estado) => api.patch(`/mesas/S/{id}/estado`, { estado }),
    getStats: () => api.get('/mesas/estadisticas')
};

// Servicios de categorías
export const categoriasService = {
    getAll: () => api.get('/categorias'),
    getById: (id) => api.get(`/categorias/S/{id}`),
    create: (categoria) => api.post('/categorias', categoria),
    update: (id, categoria) => api.put(`/categorias/S/{id}`, categoria),
    delete: (id) => api.delete(`/categorias/S/{id}`)
};

// Servicios de productos
export const productosService = {
    getAll: (params) => api.get('/productos', { params }),
    getById: (id) => api.get(`/productos/S/{id}`),
    getByCategory: (categoriaId) => api.get(`/productos/categoria/S/{categoriaId}`),
    getAvailable: () => api.get('/productos/disponibles'),
    create: (producto) => api.post('/productos', producto),
    update: (id, producto) => api.put(`/productos/S/{id}`, producto),
    delete: (id) => api.delete(`/productos/S/{id}`),
    changeAvailability: (id, disponible) => api.patch(`/productos/S/{id}/disponibilidad`, { disponible })
};

// Servicios de pedidos
export const pedidosService = {
    getAll: (params) => api.get('/pedidos', { params }),
    getById: (id) => api.get(`/pedidos/S/{id}`),
    getByMesa: (mesaId, incluirPagados = false) => {
        const params = incluirPagados ? { incluir_pagados: true } : {};
        return api.get(`/pedidos/mesa/S/{mesaId}`, { params });
    },
    getCocina: () => api.get('/pedidos/cocina'),
    create: (pedido) => api.post('/pedidos', pedido),
    changeStatus: (id, estado) => api.patch(`/pedidos/S/{id}/estado`, { estado }),
    addProducts: (id, productos) => api.post(`/pedidos/S/{id}/productos`, { productos }),
    cancel: (id, motivo) => api.patch(`/pedidos/S/{id}/cancelar`, { motivo }),
    
    // ✅ Método getCuenta con manejo silencioso de errores
    getCuenta: async (mesaId) => {
        try {
            return await api.get(`/pedidos/cuenta/mesa/S/{mesaId}`);
        } catch (error) {
            throw error;
        }
    },
    
    procesarPago: (mesaId, datosPago) => api.post(`/pedidos/pago/mesa/S/{mesaId}`, datosPago),
    getStats: (params) => api.get('/pedidos/estadisticas', { params })
};

// ✅ CORREGIDO: Servicios de reportes SIN fallbacks - datos reales solamente
export const reportesService = {
    // Dashboard básico con datos reales
    getDashboard: async () => {
        try {
            const response = await api.get('/reportes/dashboard');
            console.log('✅ Dashboard obtenido del servidor:', response.data);
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo dashboard:', error);
            throw error; // ✅ No fallback, lanzar error para manejo en componente
        }
    },

    // Reportes de ventas con datos reales
    getVentas: async (params) => {
        try {
            const response = await api.get('/reportes/ventas', { params });
            console.log('✅ Reporte de ventas obtenido:', response.data);
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo reporte de ventas:', error);
            throw error; // ✅ No fallback
        }
    },

    // Productos más vendidos con datos reales
    getProductosMasVendidos: async (params) => {
        try {
            const response = await api.get('/reportes/productos/mas-vendidos', { params });
            console.log('✅ Productos más vendidos obtenidos:', response.data);
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo productos más vendidos:', error);
            throw error; // ✅ No fallback
        }
    },

    // Rendimiento de mozos con datos reales
    getMozosRendimiento: async (params) => {
        try {
            const response = await api.get('/reportes/mozos/rendimiento', { params });
            console.log('✅ Rendimiento de mozos obtenido:', response.data);
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo rendimiento de mozos:', error);
            throw error; // ✅ No fallback
        }
    },

    // Rendimiento de mesas con datos reales
    getMesasRendimiento: async (params) => {
        try {
            const response = await api.get('/reportes/mesas/rendimiento', { params });
            console.log('✅ Rendimiento de mesas obtenido:', response.data);
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo rendimiento de mesas:', error);
            throw error; // ✅ No fallback
        }
    },

    // Ventas por categoría con datos reales
    getVentasPorCategoria: async (params) => {
        try {
            const response = await api.get('/reportes/categorias/ventas', { params });
            console.log('✅ Ventas por categoría obtenidas:', response.data);
            return response;
        } catch (error) {
            console.error('❌ Error obteniendo ventas por categoría:', error);
            throw error; // ✅ No fallback
        }
    },

    // Exportar reportes
    exportar: async (tipo, params = {}) => {
        try {
            const response = await api.get(`/reportes/exportar/S/{tipo}`, { 
                params,
                responseType: 'blob'
            });
            return response;
        } catch (error) {
            console.error('Error exportando reporte:', error);
            throw error;
        }
    }
};

export default api;