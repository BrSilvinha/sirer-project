const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection, sequelize } = require('./config/database');
const associations = require('./models/associations');

// Importar rutas
const authRoutes = require('./routes/auth');
const mesasRoutes = require('./routes/mesas');
const categoriasRoutes = require('./routes/categorias');
const productosRoutes = require('./routes/productos');
const pedidosRoutes = require('./routes/pedidos');
const reportesRoutes = require('./routes/reportes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.SOCKET_ORIGIN || 'http://localhost:3000',
    credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas básicas
app.get('/', (req, res) => {
    res.json({ 
        message: 'SIRER API funcionando correctamente',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// Health check
app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        res.json({
            status: 'OK',
            database: 'Connected',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            database: 'Disconnected',
            error: error.message
        });
    }
});

// Configurar rutas API
app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/reportes', reportesRoutes);

// Función para inicializar la base de datos
const initializeDatabase = async () => {
    try {
        await testConnection();
        
        // Sincronizar modelos (crear tablas)
        await sequelize.sync({ force: false });
        console.log('✅ Modelos sincronizados correctamente');
        
        // Crear usuario administrador por defecto
        const { Usuario } = associations;
        const adminExists = await Usuario.findOne({ where: { email: 'admin@sirer.com' } });
        
        if (!adminExists) {
            await Usuario.create({
                nombre: 'Administrador',
                email: 'admin@sirer.com',
                password: 'admin123',
                rol: 'administrador'
            });
            console.log('✅ Usuario administrador creado: admin@sirer.com / admin123');
        }
        
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
    }
};

// Iniciar servidor
const startServer = async () => {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`🚀 Servidor SIRER ejecutándose en http://localhost:5000`);
        console.log(`📊 Entorno: ${process.env.NODE_ENV}`);
        console.log(`📡 Rutas disponibles:`);
        console.log(`   GET  http://localhost:${PORT}/`);
        console.log(`   GET  http://localhost:${PORT}/health`);
        console.log(`   POST http://localhost:${PORT}/api/auth/login`);
        console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    });
};

startServer();

module.exports = app;