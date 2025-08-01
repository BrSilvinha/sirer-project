import React from 'react';
import { Routes, Route } from 'react-router-dom';
import CuentasPendientes from './CuentasPendientes';
import ResumenVentas from './ResumenVentas';

const CajeroDashboard = () => {
    return (
        <Routes>
            <Route path="/" element={<CuentasPendientes />} />
            <Route path="/pagos" element={<CuentasPendientes />} />
            <Route path="/reportes" element={<ResumenVentas />} /> {/* ✅ NUEVA RUTA */}
        </Routes>
    );
};

export default CajeroDashboard;