// 🍽️ ARCHIVO: frontend/src/App.js - VERSIÓN ACTUALIZADA

import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { ThemeProvider } from './context/ThemeContext';
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
        <ThemeProvider>
        <div className="App">
            {/* 🍽️ Configuración de notificaciones con colores del menú */}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#fff',
                        color: '#2C1810',
                        fontSize: '14px',
                        borderRadius: '12px',
                        boxShadow: '0 6px 20px rgba(198, 40, 40, 0.15)',
                        border: '2px solid rgba(198, 40, 40, 0.2)'
                    },
                    success: {
                        style: {
                            background: 'linear-gradient(135deg, #16a34a, #15803d)',
                            color: 'white',
                            border: '2px solid #16a34a'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#16a34a',
                        },
                    },
                    error: {
                        style: {
                            background: 'linear-gradient(135deg, #C62828, #9B1B1B)',
                            color: 'white',
                            border: '2px solid #C62828'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#C62828',
                        },
                    },
                    loading: {
                        style: {
                            background: 'linear-gradient(135deg, #F9A825, #E65100)',
                            color: 'white',
                            border: '2px solid #F9A825'
                        },
                    },
                    warning: {
                        style: {
                            background: 'linear-gradient(135deg, #E65100, #F9A825)',
                            color: 'white',
                            border: '2px solid #E65100'
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#E65100',
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
        </ThemeProvider>
    );
}

export default App;