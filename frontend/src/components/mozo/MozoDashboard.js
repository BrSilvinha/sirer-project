import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MesasView from './MesasView';
import PedidosForm from './PedidosForm';

const MozoDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<MesasView />} />
            <Route path="/pedidos/:mesaId" element={<PedidosForm />} />
        </Routes>
    );
};

export default MozoDashboard;