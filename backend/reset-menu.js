const { sequelize } = require('./config/database');
const { Categoria, Producto } = require('./models/associations');

const resetMenu = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conectado a la base de datos');

        // Eliminar productos primero (FK constraint)
        await Producto.destroy({ where: {}, truncate: false });
        console.log('Productos eliminados');

        await Categoria.destroy({ where: {}, truncate: false });
        console.log('Categorías eliminadas');

        // ── Categorías ──────────────────────────────────────
        const [catPollos]    = await Categoria.findOrCreate({ where: { nombre: 'Pollos a la Brasa' },  defaults: { nombre: 'Pollos a la Brasa',  descripcion: 'Pollos a la brasa con papas, cremas y ensalada', activo: true } });
        const [catCombos]    = await Categoria.findOrCreate({ where: { nombre: 'Combos' },             defaults: { nombre: 'Combos',             descripcion: 'Combos especiales de la casa',                    activo: true } });
        const [catMostritos] = await Categoria.findOrCreate({ where: { nombre: 'Mostritos' },          defaults: { nombre: 'Mostritos',          descripcion: 'Con papas, chaufa, ensalada y crema',             activo: true } });
        const [catEspeciales]= await Categoria.findOrCreate({ where: { nombre: 'Especiales' },         defaults: { nombre: 'Especiales',         descripcion: 'Platos y porciones especiales',                   activo: true } });

        console.log('Categorías creadas');

        // ── Productos ────────────────────────────────────────
        const productos = [
            // POLLOS A LA BRASA
            {
                nombre:      '1 Pollo a la Brasa',
                descripcion: 'Con papas, cremas y ensalada',
                precio:      65.00,
                categoria_id: catPollos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      '1/2 Pollo a la Brasa',
                descripcion: 'Con papas, cremas y ensalada',
                precio:      35.00,
                categoria_id: catPollos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      '1/4 Pollo a la Brasa',
                descripcion: 'Con papas, cremas y ensalada',
                precio:      22.00,
                categoria_id: catPollos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      '1/8 Pollo a la Brasa',
                descripcion: 'Con papas, cremas y ensalada',
                precio:      13.00,
                categoria_id: catPollos.id,
                disponible:  true,
                activo:      true,
            },

            // COMBOS
            {
                nombre:      'Combo 1 — Pollo Entero',
                descripcion: '1 Pollo + Papas + Ensalada + Chaufa + Gaseosa 1.5 Lt',
                precio:      85.00,
                categoria_id: catCombos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Combo 2 — Medio Pollo',
                descripcion: '1/2 Pollo + Papas + Ensalada + Chaufa + Gaseosa 1.5 Lt',
                precio:      55.00,
                categoria_id: catCombos.id,
                disponible:  true,
                activo:      true,
            },

            // MOSTRITOS
            {
                nombre:      'Mostrito 1 Pollo',
                descripcion: '1 Pollo a la brasa con papas y chaufa',
                precio:      75.00,
                categoria_id: catMostritos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Mostrito 1/2 Pollo',
                descripcion: '1/2 Pollo a la brasa con papas y chaufa',
                precio:      45.00,
                categoria_id: catMostritos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Mostrito 1/4 Pollo',
                descripcion: '1/4 Pollo a la brasa con papas y chaufa',
                precio:      25.00,
                categoria_id: catMostritos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Mostrito 1/8 Pollo',
                descripcion: '1/8 Pollo a la brasa con papas y chaufa',
                precio:      16.00,
                categoria_id: catMostritos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Mostrito (pequeño)',
                descripcion: '1/8 Pollo + Chaufa + Papas + Ensalada + Crema + Gaseosa 1/2 Lt',
                precio:      19.00,
                categoria_id: catMostritos.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Mostro',
                descripcion: '1/4 Pollo + Chaufa + Papas + Ensalada + Crema + Gaseosa 1/2 Lt',
                precio:      28.00,
                categoria_id: catMostritos.id,
                disponible:  true,
                activo:      true,
            },

            // ESPECIALES
            {
                nombre:      'Aguadito',
                descripcion: 'Caldo de pollo tradicional',
                precio:      5.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Salchipapa Clásica',
                descripcion: 'Salchichas con papas fritas',
                precio:      10.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Salchipapa Especial',
                descripcion: 'Salchichas con papas fritas y extras',
                precio:      12.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Pollo Broaster',
                descripcion: 'Pollo crujiente estilo broaster',
                precio:      13.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Mostrito Broaster',
                descripcion: 'Porción broaster con acompañamientos',
                precio:      16.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Alitas BBQ',
                descripcion: 'Alitas con salsa BBQ',
                precio:      20.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Alitas Acevichadas',
                descripcion: 'Alitas con salsa acevichada',
                precio:      20.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Alitas Picantes',
                descripcion: 'Alitas con salsa picante',
                precio:      20.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Alitas Maracuyá',
                descripcion: 'Alitas con salsa de maracuyá',
                precio:      20.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
            {
                nombre:      'Alitas Broaster',
                descripcion: 'Alitas crujientes estilo broaster',
                precio:      20.00,
                categoria_id: catEspeciales.id,
                disponible:  true,
                activo:      true,
            },
        ];

        for (const p of productos) {
            await Producto.create(p);
        }

        console.log(`\n✓ ${productos.length} productos creados`);
        console.log('\n=== Menú actualizado ===');
        console.log('  Pollos a la Brasa : 4 productos');
        console.log('  Combos            : 2 productos');
        console.log('  Mostritos         : 6 productos');
        console.log('  Especiales        : 9 productos');
        process.exit(0);

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

resetMenu();
