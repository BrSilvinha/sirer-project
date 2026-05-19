const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rutas para obtener pedidos - CORREGIDAS para incluir mozos
router.get('/',
    authenticateToken,
    authorizeRoles('administrador', 'mozo'),
    pedidosController.obtenerPedidos
);

router.get('/:id', 
    authenticateToken,
    pedidosController.obtenerPedidoPorId
);

router.get('/mesa/:mesa_id',
    authenticateToken,
    authorizeRoles('mozo', 'administrador'),
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
    authorizeRoles('mozo', 'administrador'),
    pedidosController.cambiarEstadoPedido
);

// Cuenta y pagos — accesible por mozo y admin
router.get('/cuenta/mesa/:mesa_id',
    authenticateToken,
    authorizeRoles('mozo', 'administrador'),
    pedidosController.obtenerCuentaMesa
);

router.post('/pago/mesa/:mesa_id',
    authenticateToken,
    authorizeRoles('mozo', 'administrador'),
    pedidosController.procesarPagoMesa
);

// ✅ NUEVA RUTA: Estadísticas de pedidos para mozos
router.get('/stats/mozo', 
    authenticateToken,
    authorizeRoles('mozo', 'administrador'),
    pedidosController.obtenerEstadisticasPedidos
);

module.exports = router;