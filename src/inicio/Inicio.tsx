
/**
 * PEDIDOS360 — SELECCIÓN DEL INICIO POR ROL
 * Archivo: src/inicio/Inicio.tsx
 *
 * ¿QUÉ HACE?
 * Decide qué panel abrir después de iniciar sesión.
 *
 * CONEXIONES:
 * - App.tsx: registra la dirección /inicio.
 * - usuarios/useAuthorization.ts: obtiene los roles.
 * - usuarios/rolInicio.ts: devuelve la ruta del rol.
 * - usuarios/Perfil.tsx: permite revisar la cuenta.
 *
 * NO CONSULTA DIRECTAMENTE AWS.
 * useAuthorization solicita un token a Microsoft.
 *
 * VOCABULARIO:
 * Navigate = redirigir.
 * Loading = cargando.
 * Role = rol.
 * Replace = reemplazar una entrada del historial.
 */

import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';

import { useAuthorization } from '../usuarios/useAuthorization';
import { rutaInicioPorRol } from '../usuarios/rolInicio';

/**
 * COMPONENTE: Inicio()
 *
 * Este componente no es un dashboard visual.
 * Su responsabilidad es dirigir a la página adecuada.
 */
export function Inicio() {
  // Obtiene los roles y el estado de su consulta.
  const authorization = useAuthorization();

  /**
   * ESTADO 1: Comprobando permisos.
   *
   * No redirigimos mientras los roles estén cargando.
   */
  if (authorization.loading) {
    return (
      <section className="state-panel" role="status">
        <span className="loading-indicator" aria-hidden="true" />
        <h2>Preparando tu espacio</h2>
        <p className="subtitle">
          Estamos verificando tu cuenta para abrir
          el panel que te corresponde.
        </p>
      </section>
    );
  }

  /**
   * ESTADO 2: Error de autorización.
   *
   * Evita confundir un fallo de Microsoft
   * con una cuenta que realmente no tiene roles.
   */
  if (authorization.error) {
    return (
      <section className="state-panel state-error" role="alert">
        <h2>No pudimos verificar tus permisos</h2>
        <p className="subtitle">{authorization.error}</p>
        <p>
          Puedes revisar tu sesión o volver a intentarlo
          después de comprobar la conexión.
        </p>

        <Link to="/perfil" className="secondary-button">
          Revisar mi perfil <ArrowRight size={16} />
        </Link>
      </section>
    );
  }

  /**
   * ESTADO 3: Cuenta sin roles.
   *
   * Antes podíamos enviarla directamente a /perfil.
   * Ahora explicamos la situación.
   */
  if (authorization.roles.length === 0) {
    return (
      <section className="state-panel" role="status">
        <ShieldCheck size={34} aria-hidden="true" />

        <h2>Tu cuenta está conectada</h2>
        <p className="subtitle">
          Sin embargo, todavía no tiene un rol asignado
          para acceder a los paneles de Pedidos360.
        </p>

        <Link to="/perfil" className="secondary-button">
          Revisar mi cuenta <ArrowRight size={16} />
        </Link>
      </section>
    );
  }

  /**
   * ESTADO 4: Redirección.
   *
   * rutaInicioPorRol() aplica esta prioridad:
   *
   * Admin    -> /admin
   * Operador -> /operador
   * Cliente  -> /cliente
   *
   * replace evita guardar /inicio como paso adicional
   * en el historial del navegador.
   */
  return (
    <Navigate
      to={rutaInicioPorRol(authorization.roles)}
      replace
    />
  );
}
