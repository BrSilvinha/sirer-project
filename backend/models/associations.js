const Usuario = require('./Usuario');
const Mesa = require('./Mesa');
const Categoria = require('./Categoria');
const Producto = require('./Producto');
const Pedido = require('./Pedido');
const DetallePedido = require('./DetallePedido');

// Asociaciones Usuario-Pedido
Usuario.hasMany(Pedido, { foreignKey: 'usuario_id', as: 'pedidos' });
Pedido.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'mozo' });

// Asociaciones Mesa-Pedido
Mesa.hasMany(Pedido, { foreignKey: 'mesa_id', as: 'pedidos' });
Pedido.belongsTo(Mesa, { foreignKey: 'mesa_id', as: 'mesa' });

// Asociaciones Categoria-Producto
Categoria.hasMany(Producto, { foreignKey: 'categoria_id', as: 'productos' });
Producto.belongsTo(Categoria, { foreignKey: 'categoria_id', as: 'categoria' });

// Asociaciones Pedido-DetallePedido
Pedido.hasMany(DetallePedido, { foreignKey: 'pedido_id', as: 'detalles' });
DetallePedido.belongsTo(Pedido, { foreignKey: 'pedido_id', as: 'pedido' });

// Asociaciones Producto-DetallePedido
Producto.hasMany(DetallePedido, { foreignKey: 'producto_id', as: 'detalles' });
DetallePedido.belongsTo(Producto, { foreignKey: 'producto_id', as: 'producto' });

module.exports = {
    Usuario,
    Mesa,
    Categoria,
    Producto,
    Pedido,
    DetallePedido
};