import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/Login';
import ProtectedRoute from './components/common/ProtectedRoute';
import Dashboard from './components/common/Dashboard';

// Importar estilos
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './App.css';

function App() {
    return (
        <div className="App">
            {/* Configuración de notificaciones con tema del restaurante */}
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#fff',
                        color: '#333',
                        fontSize: '14px',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(218, 165, 32, 0.15)',
                        border: '1px solid rgba(218, 165, 32, 0.2)'
                    },
                    success: {
                        style: {
                            background: 'linear-gradient(135deg, #28a745, #20c997)',
                            color: 'white',
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#28a745',
                        },
                    },
                    error: {
                        style: {
                            background: 'linear-gradient(135deg, #dc3545, #e83e8c)',
                            color: 'white',
                        },
                        iconTheme: {
                            primary: 'white',
                            secondary: '#dc3545',
                        },
                    },
                    loading: {
                        style: {
                            background: 'linear-gradient(135deg, #DAA520, #C2185B)',
                            color: 'white',
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