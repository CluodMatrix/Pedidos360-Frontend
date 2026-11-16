// src/api/client.ts
// Cliente HTTP reutilizable para el backend protegido por API Gateway + JWT authorizer.
// Se encarga de: obtener el access token de Entra (aud = tu API), inyectar el
// header Authorization, y normalizar errores. Añade rutas nuevas en archivos
// hermanos (p.ej. src/api/xxxx.ts) usando este cliente.

import type { IPublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { apiConfig, apiRequest } from '../usuarios/authConfig';
import { decodeJwt, rolesOf, scopesOf } from '../usuarios/jwt';

interface ApiTokenClaims {
  aud: string | string[] | null;
  iss: string | null;
  scp: string[];
  roles: string[];
}

export class ApiError extends Error {
  status: number;
  statusText: string;
  body: unknown;
  url: string | null;
  method: string;
  tokenClaims: ApiTokenClaims | null;

  constructor(status: number, statusText: string, body: unknown, url: string | null = null, method = 'GET', tokenClaims: ApiTokenClaims | null = null) {
    super(status === 0 ? 'No fue posible conectar con el backend.' : `Error de servicio (${status}).`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.url = url;
    this.method = method;
    this.tokenClaims = tokenClaims;
  }
}

export class ApiNotConfiguredError extends Error {
  constructor() {
    super('El backend aún no está configurado.');
    this.name = 'ApiNotConfiguredError';
  }
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiNotConfiguredError) {
    return error.message;
  }

  if (error instanceof ApiError) {
    if (error.status === 0) return 'No se pudo conectar con el backend. Inténtalo nuevamente más tarde.';
    if (error.status === 401) return 'La sesión no pudo autorizar esta solicitud. Inicia sesión nuevamente.';
    if (error.status === 403) return 'Tu cuenta no tiene permiso para realizar esta acción.';
    if (error.status === 404) return 'No se encontró la información solicitada.';
    if (error.status === 400) return 'La solicitud contiene datos inválidos. Revisa la información e inténtalo nuevamente.';
    if (error.status === 409) return 'La operación entra en conflicto con el estado o las reglas del negocio.';
    if (error.status >= 500) return 'El servicio presenta un problema temporal. Inténtalo más tarde.';
    return 'No se pudo completar la solicitud.';
  }

  return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
}

export function apiErrorDetails(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  return JSON.stringify({
    request: { method: error.method, endpoint: error.url },
    status: error.status,
    statusText: error.statusText,
    tokenClaims: error.tokenClaims,
    response: error.body,
  }, null, 2);
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Solicitud de token en curso, compartida por toda la aplicación.
//
// Al abrir una pantalla protegida piden el token varias piezas a la vez:
// el guard de rol (RequireRole), `useAuthorization` y la propia página.
// Si cada una lanza su propio `acquireTokenSilent` compiten por la misma
// caché: solo una consigue cerrar el ciclo, las demás fallan y la vista
// se queda vacía sin datos. Se comparte una única promesa por cuenta.
let pendingApiToken: { key: string; promise: Promise<string> } | null = null;

// Marca que en esta carga de página ya se abrió una redirección a Microsoft.
// El módulo se reinicia en cada recarga, así que no queda pegado: solo
// evita que varias piezas abran la redirección a la vez.
let redirectStarted = false;

/**
 * Obtiene un access token para el backend (aud = tu API).
 * - Intenta silenciosamente (acquireTokenSilent â†’ caché de MSAL).
 * - Si el intento silencioso falla por CUALQUIER motivo (token no
 *   cacheado, iframe bloqueado por cookies de terceros, timeout,
 *   consentimiento nuevo) se pide el token de forma interactiva.
 *   Limitarlo a `InteractionRequiredAuthError` dejaba la aplicación sin
 *   token y sin explicación: los guards caían en "acceso denegado" y las
 *   pantallas no cargaban nada.
 * - El redirect no vuelve en esta misma llamada: navega a Microsoft y la
 *   respuesta llega al volver a la app, donde el token ya está en caché.
 */
export async function acquireApiToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
): Promise<string> {
  const key = account.homeAccountId;
  if (pendingApiToken?.key === key) {
    return pendingApiToken.promise;
  }

  const promise = (async () => {
    try {
      const result = await instance.acquireTokenSilent({ ...apiRequest, account });
      return result.accessToken;
    } catch (error) {
      // Varias piezas fallan a la vez: solo una debe abrir la redirección.
      if (!redirectStarted) {
        redirectStarted = true;
        void instance.acquireTokenRedirect({ ...apiRequest, account }).catch(() => {
          redirectStarted = false;
          console.error('No se pudo abrir Microsoft para autorizar el acceso a la API.');
        });
      }
      throw error;
    }
  })();

  pendingApiToken = { key, promise };
  try {
    return await promise;
  } finally {
    if (pendingApiToken?.promise === promise) {
      pendingApiToken = null;
    }
  }
}

export interface ApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

export function createApiClient(
  instance: IPublicClientApplication,
  account: AccountInfo,
): ApiClient {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (!apiConfig.baseUrl) {
      throw new ApiNotConfiguredError();
    }
    if (apiConfig.scopes.length === 0) {
      throw new Error('VITE_API_SCOPE no está configurado en .env');
    }

    const token = await acquireApiToken(instance, account);
    const url = `${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
    const method = (init.method ?? 'GET').toUpperCase();
    const claims = decodeJwt(token);
    const tokenClaims: ApiTokenClaims | null = claims ? {
      aud: claims.aud ?? null,
      iss: claims.iss ?? null,
      scp: scopesOf(claims),
      roles: rolesOf(claims),
    } : null;

    const headers = new Headers(init.headers);
    if (!headers.has('Accept')) headers.set('Accept', 'application/json');
    if (init.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    headers.set('Authorization', `Bearer ${token}`);

    let response: Response;
    try {
      response = await fetch(url, { ...init, headers });
    } catch {
      throw new ApiError(0, 'Network Error', null, url, method, tokenClaims);
    }

    const text = await response.text();
    const body = text ? safeJson(text) : null;

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, body, url, method, tokenClaims);
    }
    return body as T;
  }

  return {
    request,
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
    put: <T>(path: string, body: unknown) =>
      request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  };
}
