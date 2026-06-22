const { sequelize } = require('./config/database');
const { Usuario, Mesa, Categoria, Producto } = require('./models/associations');

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conectado a la base de datos');

        await sequelize.sync({ force: false });
        console.log('Tablas sincronizadas');

        // Usuario administrador principal
        await Usuario.findOrCreate({
            where: { email: '71749437' },
            defaults: { nombre: 'Administrador', email: '71749437', password: '71749437', rol: 'administrador' }
        });
        console.log('Admin creado/verificado');

        // Mesas
        for (let i = 1; i <= 10; i++) {
            await Mesa.findOrCreate({ where: { numero: i }, defaults: { numero: i, capacidad: 4, estado: 'libre' } });
        }
        console.log('Mesas creadas');

        // Categorias
        const categorias = [
            { nombre: 'Entradas', descripcion: 'Platos de entrada', activo: true },
            { nombre: 'Platos Principales', descripcion: 'Platos fuertes', activo: true },
            { nombre: 'Postres', descripcion: 'Postres y dulces', activo: true },
            { nombre: 'Bebidas', descripcion: 'Bebidas y refrescos', activo: true },
        ];
        const catCreadas = [];
        for (const c of categorias) {
            const [cat] = await Categoria.findOrCreate({ where: { nombre: c.nombre }, defaults: c });
            catCreadas.push(cat);
        }
        console.log('Categorias creadas');

        // Productos
        const productos = [
            { nombre: 'Ceviche Clasico', descripcion: 'Ceviche fresco con limón y ají', precio: 25.00, categoria_id: catCreadas[0].id, disponible: true },
            { nombre: 'Papa a la Huancaína', descripcion: 'Papas con salsa huancaína', precio: 18.00, categoria_id: catCreadas[0].id, disponible: true },
            { nombre: 'Lomo Saltado', descripcion: 'Lomo con papas fritas y arroz', precio: 35.00, categoria_id: catCreadas[1].id, disponible: true },
            { nombre: 'Aji de Gallina', descripcion: 'Pollo en salsa de ají amarillo', precio: 30.00, categoria_id: catCreadas[1].id, disponible: true },
            { nombre: 'Arroz con Leche', descripcion: 'Postre tradicional peruano', precio: 12.00, categoria_id: catCreadas[2].id, disponible: true },
            { nombre: 'Picarones', descripcion: 'Donuts de camote con miel', precio: 15.00, categoria_id: catCreadas[2].id, disponible: true },
            { nombre: 'Inca Kola', descripcion: 'Bebida gaseosa', precio: 8.00, categoria_id: catCreadas[3].id, disponible: true },
            { nombre: 'Chicha Morada', descripcion: 'Bebida tradicional de maíz morado', precio: 10.00, categoria_id: catCreadas[3].id, disponible: true },
        ];
        for (const p of productos) {
            await Producto.findOrCreate({ where: { nombre: p.nombre }, defaults: p });
        }
        console.log('Productos creados');

        console.log('=== Seed completado ===');
    } catch (error) {
        console.error('Error en seed:', error);
        throw error;
    }
};

module.exports = seed;

// Si se ejecuta directamente
if (require.main === module) {
    seed().then(() => process.exit(0)).catch(() => process.exit(1));
}
