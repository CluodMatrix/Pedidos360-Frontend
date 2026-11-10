/**
 * ===========================================================================
 * PEDIDOS360 — DOS PORTADAS SEGÚN EL INICIO DE SESIÓN
 * Archivo: src/inicio/Landing.tsx
 * ===========================================================================
 *
 * ¿QUÉ HACE?
 * - Sin sesión: muestra la ilustración rosa de los gatitos repartidores y
 *   ofrece iniciar sesión con Microsoft.
 * - Con sesión: muestra la oficina neón de los gatitos, con un mensaje de
 *   bienvenida distinto y el botón «Continuar al panel».
 * - En ambas vistas conserva la autenticación ya implementada con MSAL.
 *
 * ARCHIVOS CONECTADOS:
 * - App.tsx -> muestra Landing en la ruta pública «/».
 * - usuarios/authConfig.ts -> exporta loginRequest para Microsoft Entra ID.
 * - main.tsx -> inicializa MSAL y procesa el regreso desde Microsoft.
 * - usuarios/activeAccount.ts -> identifica la cuenta activa de Microsoft.
 * - inicio/Inicio.tsx -> envía a /admin, /operador o /cliente según el rol.
 * - estilos/landing.css -> tiene el diseño de AMBAS portadas.
 *
 * ¿SE CONECTA A AWS?
 * NO. Esta página solo inicia sesión y permite navegar a otra ruta.
 * Cuando se abre el panel, los componentes privados consultan AWS.
 *
 * VOCABULARIO:
 * Landing = portada; guest = visitante; logged = con sesión;
 * hero = ilustración principal; prompt = indicación a Microsoft;
 * account = cuenta; redirect = redirección; layout = distribución.
 */

// useState recuerda un posible error del inicio de sesión.
import { useState } from 'react';
// Iconos de interfaz; no afectan la comunicación con Microsoft ni AWS.
import { ArrowRight, Boxes, ShieldCheck, Sparkles } from 'lucide-react';
// Link cambia de vista sin recargar toda la aplicación.
// useSearchParams permite leer el aviso «?cambiarCuenta=1» en la URL.
import { Link, useSearchParams } from 'react-router-dom';
// MSAL: biblioteca que integra la sesión Microsoft con React.
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { InteractionStatus } from '@azure/msal-browser';
// Configuración ya existente, mantenida SIN modificaciones.
import { loginRequest } from '../usuarios/authConfig';
import { resolveActiveAccount } from '../usuarios/activeAccount';

// IMAGEN 1: fondo rosa de visitantes (archivo que ya tenías).
import escenaNeon from '../imagenes/escena-neon.png';
// IMAGEN 2: oficina de gatitos azul/violeta, con espacio libre a la derecha.
import escenaOficina from '../imagenes/oficina-neon.png';
// Logo oficial transparente, utilizado en la portada de visitantes.
import logoPedidos360 from '../imagenes/pedidos360-logo.png';

/**
 * COMPONENTE: MicrosoftLogo
 * Dibuja los cuatro cuadros de Microsoft mediante SVG (imagen vectorial).
 * No ejecuta ninguna función de autenticación: es solo una ilustración.
 */
function MicrosoftLogo() {
  return (
    <svg width="17" height="17" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f35325" />
      <rect x="11" y="1" width="9" height="9" fill="#81bc06" />
      <rect x="1" y="11" width="9" height="9" fill="#05a6f0" />
      <rect x="11" y="11" width="9" height="9" fill="#ffba08" />
    </svg>
  );
}

/**
 * COMPONENTE: WelcomeArt
 * - Recibe «imagen» como propiedad (prop) desde Landing.
 * - Muestra una imagen diferente según la sesión.
 * - Las cifras/tarjetas DIBUJADAS dentro de un PNG no son datos reales de AWS.
 * - aria-hidden indica que es decorativa; el texto útil está en HTML.
 */
function WelcomeArt({ imagen }: { imagen: string }) {
  return (
    <div className="welcome-art" aria-hidden="true">
      <img className="welcome-hero-image" src={imagen} alt="" />
    </div>
  );
}

/**
 * COMPONENTE PRINCIPAL: Landing
 * 1. Comprueba si Microsoft ya tiene una sesión autenticada.
 * 2. Elige qué ilustración, colores y textos mostrar.
 * 3. Ofrece iniciar sesión o navegar al panel correspondiente.
 *
 * IMPORTANTE: cambiar la apariencia NO necesita modificar authConfig.ts.
 */
