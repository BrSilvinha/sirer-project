import React, { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const MesasView = lazy(() => import('./MesasView'));
const PedidosForm = lazy(() => import('./PedidosForm'));
const PedidosHistorial = lazy(() => import('./PedidosHistorial'));
const PedidoDetalles = lazy(() => import('./PedidoDetalles'));
const DeliveryView = lazy(() => import('./DeliveryView'));
const DeliveryForm = lazy(() => import('./DeliveryForm'));

const Fallback = () => (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #FFEBEE', borderTop: '3px solid #C62828', borderRadius: '50%', animation: 'spin .75s linear infinite' }} />
    </div>
);

const MozoDashboard = () => {
    return (
        <Suspense fallback={<Fallback />}>
            <Routes>
                <Route path="/" element={<MesasView />} />
                <Route path="/pedidos/:mesaId" element={<PedidosForm />} />
                <Route path="/historial" element={<PedidosHistorial />} />
                <Route path="/pedido/:pedidoId" element={<PedidoDetalles />} />
                <Route path="/delivery" element={<DeliveryView />} />
                <Route path="/delivery/nuevo" element={<DeliveryForm />} />
            </Routes>
        </Suspense>
    );
};

export default MozoDashboard;
