/**
 * ================================================================
 * PEDIDOS360 — PÁGINA «MI PERFIL»
 * Archivo: src/usuarios/Perfil.tsx
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Muestra nombre, correo, roles y scopes de la cuenta Microsoft.
 * En DESARROLLO, también presenta un diagnóstico básico del JWT.
 *
 * CONEXIONES:
 * - Microsoft MSAL: obtiene la cuenta con useMsal().
 * - usuarios/activeAccount.ts: identifica la cuenta activa.
 * - usuarios/useAuthorization.ts: roles y scopes del usuario.
 * - API/clienteApi.ts: acquireApiToken() obtiene el token de Entra.
 * - usuarios/jwt.ts: decodeJwt() lee claims, sin validarlos.
 * - interfaz/PageHeader.tsx: dibuja el título.
 *
 * AWS: NO consulta una Lambda ni DynamoDB directamente.
 * Solicita a Microsoft un token dirigido a la API que, cuando
 * otra pantalla hace fetch(), API Gateway podrá verificar.
 *
 * INGLÉS:
 * profile = perfil; claim = dato del token; loading = cargando;
 * access token = token de acceso; snapshot = resultado guardado.
 */

import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { acquireApiToken, apiErrorMessage } from '../API/clienteApi';
import { useAuthorization } from './useAuthorization';
import { PageHeader } from '../interfaz/PageHeader';
import { decodeJwt, type JwtClaims } from './jwt';
import { resolveActiveAccount } from './activeAccount';

/**
 * INTERFAZ: DiagnosticoToken
 *
 * Asocia los claims a una cuenta concreta.
 * Así evitamos enseñar información de un usuario anterior si se
 * cambia de cuenta antes de que termine una solicitud asíncrona.
 */
interface DiagnosticoToken {
  accountKey: string;
  claims: JwtClaims | null;
  error: string | null;
}

/**
 * COMPONENTE: Perfil()
 *
 * React lo muestra en la ruta /perfil, definida en App.tsx.
 * No modifica la cuenta ni concede permisos.
 */
