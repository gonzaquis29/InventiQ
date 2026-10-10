import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Inventario from '@/pages/Inventario';
import ProductoDetalle from '@/pages/ProductoDetalle';
import Pos from '@/pages/Pos';
import Ventas from '@/pages/Ventas';
import VentaDetalle from '@/pages/VentaDetalle';
import Compras from '@/pages/Compras';
import CompraDetalle from '@/pages/CompraDetalle';
import Proveedores from '@/pages/Proveedores';
import Configuracion from '@/pages/Configuracion';
import Caja from '@/pages/Caja';
import Reportes from '@/pages/Reportes';
import Auditoria from '@/pages/Auditoria';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Dashboard />} />
              <Route path="/pos" element={<Pos />} />
              <Route path="/ventas" element={<Ventas />} />
              <Route path="/ventas/:id" element={<VentaDetalle />} />
              <Route path="/inventario" element={<Inventario />} />
              <Route path="/inventario/:id" element={<ProductoDetalle />} />
              <Route
                path="/compras"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <Compras />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/compras/:id"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <CompraDetalle />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proveedores"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <Proveedores />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/configuracion"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <Configuracion />
                  </ProtectedRoute>
                }
              />
              <Route path="/caja" element={<Caja />} />
              <Route
                path="/auditoria"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <Auditoria />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reportes"
                element={
                  <ProtectedRoute roles={['ADMIN']}>
                    <Reportes />
                  </ProtectedRoute>
                }
              />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
