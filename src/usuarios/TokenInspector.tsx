/**
 * ================================================================
 * PEDIDOS360 — INSPECTOR DE PERMISOS (SOLO DESARROLLO)
 * Archivo: src/usuarios/TokenInspector.tsx
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Permite estudiar cinco datos de un access token de Pedidos360-API:
 * audiencia (aud), emisor (iss), permisos (scp), roles y expiración (exp).
 *
 * ¿CON QUÉ ARCHIVOS SE CONECTA?
 * - inicio/PanelAdmin.tsx: lo incorpora en el panel del administrador.
 * - usuarios/activeAccount.ts: identifica la cuenta de Microsoft activa.
 * - API/clienteApi.ts: acquireApiToken() solicita el token mediante MSAL.
 * - usuarios/jwt.ts: decodeJwt(), rolesOf() y scopesOf() leen los claims.
 * - estilos/components.css: estilo pastel del inspector y sus tarjetas.
 * - estilos/dashboard.css: organiza la sección en todo el ancho del panel.
 *
 * FLUJO DE AUTENTICACIÓN:
 * TokenInspector -> acquireApiToken() -> MSAL -> Microsoft Entra ID.
 *
 * ¿LLAMA A AWS, LAMBDA O DYNAMODB?
 * NO. Aquí solamente se obtiene el token de Microsoft. Las solicitudes a
 * AWS ocurren en las páginas que usan src/API/clienteApi.ts.
 *
 * SEGURIDAD:
 * - NO se imprime ni se guarda en React el JWT completo.
 * - Solo guardamos un RESUMEN con los cinco campos visibles.
 * - decodeJwt() NO verifica firmas. API Gateway y el backend deben
 *   validar autenticación y autorización al recibir solicitudes.
 * - Esta herramienta desaparece del renderizado de producción.
 *
 * VOCABULARIO:
 * inspector = herramienta de inspección; token = credencial digital;
 * claim = dato declarado dentro de un token; scope = permiso;
 * audience = destinatario; issuer = emisor; loading = cargando;
 * snapshot = fotografía del estado; refresh = volver a consultar.
 */

