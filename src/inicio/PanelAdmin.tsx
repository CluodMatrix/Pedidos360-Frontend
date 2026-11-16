/**
 * ============================================================
 * PEDIDOS360 — PANEL DE ADMINISTRACIÓN
 * Archivo: src/inicio/PanelAdmin.tsx
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Muestra los datos de la cuenta, accesos rápidos y cuatro
 * indicadores calculados con información real del backend.
 *
 * ¿CON QUÉ SE CONECTA?
 * - usuarios/activeAccount.ts: identifica la cuenta activa.
 * - usuarios/useAuthorization.ts: consulta roles y permisos.
 * - API/useApi.ts: entrega el cliente HTTP de esa cuenta.
 * - API/catalogoApi.ts: solicita los productos.
 * - API/pedidosApi.ts: solicita los pedidos.
 * - interfaz/: muestra encabezados, estados y mensajes.
 * - usuarios/TokenInspector.tsx: diagnóstico en desarrollo.
 *
 * RECORRIDO HASTA AWS:
 * PanelAdmin -> catalogoApi / pedidosApi -> clienteApi
 * -> API Gateway -> Lambda -> DynamoDB.
 *
 * IMPORTANTE:
 * Este componente no consulta DynamoDB directamente ni
 * contiene números inventados: los indicadores se calculan
 * a partir de las respuestas de la API.
 */

// Hooks de React: ejecutan efectos y conservan datos de la pantalla.
import { useEffect, useState } from 'react';

// Link permite navegar sin recargar toda la aplicación.
import { Link } from 'react-router-dom';

// Acceso a la sesión de Microsoft Entra ID.
import { useMsal } from '@azure/msal-react';

// Iconos de la interfaz (Lucide).
import {
  ArrowUpRight,
  Boxes,
  ClipboardList,
  PackageOpen,
  ShoppingCart,
} from 'lucide-react';

// Conexiones con API y autorización.
import { useApi } from '../API/useApi';
import { useAuthorization } from '../usuarios/useAuthorization';
import { apiErrorMessage } from '../API/clienteApi';
import { listarCatalogo } from '../API/catalogoApi';
import { listarPedidos } from '../API/pedidosApi';

// Componentes compartidos y utilidades de la cuenta.
import { PageHeader } from '../interfaz/PageHeader';
import { ErrorState } from '../interfaz/ErrorState';
import { LoadingState } from '../interfaz/LoadingState';
import { TokenInspector } from '../usuarios/TokenInspector';
import { resolveActiveAccount } from '../usuarios/activeAccount';

// Cuatro imágenes existentes de gatitos. Puedes cambiar esta lista más adelante
// cuando implementemos un selector de avatares en usuarios/Perfil.tsx.
import gatoNegro from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_20.png';
import gatoCaja from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_42.png';
import gatoNaranja from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_53.png';
import gatoOficina from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_06.png';

/** Imágenes candidatas para el avatar del panel (no se consultan desde AWS). */
const AVATARES_GATOS = [gatoNegro, gatoCaja, gatoNaranja, gatoOficina];

/**
 * INTERFAZ: AdminStats (estadísticas del administrador).
 *
 * Define los cuatro contadores mostrados en la pantalla.
 * - productos: cantidad de productos registrados.
 * - agotados: productos cuyo stock es exactamente cero.
 * - pedidos: cantidad total de pedidos devueltos por la API.
 * - pendientes: pedidos con estado CREADO.
 *
 * La cifra «pendientes» NO incluye otros estados, como
 * ACEPTADO o EN_PREPARACION. Si cambiamos esta definición,
 * también tendremos que revisar el texto de la tarjeta.
 */
interface AdminStats {
  productos: number;
  agotados: number;
  pedidos: number;
  pendientes: number;
}

/**
 * INTERFAZ: ResultadoIndicadores.
 *
 * Almacena el resultado de una consulta junto con su clave.
 * Esta clave impide mostrar estadísticas de una cuenta anterior
 * mientras se está consultando la cuenta nueva.
 */
interface ResultadoIndicadores {
  clave: string;
  stats: AdminStats | null;
  error: string | null;
}

/**
 * COMPONENTE: PanelAdmin().
 *
 * React ejecuta este componente para dibujar /admin.
 * App.tsx y RequireRole deben proteger esa ruta con rol Admin.
 * La seguridad de las operaciones reales sigue en AWS.
 */
