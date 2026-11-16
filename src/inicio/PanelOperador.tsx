/**
 * ============================================================
 * PEDIDOS360 — PANEL DEL OPERADOR
 * Archivo: src/inicio/PanelOperador.tsx
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Muestra la cuenta activa, accesos al trabajo diario e indicadores
 * de pedidos calculados con la respuesta real de la API.
 *
 * ¿CON QUÉ SE CONECTA?
 * - usuarios/activeAccount.ts: identifica la cuenta activa.
 * - usuarios/useAuthorization.ts: consulta roles y permisos.
 * - api/useApi.ts: cliente HTTP de la cuenta.
 * - api/pedidosApi.ts: solicita los pedidos (GET /pedidos).
 *
 * ESTILOS:
 * Reutiliza la estructura visual del panel de administración. Las reglas
 * CSS de dashboard.css están escritas bajo .admin-dashboard, por eso el
 * contenedor lleva esa clase. Solo es un nombre de estilo: el rol y los
 * permisos siguen viniendo de Entra ID y de la API.
 *
 * SEGURIDAD:
 * La interfaz no ofrece edición de catálogo al Operador. Los permisos
 * reales se comprueban en API Gateway y en las Lambda.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { ArrowUpRight, Boxes, ClipboardList, Clock, Package, Truck } from 'lucide-react';

import { useApi } from '../api/useApi';
import { useAuthorization } from '../usuarios/useAuthorization';
import { apiErrorMessage } from '../api/clienteApi';
import { listarPedidos } from '../api/pedidosApi';
import { PageHeader } from '../interfaz/PageHeader';
import { ErrorState } from '../interfaz/ErrorState';
import { LoadingState } from '../interfaz/LoadingState';
import { resolveActiveAccount } from '../usuarios/activeAccount';

import avatarOperador from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_06.png';

interface IndicadoresOperador {
  total: number;
  porAtender: number;
  enPreparacion: number;
  despachados: number;
}

export function PanelOperador() {
  const { instance, accounts } = useMsal();
  const api = useApi();
  const authorization = useAuthorization();
  const account = resolveActiveAccount(instance, accounts);

  const [indicadores, setIndicadores] = useState<IndicadoresOperador | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Los indicadores salen de la API real. Solo se consultan cuando la
  // autorización ya terminó y existe un cliente HTTP utilizable.
  useEffect(() => {
    if (authorization.loading || authorization.error || !api) return;

    let activa = true;

    const consultar = async () => {
      try {
        const pedidos = await listarPedidos(api);
        if (!activa) return;
        setIndicadores({
          total: pedidos.length,
          porAtender: pedidos.filter((p) => p.estado === 'CREADO').length,
          enPreparacion: pedidos.filter((p) => p.estado === 'ACEPTADO' || p.estado === 'EN_PREPARACION').length,
          despachados: pedidos.filter((p) => p.estado === 'DESPACHADO').length,
        });
        setError(null);
      } catch (motivo) {
        if (!activa) return;
        setError(apiErrorMessage(motivo));
      }
    };

    void consultar();
    return () => {
      activa = false;
    };
  }, [api, authorization.loading, authorization.error]);

  return (
    <section className="page-stack dashboard-page admin-dashboard operador-dashboard">
      <PageHeader
        eyebrow="Operación"
        title="Panel de Operaciones"
        subtitle="Consulta el catálogo y gestiona los pedidos del día."
      />

      <div className="admin-top-grid">
        <section className="dashboard-welcome surface admin-session-card" aria-label="Sesión activa">
          <div className="dashboard-welcome-copy">
            <span className="admin-avatar-frame">
              <img className="admin-avatar-img" src={avatarOperador} alt="Avatar ilustrado de un gatito" />
            </span>
            <div className="admin-session-details">
              <p className="card-overline">SESIÓN ACTIVA</p>
              <h2>{account?.name ?? 'Cuenta Microsoft'}</h2>
              <p className="muted-copy">
                {account?.username ?? 'Usuario autenticado mediante Microsoft Entra ID'}
              </p>
            </div>
          </div>

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

        <section className="dashboard-shortcuts admin-quick-section" aria-labelledby="operator-shortcuts-heading">
          <div className="section-heading">
            <div>
              <p className="page-eyebrow">ACCESOS</p>
              <h2 id="operator-shortcuts-heading">Trabajo diario</h2>
            </div>
          </div>
          <div className="shortcut-grid">
            <Link to="/catalogo" className="shortcut-card">
              <span className="shortcut-icon" aria-hidden="true"><Boxes size={25} strokeWidth={1.9} /></span>
              <span className="shortcut-copy">
                <strong>Ver catálogo</strong>
                <small>Consulta de productos, precios y stock (solo lectura)</small>
              </span>
              <ArrowUpRight className="shortcut-arrow" size={18} aria-hidden="true" />
            </Link>

            <Link to="/pedidos" className="shortcut-card">
              <span className="shortcut-icon" aria-hidden="true"><ClipboardList size={25} strokeWidth={1.9} /></span>
              <span className="shortcut-copy">
                <strong>Gestionar pedidos</strong>
                <small>Aceptar, preparar y despachar pedidos</small>
              </span>
              <ArrowUpRight className="shortcut-arrow" size={18} aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section className="dashboard-shortcuts admin-stats-section" aria-labelledby="operator-stats-heading">
        <div className="section-heading">
          <div>
            <p className="page-eyebrow">INDICADORES</p>
            <h2 id="operator-stats-heading">Pedidos del día</h2>
          </div>
        </div>

        {authorization.loading ? (
          <LoadingState message="Verificando permisos…" />
        ) : authorization.error ? (
          <ErrorState message={authorization.error} />
        ) : !api ? (
          <ErrorState message="No fue posible preparar la conexión con la API." />
        ) : error ? (
          <ErrorState message={error} />
        ) : indicadores === null ? (
          <LoadingState message="Consultando pedidos…" />
        ) : (
          <div className="stat-grid">
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><ClipboardList size={25} /></span>
              <div className="stat-copy"><small>Pedidos totales</small><strong>{indicadores.total}</strong></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><Clock size={25} /></span>
              <div className="stat-copy"><small>Por aceptar</small><strong>{indicadores.porAtender}</strong></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><Package size={25} /></span>
              <div className="stat-copy"><small>En preparación</small><strong>{indicadores.enPreparacion}</strong></div>
            </div>
            <div className="stat-card">
              <span className="stat-icon" aria-hidden="true"><Truck size={25} /></span>
              <div className="stat-copy"><small>Despachados</small><strong>{indicadores.despachados}</strong></div>
            </div>
          </div>
        )}
      </section>

      <p className="security-note">
        El catálogo es de solo lectura para Operador: las opciones de crear,
        editar o eliminar no aparecen y el backend las rechaza con 403.
      </p>
    </section>
  );
}
