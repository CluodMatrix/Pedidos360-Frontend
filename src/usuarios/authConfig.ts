/**
 * ================================================================
 * PEDIDOS360 — CONFIGURACIÓN DE MICROSOFT Y AWS
 * Archivo: src/usuarios/authConfig.ts
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Lee variables VITE_ del archivo .env y construye:
 * - msalConfig: configuración de autenticación Microsoft Entra ID.
 * - loginRequest: datos solicitados en el inicio de sesión.
 * - apiConfig: dirección de API Gateway y scopes solicitados.
 * - apiRequest: scopes utilizados para obtener el access token.
 *
 * CONEXIONES:
 * - main.tsx: crea PublicClientApplication(msalConfig).
 * - inicio/Landing.tsx y usuarios/RequireAuth.tsx: loginRequest.
 * - API/clienteApi.ts: apiConfig y apiRequest.
 *
 * IMPORTANTE:
 * Las variables VITE_ están disponibles en el navegador:
 * NUNCA coloques AWS_SECRET_ACCESS_KEY, session tokens, contraseñas
 * ni client secrets de Microsoft dentro de .env del frontend.
 * Aquí solo deben ir identificadores, URLs y scopes públicos.
 *
 * INGLÉS:
 * client = cliente; tenant = directorio/inquilino;
 * redirect = redirección; scope = permiso/alcance;
 * authority = autoridad de autenticación; cache = caché.
 */

import { LogLevel, type Configuration } from '@azure/msal-browser';

/** Identificador público del registro Pedidos360-Frontend en Entra. */
const clientId = import.meta.env.VITE_AZURE_CLIENT_ID;

/** Identificador público del directorio Microsoft Entra ID. */
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID;

/** URL a la que Microsoft devuelve al usuario después del login. */
const redirectUri = import.meta.env.VITE_AZURE_REDIRECT_URI;

/**
 * OBJETO: msalConfig
 *
 * Lo utiliza la librería MSAL para iniciar y administrar sesiones.
 * NO se conecta con AWS; únicamente configura Microsoft Entra ID.
 */
export const msalConfig: Configuration = {
  auth: {
    // «clientId» identifica a la aplicación frontend, no a la persona.
    clientId,

    // URL del directorio que validará el inicio de sesión.
    // Se corrigió aquí la URL: debe ser texto normal, NO Markdown.
    authority: `https://login.microsoftonline.com/${tenantId}`,

    // Debe coincidir con una URI de redirección registrada en Entra.
    redirectUri,
  },

  cache: {
    // localStorage conserva la caché de MSAL entre recargas.
    // Es más persistente que sessionStorage; protege igualmente el equipo.
    cacheLocation: 'localStorage',
  },

  system: {
    loggerOptions: {
      /**
       * loggerCallback = función que recibe mensajes de MSAL.
       *
       * containsPii indica si el mensaje puede tener datos personales.
       * En desarrollo imprimimos solamente errores sin PII.
       */
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;

        if (level === LogLevel.Error && import.meta.env.DEV) {
          console.error(message);
        }
      },
      logLevel: LogLevel.Error,
    },
  },
};

/**
 * OBJETO: loginRequest
 *
 * Lo usan Landing.tsx y RequireAuth.tsx para solicitar login.
 * openid: identidad OpenID Connect; profile: perfil básico.
 *
 * Esto es distinto de los permisos de la API de pedidos.
 */
export const loginRequest = {
  scopes: ['openid', 'profile'],
};

/**
 * DIRECCIÓN DE API GATEWAY
 *
 * Ejemplo en tu proyecto:
 * https://ijkncygeb7.execute-api.us-east-1.amazonaws.com
 *
 * trim() elimina espacios accidentales.
 * replace(/\/+$/, '') elimina barras finales para evitar //catalogo.
 */
const apiBaseUrl = (
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? ''
).trim().replace(/\/+$/, '');

/**
 * SCOPES DE API
 *
 * Ejemplo: catalog.read catalog.write orders.read orders.write.
 * VITE_API_SCOPE contiene scopes completos separados por espacios.
 */
const apiScopes = (
  (import.meta.env.VITE_API_SCOPE as string | undefined) ?? ''
);

/**
 * OBJETO: apiConfig
 *
 * baseUrl = URL de la API.
 * scopes = arreglo de permisos solicitados a Microsoft.
 *
 * split(/\s+/): separa por uno o varios espacios/saltos de línea.
 * filter(Boolean): elimina elementos vacíos.
 */
export const apiConfig = {
  baseUrl: apiBaseUrl,
  scopes: apiScopes.split(/\s+/).map((scope) => scope.trim()).filter(Boolean),
};

/**
 * OBJETO: apiRequest
 *
 * API/clienteApi.ts entrega este objeto a acquireTokenSilent() o
 * acquireTokenRedirect() para pedir un ACCESS TOKEN de Pedidos360-API.
 *
 * La firma y los scopes del token son validados por API Gateway;
 * escribir un scope en .env NO concede automáticamente ese permiso.
 */
export const apiRequest = {
  scopes: apiConfig.scopes,
};
