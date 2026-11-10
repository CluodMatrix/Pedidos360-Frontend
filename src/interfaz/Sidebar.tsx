/**
 * PEDIDOS360 — MENÚ LATERAL NEÓN PASTEL
 * Archivo: src/interfaz/Sidebar.tsx
 *
 * QUÉ HACE:
 * - Muestra el logo y la navegación.
 * - Selecciona un gatito aleatorio al cargar.
 * - Permite cambiar el gatito haciendo clic en él.
 * - Resalta la página que está abierta.
 * - Enseña el menú correspondiente al rol.
 *
 * CONEXIONES:
 * AppShell.tsx -> Sidebar.tsx -> SidebarUser.tsx
 * App.tsx define las rutas.
 * sidebar.css contiene la apariencia visual.
 *
 * No llama directamente a AWS ni a Microsoft.
 *
 * VOCABULARIO:
 * Sidebar = barra lateral.
 * NavLink = enlace que detecta si está activo.
 * Active = activo o seleccionado.
 * Brand = marca.
 * Hover = pasar el cursor sobre un elemento.
 */

import { useState } from 'react';
import {
  Boxes,
  ClipboardList,
  Home,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SidebarUser } from './SidebarUser';

/**
 * IMÁGENES DE GATITOS
 *
 * Estas imágenes ya aparecen en el proyecto original.
 * Puedes agregar más archivos cuando quieras.
 *
 * IMPORTANTE:
 * Para agregar otro gatito:
 * 1. Importa el PNG desde ../imagenes/animales/.
 * 2. Agrégalo al arreglo GATITOS.
 *
 * No cambiamos ni movemos las imágenes originales.
 */
import ima1 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_05.png';
import ima2 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_07.png';
import ima3 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_11.png';
import ima4 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_18.png';
import ima5 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_20.png';
import ima6 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_42.png';
import ima7 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_53.png';
import ima8 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_57.png';
import ima9 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_04_00.png';
import ima10 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_04_04.png';
import ima11 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_06.png';
import ima12 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_15.png';
import ima13 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_18.png';
import ima14 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_22.png';
import ima15 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_24.png';
import ima16 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_13_25.png';
import ima17 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_17_52.png';


/**
 * Arreglo = colección de elementos.
 *
 * Todos los archivos de este arreglo pueden aparecer
 * como mascota del menú.
 */
const GATITOS = [
  ima1,
  ima2,
  ima3,
  ima4,
  ima5,
  ima6,
  ima7,
  ima8,
  ima9,
  ima10,
  ima11,
  ima12,
  ima13,
  ima14,
  ima15,
  ima16,
  ima17
];

/**
 * Datos recibidos desde AppShell.
 *
 * Estos nombres se mantienen para no romper
 * las conexiones con el resto del proyecto.
 */
interface SidebarProps {
  userName: string;
  username: string;
  roles: string[];
  homePath: string;
  canSeeCatalog: boolean;
  canSeeOrders: boolean;
  open: boolean;
  logout: () => void;
  logoutDisabled: boolean;
  onNavigate: () => void;
}