export function Perfil() {
  // useMsal: permite consultar la sesión de Microsoft Entra ID.
  const { instance, accounts } = useMsal();

  // Este hook obtiene roles/scopes desde el access token de la API.
  const authorization = useAuthorization();

  // Seleccionamos la cuenta activa y obtenemos su identificador.
  const cuentaActiva = resolveActiveAccount(instance, accounts);
  const accountKey = cuentaActiva?.homeAccountId ?? '';

  // Almacena exclusivamente claims para diagnóstico (no el token completo).
  const [diagnostico, setDiagnostico] = useState<DiagnosticoToken | null>(null);

  // Evita mostrar claims almacenados de una cuenta distinta.
  const actual = diagnostico?.accountKey === accountKey ? diagnostico : null;
  const loading = Boolean(accountKey && !actual);
  const claims = actual?.claims ?? null;
  const error = actual?.error ?? null;

  /**
   * EFECTO: lectura de claims SOLO durante desarrollo.
   *
   * useEffect se ejecuta al cambiar la cuenta o la instancia de MSAL.
   * active = bandera que evita actualizar estado después de desmontar
   * el componente o cambiar de cuenta.
   *
   * acquireApiToken puede abrir login interactivo si MSAL no logra
   * obtener un token silenciosamente (lógica de clienteApi.ts).
   */
  useEffect(() => {
    // En producción no solicitamos el token solo para mostrar diagnóstico.
    if (!import.meta.env.DEV || !accountKey) return;

    let active = true;
    const tokenAccount = instance.getAccount({ homeAccountId: accountKey });

    if (!tokenAccount) {
      setDiagnostico({
        accountKey,
        claims: null,
        error: 'No se encontró la cuenta activa en Microsoft.',
      });
      return;
    }

    void acquireApiToken(instance, tokenAccount)
      .then((token) => {
        if (!active) return;

        // Solo lee el payload del JWT: no verifica firmas ni permisos.
        const claimsLeidos = decodeJwt(token);
        if (!claimsLeidos) {
          setDiagnostico({
            accountKey,
            claims: null,
            error: 'No fue posible interpretar el access token.',
          });
          return;
        }

        setDiagnostico({ accountKey, claims: claimsLeidos, error: null });
      })
      .catch((reason: unknown) => {
        if (active) {
          setDiagnostico({
            accountKey,
            claims: null,
            error: apiErrorMessage(reason),
          });
        }
      });

    // Cleanup = limpieza: invalida la solicitud si cambia la cuenta.
    return () => {
      active = false;
    };
  }, [accountKey, instance]);

  // Recuperamos datos públicos de la cuenta, como nombre y correo.
  const account = accountKey
    ? instance.getAccount({ homeAccountId: accountKey })
    : null;

  return (
    <section className="page-stack">
      {/* Encabezado reutilizable de las páginas de Pedidos360. */}
      <PageHeader
        eyebrow="Cuenta"
        title="Mi perfil"
        subtitle="Información de tu sesión de Microsoft Entra ID."
      />

      {/* Información visible al usuario: NO consulta directamente AWS. */}
      <section className="surface profile-panel" aria-labelledby="profile-account-heading">
        <div className="profile-heading">
          <span className="profile-avatar" aria-hidden="true">
            {account?.name?.trim().charAt(0).toUpperCase() || 'M'}
          </span>
          <div>
            <h2 id="profile-account-heading">
              {account?.name ?? 'Cuenta autenticada'}
            </h2>
            <p className="muted-copy">
              {account?.username ?? 'Correo o usuario no disponible'}
            </p>
          </div>
        </div>

        {/* dl = lista descriptiva; dt = término; dd = descripción. */}
        <dl className="profile-details">
          <div>
            <dt>Nombre</dt>
            <dd>{account?.name ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt>Correo o usuario</dt>
            <dd>{account?.username ?? 'No disponible'}</dd>
          </div>
          <div>
            <dt>Rol</dt>
            <dd>
              {authorization.loading
                ? 'Consultando…'
                : authorization.roles.join(', ') || 'Sin roles asignados'}
            </dd>
          </div>
          <div>
            <dt>Scopes de la API</dt>
            <dd>
              {authorization.loading
                ? 'Consultando…'
                : authorization.scopes.join(', ') || 'Sin scopes disponibles'}
            </dd>
          </div>
        </dl>

        {!account && (
          <p className="inline-error" role="status">
            No hay una cuenta activa seleccionada.
          </p>
        )}
        {authorization.error && (
          <p className="inline-error" role="alert">{authorization.error}</p>
        )}
      </section>

      {/* DEV = modo de desarrollo de Vite; ocultamos diagnóstico en producción. */}
      {import.meta.env.DEV && (
        <section className="surface profile-claims" aria-labelledby="profile-claims-heading">
          <h2 id="profile-claims-heading">Diagnóstico de sesión</h2>

          {loading && (
            <p className="muted-copy" role="status">
              Consultando claims del access token…
            </p>
          )}
          {!accountKey && (
            <p className="muted-copy">Selecciona una cuenta para consultar su token.</p>
          )}
          {error && <p className="inline-error" role="alert">{error}</p>}

          {!loading && !error && claims && (
            <dl className="profile-details profile-details-compact">
              {/* aud = audiencia; debe corresponder a Pedidos360-API. */}
              <div>
                <dt>aud</dt>
                <dd>
                  {Array.isArray(claims.aud)
                    ? claims.aud.join(', ')
                    : claims.aud ?? 'No disponible'}
                </dd>
              </div>
              {/* iss = autoridad que emitió el token. */}
              <div>
                <dt>iss</dt>
                <dd>{claims.iss ?? 'No disponible'}</dd>
              </div>
              {/* exp se mide en segundos Unix; JavaScript usa milisegundos. */}
              <div>
                <dt>exp</dt>
                <dd>
                  {typeof claims.exp === 'number'
                    ? new Date(claims.exp * 1000).toLocaleString('es-CL')
                    : 'No disponible'}
                </dd>
              </div>
            </dl>
          )}
        </section>
      )}
    </section>
  );
}
