import React from 'react';
import ReactDOM from 'react-dom/client';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import type { EventMessage, AuthenticationResult } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './auth/authConfig';
import { resolveActiveAccount } from './auth/activeAccount';
import App from './App';
import './css/variables.css';
import './css/global.css';
import './css/layout.css';
import './css/sidebar.css';
import './css/components.css';
import './css/forms.css';
import './css/landing.css';
import './css/dashboard.css';
import './css/catalogo.css';
import './css/pedidos.css';
import './css/responsive.css';
import './css/toast.css';

const msalInstance = new PublicClientApplication(msalConfig);

msalInstance.addEventCallback((event: EventMessage) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
    const payload = event.payload as AuthenticationResult;
    // La cuenta que acaba de completar el login ES la cuenta activa:
    // no filtrar por tenant aquí para no descartar invitados/otras cuentas
    // y volver al usuario anterior después de "Cambiar cuenta".
    if (payload.account) {
      msalInstance.setActiveAccount(payload.account);
    }
  }

  if (event.eventType === EventType.LOGOUT_SUCCESS) {
    msalInstance.setActiveAccount(null);
  }
});

async function bootstrap() {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('No se encontró el contenedor de la aplicación.');

  const root = ReactDOM.createRoot(rootElement);

  try {
    await msalInstance.initialize();

    // Procesar la respuesta del redirect ANTES de resolver la cuenta activa.
    //
    // Sin esto, "Cambiar cuenta" no funciona: la cuenta elegida en Microsoft
    // todavia no esta en la cache cuando se resuelve la cuenta activa, asi
    // que se elige la anterior (que queda ademas persistida como activa) y la
    // app se queda mostrando el panel del usuario viejo.
    const resultado = await msalInstance.handleRedirectPromise();
    if (resultado?.account) {
      msalInstance.setActiveAccount(resultado.account);
    }

    const account = resolveActiveAccount(msalInstance, msalInstance.getAllAccounts());
    if (account !== msalInstance.getActiveAccount()) {
      msalInstance.setActiveAccount(account);
    }

    root.render(
      <React.StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </React.StrictMode>,
    );
  } catch {
    root.render(
      <main className="startup-error">
        <h1>Pedidos360</h1>
        <p>No se pudo iniciar la autenticación. Recarga la página o inténtalo más tarde.</p>
      </main>,
    );
  }
}

void bootstrap();
