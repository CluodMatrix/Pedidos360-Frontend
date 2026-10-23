// src/App.tsx
//
// Configuración principal de navegación y rutas de Pedidos360.
//
// RequireAuth:
// - Comprueba que exista una sesión iniciada.
//
// RequireRole:
// - Comprueba que el usuario tenga al menos uno de los roles
//   permitidos para acceder a una ruta.
//
// Inicio por rol:
// - /inicio resuelve el panel correspondiente según el rol:
//   Admin → /admin · Operador → /operador · Cliente → /cliente.
// - El Cliente compra en /comprar y NO tiene acceso a /catalogo.
//
// Las rutas utilizan nombres en español para mantener
// consistencia dentro del proyecto.

import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';
import { useEffect } from 'react';
import { RequireAuth } from './auth/RequireAuth';
import { RequireRole } from './auth/RequireRole';
import { AppShell } from './components/layout/AppShell';
import { ToastProvider } from './components/ToastProvider';
import { Landing } from './pages/Landing';
import { CatalogoDemo } from './pages/CatalogoDemo';
import { Inicio } from './pages/Inicio';
import { PanelAdmin } from './pages/PanelAdmin';
import { PanelOperador } from './pages/PanelOperador';
import { InicioCliente } from './pages/InicioCliente';
import { Comprar } from './pages/Comprar';
import { Catalogo } from './pages/Catalogo';
import { Pedidos } from './pages/Pedidos';
import { Perfil } from './pages/Perfil';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.getElementById('main-content')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/catalogo-demo" element={<CatalogoDemo />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppShell />}>
            <Route path="/inicio" element={<Inicio />} />
            <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
            <Route path="/perfil" element={<Perfil />} />
            <Route element={<RequireRole roles={['Admin']} />}>
              <Route path="/admin" element={<PanelAdmin />} />
            </Route>
            <Route element={<RequireRole roles={['Operador']} />}>
              <Route path="/operador" element={<PanelOperador />} />
            </Route>
            <Route element={<RequireRole roles={['Cliente']} />}>
              <Route path="/cliente" element={<InicioCliente />} />
              <Route path="/comprar" element={<Comprar />} />
            </Route>
            <Route element={<RequireRole roles={['Admin', 'Operador']} />}>
              <Route path="/catalogo" element={<Catalogo />} />
            </Route>
            <Route element={<RequireRole roles={['Admin', 'Operador', 'Cliente']} />}>
              <Route path="/pedidos" element={<Pedidos />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ToastProvider>

    </BrowserRouter>
  );
}