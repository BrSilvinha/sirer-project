const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const { sequelize, testConnection } = require('./config/database');
const socketManager = require('./config/socket');
const { createServer } = require('http');

// Importar rutas
const authRoutes = require('./routes/auth');
const mesasRoutes = require('./routes/mesas');
const categoriasRoutes = require('./routes/categorias');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const reportesRoutes = require('./routes/reportes');

// Crear aplicación Express
const app = express();
const server = createServer(app);

// Configurar Socket.io
const io = socketManager.initialize(server);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(cors({
    origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3001',
        'https://sirer-frontend.onrender.com',
        /\.onrender\.com$/,
        /\.vercel\.app$/
    ],
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Middleware para pasar io a las rutas
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/reportes', reportesRoutes);

// Ruta para gestión de usuarios
app.use('/api/users', require('./routes/users'));

// Ruta de prueba
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'SIRER API funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
    });
});

// Ruta no encontrada
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint no encontrado' });
});

// Función para iniciar el servidor
const startServer = async () => {
    try {
        // Probar conexión a la base de datos
        await testConnection();

        await sequelize.sync({ alter: false });
        console.log('📊 Modelos sincronizados con la base de datos');

        // Ejecutar seed automáticamente (crea datos iniciales si no existen)
        const seed = require('./seed');
        await seed();

        const PORT = process.env.PORT || 5000;
        
        server.listen(PORT, () => {
            console.log(`🚀 Servidor ejecutándose en puerto ${PORT}`);
            console.log(`📡 Socket.io configurado y listo`);
            console.log(`🌐 API disponible en http://localhost:${PORT}/api`);
        });

    } catch (error) {
        console.error('❌ Error al iniciar servidor:', error);
        process.exit(1);
    }
};

// Manejar cierre graceful
process.on('SIGTERM', () => {
    console.log('🔄 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        sequelize.close();
    });
});

process.on('SIGINT', () => {
    console.log('🔄 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        sequelize.close();
    });
});

// Iniciar servidor
startServer();

module.exports = app;