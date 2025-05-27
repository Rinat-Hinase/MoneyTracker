import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IngresosEgresos from './pages/IngresosEgresos';
import Deudores from './pages/Deudores';
import MovimientosSemanales from './pages/MovimientosSemanales';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta pública */}
        <Route path="/" element={<Login />} />

        {/* Rutas protegidas */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/movimientos"
          element={
            <ProtectedRoute>
              <IngresosEgresos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/deudores"
          element={
            <ProtectedRoute>
              <Deudores />
            </ProtectedRoute>
          }
        />
        <Route
          path="/movimientos-semanales"
          element={
            <ProtectedRoute>
              <MovimientosSemanales />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
