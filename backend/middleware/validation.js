const { body, validationResult } = require('express-validator');

const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Datos de entrada inválidos',
            details: errors.array()
        });
    }
    next();
};

// Validaciones para Usuario
const validateUsuario = [
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('La contraseña debe tener al menos 6 caracteres'),
    body('rol')
        .isIn(['administrador', 'mozo', 'cocina', 'cajero'])
        .withMessage('Rol inválido'),
    handleValidationErrors
];

// Validaciones para Login
const validateLogin = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email inválido'),
    body('password')
        .notEmpty()
        .withMessage('La contraseña es requerida'),
    handleValidationErrors
];

// Validaciones para Mesa
const validateMesa = [
    body('numero')
        .isInt({ min: 1 })
        .withMessage('El número de mesa debe ser un entero positivo'),
    body('capacidad')
        .isInt({ min: 1, max: 20 })
        .withMessage('La capacidad debe estar entre 1 y 20 personas'),
    handleValidationErrors
];

// Validaciones para Producto
const validateProducto = [
    body('nombre')
        .trim()
        .isLength({ min: 2, max: 150 })
        .withMessage('El nombre debe tener entre 2 y 150 caracteres'),
    body('precio')
        .isFloat({ min: 0.01 })
        .withMessage('El precio debe ser mayor a 0'),
    body('categoria_id')
        .isInt({ min: 1 })
        .withMessage('ID de categoría inválido'),
    handleValidationErrors
];

module.exports = {
    validateUsuario,
    validateLogin,
    validateMesa,
    validateProducto,
    handleValidationErrors
};