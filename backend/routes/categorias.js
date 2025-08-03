const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categoriasController');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Rutas para obtener categorías (todos los roles autenticados)
router.get('/', authenticateToken, categoriasController.obtenerCategorias);
router.get('/:id', authenticateToken, categoriasController.obtenerCategoriaPorId);

// Rutas administrativas (solo administradores)
router.post('/', 
    authenticateToken, 
    authorizeRoles('administrador'),
    categoriasController.crearCategoria
);

router.put('/:id', 
    authenticateToken, 
    authorizeRoles('administrador'),
    categoriasController.actualizarCategoria
);

router.delete('/:id', 
    authenticateToken, 
    authorizeRoles('administrador'),
    categoriasController.eliminarCategoria
);

module.exports = router;