// useState: recuerda resultados, errores y si una consulta está en curso.
import { useState } from 'react';
// useMsal: acceso al cliente de autenticación de Microsoft.
import { useMsal } from '@azure/msal-react';
// Iconos de Lucide: son decorativos y NO llaman a ningún servicio.
import { KeyRound, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';

import { acquireApiToken, apiErrorMessage } from '../API/clienteApi';
import { resolveActiveAccount } from './activeAccount';
import { decodeJwt, rolesOf, scopesOf, type JwtClaims } from './jwt';

/**
 * INTERFAZ: ResumenPermisos
 * Aquí no almacenamos JwtClaims entero porque podría contener datos
 * adicionales que NO necesitamos mostrar en pantalla.
 */
interface ResumenPermisos {
  audiencia: string;
  emisor: string;
  scopes: string[];
  roles: string[];
  expiracion: number | null;
}

/**
 * INTERFAZ: ResultadoInspeccion
 * accountKey identifica a qué cuenta pertenece el resumen. Así evitamos
 * mostrar los permisos de una cuenta anterior si la persona cambia de usuario.
 */
interface ResultadoInspeccion {
  accountKey: string;
  resumen: ResumenPermisos;
}

/**
 * FUNCIÓN: resumirClaims()
 * Toma el objeto decodificado y conserva SOLO los datos necesarios.
 * Array.isArray(): comprueba si 'aud' es una lista de destinatarios.
 * Number.isFinite(): comprueba que la fecha de expiración sea un número válido.
 * No modifica ni valida criptográficamente el JWT.
 */
function resumirClaims(claims: JwtClaims): ResumenPermisos {
  const aud = claims.aud;
  return {
    audiencia: Array.isArray(aud) ? aud.join(', ') : aud ?? 'No disponible',
    emisor: claims.iss ?? 'No disponible',
    scopes: scopesOf(claims),
    roles: rolesOf(claims),
    expiracion: typeof claims.exp === 'number' && Number.isFinite(claims.exp)
      ? claims.exp
      : null,
  };
}

/**
 * FUNCIÓN: formatearExpiracion()
 * La propiedad exp de un JWT está en SEGUNDOS desde 1970.
 * JavaScript Date necesita MILISEGUNDOS; por eso multiplicamos por 1000.
 * Formateamos la fecha con el idioma y formato de Chile (es-CL).
 */
function formatearExpiracion(segundos: number | null): string {
  if (segundos === null) return 'No disponible';
  const fecha = new Date(segundos * 1000);
  return Number.isNaN(fecha.getTime())
    ? 'Fecha no válida'
    : fecha.toLocaleString('es-CL');
}

/**
 * COMPONENTE: TokenInspector()
 * Se dibuja dentro de PanelAdmin.tsx y NO necesita recibir props.
 * Solo consulta el token cuando la persona presiona el botón.
 */
export function TokenInspector() {
  // La instancia MSAL permite solicitar tokens para la cuenta activa.
  const { instance, accounts } = useMsal();
  const account = resolveActiveAccount(instance, accounts);

  // Combinamos cuenta + directorio, ya que una identidad puede usar tenants.
  const accountKey = account ? `${account.homeAccountId}:${account.tenantId}` : '';

  // Estos estados guardan un resumen, un error y la consulta en curso.
  // NO existe un useState para guardar la cadena del access token.
  const [resultado, setResultado] = useState<ResultadoInspeccion | null>(null);
  const [error, setError] = useState<{ key: string; message: string } | null>(null);
  const [inspeccionando, setInspeccionando] = useState<string | null>(null);

  // Mostramos resultados solamente cuando corresponden a la cuenta actual.
  const resumenActual = resultado?.accountKey === accountKey ? resultado.resumen : null;
  const mensajeError = error?.key === accountKey ? error.message : null;
  const loading = Boolean(accountKey && inspeccionando === accountKey);

  /**
   * FUNCIÓN: handleInspect()
   * handle = manejar; inspect = inspeccionar.
   *
   * 1. Evita duplicar una solicitud que está en curso.
   * 2. Llama a acquireApiToken(), que usa MSAL y Microsoft Entra ID.
   * 3. Lee los claims del token mediante decodeJwt().
   * 4. Solo guarda los cinco campos resumidos con resumirClaims().
   * 5. Si algo falla, muestra un mensaje sin revelar credenciales.
   *
   * El token es una variable TEMPORAL, no se renderiza ni guarda en estado.
   */
  async function handleInspect() {
    if (!account || loading) return;

    // Esta clave permite ocultar resultados que pertenezcan a otra cuenta.
    const key = accountKey;
    setInspeccionando(key);
    setError(null);
    setResultado(null);

    try {
      const token = await acquireApiToken(instance, account);
      const decoded = decodeJwt(token);

      if (!decoded) {
        setError({ key, message: 'No se pudo interpretar el formato del token de la API.' });
        return;
      }

      // Guardamos solo las cinco propiedades necesarias para el diagnóstico.
      setResultado({ accountKey: key, resumen: resumirClaims(decoded) });
    } catch (reason) {
      setError({ key, message: apiErrorMessage(reason) });
    } finally {
      // Si otra cuenta inició una consulta, no apagamos su indicador de carga.
      setInspeccionando((actual) => (actual === key ? null : actual));
    }
  }

  // DEV = entorno de desarrollo. En producción no se muestra el inspector.
  if (!import.meta.env.DEV) return null;

  return (
    <section className="token-inspector" aria-labelledby="inspector-token-heading">
      {/* CABECERA: descripción a la izquierda y botón de consulta a la derecha. */}
      <div className="token-inspector-header">
        <div className="token-inspector-identidad">
          <span className="token-inspector-emblema" aria-hidden="true">
            <ShieldCheck size={27} strokeWidth={1.9} />
          </span>
          <div className="token-inspector-titulos">
            <p className="token-inspector-kicker">SEGURIDAD · SOLO DESARROLLO</p>
            <h2 id="inspector-token-heading">Permisos de tu sesión</h2>
            <p className="token-inspector-descripcion">
              Consulta los datos de autorización que Microsoft entrega a Pedidos360.
            </p>
          </div>
        </div>

        {/* Este botón solicita un TOKEN A MICROSOFT, no consulta DynamoDB. */}
        <button
          type="button"
          className="secondary-button token-inspector-action"
          onClick={() => void handleInspect()}
          disabled={loading || !account}
        >
          <RefreshCw size={17} aria-hidden="true" />
          {loading ? 'Consultando permisos…' : 'Inspeccionar permisos'}
        </button>
      </div>

      {/* NOTA: no revelar el JWT completo en capturas o repositorios. */}
      <p className="token-inspector-aviso">
        <LockKeyhole size={17} aria-hidden="true" />
        Solo se muestran campos seleccionados: nunca el token completo ni su firma.
      </p>

      {/* Errores accesibles para lectores de pantalla. */}
      {mensajeError && <p className="inline-error token-inspector-error" role="alert">{mensajeError}</p>}
      {!account && <p className="token-inspector-vacio" role="status">Inicia sesión para inspeccionar permisos.</p>}

      {/* ESTADO INICIAL: mantiene la sección agradable sin cifras ficticias. */}
      {account && !resumenActual && !loading && !mensajeError && (
        <p className="token-inspector-vacio">
          <KeyRound size={19} aria-hidden="true" />
          Presiona «Inspeccionar permisos» para ver la información de tu sesión.
        </p>
      )}

      {loading && <p className="token-inspector-cargando" role="status">Leyendo los permisos de Microsoft…</p>}

      {/* RESULTADO: una cuadrícula de cinco tarjetas claras, con datos reales. */}
      {resumenActual && (
        <div className="token-grid" aria-label="Datos del token de acceso">
          <div className="token-field">
            <span className="token-field-label">Audiencia (aud)</span>
            <code className="token-field-value">{resumenActual.audiencia}</code>
            <small>Aplicación o API destinataria del token.</small>
          </div>
          <div className="token-field">
            <span className="token-field-label">Emisor (iss)</span>
            <code className="token-field-value">{resumenActual.emisor}</code>
            <small>Servicio que emitió el token: Microsoft Entra ID.</small>
          </div>
          <div className="token-field">
            <span className="token-field-label">Permisos (scp)</span>
            <code className="token-field-value">{resumenActual.scopes.join(', ') || 'Ninguno'}</code>
            <small>Acciones delegadas, como catalog.read u orders.write.</small>
          </div>
          <div className="token-field">
            <span className="token-field-label">Roles (roles)</span>
            <code className="token-field-value">{resumenActual.roles.join(', ') || 'Ninguno'}</code>
            <small>Por ejemplo: Admin, Operador o Cliente.</small>
          </div>
          <div className="token-field">
            <span className="token-field-label">Expiración (exp)</span>
            <code className="token-field-value">{formatearExpiracion(resumenActual.expiracion)}</code>
            <small>Momento hasta el cual el token declara ser válido.</small>
          </div>
        </div>
      )}
    </section>
  );
}
