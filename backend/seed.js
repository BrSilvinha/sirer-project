const { sequelize } = require('./config/database');
const { Usuario, Mesa, Categoria, Producto } = require('./models/associations');

const seed = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conectado a la base de datos');

        await sequelize.sync({ force: false });
        console.log('Tablas sincronizadas');

        // Usuarios
        const usuarios = [
            { nombre: 'Administrador', email: 'admin@sirer.com', password: 'admin123', rol: 'administrador' },
            { nombre: 'Mozo Demo', email: 'mozo@sirer.com', password: 'mozo123', rol: 'mozo' },
        ];
        for (const u of usuarios) {
            await Usuario.findOrCreate({ where: { email: u.email }, defaults: u });
        }
        console.log('Usuarios creados');

        // Mesas
        const mesas = [];
        for (let i = 1; i <= 10; i++) {
            mesas.push({ numero: i, capacidad: 4, estado: 'libre' });
        }
        for (const m of mesas) {
            await Mesa.findOrCreate({ where: { numero: m.numero }, defaults: m });
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

        console.log('\n=== Seed completado exitosamente ===');
        console.log('Usuarios disponibles:');
        console.log('  admin@sirer.com / admin123');
        console.log('  mozo@sirer.com / mozo123');
        process.exit(0);
    } catch (error) {
        console.error('Error en seed:', error);
        process.exit(1);
    }
};

seed();
