const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DetallePedido = sequelize.define('DetallePedido', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    pedido_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'pedidos',
            key: 'id'
        }
    },
    producto_id: {
        type: DataTypes.INTEGER,
        references: {
            model: 'productos',
            key: 'id'
        }
    },
    cantidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1
    },
    precio_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    }
}, {
    tableName: 'detalle_pedidos'
});

module.exports = DetallePedido;