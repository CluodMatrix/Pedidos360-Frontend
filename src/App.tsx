/**
 * ================================================================
 * PEDIDOS360 — RUTAS Y PANTALLAS DE LA APLICACIÓN
 * Archivo: src/App.tsx
 * ================================================================
 *
 * ¿QUÉ HACE?
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
 * INGLÉS:
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

/**
 * COMPONENTE: ScrollToTop()
 *
 * Se ejecuta dentro de BrowserRouter para poder leer useLocation().
 * Cuando cambia pathname, mueve al principio la zona de contenido.
 *
 * useEffect() ejecuta el efecto DESPUÉS de actualizar la vista.
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

      {/* Permite que las pantallas compartan avisos mediante useToasts().
          La consulta AWS de notificaciones sigue deshabilitada hasta
          que exista una ruta segura en API Gateway. */}
      <ToastProvider>
        <Routes>
          {/* RUTAS PÚBLICAS: no exigen inicio de sesión. */}
          <Route path="/" element={<Landing />} />
          <Route path="/catalogo-demo" element={<CatalogoDemo />} />

          {/* RUTAS PRIVADAS: RequireAuth comprueba sesión Microsoft. */}
          <Route element={<RequireAuth />}>
            {/* AppShell muestra el mismo menú en todas las páginas privadas.
                <Outlet /> es donde aparece la ruta hija seleccionada. */}
            <Route element={<AppShell />}>

              {/* /inicio decide a qué panel ir según el rol de la cuenta. */}
              <Route path="/inicio" element={<Inicio />} />

              {/* Redirección compatible con una URL anterior. */}
              <Route
                path="/dashboard"
                element={<Navigate to="/inicio" replace />}
              />

              {/* Cualquier persona autenticada puede consultar su perfil. */}
              <Route path="/perfil" element={<Perfil />} />

              {/* SOLO ADMIN: panel de estadísticas y administración. */}
              <Route element={<RequireRole roles={['Admin']} />}>
                <Route path="/admin" element={<PanelAdmin />} />
              </Route>

              {/* SOLO OPERADOR: pantalla operativa. */}
              <Route element={<RequireRole roles={['Operador']} />}>
                <Route path="/operador" element={<PanelOperador />} />
              </Route>

              {/* SOLO CLIENTE: inicio personal y carrito de compras. */}
              <Route element={<RequireRole roles={['Cliente']} />}>
                <Route path="/cliente" element={<InicioCliente />} />
                <Route path="/comprar" element={<Comprar />} />
              </Route>

              {/* ADMIN U OPERADOR: catálogo administrativo. */}
              <Route element={<RequireRole roles={['Admin', 'Operador']} />}>
                <Route path="/catalogo" element={<Catalogo />} />
              </Route>

              {/* ADMIN, OPERADOR O CLIENTE: ven pedidos según backend.
                  La Lambda decide cuáles corresponden a cada usuario. */}
              <Route
                element={<RequireRole roles={['Admin', 'Operador', 'Cliente']} />}
              >
                <Route path="/pedidos" element={<Pedidos />} />
              </Route>
            </Route>
          </Route>

          {/* * captura rutas desconocidas y vuelve a la portada.
              replace evita dejar una ruta inválida en el historial. */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
