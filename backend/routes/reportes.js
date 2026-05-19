// 🔧 ARCHIVO: backend/routes/reportes.js - RUTAS CORREGIDAS

const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// ✅ MIDDLEWARE: Todas las rutas requieren autenticación
router.use(authenticateToken);

const requiresReportsAccess = authorizeRoles('administrador', 'mozo');

// ✅ RUTA PRINCIPAL: Dashboard con métricas del día
router.get('/dashboard', 
    requiresReportsAccess,
    reportesController.obtenerDashboard
);

// ✅ REPORTES DE VENTAS
router.get('/ventas', 
    requiresReportsAccess,
    reportesController.obtenerReporteVentas
);

// ✅ REPORTES DE PRODUCTOS
router.get('/productos/mas-vendidos', 
    requiresReportsAccess,
    reportesController.obtenerProductosMasVendidos
);

// ✅ REPORTES DE MOZOS - NOMBRES CORREGIDOS
router.get('/mozos/rendimiento', 
    requiresReportsAccess,
    reportesController.obtenerReporteMozos
);

// ✅ RUTA ALTERNATIVA para compatibilidad
router.get('/mozos', 
    requiresReportsAccess,
    reportesController.obtenerReporteMozos
);

// ✅ REPORTES DE MESAS - NOMBRES CORREGIDOS
router.get('/mesas/rendimiento', 
    requiresReportsAccess,
    reportesController.obtenerReporteMesas
);

// ✅ RUTA ALTERNATIVA para compatibilidad
router.get('/mesas', 
    requiresReportsAccess,
    reportesController.obtenerReporteMesas
);

// ✅ REPORTES DE CATEGORÍAS
router.get('/categorias/ventas', 
    requiresReportsAccess,
    reportesController.obtenerVentasPorCategoria
);

// ✅ RUTA ALTERNATIVA
router.get('/categorias', 
    requiresReportsAccess,
    reportesController.obtenerVentasPorCategoria
);

// ✅ NUEVAS RUTAS: Métodos de pago y estadísticas
router.get('/metodos-pago', 
    requiresReportsAccess,
    reportesController.obtenerMetodosPago
);

router.get('/estadisticas', 
    requiresReportsAccess,
    reportesController.obtenerEstadisticasGenerales
);

// ✅ RUTA DE PRUEBA: Verificar que el servicio funciona
router.get('/test', 
    authenticateToken,
    (req, res) => {
        res.json({
            success: true,
            message: 'Servicio de reportes funcionando correctamente',
            usuario: req.user.nombre,
            rol: req.user.rol,
            timestamp: new Date().toISOString(),
            rutas_disponibles: [
                '/dashboard',
                '/ventas', 
                '/productos/mas-vendidos',
                '/mozos/rendimiento',
                '/mesas/rendimiento',
                '/categorias/ventas',
                '/metodos-pago',
                '/estadisticas'
            ]
        });
    }
);

module.exports = router;