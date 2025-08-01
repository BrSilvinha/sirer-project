import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Crear instancia de axios
const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
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
                return Promise.reject(refreshError);
            }
        }

        // Solo mostrar error si no es un error de autenticación
        if (error.response?.status !== 401) {
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
    getByMesa: (mesaId) => api.get(`/pedidos/mesa/${mesaId}`),
    getCocina: () => api.get('/pedidos/cocina'),
    create: (pedido) => api.post('/pedidos', pedido),
    changeStatus: (id, estado) => api.patch(`/pedidos/${id}/estado`, { estado }),
    getCuenta: (mesaId) => api.get(`/pedidos/cuenta/mesa/${mesaId}`),
    procesarPago: (mesaId, metodoPago) => api.post(`/pedidos/pago/mesa/${mesaId}`, { metodo_pago: metodoPago })
};

// Servicios de reportes
export const reportesService = {
    getDashboard: () => api.get('/reportes/dashboard'),
    getVentas: (params) => api.get('/reportes/ventas', { params }),
    getProductosMasVendidos: (params) => api.get('/reportes/productos/mas-vendidos', { params }),
    getRendimientoMesas: (params) => api.get('/reportes/mesas/rendimiento', { params }),
    getRendimientoMozos: (params) => api.get('/reportes/mozos/rendimiento', { params }),
    getVentasPorCategoria: (params) => api.get('/reportes/categorias/ventas', { params })
};

export default api;