
/**
 * ============================================================
 * PEDIDOS360 — CLIENTE PRINCIPAL HTTP
 * Archivo: src/API/clienteApi.ts
 * ============================================================
 *
 * ¿PARA QUÉ SIRVE?
 * Centraliza la comunicación entre React y AWS API Gateway.
 *
 * RESPONSABILIDADES:
 * 1. Solicitar tokens de acceso a Microsoft Entra ID.
 * 2. Adjuntar el token JWT a cada solicitud HTTP.
 * 3. Enviar solicitudes mediante fetch().
 * 4. Recibir respuestas del backend.
 * 5. Transformar errores en mensajes comprensibles.
 *
 * CONEXIONES:
 * - usuarios/authConfig.ts: URL de API y scopes.
 * - usuarios/jwt.ts: lectura de claims.
 * - API/catalogoApi.ts: operaciones de productos.
 * - API/pedidosApi.ts: operaciones de pedidos.
 * - API/useApi.ts: crea el cliente para la cuenta activa.
 *
 * SERVICIOS EXTERNOS:
 * - Microsoft Entra ID: proporciona los tokens.
 * - AWS API Gateway: recibe las solicitudes HTTP.
 *
 * NOTA:
 * Este archivo no llama directamente a DynamoDB.
 * API Gateway dirige cada solicitud a su Lambda.
 */

import type {
  IPublicClientApplication,
  AccountInfo,
} from '@azure/msal-browser';

import {
  apiConfig,
  apiRequest,
} from '../usuarios/authConfig';

import {
  decodeJwt,
  rolesOf,
  scopesOf,
} from '../usuarios/jwt';

/**
 * INTERFAZ: ApiTokenClaims
 *
 * Claims = afirmaciones o datos incluidos en un token.
 *
 * Guarda parte de la información del JWT
 * para ayudar a diagnosticar solicitudes.
 *
 * aud: audiencia o destinatario del token.
 * iss: emisor del token.
 * scp: permisos delegados.
 * roles: roles de aplicación.
 *
 * NO contiene el token completo.
 */
interface ApiTokenClaims {
  aud: string | string[] | null;
  iss: string | null;
  scp: string[];
  roles: string[];
}

/**
 * CLASE: ApiError
 *
 * ¿PARA QUÉ SIRVE?
 * Representa un error ocurrido durante una
 * solicitud al backend.
 *
 * extends Error:
 * Significa que esta clase hereda de la clase Error
 * que ya incluye JavaScript.
 *
 * ALMACENA:
 * - status: código HTTP, por ejemplo 403 o 500.
 * - statusText: descripción HTTP.
 * - body: respuesta enviada por el servidor.
 * - url: dirección de la solicitud.
 * - method: GET, POST, PUT o DELETE.
 * - tokenClaims: información diagnóstica del JWT.
 *
 * CONEXIÓN:
 * request() crea esta clase cuando una solicitud falla.
 */
export class ApiError extends Error {
  status: number;
  statusText: string;
  body: unknown;
  url: string | null;
  method: string;
  tokenClaims: ApiTokenClaims | null;

  /**
   * CONSTRUCTOR:
   * Se ejecuta cuando creamos un nuevo ApiError.
   *
   * Ejemplo:
   * new ApiError(403, 'Forbidden', null)
   *
   * Forbidden = prohibido.
   */
  constructor(
    status: number,
    statusText: string,
    body: unknown,
    url: string | null = null,
    method = 'GET',
    tokenClaims: ApiTokenClaims | null = null,
  ) {
    // Inicializamos el mensaje de la clase Error.
    super(
      status === 0
        ? 'No fue posible conectar con el backend.'
        : `Error de servicio (${status}).`,
    );

    // Nombre utilizado para identificar la clase.
    this.name = 'ApiError';

    // Guardamos los detalles del error.
    this.status = status;
    this.statusText = statusText;
    this.body = body;
    this.url = url;
    this.method = method;
    this.tokenClaims = tokenClaims;
  }
}

/**
 * CLASE: ApiNotConfiguredError
 *
 * ¿PARA QUÉ SIRVE?
 * Representa el error que ocurre cuando
 * todavía no tenemos una URL de backend.
 *
 * EJEMPLO:
 * Si VITE_API_BASE_URL está vacío en .env,
 * no sabemos a qué API Gateway enviar solicitudes.
 *
 * Esta clase también hereda de Error.
 */
export class ApiNotConfiguredError extends Error {
  constructor() {
    super('El backend aún no está configurado.');
    this.name = 'ApiNotConfiguredError';
  }
}

