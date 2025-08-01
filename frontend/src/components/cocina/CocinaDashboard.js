import React from 'react';
import { Routes, Route } from 'react-router-dom';
import PedidosCocina from './PedidosCocina';
import ProductosDisponibilidad from './ProductosDisponibilidad';

const CocinaDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<PedidosCocina />} />
            <Route path="productos" element={<ProductosDisponibilidad />} /> {/* ✅ CORREGIDO */}
        </Routes>
    );
};

export default CocinaDashboard;