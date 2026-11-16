/**
 * ================================================================
 * PEDIDOS360 — PROTECCIÓN VISUAL POR ROL
 * Archivo: src/usuarios/RequireRole.tsx
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Permite acceder a una ruta privada solo si el token de la API
 * contiene al menos uno de los roles permitidos para ella.
 *
 * CONEXIONES:
 * - App.tsx: pasa los roles permitidos a <RequireRole roles={...} />.
 * - usuarios/activeAccount.ts: determina la cuenta activa.
 * - API/clienteApi.ts: solicita un access token a Microsoft Entra ID.
 * - usuarios/jwt.ts: lee el claim «roles» de ese token.
 *
 * IMPORTANTE SOBRE SEGURIDAD:
 * Leer un JWT en el navegador NO valida su firma ni autoriza AWS.
 * Esta comprobación solo controla qué pantalla puede verse.
 * API Gateway debe verificar el token y Lambda las reglas de negocio.
 *
 * INGLÉS:
 * require = exigir; role = rol; allowed = permitido;
 * denied = denegado; loading = cargando; guard = protección.
 */

import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';
import { acquireApiToken } from '../API/clienteApi';
import { decodeJwt, rolesOf } from './jwt';
import { resolveActiveAccount } from './activeAccount';

/**
 * PROPS: propiedades del componente.
 * roles: lista de roles autorizados a entrar a esta página.
 * readonly: esta función no modifica la lista que recibió.
 *
 * EJEMPLO en App.tsx:
 * <RequireRole roles={['Admin', 'Operador']} />
 */
interface RequireRoleProps {
  roles: readonly string[];
}

/**
 * Status = situación de la comprobación:
 * - loading: esperando token.
 * - allowed: tiene rol permitido.
 * - denied: token leído, pero sin rol permitido.
 * - error: no se pudo comprobar el token.
 *
 * Separar error de denied evita confundir un fallo técnico
 * con una denegación real de permisos.
 */
type Status = 'loading' | 'allowed' | 'denied' | 'error';

interface Evaluacion {
  key: string;
  status: Status;
}

/**
 * COMPONENTE: RequireRole()
 *
 * Recibe los roles permitidos, consigue el token de la cuenta
 * activa y compara los roles que aparecen en su payload.
 */
export function RequireRole({ roles }: RequireRoleProps) {
  // useMsal = sesión Microsoft compartida con toda la aplicación.
  const { instance, accounts } = useMsal();

  // Seleccionamos la cuenta que está utilizando Pedidos360.
  const account = resolveActiveAccount(instance, accounts);
  const accountKey = account?.homeAccountId ?? '';

  /**
   * rolesKey:
   * Representación estable de los roles admitidos para este componente.
   * \u0000 es un separador poco común y evita confundir elementos.
   *
   * evaluationKey:
   * Identifica «esta cuenta + estos roles». Si cambiamos de cuenta,
   * una autorización anterior nunca se aplica a la nueva.
   */
  const rolesKey = roles.join('\u0000');
  const evaluationKey = `${accountKey}\u0001${rolesKey}`;

  // Última comprobación asíncrona terminada.
  const [evaluation, setEvaluation] = useState<Evaluacion | null>(null);

  /**
   * El estado se calcula considerando la cuenta actual.
   * Si una evaluación pertenece a otra cuenta, no la reutilizamos.
   */
  const tokenAccount = accountKey
    ? instance.getAccount({ homeAccountId: accountKey })
    : null;

  const status: Status = !account || !tokenAccount || !rolesKey
    ? 'denied'
    : evaluation?.key === evaluationKey
      ? evaluation.status
      : 'loading';

  /**
   * EFECTO: verificarRoles()
   *
   * Cuando cambia la cuenta o los roles permitidos:
   * 1. Solicita un access token para Pedidos360-API.
   * 2. Decodifica el JWT SOLO para leer sus roles.
   * 3. Comprueba si alguno pertenece a la lista autorizada.
   * 4. Guarda allowed, denied o error para mostrar la pantalla.
   *
   * Cancelled evita que una respuesta antigua cambie esta pantalla.
   */
  useEffect(() => {
    if (!accountKey || !rolesKey) return;

    const cuentaToken = instance.getAccount({ homeAccountId: accountKey });
    if (!cuentaToken) return;

    let cancelled = false;

    const verificarRoles = async () => {
      try {
        // Solicita el token a Microsoft (mediante API/clienteApi.ts).
        const token = await acquireApiToken(instance, cuentaToken);
        if (cancelled) return;

        // No valida firma; solo interpreta datos para decidir la vista.
        const claims = decodeJwt(token);
        if (!claims) throw new Error('No se pudo interpretar el JWT.');

        // Set = conjunto; tiene búsquedas rápidas con .has().
        const permitidos = new Set(rolesKey.split('\u0000'));

        // some() devuelve true si existe al menos un rol coincidente.
        const tieneAcceso = rolesOf(claims).some((rol) => permitidos.has(rol));

        if (!cancelled) {
          setEvaluation({
            key: evaluationKey,
            status: tieneAcceso ? 'allowed' : 'denied',
          });
        }
      } catch {
        // Un problema técnico se distingue de «sin permisos».
        if (!cancelled) {
          setEvaluation({ key: evaluationKey, status: 'error' });
        }
      }
    };

    void verificarRoles();

    // Cleanup = limpieza cuando se desmonta o cambia la cuenta.
    return () => {
      cancelled = true;
    };
  }, [accountKey, evaluationKey, instance, rolesKey]);

  /**
   * CASO 1 — AÚN ESTAMOS COMPROBANDO PERMISOS
   */
  if (status === 'loading') {
    return (
      <div className="state-panel" role="status">
        <h3>Verificando permisos</h3>
        <p className="subtitle">
          Estamos comprobando los permisos asociados a tu cuenta.
        </p>
      </div>
    );
  }

  /**
   * CASO 2 — NO SE PUDO OBTENER O INTERPRETAR EL TOKEN
   * Evita mostrar falsamente «no tienes el rol» ante un error técnico.
   */
  if (status === 'error') {
    return (
      <div className="state-panel state-error" role="alert">
        <h2>No se pudieron verificar los permisos</h2>
        <p className="subtitle">
          Revisa tu conexión o vuelve a iniciar sesión para intentarlo nuevamente.
        </p>
      </div>
    );
  }

  /**
   * CASO 3 — LA CUENTA NO TIENE UN ROL AUTORIZADO
   */
  if (status === 'denied') {
    return (
      <div className="state-panel state-error" role="alert">
        <h2>Acceso restringido</h2>
        <p className="subtitle">
          No fue posible confirmar que tu cuenta tenga acceso a esta sección.
        </p>
        <p className="security-note">
          La autorización de las operaciones reales se aplica en API Gateway y Lambda.
        </p>
      </div>
    );
  }

  /**
   * CASO 4 — EL ROL ESTÁ PERMITIDO
   * Outlet muestra la página hija: /admin, /operador, /comprar, etc.
   */
  return <Outlet />;
}