export function Sidebar({
  userName,
  username,
  roles,
  homePath,
  canSeeCatalog,
  canSeeOrders,
  open,
  logout,
  logoutDisabled,
  onNavigate,
}: SidebarProps) {
  /**
   * GATITO ALEATORIO
   *
   * useState guarda cuál gatito aparece.
   * Math.random() produce un número aleatorio.
   * Math.floor() convierte ese número en un entero.
   *
   * El gatito se elige al montar el componente.
   * No cambia continuamente mientras estás trabajando.
   */
  const [gatoActual, setGatoActual] = useState(
    () => Math.floor(Math.random() * GATITOS.length),
  );

  /**
   * FUNCIÓN: cambiarGatito()
   *
   * Se ejecuta al hacer clic sobre el gatito.
   * Selecciona otra imagen diferente a la actual.
   */
  function cambiarGatito() {
    setGatoActual((actual) => {
      if (GATITOS.length < 2) return actual;

      // El desplazamiento siempre es mayor que cero.
      const salto =
        1 + Math.floor(Math.random() * (GATITOS.length - 1));

      // El módulo (%) evita superar la cantidad de imágenes.
      return (actual + salto) % GATITOS.length;
    });
  }

  /**
   * FUNCIÓN: linkClass()
   *
   * NavLink pregunta si su ruta está seleccionada.
   * Cuando isActive es true, agregamos "is-active".
   *
   * sidebar.css se encarga de mostrar el degradado
   * rosa y cian del enlace activo.
   */
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `sidebar-link${isActive ? ' is-active' : ''}`;

  /**
   * Si una cuenta tiene varios roles, priorizamos
   * el menú de administración sobre el de Cliente.
   */
  const esCliente = roles.includes('Cliente') && !canSeeCatalog;

  return (
    <aside
      className={`sidebar${open ? ' is-open' : ''}`}
      id="primary-sidebar"
      aria-label="Navegación principal"
    >
      {/* LOGOTIPO SUPERIOR */}
      <div className="sidebar-brand">
        <button
          type="button"
          className="brand-cat-button"
          onClick={cambiarGatito}
          aria-label="Mostrar otro gatito de Pedidos360"
          title="¡Haz clic para cambiar de gatito!"
        >
          <img
            className="brand-mark-img"
            src={GATITOS[gatoActual]}
            alt=""
          />
        </button>

        <div className="brand-copy">
          <strong>
            Pedidos<span>360</span>
          </strong>
          <small>Sistema de gestión de pedidos</small>
        </div>
      </div>

      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="sidebar-nav" aria-label="Menú de páginas">
        <p className="sidebar-section-label">MENÚ PRINCIPAL</p>

        {/* El inicio depende del rol del usuario. */}
        <NavLink
          to={homePath}
          end
          className={linkClass}
          onClick={onNavigate}
        >
          <Home size={19} strokeWidth={1.9} aria-hidden="true" />
          <span>Inicio</span>
        </NavLink>

        {esCliente ? (
          <>
            {/* VISTA DEL CLIENTE */}
            <NavLink
              to="/comprar"
              className={linkClass}
              onClick={onNavigate}
            >
              <ShoppingBag size={19} strokeWidth={1.9} aria-hidden="true" />
              <span>Comprar</span>
            </NavLink>

            {canSeeOrders && (
              <NavLink
                to="/pedidos"
                className={linkClass}
                onClick={onNavigate}
              >
                <ClipboardList size={19} strokeWidth={1.9} aria-hidden="true" />
                <span>Mis pedidos</span>
              </NavLink>
            )}
          </>
        ) : (
          <>
            {/* VISTA DEL PERSONAL */}
            {canSeeCatalog && (
              <NavLink
                to="/catalogo"
                className={linkClass}
                onClick={onNavigate}
              >
                <Boxes size={19} strokeWidth={1.9} aria-hidden="true" />
                <span>Catálogo</span>
              </NavLink>
            )}

            {canSeeOrders && (
              <NavLink
                to="/pedidos"
                className={linkClass}
                onClick={onNavigate}
              >
                <ClipboardList size={19} strokeWidth={1.9} aria-hidden="true" />
                <span>Pedidos</span>
              </NavLink>
            )}
          </>
        )}

        {/* Todos pueden consultar su propio perfil. */}
        <NavLink
          to="/perfil"
          className={linkClass}
          onClick={onNavigate}
        >
          <UserRound size={19} strokeWidth={1.9} aria-hidden="true" />
          <span>Mi perfil</span>
        </NavLink>
      </nav>

      {/* INFORMACIÓN DEL USUARIO Y CIERRE DE SESIÓN */}
      <SidebarUser
        userName={userName}
        username={username}
        roles={roles}
        onLogout={logout}
        logoutDisabled={logoutDisabled}
      />
    </aside>
  );
}