export function Landing() {
  // instance: cliente MSAL; accounts: cuentas conocidas;
  // inProgress: indica si Microsoft tiene una interacción pendiente.
  const { instance, accounts, inProgress } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();

  // React consulta la cuenta seleccionada; así podemos saludar a la persona.
  // Esta función NO pide datos a AWS ni expone el token de acceso.
  const cuentaActiva = resolveActiveAccount(instance, accounts);
  const primerNombre = cuentaActiva?.name?.trim().split(/\s+/)[0] ?? '';

  // Conservamos el selector de cuenta tal como estaba en tu flujo funcional.
  const accountRequest = { ...loginRequest, prompt: 'select_account' as const };
  const autenticacionOcupada = inProgress !== InteractionStatus.None;

  const avisoCambioCuenta =
    searchParams.get('cambiarCuenta') === '1' && !isAuthenticated
      ? 'Sesión cerrada. Elige con qué cuenta quieres entrar.'
      : null;

  /**
   * FUNCIÓN: handleLogin
   * Se ejecuta al pulsar «Ingresar» o «Cambiar cuenta».
   * - No lanza dos redirecciones al mismo tiempo.
   * - Limpia la selección local de cuenta.
   * - Microsoft muestra su selector y devuelve la sesión a main.tsx.
   *
   * NOTA: setActiveAccount(null) NO cierra la sesión remota de Microsoft.
   * Conservamos esta conducta porque ya funciona en tu proyecto.
   */
  function handleLogin() {
    if (autenticacionOcupada) return;
    setError(null);
    instance.setActiveAccount(null);
    void instance.loginRedirect(accountRequest).catch(() => {
      setError('No se pudo iniciar sesión. Inténtalo nuevamente.');
    });
  }

  // Se usan dos modificadores CSS para que cada portada tenga su propio tema:
  // --guest = visitante, fondo rosa con mascotas repartidoras.
  // --logged = autenticado, oficina azul/violeta y texto a la derecha.
  return (
    <main
      className={`welcome-screen ${isAuthenticated ? 'welcome-screen--logged' : 'welcome-screen--guest'}`}
    >
      <WelcomeArt imagen={isAuthenticated ? escenaOficina : escenaNeon} />

      {/* CABECERA: la imagen de oficina YA trae un logo grande; por eso no
          superponemos otro logo sobre los gatitos de la portada autenticada. */}
      {isAuthenticated ? (
        <header className="welcome-topbar welcome-topbar--logged">
          <span className="welcome-session-label">
            <ShieldCheck size={16} /> SESIÓN INICIADA · PEDIDOS360
          </span>
        </header>
      ) : (
        <header className="welcome-topbar welcome-topbar--guest">
          <img className="welcome-brand-logo" src={logoPedidos360} alt="Pedidos360" />
          <span className="welcome-brand-caption">
            Gestión de pedidos · acceso seguro
          </span>
        </header>
      )}

      <section className="welcome-layout" aria-labelledby="welcome-title">
        <div className="welcome-copy">
          {isAuthenticated ? (
            <>
              {/* VISTA CON SESIÓN: el texto se ubicará a la derecha del dibujo. */}
              <p className="welcome-kicker"><Sparkles size={16} /> TU ESPACIO DE TRABAJO</p>
              <h1 id="welcome-title">
                ¡Tu equipo ya está<br />
                <span>en acción!</span>
              </h1>
              <p className="welcome-description">
                {primerNombre ? `¡Hola, ${primerNombre}! ` : '¡Bienvenido! '}
                Tus productos, pedidos y herramientas están listos para que
                sigas organizando tu negocio.
              </p>
              <div className="welcome-actions">
                {/* /inicio elige después /admin, /operador o /cliente. */}
                <Link className="welcome-button" to="/inicio">
                  Continuar al panel <ArrowRight size={18} />
                </Link>
                <button
                  type="button"
                  className="welcome-secondary-button"
                  onClick={handleLogin}
                  disabled={autenticacionOcupada}
                >
                  Cambiar cuenta
                </button>
              </div>
              <p className="welcome-security">
                <ShieldCheck size={16} /> Acceso con Microsoft Entra ID
              </p>
            </>
          ) : (
            <>
              {/* VISTA SIN SESIÓN: conserva el texto y los controles originales. */}
              <p className="welcome-kicker"><Boxes size={16} /> SISTEMA DE PEDIDOS</p>
              <h1 id="welcome-title">
                Tu operación,<br />
                <span>en movimiento.</span>
              </h1>
              <p className="welcome-description">
                Gestiona el catálogo y acompaña cada pedido desde su creación
                hasta la entrega.
              </p>
              <div className="welcome-actions">
                <button
                  type="button"
                  className="welcome-button"
                  onClick={handleLogin}
                  disabled={autenticacionOcupada}
                >
                  {!autenticacionOcupada && <MicrosoftLogo />}
                  {autenticacionOcupada ? 'Conectando…' : 'Ingresar con Microsoft'}
                  <ArrowRight size={18} />
                </button>
                <button
                  type="button"
                  className="welcome-secondary-button"
                  onClick={handleLogin}
                  disabled={autenticacionOcupada}
                >
                  Ingresar con otra cuenta
                </button>
              </div>
              <p className="welcome-security">
                <ShieldCheck size={16} /> Inicio de sesión seguro con Microsoft Entra ID
              </p>
            </>
          )}

          {/* Estos avisos se reutilizan, no importa cuál portada se muestre. */}
          {avisoCambioCuenta && <p className="inline-error" role="status">{avisoCambioCuenta}</p>}
          {error && <p className="inline-error" role="alert">{error}</p>}
        </div>
      </section>

      {/* Enlace al catálogo de DEMOSTRACIÓN; no consulta datos privados. */}
      <footer className="welcome-footer">
        <span>Pedidos360 · Experiencia de pedidos conectada</span>
        <Link className="welcome-demo-link" to="/catalogo-demo">
          Ver mini catálogo <ArrowRight size={15} />
        </Link>
      </footer>
    </main>
  );
}
