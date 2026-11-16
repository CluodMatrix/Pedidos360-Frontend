/**
 * ================================================================
 * PEDIDOS360 — PROTECCIÓN POR INICIO DE SESIÓN
 * Archivo: src/usuarios/RequireAuth.tsx
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Impide mostrar las rutas privadas cuando el usuario todavía
 * no ha iniciado sesión en Microsoft Entra ID.
 *
 * CONEXIONES:
 * - App.tsx: envuelve las rutas privadas en <RequireAuth />.
 * - usuarios/authConfig.ts: obtiene loginRequest.
 * - main.tsx: proporciona la instancia MSAL mediante MsalProvider.
 * - usuarios/RequireRole.tsx: después revisa los roles por ruta.
 *
 * AWS: NO llama directamente a AWS. Autenticarse (quién eres)
 * no equivale a autorizar una operación (qué puedes hacer).
 *
 * INGLÉS:
 * require = exigir; auth = autenticación;
 * redirect = redirección; loading = cargando; outlet = contenido hijo.
 */

// Outlet: espacio en React Router donde se muestra la ruta hija.
import { Outlet } from 'react-router-dom';

// MsalAuthenticationTemplate comprueba la sesión mediante MSAL.
import { MsalAuthenticationTemplate } from '@azure/msal-react';

// Redirect: Microsoft abre la pantalla de login si hace falta.
import { InteractionType } from '@azure/msal-browser';

import { loginRequest } from './authConfig';

/**
 * COMPONENTE: RequireAuth()
 *
 * App.tsx lo monta alrededor de las páginas protegidas.
 *
 * Si ya hay sesión: muestra <Outlet />.
 * Si falta sesión: MSAL inicia el flujo de redirección.
 * Si está verificando: enseña un indicador de carga.
 * Si falla: enseña un mensaje comprensible.
 *
 * NOTA: la autenticación no valida roles ni scopes; eso corresponde
 * a RequireRole y, para las solicitudes, a API Gateway/Lambda.
 */
export function RequireAuth() {
  return (
    <MsalAuthenticationTemplate
      interactionType={InteractionType.Redirect}
      authenticationRequest={loginRequest}

      // loadingComponent = lo que se muestra mientras MSAL comprueba sesión.
      loadingComponent={() => (
        <div className="state-panel" role="status">
          <span className="loading-indicator" aria-hidden="true" />
          <p>Comprobando tu sesión…</p>
        </div>
      )}

      // errorComponent = interfaz cuando MSAL no logra autenticar.
      // No mostramos tokens ni información sensible del error.
      errorComponent={() => (
        <div className="state-panel state-error" role="alert">
          <h2>No se pudo iniciar sesión</h2>
          <p>Comprueba tu conexión e inténtalo nuevamente.</p>
        </div>
      )}
    >
      {/* Página privada que React Router seleccionó para esta URL. */}
      <Outlet />
    </MsalAuthenticationTemplate>
  );
}
