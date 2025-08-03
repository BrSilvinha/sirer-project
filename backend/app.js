const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http'); // ✅ NUEVO: Para Socket.io
require('dotenv').config();

const { testConnection, sequelize } = require('./config/database');
const associations = require('./models/associations');
const socketManager = require('./config/socket'); // ✅ NUEVO: Socket manager

// Importar todas las rutas
const authRoutes = require('./routes/auth');
const mesasRoutes = require('./routes/mesas');
const categoriasRoutes = require('./routes/categorias');
const productosRoutes = require('./routes/productos');
const reportesRoutes = require('./routes/reportes');
const pedidosRoutes = require('./routes/pedidos');

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ NUEVO: Crear servidor HTTP para Socket.io
const server = http.createServer(app);

// Middlewares básicos
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ NUEVO: Middleware para socket.io en las rutas
app.use((req, res, next) => {
    req.io = socketManager.getIO();
    req.socketManager = socketManager;
    next();
});

// Rutas principales
app.get('/', (req, res) => {
    res.json({ 
        message: 'SIRER API funcionando correctamente',
        version: '1.0.0',
        features: ['REST API', 'Socket.io', 'Real-time notifications'], // ✅ NUEVO
        timestamp: new Date().toISOString()
    });
});

app.get('/health', async (req, res) => {
    try {
        await sequelize.authenticate();
        
        // ✅ NUEVO: Verificar estado de Socket.io
        const io = socketManager.getIO();
        const connectedUsers = socketManager.getConnectedUsers();
        
        res.json({
            status: 'OK',
            database: 'Connected',
            socketio: {
                status: io ? 'Active' : 'Inactive',
                connectedUsers: connectedUsers.length,
                usersByRole: connectedUsers.reduce((acc, user) => {
                    acc[user.rol] = (acc[user.rol] || 0) + 1;
                    return acc;
                }, {})
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(503).json({
            status: 'ERROR',
            database: 'Disconnected',
            socketio: 'Unknown',
            error: error.message
        });
    }
});

// ✅ NUEVO: Endpoint para estadísticas de Socket.io
app.get('/socket/stats', (req, res) => {
    const connectedUsers = socketManager.getConnectedUsers();
    
    res.json({
        success: true,
        data: {
            totalConnected: connectedUsers.length,
            users: connectedUsers,
            byRole: connectedUsers.reduce((acc, user) => {
                acc[user.rol] = (acc[user.rol] || 0) + 1;
                return acc;
            }, {})
        }
    });
});

// Configurar todas las rutas
app.use('/api/auth', authRoutes);
app.use('/api/mesas', mesasRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/productos', productosRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/pedidos', pedidosRoutes);

// Función para crear datos iniciales completos
const createInitialData = async () => {
    try {
        const { Usuario, Categoria, Mesa, Producto } = associations;
        
        // Crear usuarios
        const usuarios = [
            { nombre: 'Administrador', email: 'admin@sirer.com', password: 'admin123', rol: 'administrador' },
            { nombre: 'Juan Pérez', email: 'mozo@sirer.com', password: 'mozo123', rol: 'mozo' },
            { nombre: 'Chef García', email: 'cocina@sirer.com', password: 'cocina123', rol: 'cocina' },
            { nombre: 'Ana López', email: 'cajero@sirer.com', password: 'cajero123', rol: 'cajero' }
        ];
        
        for (const userData of usuarios) {
            const [usuario, created] = await Usuario.findOrCreate({
                where: { email: userData.email },
                defaults: userData
            });
            if (created) {
                console.log(`✅ Usuario ${userData.rol} creado: ${userData.email}`);
            }
        }

        // Crear categorías
        const categorias = [
            { nombre: 'Bebidas', descripcion: 'Bebidas calientes y frías' },
            { nombre: 'Entradas', descripcion: 'Aperitivos y entradas' },
            { nombre: 'Platos Principales', descripcion: 'Platos principales del menú' },
            { nombre: 'Postres', descripcion: 'Postres y dulces' }
        ];
        
        for (const cat of categorias) {
            const [categoria, created] = await Categoria.findOrCreate({
                where: { nombre: cat.nombre },
                defaults: cat
            });
            if (created) {
                console.log(`✅ Categoría creada: ${cat.nombre}`);
            }
        }

        // Crear mesas
        const mesasCount = await Mesa.count();
        if (mesasCount === 0) {
            const mesas = [];
            for (let i = 1; i <= 10; i++) {
                mesas.push({
                    numero: i,
                    capacidad: i <= 6 ? 4 : 6
                });
            }
            await Mesa.bulkCreate(mesas);
            console.log('✅ Mesas creadas (1-10)');
        }

        // Crear productos de ejemplo
        const productosCount = await Producto.count();
        if (productosCount === 0) {
            const bebidas = await Categoria.findOne({ where: { nombre: 'Bebidas' } });
            const principales = await Categoria.findOne({ where: { nombre: 'Platos Principales' } });
            const postres = await Categoria.findOne({ where: { nombre: 'Postres' } });
            const entradas = await Categoria.findOne({ where: { nombre: 'Entradas' } });
            
            const productos = [
                // Bebidas
                { nombre: 'Coca Cola', precio: 3.50, categoria_id: bebidas?.id },
                { nombre: 'Agua Mineral', precio: 2.00, categoria_id: bebidas?.id },
                { nombre: 'Café', precio: 4.00, categoria_id: bebidas?.id },
                
                // Entradas
                { nombre: 'Pan con Ajo', precio: 6.50, categoria_id: entradas?.id },
                { nombre: 'Ensalada César', precio: 12.00, categoria_id: entradas?.id },
                
                // Principales
                { nombre: 'Pizza Margarita', precio: 25.90, categoria_id: principales?.id },
                { nombre: 'Hamburguesa', precio: 18.50, categoria_id: principales?.id },
                { nombre: 'Pasta Carbonara', precio: 22.00, categoria_id: principales?.id },
                
                // Postres
                { nombre: 'Tiramisú', precio: 8.50, categoria_id: postres?.id },
                { nombre: 'Helado', precio: 6.50, categoria_id: postres?.id }
            ].filter(p => p.categoria_id);
            
            if (productos.length > 0) {
                await Producto.bulkCreate(productos);
                console.log(`✅ Productos creados (${productos.length})`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error creando datos iniciales:', error);
    }
};

// Función para inicializar la base de datos
const initializeDatabase = async () => {
    try {
        console.log('🔄 Conectando a la base de datos...');
        await testConnection();
        
        console.log('🔄 Sincronizando modelos...');
        await sequelize.sync({ force: false });
        console.log('✅ Modelos sincronizados correctamente');
        
        await createInitialData();
        
    } catch (error) {
        console.error('❌ Error al inicializar la base de datos:', error);
    }
};

// ✅ NUEVO: Función para inicializar Socket.io
const initializeSocket = () => {
    try {
        console.log('🔄 Inicializando Socket.io...');
        const io = socketManager.initialize(server);
        console.log('✅ Socket.io inicializado correctamente');
        return io;
    } catch (error) {
        console.error('❌ Error al inicializar Socket.io:', error);
        throw error;
    }
};

// Iniciar servidor
const startServer = async () => {
    try {
        await initializeDatabase();
        
        // ✅ NUEVO: Inicializar Socket.io
        initializeSocket();
        
        // ✅ MODIFICADO: Usar server en lugar de app
        server.listen(PORT, () => {
            console.log(`🚀 Servidor SIRER ejecutándose en http://localhost:${PORT}`);
            console.log(`📊 Entorno: ${process.env.NODE_ENV}`);
            console.log(`🔌 Socket.io habilitado en puerto ${PORT}`);
            console.log('👥 Usuarios disponibles:');
            console.log('   📧 admin@sirer.com / admin123');
            console.log('   📧 mozo@sirer.com / mozo123');
            console.log('   📧 cocina@sirer.com / cocina123');
            console.log('   📧 cajero@sirer.com / cajero123');
            console.log('\n🔔 Funcionalidades en tiempo real:');
            console.log('   • Notificaciones automáticas a cocina');
            console.log('   • Alertas cuando pedidos están listos');
            console.log('   • Sincronización de estados en tiempo real');
            console.log('   • Dashboard con métricas live');
        });
        
    } catch (error) {
        console.error('❌ Error al iniciar el servidor:', error);
        process.exit(1);
    }
};

startServer();

// ✅ NUEVO: Exportar server para testing
module.exports = { app, server, socketManager };