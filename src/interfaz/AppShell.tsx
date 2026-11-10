
/**
 * PEDIDOS360 — ESTRUCTURA PRINCIPAL DEL PANEL
 * Archivo: src/interfaz/AppShell.tsx
 *
 * QUÉ HACE:
 * - Construye la estructura de las páginas privadas.
 * - Muestra el menú lateral y la cabecera móvil.
 * - Decide qué opciones mostrar según los roles.
 * - Permite cerrar sesión con Microsoft.
 * - Prepara una transición visual entre páginas.
 *
 * CONEXIONES:
 * App.tsx -> AppShell -> Sidebar -> SidebarUser
 *                     -> Outlet (página actual)
 *
 * useAuthorization -> consulta permisos del usuario.
 * activeAccount -> identifica la cuenta de Microsoft.
 * rolInicio -> decide el panel de inicio según el rol.
 *
 * AWS: este archivo no realiza solicitudes HTTP.
 *
 * VOCABULARIO:
 * Shell = estructura de la aplicación.
 * Sidebar = barra lateral.
 * Outlet = espacio donde aparece otra página.
 * Layout = distribución de los elementos.
 * Route = ruta o dirección.
 * Props = propiedades recibidas por un componente.
 */

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Outlet, useLocation } from 'react-router-dom';
import { InteractionStatus } from '@azure/msal-browser';
import { useMsal } from '@azure/msal-react';

import { useAuthorization } from '../usuarios/useAuthorization';
import { resolveActiveAccount } from '../usuarios/activeAccount';
import { rutaInicioPorRol } from '../usuarios/rolInicio';
import { Sidebar } from './Sidebar';

/**
 * Títulos para la barra superior de los celulares.
 *
 * Record<string, string> es un objeto que relaciona
 * una dirección con el nombre de la página.
 */
const routeTitles: Record<string, string> = {
  '/inicio': 'Inicio',
  '/admin': 'Panel de Administración',
  '/operador': 'Panel de Operaciones',
  '/cliente': 'Inicio de Cliente',
  '/comprar': 'Comprar',
  '/catalogo': 'Catálogo',
  '/pedidos': 'Pedidos',
  '/perfil': 'Mi perfil',
};

/**
 * COMPONENTE PRINCIPAL: AppShell()
 *
 * Recuerda: un componente React es una función que
 * devuelve los elementos que aparecen en pantalla.
 */
export function AppShell() {
  // Obtiene información de Microsoft Entra ID.
  const { instance, accounts, inProgress } = useMsal();

  // Obtiene los roles y permisos que utiliza la interfaz.
  const authorization = useAuthorization();

  // Detecta en qué página está navegando el usuario.
  const location = useLocation();

  // Guarda si el menú móvil está abierto.
  const [menuOpen, setMenuOpen] = useState(false);

  // Guarda errores al intentar cerrar sesión.
  const [logoutError, setLogoutError] = useState<string | null>(null);

  // Identifica la cuenta activa de Microsoft.
  const account = resolveActiveAccount(instance, accounts);

  // Nombre visible del usuario.
  const userName =
    account?.name ?? account?.username ?? 'Cuenta Microsoft';

  /**
   * PERMISOS PARA MOSTRAR ENLACES
   *
   * some() significa "al menos uno".
   *
   * Esto solamente decide qué enlaces aparecen.
   * RequireRole y el backend controlan los accesos reales.
   */
  const canSeeCatalog = authorization.roles.some(
    (role) => role === 'Admin' || role === 'Operador',
  );

  const canSeeOrders = authorization.roles.some(
    (role) => ['Admin', 'Operador', 'Cliente'].includes(role),
  );

  // Selecciona el inicio que corresponde al rol.
  const homePath = rutaInicioPorRol(authorization.roles);

  /**
   * FUNCIÓN: logout()
   *
   * Logout = cerrar sesión.
   *
   * 1. Comprueba que MSAL no esté ocupado.
   * 2. Solicita a Microsoft cerrar la sesión.
   * 3. Regresa a la portada del frontend.
   *
   * No elimina productos ni pedidos de AWS.
   */
  function logout() {
    if (inProgress !== InteractionStatus.None) return;

    setLogoutError(null);

    void instance.logoutRedirect({
      account,
      postLogoutRedirectUri: window.location.origin,
    }).catch(() => {
      console.error('No se pudo cerrar la sesión con Microsoft.');
      setLogoutError('No se pudo cerrar sesión. Inténtalo nuevamente.');
    });
  }

  /**
   * FUNCIÓN: cerrarMenu()
   *
   * Cuando el usuario selecciona una página desde
   * un celular, escondemos el menú lateral.
   */
  function cerrarMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="app-shell">
      {/*
        SIDEBAR: menú lateral.

        Aquí le entregamos:
        - Datos del usuario.
        - Roles y rutas.
        - Función para cerrar sesión.
        - Estado del menú móvil.
      */}
      <Sidebar
        userName={userName}
        username={account?.username ?? ''}
        roles={authorization.roles}
        homePath={homePath}
        canSeeCatalog={canSeeCatalog}
        canSeeOrders={canSeeOrders}
        open={menuOpen}
        logout={logout}
        logoutDisabled={inProgress !== InteractionStatus.None}
        onNavigate={cerrarMenu}
      />

      {/*
        SCRIM = capa semitransparente.

        Aparece detrás del menú cuando está abierto
        en un celular. Al tocarla, el menú se cierra.
      */}
      {menuOpen && (
        <button
          type="button"
          className="sidebar-scrim"
          aria-label="Cerrar menú"
          onClick={cerrarMenu}
        />
      )}

      {/* Zona principal de la aplicación. */}
      <div className="app-main">
        {/* Cabecera visible en pantallas pequeñas. */}
        <header className="mobile-header">
          <button
            type="button"
            className="icon-button menu-toggle"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuOpen}
            aria-controls="primary-sidebar"
            onClick={() => setMenuOpen((abierto) => !abierto)}
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <strong>Pedidos360</strong>

          <span className="mobile-route-title">
            {routeTitles[location.pathname] ?? 'Pedidos360'}
          </span>
        </header>

        {logoutError && (
          <p className="inline-error" role="alert">
            {logoutError}
          </p>
        )}

        {/*
          OUTLET: aquí aparece la página seleccionada.

          Ejemplos:
          /admin    -> PanelAdmin.tsx
          /catalogo -> Catalogo.tsx
          /pedidos  -> Pedidos.tsx
          /perfil   -> Perfil.tsx

          key={location.pathname} hace que React vuelva
          a montar esta zona cuando cambia la dirección.

          La clase page-route-transition aplica una entrada
          suave mediante CSS. No cambia las rutas ni la API.
        */}
        <main
          className="page-content page-route-transition"
          id="main-content"
          key={location.pathname}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
