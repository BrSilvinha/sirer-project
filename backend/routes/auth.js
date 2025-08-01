const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateLogin, validateUsuario } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas
router.post('/login', validateLogin, authController.login);
router.post('/register', validateUsuario, authController.register);
router.post('/refresh', authController.refreshToken);

// Rutas protegidas
router.get('/profile', authenticateToken, authController.getProfile);

module.exports = router;