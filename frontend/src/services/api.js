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
            config.headers.Authorization = `Bearer ${token}`;
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
                    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken
                    });

                    const { accessToken } = response.data;
                    localStorage.setItem('accessToken', accessToken);

                    // Reintentar la petición original
                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
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
        return await api.put(`/users/${id}`, userData);
    },

    toggleUserStatus: async (id, status) => {
        return await api.patch(`/users/${id}/status`, { activo: status });
    },

    changePassword: async (id, passwordData) => {
        return await api.patch(`/users/${id}/password`, passwordData);
    }
};

// Servicios de mesas
export const mesasService = {
    getAll: () => api.get('/mesas'),
    getById: (id) => api.get(`/mesas/${id}`),
    create: (mesa) => api.post('/mesas', mesa),
    update: (id, mesa) => api.put(`/mesas/${id}`, mesa),
    delete: (id) => api.delete(`/mesas/${id}`),
    changeStatus: (id, estado) => api.patch(`/mesas/${id}/estado`, { estado }),
    getStats: () => api.get('/mesas/estadisticas')
};

// Servicios de categorías
export const categoriasService = {
    getAll: () => api.get('/categorias'),
    getById: (id) => api.get(`/categorias/${id}`),
    create: (categoria) => api.post('/categorias', categoria),
    update: (id, categoria) => api.put(`/categorias/${id}`, categoria),
    delete: (id) => api.delete(`/categorias/${id}`)
};

// Servicios de productos
export const productosService = {
    getAll: (params) => api.get('/productos', { params }),
    getById: (id) => api.get(`/productos/${id}`),
    getByCategory: (categoriaId) => api.get(`/productos/categoria/${categoriaId}`),
    getAvailable: () => api.get('/productos/disponibles'),
    create: (producto) => api.post('/productos', producto),
    update: (id, producto) => api.put(`/productos/${id}`, producto),
    delete: (id) => api.delete(`/productos/${id}`),
    changeAvailability: (id, disponible) => api.patch(`/productos/${id}/disponibilidad`, { disponible })
};

// Servicios de pedidos
export const pedidosService = {
    getAll: (params) => api.get('/pedidos', { params }),
    getById: (id) => api.get(`/pedidos/${id}`),
    getByMesa: (mesaId, incluirPagados = false) => {
        const params = incluirPagados ? { incluir_pagados: true } : {};
        return api.get(`/pedidos/mesa/${mesaId}`, { params });
    },
    create: (pedido) => api.post('/pedidos', pedido),
    changeStatus: (id, estado) => api.patch(`/pedidos/${id}/estado`, { estado }),
    addProducts: (id, productos) => api.post(`/pedidos/${id}/productos`, { productos }),
    cancel: (id, motivo) => api.patch(`/pedidos/${id}/cancelar`, { motivo }),
    
    // ✅ Método getCuenta con manejo silencioso de errores
    getCuenta: async (mesaId) => {
        try {
            return await api.get(`/pedidos/cuenta/mesa/${mesaId}`);
        } catch (error) {
            throw error;
        }
    },
    
    procesarPago: (mesaId, datosPago) => api.post(`/pedidos/pago/mesa/${mesaId}`, datosPago),
    getStats: (params) => api.get('/pedidos/estadisticas', { params })
};

// ✅ CORREGIDO: Servicios de reportes SIN fallbacks - datos reales solamente
export const reportesService = {
    // Dashboard básico con datos reales
    getDashboard: () => api.get('/reportes/dashboard'),
    getVentas: (params) => api.get('/reportes/ventas', { params }),
    getProductosMasVendidos: (params) => api.get('/reportes/productos/mas-vendidos', { params }),
    getMozosRendimiento: (params) => api.get('/reportes/mozos/rendimiento', { params }),
    getMesasRendimiento: (params) => api.get('/reportes/mesas/rendimiento', { params }),
    getVentasPorCategoria: (params) => api.get('/reportes/categorias/ventas', { params }),
    exportar: (tipo, params = {}) => api.get(`/reportes/exportar/${tipo}`, { params, responseType: 'blob' })
};

export default api;