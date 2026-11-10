/**
 * ================================================================
 * PEDIDOS360 — PUNTO DE ENTRADA DE REACT
 * Archivo: src/main.tsx
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Este es el primer archivo TypeScript/React que se ejecuta al abrir
 * Pedidos360 en el navegador.
 *
 * FLUJO:
 * index.html (contiene <div id="root">)
 *   -> main.tsx (inicializa Microsoft MSAL)
 *   -> <MsalProvider> (comparte autenticación)
 *   -> <App /> (selecciona las rutas)
 *   -> páginas y componentes de Pedidos360.
 *
 * CONEXIONES:
 * - usuarios/authConfig.ts: datos públicos de configuración Microsoft.
 * - usuarios/activeAccount.ts: cuenta que debe quedar activa.
 * - App.tsx: enrutador de la aplicación.
 * - estilos/*.css: apariencia global y componentes.
 *
 * ¿LLAMA A AWS?
 * NO. Aquí se prepara Microsoft Entra ID y se inicia React.
 * API/clienteApi.ts es quien enviará peticiones a AWS después.
 *
 * INGLÉS:
 * bootstrap = iniciar/preparar la aplicación;
 * root = raíz; render = dibujar componentes;
 * event = evento; callback = función que responde a un evento;
 * redirect = redirección; provider = proveedor; cache = caché.
 */

// React y su motor de renderizado en el navegador.
import React from 'react';
import ReactDOM from 'react-dom/client';

// Microsoft Authentication Library: sesión y eventos de login/logout.
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import type { EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';

// Configuración y selección de cuenta.
import { msalConfig } from './usuarios/authConfig';
import { resolveActiveAccount } from './usuarios/activeAccount';

// Componente principal de navegación.
import App from './App';

/**
 * IMPORTACIONES CSS
 *
 * Se cargan una vez al iniciar el frontend con Vite.
 * El orden importa si varios estilos utilizan la misma especificidad.
 * Cambiar archivos CSS NO afecta la autenticación ni los datos de AWS.
 */
import './estilos/variables.css';
import './estilos/global.css';
import './estilos/layout.css';
import './estilos/sidebar.css';
import './estilos/components.css';
import './estilos/forms.css';
import './estilos/landing.css';
import './estilos/dashboard.css';
import './estilos/catalogo.css';
import './estilos/pedidos.css';
import './estilos/responsive.css';
import './estilos/toast.css';

/**
 * INSTANCIA: msalInstance
 *
 * PublicClientApplication es el objeto que administra la autenticación
 * de una aplicación frontend (SPA) con Microsoft Entra ID.
 *
 * msalConfig incluye clientId, authority y redirectUri.
 * No deben incluirse contraseñas, client secrets ni claves de AWS.
 */
const msalInstance = new PublicClientApplication(msalConfig);

/**
 * ESCUCHAR EVENTOS DE MICROSOFT
 *
 * addEventCallback registra una función que MSAL ejecuta cuando ocurre
 * un evento, por ejemplo LOGIN_SUCCESS o LOGOUT_SUCCESS.
 *
 * Esta función NO se comunica con DynamoDB ni API Gateway.
 */
msalInstance.addEventCallback((event: EventMessage) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    // AuthenticationResult describe el resultado de un login exitoso.
    const resultado = event.payload as AuthenticationResult;

    // Marcamos la cuenta que ACABA de iniciar sesión como activa.
    // Evita regresar accidentalmente a la cuenta anterior cuando se
    // utiliza «Cambiar cuenta» con varias sesiones en la caché.
    if (resultado.account) {
      msalInstance.setActiveAccount(resultado.account);
    }
  }

  if (event.eventType === EventType.LOGOUT_SUCCESS) {
    // Limpiamos la selección activa cuando MSAL termina el cierre.
    msalInstance.setActiveAccount(null);
  }
});

/**
 * FUNCIÓN: bootstrap()
 *
 * bootstrap significa «arranque» o «preparación inicial».
 *
 * PASOS:
 * 1. Encuentra <div id="root"> dentro de index.html.
 * 2. Inicializa MSAL.
 * 3. Procesa un posible regreso desde la página de Microsoft.
 * 4. Resuelve y fija la cuenta activa.
 * 5. Renderiza React con MsalProvider y App.
 *
 * MUY IMPORTANTE:
 * handleRedirectPromise() debe ejecutarse ANTES de seleccionar la cuenta
 * desde la caché. De lo contrario puede reaparecer una cuenta anterior
 * tras iniciar sesión con otra identidad.
 */
async function bootstrap() {
  const rootElement = document.getElementById('root');

  // root es obligatorio; sin él React no tendría dónde mostrarse.
  if (!rootElement) {
    throw new Error('No se encontró el contenedor #root de index.html.');
  }

  const root = ReactDOM.createRoot(rootElement);

  try {
    // Prepara el sistema de cuentas, almacenamiento y autenticación MSAL.
    await msalInstance.initialize();

    // Procesa la respuesta cuando Microsoft redirige de regreso a la SPA.
    const resultado = await msalInstance.handleRedirectPromise();

    if (resultado?.account) {
      // Preferimos la cuenta que acaba de completar la redirección.
      msalInstance.setActiveAccount(resultado.account);
    }

    // Si no llegó una cuenta nueva, respetamos la que MSAL tenía activa.
    // Si solo queda una en caché, resolveActiveAccount permite utilizarla.
    // Si hay varias sin elección explícita, devuelve null.
    const account = resolveActiveAccount(
      msalInstance,
      msalInstance.getAllAccounts(),
    );

    if (account !== msalInstance.getActiveAccount()) {
      msalInstance.setActiveAccount(account);
    }

    /**
     * StrictMode: ayuda a detectar problemas durante el desarrollo.
     * Puede ejecutar ciertos efectos dos veces en modo desarrollo.
     *
     * MsalProvider: comparte el estado de Microsoft con los componentes
     * que utilizan useMsal(), useAuthorization() y RequireAuth().
     *
     * App: define qué página corresponde a cada dirección y rol.
     */
    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>,
    );
  } catch {
    // Si la autenticación no pudo prepararse, mostramos un error legible.
    // Evitamos exponer datos sensibles del proveedor al usuario.
    root.render(
      <main className="startup-error" role="alert">
        <h1>Pedidos360</h1>
        <p>
          No se pudo iniciar la autenticación.
          Recarga la página o inténtalo más tarde.
        </p>
      </main>,
    );
  }
}

// void indica que iniciamos una función async sin usar su Promise aquí.
void bootstrap();