/**
 * FUNCIÓN: apiErrorMessage()
 *
 * ¿PARA QUÉ SIRVE?
 * Transforma un error técnico en un mensaje
 * comprensible para el usuario.
 *
 * PARÁMETRO:
 * error: error recibido, inicialmente desconocido.
 *
 * RETORNA:
 * string: mensaje en español.
 *
 * CONEXIÓN:
 * Puede utilizarse desde las páginas React
 * para mostrar un aviso cuando una operación falla.
 *
 * EJEMPLOS:
 * 401 = sesión no autorizada.
 * 403 = operación prohibida.
 * 404 = recurso no encontrado.
 * 500 = error del servidor.
 */
export function apiErrorMessage(error: unknown): string {

  // Falta la configuración del backend.
  if (error instanceof ApiNotConfiguredError) {
    return error.message;
  }

  // El error proviene de una solicitud HTTP.
  if (error instanceof ApiError) {

    if (error.status === 0) {
      return 'No se pudo conectar con el backend. Inténtalo nuevamente más tarde.';
    }

    if (error.status === 401) {
      return 'La sesión no pudo autorizar esta solicitud. Inicia sesión nuevamente.';
    }

    if (error.status === 403) {
      return 'Tu cuenta no tiene permiso para realizar esta acción.';
    }

    if (error.status === 404) {
      return 'No se encontró la información solicitada.';
    }

    if (error.status === 400) {
      return 'La solicitud contiene datos inválidos. Revisa la información e inténtalo nuevamente.';
    }

    if (error.status === 409) {
      return 'La operación entra en conflicto con el estado o las reglas del negocio.';
    }

    if (error.status >= 500) {
      return 'El servicio presenta un problema temporal. Inténtalo más tarde.';
    }

    return 'No se pudo completar la solicitud.';
  }

  // Mensaje para cualquier otro tipo de error.
  return 'No se pudo completar la solicitud. Inténtalo nuevamente.';
}

/**
 * FUNCIÓN: apiErrorDetails()
 *
 * Details = detalles.
 *
 * ¿PARA QUÉ SIRVE?
 * Obtiene información técnica sobre un ApiError.
 *
 * Esto ayuda durante el desarrollo y depuración.
 *
 * JSON.stringify():
 * Convierte un objeto en texto JSON.
 *
 * Los argumentos null y 2 permiten
 * presentar el JSON con indentación.
 *
 * ATENCIÓN:
 * Los detalles pueden contener información
 * sensible enviada en la respuesta del backend.
 * No los publiques sin revisarlos.
 */
export function apiErrorDetails(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;

  return JSON.stringify({
    request: {
      method: error.method,
      endpoint: error.url,
    },
    status: error.status,
    statusText: error.statusText,
    tokenClaims: error.tokenClaims,
    response: error.body,
  }, null, 2);
}

/**
 * FUNCIÓN: safeJson()
 *
 * Safe = seguro.
 *
 * ¿PARA QUÉ SIRVE?
 * Intenta convertir una respuesta de texto
 * en un objeto JSON.
 *
 * Si no es JSON válido, devuelve el texto original.
 *
 * Se utiliza dentro de request().
 */
function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/**
 * VARIABLE: pendingApiToken
 *
 * Pending = pendiente o en proceso.
 *
 * ¿PARA QUÉ SIRVE?
 * Comparte una solicitud de token que ya está en curso.
 *
 * PROBLEMA QUE RESUELVE:
 * Varios componentes pueden solicitar un token
 * simultáneamente:
 *
 * - RequireRole.
 * - useAuthorization.
 * - Páginas que consultan datos.
 *
 * Para una misma cuenta, reutilizamos la misma
 * Promise mientras la solicitud siga pendiente.
 *
 * key: identificador de la cuenta.
 * promise: operación asíncrona que devuelve el token.
 */
let pendingApiToken: {
  key: string;
  promise: Promise<string>;
} | null = null;

/**
 * VARIABLE: redirectStarted
 *
 * Redirect = redirección.
 *
 * ¿PARA QUÉ SIRVE?
 * Evita iniciar varias redirecciones a Microsoft
 * simultáneamente dentro de esta carga de página.
 */
let redirectStarted = false;

