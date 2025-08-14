// 🍽️ ARCHIVO: frontend/src/App.js - VERSIÓN ACTUALIZADA

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import Dashboard from './components/common/Dashboard';

// ✅ IMPORTAR ESTILOS EN EL ORDEN CORRECTO
import 'bootstrap/dist/css/bootstrap.min.css';        // 1. Bootstrap base
import '@fortawesome/fontawesome-free/css/all.min.css'; // 2. FontAwesome
import './index.css';                                  // 3. Variables globales
import './App.css';                                    // 4. Estilos personalizados del menú

function App() {
    return (
        <div className="App">
            {/* 🍽️ Configuración de notificaciones con colores del menú */}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#fff',
                        color: '#2C1810', // --menu-dark
                        fontSize: '14px',
                        borderRadius: '12px',
                        boxShadow: '0 6px 20px rgba(218, 165, 32, 0.15)',
                        border: '2px solid rgba(218, 165, 32, 0.2)'
                    },
                    success: {
                        style: {
                            background: 'linear-gradient(135deg, #32CD32, #228B22)', // Verde del menú
                            color: 'white',
                            border: '2px solid #32CD32'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#32CD32',
                        },
                    },
                    error: {
                        style: {
                            background: 'linear-gradient(135deg, #C2185B, #880E4F)', // Purple del menú
                            color: 'white',
                            border: '2px solid #C2185B'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#C2185B',
                        },
                    },
                    loading: {
                        style: {
                            background: 'linear-gradient(135deg, #DAA520, #C2185B)', // Gradiente dorado-purple
                            color: 'white',
                            border: '2px solid #DAA520'
                        },
                    },
                    warning: {
                        style: {
                            background: 'linear-gradient(135deg, #FF8C00, #DAA520)', // Naranja-dorado
                            color: 'white',
                            border: '2px solid #FF8C00'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#FF8C00',
                        },
                    },
                }}
            />
            
            <Router>
                <AuthProvider>
                    <SocketProvider>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route
                                path="/dashboard/*"
                                element={
                                    <ProtectedRoute>
                                        <Dashboard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="/" element={<Navigate to="/dashboard" replace />} />
                            <Route path="*" element={<Navigate to="/login" replace />} />
                        </Routes>
                    </SocketProvider>
                </AuthProvider>
            </Router>
        </div>
    );
}

export default App;