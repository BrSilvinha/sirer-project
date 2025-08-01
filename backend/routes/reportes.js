const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Todas las rutas de reportes requieren rol de administrador o cajero
const requiresReportsAccess = authorizeRoles('administrador', 'cajero');

// Dashboard principal
router.get('/dashboard', 
    authenticateToken,
    requiresReportsAccess,
    reportesController.obtenerDashboard
);

// Reportes de ventas
router.get('/ventas', 
    authenticateToken,
    requiresReportsAccess,
    reportesController.obtenerReporteVentas
);

// Productos más vendidos
router.get('/productos/mas-vendidos', 
    authenticateToken,
    requiresReportsAccess,
    reportesController.obtenerProductosMasVendidos
);

// Rendimiento de mesas
router.get('/mesas/rendimiento', 
    authenticateToken,
    requiresReportsAccess,
    reportesController.obtenerReporteMesas
);

// Rendimiento de mozos
router.get('/mozos/rendimiento', 
    authenticateToken,
    requiresReportsAccess,
    reportesController.obtenerReporteMozos
);

// Ventas por categoría
router.get('/categorias/ventas', 
    authenticateToken,
    requiresReportsAccess,
    reportesController.obtenerVentasPorCategoria
);

module.exports = router;