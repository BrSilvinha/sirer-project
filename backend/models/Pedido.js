const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Pedido = sequelize.define('Pedido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    mesa_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'mesas',
            key: 'id'
        }
    },
    usuario_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'usuarios',
            key: 'id'
        }
    },
    estado: {
        type: DataTypes.ENUM('nuevo', 'preparado', 'entregado', 'pagado', 'cancelado'),
        defaultValue: 'nuevo'
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    observaciones: {
        type: DataTypes.TEXT
    },
    tipo: {
        type: DataTypes.ENUM('mesa', 'delivery'),
        defaultValue: 'mesa'
    },
    metodo_pago: {
        type: DataTypes.ENUM('efectivo', 'tarjeta', 'yape'),
        allowNull: true
    },
    cliente_nombre: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'pedidos',
    indexes: [
        { fields: ['mesa_id'] },
        { fields: ['usuario_id'] },
        { fields: ['estado'] },
        { fields: ['created_at'] },
        { fields: ['tipo'] },
    ]
});

module.exports = Pedido;