/**
 * FUNCIÓN: acquireApiToken()
 *
 * Acquire = adquirir u obtener.
 *
 * ¿PARA QUÉ SIRVE?
 * Obtiene un access token para Pedidos360-API.
 *
 * PARÁMETROS:
 * instance: instancia MSAL.
 * account: cuenta del usuario autenticado.
 *
 * DEVUELVE:
 * Promise<string>: token de acceso.
 *
 * CONEXIONES:
 * - Microsoft Entra ID.
 * - usuarios/authConfig.ts (apiRequest).
 *
 * IMPORTANTE:
 * Este token es para acceder al backend.
 * NO contiene credenciales de AWS.
 *
 * FUNCIONAMIENTO:
 * 1. Reutiliza una solicitud pendiente si existe.
 * 2. Intenta obtener un token silenciosamente.
 * 3. Si falla, inicia una redirección a Microsoft.
 * 4. Comparte la promesa entre solicitudes simultáneas.
 *
 * OBSERVACIÓN:
 * El código actual intenta la redirección cuando
 * acquireTokenSilent falla por cualquier motivo.
 * Conservamos ese comportamiento porque es el
 * que tienes funcionando, aunque más adelante
 * podemos distinguir distintos tipos de error.
 */
export async function acquireApiToken(
  instance: IPublicClientApplication,
  account: AccountInfo,
): Promise<string> {

  // Identificamos al usuario actual.
  const key = account.homeAccountId;

  /**
   * Si existe una solicitud pendiente para esta cuenta,
   * devolvemos la misma promesa.
   */
  if (pendingApiToken?.key === key) {
    return pendingApiToken.promise;
  }

  /**
   * Creamos la operación asíncrona
   * que intentará obtener el token.
   */
  const promise = (async () => {
    try {

      /**
       * acquireTokenSilent:
       * MSAL intenta obtener un token válido sin
       * mostrar una pantalla interactiva.
       *
       * Puede utilizar la caché o renovar el acceso
       * según sus mecanismos internos.
       */
      const result = await instance.acquireTokenSilent({
        ...apiRequest,
        account,
      });

      // Entregamos el token obtenido.
      return result.accessToken;

    } catch (error) {

      /**
       * Si el intento silencioso falla,
       * intentamos iniciar una redirección interactiva.
       *
       * El token no vuelve inmediatamente en esta llamada:
       * el navegador debe volver desde Microsoft.
       */
      if (!redirectStarted) {
        redirectStarted = true;

        void instance.acquireTokenRedirect({
          ...apiRequest,
          account,
        }).catch(() => {

          // Permitimos otro intento si falló iniciar la redirección.
          redirectStarted = false;

          console.error(
            'No se pudo abrir Microsoft para autorizar el acceso a la API.',
          );
        });
      }

      // Conservamos el error original de esta solicitud.
      throw error;
    }
  })();

  // Compartimos esta promesa con otras solicitudes.
  pendingApiToken = { key, promise };

  try {
    return await promise;
  } finally {

    /**
     * finally:
     * Se ejecuta tanto si la solicitud termina
     * correctamente como si falla.
     *
     * Limpiamos la solicitud pendiente para
     * permitir futuras solicitudes de token.
     */
    if (pendingApiToken?.promise === promise) {
      pendingApiToken = null;
    }
  }
}

/**
 * INTERFAZ: ApiClient
 *
 * Define las operaciones HTTP que ofrecemos
 * al resto del frontend.
 *
 * request(): solicitud genérica.
 * get(): consultar.
 * post(): crear o enviar datos.
 * put(): actualizar.
 * del(): eliminar.
 * delete(): eliminar, alias de del().
 *
 * <T>:
 * Representa el tipo de dato esperado en la respuesta.
 *
 * Ejemplo:
 * api.get<Producto[]>('/catalogo')
 */
export interface ApiClient {
  request<T>(path: string, init?: RequestInit): Promise<T>;
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  del<T>(path: string): Promise<T>;
  delete<T>(path: string): Promise<T>;
}

/**
 * FUNCIÓN: createApiClient()
 *
 * Create = crear.
 *
 * ¿PARA QUÉ SIRVE?
 * Crea un cliente HTTP asociado a una cuenta Microsoft.
 *
 * PARÁMETROS:
 * instance: instancia de MSAL.
 * account: usuario que realizará las solicitudes.
 *
 * DEVUELVE:
 * ApiClient: objeto con métodos HTTP.
 *
 * CONEXIÓN:
 * useApi.ts llama a createApiClient().
 *
 * Las funciones de catálogo y pedidos
 * reciben el cliente ya preparado.
 */
