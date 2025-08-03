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

function App() {
    return (
        <div className="App">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#fff',
                        color: '#333',
                        fontSize: '14px'
                    }
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