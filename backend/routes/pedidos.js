const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rutas para obtener pedidos - CORREGIDAS para incluir mozos
router.get('/', 
    authenticateToken,
    authorizeRoles('administrador', 'cajero', 'mozo'), // ✅ AGREGADO: mozo
    pedidosController.obtenerPedidos
);

router.get('/cocina', 
    authenticateToken,
    authorizeRoles('cocina', 'administrador'),
    pedidosController.obtenerPedidosCocina
);

router.get('/:id', 
    authenticateToken,
    pedidosController.obtenerPedidoPorId
);

router.get('/mesa/:mesa_id', 
    authenticateToken,
    authorizeRoles('mozo', 'administrador', 'cajero'), // ✅ CORREGIDO: orden de roles
    pedidosController.obtenerPedidosPorMesa
);

// Rutas para crear pedidos (mozos y administradores)
router.post('/', 
    authenticateToken,
    authorizeRoles('mozo', 'administrador'),
    pedidosController.crearPedido
);

// Rutas para cambiar estado de pedidos - CORREGIDAS
router.patch('/:id/estado', 
    authenticateToken,
    authorizeRoles('mozo', 'cocina', 'administrador'), // ✅ AGREGADO: mozo puede cambiar estados
    pedidosController.cambiarEstadoPedido
);

// Rutas para cajeros - gestión de cuentas y pagos
router.get('/cuenta/mesa/:mesa_id', 
    authenticateToken,
    authorizeRoles('cajero', 'administrador'),
    pedidosController.obtenerCuentaMesa
);

router.post('/pago/mesa/:mesa_id', 
    authenticateToken,
    authorizeRoles('cajero', 'administrador'),
    pedidosController.procesarPagoMesa
);

// ✅ NUEVA RUTA: Estadísticas de pedidos para mozos
router.get('/stats/mozo', 
    authenticateToken,
    authorizeRoles('mozo', 'administrador'),
    pedidosController.obtenerEstadisticasPedidos
);

module.exports = router;