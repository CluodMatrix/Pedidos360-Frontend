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
//   Admin â†’ /admin · Operador â†’ /operador · Cliente â†’ /cliente.
// - El Cliente compra en /comprar y NO tiene acceso a /catalogo.
//
// Las rutas utilizan nombres en español para mantener
// consistencia dentro del proyecto.

/**
 * ================================================================
 * PEDIDOS360 â€” RUTAS Y PANTALLAS DE LA APLICACIÃ“N
 * Archivo: src/App.tsx
 * ================================================================
 *
 * ¿QUÃ‰ HACE?
 * Decide qué página se muestra según la dirección URL del navegador.
 * Además, coloca protecciones de autenticación y de roles.
 *
 * CONEXIONES:
 * - main.tsx: inicia React y renderiza <App />.
 * - usuarios/RequireAuth.tsx: exige una sesión de Microsoft.
 * - usuarios/RequireRole.tsx: exige uno de los roles indicados.
 * - interfaz/AppShell.tsx: dibuja el menú y el espacio de la página.
 * - interfaz/ToastProvider.tsx: comparte el contexto de avisos.
 * - inicio/, catalogo/, pedidos/ y usuarios/Perfil.tsx: pantallas.
 *
 * ¿LLAMA A AWS?
 * NO directamente. Las páginas privadas emplean useApi(),
 * catalogoApi.ts o pedidosApi.ts para comunicarse con AWS.
 *
 * SEGURIDAD:
 * Ocultar rutas en React NO evita por sí solo llamadas a la API.
 * API Gateway debe validar el JWT y Lambda los roles/propietarios.
 *
 * INGLÃ‰S:
 * route = ruta; router = enrutador; navigate = redirigir;
 * outlet = espacio donde aparece una página hija;
 * scroll = desplazamiento; provider = proveedor.
 */

import { useEffect } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

// Protecciones de sesión y roles.
import { RequireAuth } from './usuarios/RequireAuth';
import { RequireRole } from './usuarios/RequireRole';

// Estructura común y proveedor de avisos.
import { AppShell } from './interfaz/AppShell';
import { ToastProvider } from './interfaz/ToastProvider';

// Portada pública y demostración sin backend.
import { Landing } from './inicio/Landing';
import { CatalogoDemo } from './catalogo/CatalogoDemo';

// Inicio y paneles diferenciados por rol.
import { Inicio } from './inicio/Inicio';
import { PanelAdmin } from './inicio/PanelAdmin';
import { PanelOperador } from './inicio/PanelOperador';
import { InicioCliente } from './inicio/InicioCliente';

// Páginas de productos y pedidos.
import { Comprar } from './catalogo/Comprar';
import { Catalogo } from './catalogo/Catalogo';
import { Pedidos } from './pedidos/Pedidos';
import { Perfil } from './usuarios/Perfil';

// Páginas de analítica (servicios de Kafka del proyecto Pedidos360-Kafka).
import { Reportes } from './kafka/Reportes';
import { Auditoria } from './kafka/Auditoria';

/**
 * COMPONENTE: ScrollToTop()
 *
 * Se ejecuta dentro de BrowserRouter para poder leer useLocation().
 * Cuando cambia pathname, mueve al principio la zona de contenido.
 *
 * useEffect() ejecuta el efecto DESPUÃ‰S de actualizar la vista.
 * document.getElementById('main-content') es el contenedor que
 * AppShell.tsx utiliza para las páginas privadas.
 *
 * Retorna null porque no dibuja ningún elemento visual.
 */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.getElementById('main-content')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

/**
 * COMPONENTE PRINCIPAL: App()
 *
 * BrowserRouter observa la URL del navegador.
 * Routes contiene las rutas posibles.
 * Route relaciona una URL con un componente visual.
 *
 * Anidar Route dentro de RequireAuth y RequireRole significa
 * que esas protecciones deben cumplirse antes de mostrar la página.
 */
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
            {/* Analítica: la consumen los servicios de Kafka (report y audit). */}
            <Route element={<RequireRole roles={['Admin', 'Operador']} />}>
              <Route path="/reportes" element={<Reportes />} />
              <Route path="/auditoria" element={<Auditoria />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ToastProvider>

    </BrowserRouter>
  );
}
