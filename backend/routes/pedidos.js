const express = require('express');
const router = express.Router();
const productosController = require('../controllers/productosController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rutas para obtener productos (todos los roles autenticados)
router.get('/', authenticateToken, productosController.obtenerProductos);
router.get('/disponibles', authenticateToken, productosController.obtenerProductosDisponibles);
router.get('/categoria/:categoria_id', authenticateToken, productosController.obtenerProductosPorCategoria);
router.get('/:id', authenticateToken, productosController.obtenerProductoPorId);

// Rutas para cambiar disponibilidad (administradores y cocina)
router.patch('/:id/disponibilidad', 
    authenticateToken, 
    authorizeRoles('administrador', 'cocina'),
    productosController.cambiarDisponibilidadProducto
);

// Rutas administrativas (solo administradores)
router.post('/', 
    authenticateToken, 
    authorizeRoles('administrador'),
    productosController.crearProducto
);

router.put('/:id', 
    authenticateToken, 
    authorizeRoles('administrador'),
    productosController.actualizarProducto
);

router.delete('/:id', 
    authenticateToken, 
    authorizeRoles('administrador'),
    productosController.eliminarProducto
);

module.exports = router;