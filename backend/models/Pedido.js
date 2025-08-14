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
        type: DataTypes.ENUM('nuevo', 'preparando', 'listo', 'entregado', 'pagado', 'cancelado'),
        defaultValue: 'nuevo'
    },
    total: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
    },
    observaciones: {
        type: DataTypes.TEXT
    }
}, {
    tableName: 'pedidos'
});

module.exports = Pedido;