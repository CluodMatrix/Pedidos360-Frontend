/**
 * ============================================================
 * PEDIDOS360 — AUTORIZACIÓN DEL USUARIO
 * Archivo: src/usuarios/useAuthorization.ts
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Obtiene el access token de la cuenta activa y lee los roles y
 * permisos (scopes) que Microsoft Entra incluyó en ese token.
 *
 * CONEXIONES:
 * - usuarios/activeAccount.ts: identifica la cuenta activa.
 * - API/clienteApi.ts: acquireApiToken() obtiene el access token.
 * - usuarios/jwt.ts: interpreta roles y scopes del token.
 * - PanelAdmin, Catalogo, Pedidos, AppShell, etc.: usan este hook.
 *
 * NO consulta directamente AWS; otras funciones envían el token
 * al API Gateway. Leer un JWT aquí no valida su firma:
 * la autorización real corresponde al backend.
 *
 * VOCABULARIO:
 * hook = función reutilizable de React;
 * snapshot = resultado guardado;
 * scope = permiso; loading = cargando;
 * claim = dato incluido en un JWT.
 */

import { useCallback, useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';

import { acquireApiToken } from '../API/clienteApi';
import { decodeJwt, rolesOf, scopesOf } from './jwt';
import { resolveActiveAccount } from './activeAccount';

/** Información que guardamos después de consultar los permisos. */
interface AuthorizationSnapshot {
  accountKey: string;
  roles: string[];
  scopes: string[];
  error: string | null;
}

// Evitamos crear arreglos vacíos nuevos en cada renderizado.
const ROLES_VACIOS: string[] = [];
const SCOPES_VACIOS: string[] = [];

/**
 * HOOK: useAuthorization()
 *
 * Ejemplo de uso:
 *   const authorization = useAuthorization();
 *   const puedeLeer = authorization.hasScope('catalog.read');
 *
 * DEVUELVE:
 * roles, scopes, loading, error, hasRole() y hasScope().
 */
export function useAuthorization() {
  // Obtiene MSAL y las cuentas que conoce Microsoft.
  const { instance, accounts } = useMsal();

  // Selecciona la cuenta activa sin elegir otra arbitrariamente.
  const account = resolveActiveAccount(instance, accounts);
  const homeAccountId = account?.homeAccountId ?? '';
  const tenantId = account?.tenantId ?? '';

  // Identificador único para separar resultados entre cuentas/tenants.
  const accountKey = homeAccountId ? `${homeAccountId}:${tenantId}` : '';

  // Resultado de la última consulta de permisos.
  const [snapshot, setSnapshot] = useState<AuthorizationSnapshot | null>(null);

  // Nunca mostramos permisos guardados de otra cuenta.
  const currentSnapshot = snapshot?.accountKey === accountKey ? snapshot : null;

  /**
   * EFECTO: obtener permisos al iniciar sesión o cambiar de cuenta.
   *
   * 1. Busca la cuenta en la caché de Microsoft.
   * 2. Pide su token con acquireApiToken().
   * 3. Decodifica el token y extrae roles/scopes.
   * 4. Guarda el resultado para que las pantallas lo utilicen.
   *
   * La variable vigente evita guardar resultados de una solicitud
   * antigua cuando el componente se desmonta o cambia la cuenta.
   */
  useEffect(() => {
    if (!accountKey) return;

    let vigente = true;

    async function obtenerPermisos() {
      try {
        // Esta búsqueda puede devolver null: comprobamos el resultado.
        const cuenta = instance.getAccount({ homeAccountId, tenantId });
        if (!cuenta) {
          throw new Error('La cuenta activa no está en la caché de MSAL.');
        }

        // Solicita un access token para la API (puede reutilizar caché).
        const token = await acquireApiToken(instance, cuenta);
        const claims = decodeJwt(token);

        // decodeJwt() devuelve null si no reconoce el formato.
        if (!claims) {
          throw new Error('El token no tiene un formato JWT reconocible.');
        }

        if (!vigente) return;

        // Guarda solo permisos, nunca el token completo.
        setSnapshot({
          accountKey,
          roles: rolesOf(claims),
          scopes: scopesOf(claims),
          error: null,
        });
      } catch {
        if (!vigente) return;

        // Si la consulta falla, no concedemos permisos por defecto.
        setSnapshot({
          accountKey,
          roles: [],
          scopes: [],
          error: 'No fue posible comprobar los permisos de la cuenta.',
        });
      }
    }

    // Inicia la consulta asincrónica sin bloquear el renderizado.
    void obtenerPermisos();

    // Limpieza: descarta las respuestas que lleguen demasiado tarde.
    return () => {
      vigente = false;
    };
  }, [accountKey, homeAccountId, instance, tenantId]);

  // Solo se usan los permisos de la cuenta actual.
  const roles = currentSnapshot?.roles ?? ROLES_VACIOS;
  const scopes = currentSnapshot?.scopes ?? SCOPES_VACIOS;

  /** Indica si el token declara un rol, por ejemplo 'Admin'. */
  const hasRole = useCallback(
    (role: string) => roles.includes(role),
    [roles],
  );

  /** Indica si el token declara un scope, como 'orders.read'. */
  const hasScope = useCallback(
    (scope: string) => scopes.includes(scope),
    [scopes],
  );

  return {
    roles,
    scopes,
    // Sin cuenta activa no esperamos un token indefinidamente.
    loading: Boolean(accountKey && !currentSnapshot),
    error: currentSnapshot?.error ?? null,
    hasRole,
    hasScope,
  };
}
