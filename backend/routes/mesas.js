const express = require('express');
const router = express.Router();
const mesasController = require('../controllers/mesasController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rutas para obtener mesas (todos los roles autenticados)
router.get('/', authenticateToken, mesasController.obtenerMesas);
router.get('/estadisticas', authenticateToken, mesasController.obtenerEstadisticasMesas);
router.get('/:id', authenticateToken, mesasController.obtenerMesaPorId);

// Rutas para cambiar estado (mozos, cajeros, administradores)
router.patch('/:id/estado', 
    authenticateToken, 
    authorizeRoles('mozo', 'cajero', 'administrador'),
    mesasController.cambiarEstadoMesa
);

// Rutas administrativas (solo administradores)
router.post('/', 
    authenticateToken, 
    authorizeRoles('administrador'),
    mesasController.crearMesa
);

router.put('/:id', 
    authenticateToken, 
    authorizeRoles('administrador'),
    mesasController.actualizarMesa
);

router.delete('/:id', 
    authenticateToken, 
    authorizeRoles('administrador'),
    mesasController.eliminarMesa
);

module.exports = router;