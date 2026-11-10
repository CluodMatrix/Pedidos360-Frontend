/**
 * ============================================================
 * PEDIDOS360 — PANEL DEL OPERADOR
 * Archivo: src/inicio/PanelOperador.tsx
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Muestra la cuenta activa y accesos al trabajo diario:
 * consultar el catálogo y gestionar los estados de pedidos.
 *
 * CONEXIONES:
 * - App.tsx / RequireRole.tsx: protegen la ruta /operador.
 * - usuarios/activeAccount.ts: obtiene la cuenta seleccionada.
 * - usuarios/useAuthorization.ts: obtiene roles y estado.
 * - interfaz/PageHeader.tsx: encabezado compartido.
 * - /catalogo y /pedidos: páginas a las que navega.
 *
 * ¿SE CONECTA DIRECTAMENTE CON AWS?
 * NO. Este componente no utiliza useApi() ni fetch().
 * Las consultas se realizan después, desde las páginas
 * de catálogo y pedidos utilizando los servicios de API/.
 *
 * SEGURIDAD:
 * La interfaz no ofrece edición de catálogo al Operador.
 * Sin embargo, los permisos reales deben comprobarse en
 * API Gateway y en las funciones Lambda.
 */

// Link navega entre páginas de React Router sin recargar el sitio.
import { Link } from 'react-router-dom';

// Hook de MSAL para consultar las cuentas de Microsoft Entra ID.
import { useMsal } from '@azure/msal-react';

// Iconos reutilizables del paquete lucide-react.
import {
  ArrowUpRight,
  Boxes,
  ClipboardList,
  UserRound,
} from 'lucide-react';

// Hook de autorización, componente visual y selección de cuenta.
import { useAuthorization } from '../usuarios/useAuthorization';
import { PageHeader } from '../interfaz/PageHeader';
import { resolveActiveAccount } from '../usuarios/activeAccount';

/**
 * COMPONENTE: PanelOperador().
 *
 * Se muestra cuando se visita /operador con un rol permitido.
 * No recibe propiedades (props) y no guarda estado propio.
 */
export function PanelOperador() {
  /**
   * PASO 1 — Obtener la cuenta y los roles.
   *
   * useMsal(): entrega instance y accounts desde Microsoft.
   * useAuthorization(): consulta roles/scopes del token de API.
   * resolveActiveAccount(): selecciona la cuenta activa.
   *
   * Estas llamadas NO consultan catálogo ni pedidos.
   */
  const { instance, accounts } = useMsal();
  const authorization = useAuthorization();
  const account = resolveActiveAccount(instance, accounts);

  /**
   * PASO 2 — Mostrar la interfaz.
   *
   * JSX: sintaxis para representar elementos React.
   * className: nombre de una clase CSS (estilos visuales).
   */
  return (
    <section className="page-stack dashboard-page">
      {/* Título y subtítulo del panel. */}
      <PageHeader
        eyebrow="Operación"
        title="Panel de Operaciones"
        subtitle="Consulta el catálogo y gestiona los pedidos del día."
      />

      {/* Datos de sesión tomados de MSAL, no de DynamoDB. */}
      <section className="dashboard-welcome surface">
        <div className="dashboard-welcome-copy">
          <span className="dashboard-icon"><UserRound size={21} /></span>
          <div>
            <p className="card-overline">Sesión activa</p>
            <h2>{account?.name ?? 'Cuenta Microsoft'}</h2>
            <p className="muted-copy">
              {account?.username ?? 'Usuario autenticado mediante Microsoft Entra ID'}
            </p>
          </div>
        </div>

        {/*
         * roles.map(): recorre los roles y dibuja una etiqueta
         * para cada uno. Mientras se comprueban, mostramos
         * un mensaje para que la sección no parezca vacía.
         */}
        <div className="role-list" aria-label="Roles asignados">
          {authorization.loading ? (
            <span className="role-chip">Verificando roles…</span>
          ) : authorization.error ? (
            <span className="role-chip" role="status">No se pudieron comprobar los roles</span>
          ) : (
            authorization.roles.map((role) => (
              <span className="role-chip" key={role}>{role}</span>
            ))
          )}
        </div>
      </section>

      {/*
       * SHORTCUTS = accesos directos.
       * Estas tarjetas son enlaces: no ejecutan operaciones
       * de escritura ni llamadas AWS en este componente.
       */}
      <section className="dashboard-shortcuts" aria-labelledby="operator-shortcuts-heading">
        <div className="section-heading">
          <div>
            <p className="page-eyebrow">ACCESOS</p>
            <h2 id="operator-shortcuts-heading">Trabajo diario</h2>
          </div>
        </div>

        <div className="shortcut-grid">
          {/* Ir a /catalogo: consulta productos en la página de destino. */}
          <Link to="/catalogo" className="shortcut-card">
            <span className="shortcut-icon"><Boxes size={20} strokeWidth={1.8} /></span>
            <span className="shortcut-copy">
              <strong>Ver catálogo</strong>
              <small>Consulta de productos, precios y stock (solo lectura)</small>
            </span>
            <ArrowUpRight className="shortcut-arrow" size={17} />
          </Link>

          {/* Ir a /pedidos: allí se consultan y actualizan pedidos. */}
          <Link to="/pedidos" className="shortcut-card">
            <span className="shortcut-icon"><ClipboardList size={20} strokeWidth={1.8} /></span>
            <span className="shortcut-copy">
              <strong>Gestionar pedidos</strong>
              <small>Aceptar, preparar y despachar pedidos</small>
            </span>
            <ArrowUpRight className="shortcut-arrow" size={17} />
          </Link>
        </div>
      </section>

      {/*
       * Mensaje informativo: la API y Lambda siguen siendo
       * responsables de rechazar operaciones no autorizadas.
       */}
      <p className="security-note">
        El catálogo es de solo lectura para Operador: las opciones de crear,
        editar o eliminar no aparecen y el backend las rechaza con 403.
      </p>
    </section>
  );
}
