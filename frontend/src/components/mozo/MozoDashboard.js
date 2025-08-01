import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MesasView from './MesasView';
import PedidosForm from './PedidosForm';
import PedidosHistorial from './PedidosHistorial';
import PedidoDetalles from './PedidoDetalles';

const MozoDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<MesasView />} />
            <Route path="/pedidos/:mesaId" element={<PedidosForm />} />
            <Route path="/historial" element={<PedidosHistorial />} />
            <Route path="/pedido/:pedidoId" element={<PedidoDetalles />} />
        </Routes>
    );
};

export default MozoDashboard;