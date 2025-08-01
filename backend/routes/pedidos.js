const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rutas para obtener pedidos
router.get('/', 
    authenticateToken,
    authorizeRoles('administrador', 'cajero'),
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
    pedidosController.obtenerPedidosPorMesa
);

// Rutas para crear pedidos (mozos y administradores)
router.post('/', 
    authenticateToken,
    authorizeRoles('mozo', 'administrador'),
    pedidosController.crearPedido
);

// Rutas para cambiar estado de pedidos
router.patch('/:id/estado', 
    authenticateToken,
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

module.exports = router;