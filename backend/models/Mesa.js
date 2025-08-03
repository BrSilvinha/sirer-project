const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Mesa = sequelize.define('Mesa', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    numero: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    capacidad: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 4
    },
    estado: {
        type: DataTypes.ENUM('libre', 'ocupada', 'cuenta_solicitada'),
        defaultValue: 'libre'
    },
    activa: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'mesas'
});

module.exports = Mesa;