export function PanelAdmin() {
  /**
   * PASO 1 — Identificar al usuario y preparar la API.
   *
   * instance / accounts: instancia y cuentas conocidas por MSAL.
   * api: cliente HTTP, o null si no existe una cuenta utilizable.
   * authorization: roles, scopes y estado de su comprobación.
   * account: cuenta seleccionada por activeAccount.ts.
   */
  const { instance, accounts } = useMsal();
  const api = useApi();
  const authorization = useAuthorization();
  const account = resolveActiveAccount(instance, accounts);

  /**
   * PASO 2 — Estados de React.
   *
   * useState conserva información entre renderizados.
   * revision aumenta cuando la persona solicita «Reintentar».
   * resultado guarda las estadísticas o el error recibido.
   */
  const [revision, setRevision] = useState(0);
  const [resultado, setResultado] = useState<ResultadoIndicadores | null>(null);

  /**
   * AVATAR ALEATORIO, PERO ESTÁTICO.
   * useState con una función inicializadora elige una imagen solo al montar
   * este panel. No cambia en cada render, no tiene animación y no usa AWS.
   * Más adelante se podrá sustituir por la preferencia guardada en Perfil.
   */
  const [avatarGato] = useState<string>(() =>
    AVATARES_GATOS[Math.floor(Math.random() * AVATARES_GATOS.length)],
  );

  /**
   * La clave combina la cuenta y el número de revisión.
   * Cuando cambia cualquiera de ambos, un resultado anterior
   * deja de ser válido para lo que se muestra en pantalla.
   */
  const claveConsulta = `${account?.homeAccountId ?? 'sin-cuenta'}:${revision}`;
  const resultadoActual = resultado?.clave === claveConsulta ? resultado : null;

  /**
   * PASO 3 — Consultar estadísticas.
   *
   * useEffect ejecuta esta operación cuando la autenticación
   * está lista, cambia el cliente API o se pulsa «Reintentar».
   *
   * Promise.all(): ejecuta ambas consultas en paralelo.
   * Espera a que terminen las dos antes de calcular los datos.
   * Si una falla, se presenta un error en lugar de cifras
   * aparentemente completas pero incorrectas.
   *
   * CONEXIÓN AWS:
   * - listarCatalogo(api) -> GET /catalogo -> Lambda catálogo.
   * - listarPedidos(api) -> GET /pedidos -> Lambda pedidos.
   * Ambas Lambda consultan DynamoDB según su implementación.
   */
  useEffect(() => {
    // No consultamos AWS mientras se verifican los permisos
    // o mientras falta el cliente HTTP.
    if (authorization.loading || authorization.error || !api) return;

    // Evita guardar el resultado de una petición obsoleta.
    let activa = true;

    /**
     * FUNCIÓN INTERNA: consultarIndicadores().
     *
     * Obtiene productos y pedidos, calcula los contadores y
     * guarda el resultado de la consulta actual.
     */
    const consultarIndicadores = async () => {
      try {
        const [productos, pedidos] = await Promise.all([
          listarCatalogo(api),
          listarPedidos(api),
        ]);

        if (!activa) return;

        setResultado({
          clave: claveConsulta,
          stats: {
            productos: productos.length,
            // filter(): deja únicamente los productos sin stock.
            agotados: productos.filter((producto) => producto.stock === 0).length,
            pedidos: pedidos.length,
            // Aquí «por atender» significa exclusivamente CREADO.
            pendientes: pedidos.filter((pedido) => pedido.estado === 'CREADO').length,
          },
          error: null,
        });
      } catch (motivo) {
        if (!activa) return;

        // Convertimos errores HTTP en mensajes comprensibles.
        setResultado({
          clave: claveConsulta,
          stats: null,
          error: apiErrorMessage(motivo),
        });
      }
    };

    void consultarIndicadores();

    // CLEANUP = limpieza: ignora respuestas de una consulta anterior.
    return () => {
      activa = false;
    };
  }, [api, authorization.loading, authorization.error, claveConsulta]);

  /**
   * FUNCIÓN: reintentar().
   *
   * Se entrega al botón de ErrorState.
   * Al aumentar revision, React vuelve a ejecutar el efecto
   * y consulta los datos otra vez. No duplica la lógica HTTP.
   */
  function reintentar() {
    setRevision((anterior) => anterior + 1);
  }

  /**
   * PASO 4 — Dibujar la interfaz (JSX).
   *
   * «admin-dashboard» separa los estilos del administrador de las páginas
   * del Cliente. No cambia rutas, permisos ni conexiones con AWS.
   *
   * ESTRUCTURA:
   * 1) PageHeader: título de la página.
   * 2) admin-top-grid: sesión a la izquierda y accesos a la derecha.
   * 3) admin-stats-section: cuatro contadores reales.
   * 4) token-surface: herramientas de diagnóstico solo en desarrollo.
   */
  return (
    <section className="page-stack dashboard-page admin-dashboard">
      {/* El componente PageHeader también se usa en otras secciones. */}
      <PageHeader
        eyebrow="Administración"
        title="Panel de Administración"
        subtitle="Resumen de la operación con datos provenientes de la API."
      />

      {/* GRID = cuadrícula. Esta fila comparte el espacio en dos columnas. */}
      <div className="admin-top-grid">
        {/* DATOS DE LA CUENTA: MSAL, no DynamoDB. */}
        <section className="dashboard-welcome surface admin-session-card" aria-label="Sesión activa">
          <div className="dashboard-welcome-copy">
            {/* AVATAR: un gatito seleccionado al abrir esta pantalla. */}
            <span className="admin-avatar-frame">
              <img className="admin-avatar-img" src={avatarGato} alt="Avatar ilustrado de un gatito" />
            </span>
            <div className="admin-session-details">
              <p className="card-overline">SESIÓN ACTIVA</p>
              <h2>{account?.name ?? 'Cuenta Microsoft'}</h2>
              <p className="muted-copy">
                {account?.username ?? 'Usuario autenticado mediante Microsoft Entra ID'}
              </p>
            </div>
          </div>

          {/* Roles obtenidos del token de acceso mediante useAuthorization(). */}
          <div className="role-list" aria-label="Roles asignados">
            {authorization.loading ? (
              <span className="role-chip">Verificando rol…</span>
            ) : (
              authorization.roles.map((role) => (
                <span className="role-chip" key={role}>{role}</span>
              ))
            )}
          </div>
        </section>

        {/* ACCESOS RÁPIDOS: Link solo cambia la página dentro de React Router.
            Las páginas de destino llaman a AWS si tienen los permisos. */}
        <section className="dashboard-shortcuts admin-quick-section" aria-labelledby="admin-shortcuts-heading">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">ACCESOS</p>
              <h2 id="admin-shortcuts-heading">Gestión rápida</h2>
            </div>
          </div>
          <div className="shortcut-grid">
            <Link to="/catalogo" className="shortcut-card">
              <span className="shortcut-icon" aria-hidden="true"><Boxes size={25} strokeWidth={1.9} /></span>
              <span className="shortcut-copy">
                <strong>Gestionar catálogo</strong>
                <small>Crear, editar y eliminar productos</small>
              </span>
              <ArrowUpRight className="shortcut-arrow" size={18} aria-hidden="true" />
            </Link>

            <Link to="/pedidos" className="shortcut-card">
              <span className="shortcut-icon" aria-hidden="true"><ClipboardList size={25} strokeWidth={1.9} /></span>
              <span className="shortcut-copy">
                <strong>Gestionar pedidos</strong>
                <small>Cambiar estados y dar seguimiento</small>
              </span>
              <ArrowUpRight className="shortcut-arrow" size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      {/* INDICADORES: permanecen conectados a la API real.
          Los valores NO son los números decorativos de una referencia visual. */}
      <section className="dashboard-shortcuts admin-stats-section" aria-labelledby="admin-stats-heading">
        <div className="section-heading">
          <div>
            <p className="page-eyebrow">INDICADORES</p>
            <h2 id="admin-stats-heading">Estado del negocio</h2>
          </div>
        </div>

        {authorization.loading ? (
          <LoadingState message="Verificando permisos…" />
        ) : authorization.error ? (
          <ErrorState message={authorization.error} />
        ) : !api ? (
          <ErrorState message="No fue posible preparar la conexión con la API." />
        ) : resultadoActual?.error ? (
          <ErrorState message={resultadoActual.error} onRetry={reintentar} />
        ) : resultadoActual?.stats == null ? (
          <LoadingState message="Consultando catálogo y pedidos…" />
        ) : (
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><Boxes size={25} /></span>
              <div className="stat-copy"><small>Productos</small><strong>{resultadoActual.stats.productos}</strong></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><PackageOpen size={25} /></span>
              <div className="stat-copy"><small>Sin stock</small><strong>{resultadoActual.stats.agotados}</strong></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><ShoppingCart size={25} /></span>
              <div className="stat-copy"><small>Pedidos totales</small><strong>{resultadoActual.stats.pedidos}</strong></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><ClipboardList size={25} /></span>
              <div className="stat-copy"><small>Pedidos por atender</small><strong>{resultadoActual.stats.pendientes}</strong></div>
            </div>
          </div>
        )}
      </section>

      {/*
       * TOKEN = credencial de acceso de Microsoft.
       * TokenInspector sirve únicamente para estudiar y diagnosticar.
       * Ocupamos todo el ancho disponible, pero no mostramos el token
       * completo aquí. Importante: no publicarlo en capturas ni repositorios.
       */}
      {import.meta.env.DEV && (
        <section className="surface token-surface admin-token-section" aria-label="Diagnóstico de permisos">
          <TokenInspector />
        </section>
      )}
    </section>
  );
}