export function createApiClient(
  instance: IPublicClientApplication,
  account: AccountInfo,
): ApiClient {

  /**
   * FUNCIÓN INTERNA: request()
   *
   * Es el núcleo de la comunicación HTTP.
   *
   * ¿QUÉ HACE?
   * 1. Comprueba la configuración.
   * 2. Obtiene un token.
   * 3. Construye la URL completa.
   * 4. Prepara los encabezados.
   * 5. Envía la solicitud mediante fetch().
   * 6. Procesa la respuesta.
   * 7. Devuelve los datos o lanza un ApiError.
   *
   * PARÁMETROS:
   * path: ruta, como /catalogo.
   * init: configuración de la solicitud HTTP.
   *
   * <T> indica el tipo de respuesta esperado.
   */
  async function request<T>(
    path: string,
    init: RequestInit = {},
  ): Promise<T> {

    // Verificamos que exista una URL de backend.
    if (!apiConfig.baseUrl) {
      throw new ApiNotConfiguredError();
    }

    // Verificamos que existan scopes configurados.
    if (apiConfig.scopes.length === 0) {
      throw new Error('VITE_API_SCOPE no está configurado en .env');
    }

    // Solicitamos el token de acceso para la cuenta.
    const token = await acquireApiToken(instance, account);

    /**
     * Construimos la URL completa:
     *
     * URL base:
     * https://...execute-api.us-east-1.amazonaws.com
     *
     * path:
     * /catalogo
     *
     * Resultado:
     * https://...amazonaws.com/catalogo
     */
    const url = `${apiConfig.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

    // Identificamos el método HTTP utilizado.
    const method = (init.method ?? 'GET').toUpperCase();

    /**
     * Extraemos algunos claims del JWT para diagnóstico.
     *
     * Esto no valida el token:
     * la verificación real ocurre en API Gateway.
     */
    const claims = decodeJwt(token);

    const tokenClaims: ApiTokenClaims | null = claims
      ? {
          aud: claims.aud ?? null,
          iss: claims.iss ?? null,
          scp: scopesOf(claims),
          roles: rolesOf(claims),
        }
      : null;

    /**
     * Headers = encabezados de la solicitud.
     *
     * Son metadatos enviados al servidor.
     */
    const headers = new Headers(init.headers);

    // Indicamos que esperamos una respuesta JSON.
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    // Cuando enviamos datos, indicamos su formato.
    if (init.body != null && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    /**
     * Authorization:
     * Encabezado HTTP que transporta el token de acceso.
     *
     * Bearer = portador.
     *
     * API Gateway lee este encabezado para
     * validar la autenticación JWT.
     */
    headers.set('Authorization', `Bearer ${token}`);

    let response: Response;

    /**
     * FETCH: SOLICITUD REAL AL BACKEND
     *
     * fetch() es la función que realiza
     * la comunicación HTTP desde el navegador.
     *
     * AQUÍ ocurre la llamada real a AWS API Gateway.
     */
    try {
      response = await fetch(url, {
        ...init,
        headers,
      });

    } catch {

      /**
       * Si hay un problema de red o conexión,
       * creamos un ApiError con estado 0.
       *
       * El código 0 es una convención de este cliente;
       * no es un estado HTTP enviado por el servidor.
       */
      throw new ApiError(
        0,
        'Network Error',
        null,
        url,
        method,
        tokenClaims,
      );
    }

    /**
     * PASO: Leer la respuesta del backend.
     *
     * response.text():
     * Obtiene el cuerpo de la respuesta como texto.
     *
     * safeJson():
     * Intenta convertirlo en un objeto JavaScript.
     */
    const text = await response.text();
    const body = text ? safeJson(text) : null;

    /**
     * response.ok:
     * Será true para respuestas HTTP exitosas
     * dentro del rango 200-299.
     *
     * Si la respuesta indica un error,
     * lanzamos ApiError con sus detalles.
     */
    if (!response.ok) {
      throw new ApiError(
        response.status,
        response.statusText,
        body,
        url,
        method,
        tokenClaims,
      );
    }

    // Entregamos los datos al código que llamó a request().
    return body as T;
  }

  /**
   * DEVOLVER LOS MÉTODOS HTTP
   *
   * Cada método reutiliza request().
   *
   * Así evitamos repetir:
   * - Obtención del token.
   * - Construcción de la URL.
   * - Encabezados de autenticación.
   * - Gestión de errores.
   */
  return {
    // Solicitud genérica.
    request,

    // GET: consultar información.
    get: <T>(path: string) => request<T>(path),

    // POST: enviar datos para crear un recurso.
    post: <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    // PUT: enviar datos para actualizar un recurso.
    put: <T>(path: string, body: unknown) =>
      request<T>(path, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),

    // DELETE: solicitar eliminación.
    del: <T>(path: string) =>
      request<T>(path, { method: 'DELETE' }),

    // Alias de del(), con un nombre más explícito.
    delete: <T>(path: string) =>
      request<T>(path, { method: 'DELETE' }),
  };
}
