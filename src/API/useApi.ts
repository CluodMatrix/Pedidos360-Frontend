
/**
 * ============================================================
 * PEDIDOS360 — HOOK DE CONEXIÓN API
 * Archivo: src/API/useApi.ts
 * ============================================================
 *
 * ¿PARA QUÉ SIRVE?
 * Entrega un cliente HTTP asociado a la cuenta
 * de Microsoft Entra ID que está activa.
 *
 * RESPONSABILIDADES:
 * 1. Consultar la sesión actual de Microsoft.
 * 2. Identificar la cuenta activa.
 * 3. Crear un cliente HTTP para esa cuenta.
 * 4. Reutilizarlo mientras corresponda.
 *
 * CONEXIONES:
 * - usuarios/activeAccount.ts: selecciona la cuenta.
 * - API/clienteApi.ts: crea el cliente HTTP.
 * - Componentes React: llaman al hook useApi().
 *
 * IMPORTANTE:
 * Este hook NO llama directamente a AWS.
 * Prepara el objeto que otras funciones utilizarán
 * para realizar las solicitudes.
 */

// useMemo permite reutilizar un resultado
// mientras sus dependencias no cambien.
import { useMemo } from 'react';

// Hook de Microsoft para acceder a la sesión.
import { useMsal } from '@azure/msal-react';

// Función que crea el cliente y su tipo.
import {
  createApiClient,
  type ApiClient,
} from './clienteApi';

// Función que identifica la cuenta activa de Microsoft.
import { resolveActiveAccount } from '../usuarios/activeAccount';

/**
 * HOOK PERSONALIZADO: useApi()
 *
 * ¿PARA QUÉ SIRVE?
 * Entrega un cliente HTTP preparado para el
 * usuario que actualmente utiliza Pedidos360.
 *
 * DEVUELVE:
 * ApiClient: cliente listo para realizar solicitudes.
 * null: si todavía no hay una cuenta utilizable.
 *
 * EJEMPLO DE USO:
 *
 * const api = useApi();
 *
 * if (api) {
 *   const productos = await listarCatalogo(api);
 * }
 *
 * Debe utilizarse dentro de un componente React
 * o de otro hook, respetando las reglas de hooks.
 */
export function useApi(): ApiClient | null {

  /**
   * PASO 1: Obtener la sesión de Microsoft.
   *
   * instance:
   * Instancia de autenticación MSAL.
   *
   * accounts:
   * Cuentas conocidas por Microsoft MSAL.
   */
  const { instance, accounts } = useMsal();

  /**
   * PASO 2: Resolver la cuenta activa.
   *
   * Esto ayuda a evitar utilizar otra cuenta
   * cuando cambiamos entre Admin, Operador y Cliente.
   */
  const account = resolveActiveAccount(instance, accounts);

  /**
   * PASO 3: Obtener su identificador.
   *
   * homeAccountId:
   * Identificador de la cuenta administrada por MSAL.
   *
   * Si todavía no existe una cuenta, usamos ''.
   */
  const accountKey = account?.homeAccountId ?? '';

  /**
   * PASO 4: Crear o reutilizar el ApiClient.
   *
   * useMemo:
   * Hook de React que memoriza un resultado.
   *
   * Mientras instance y accountKey no cambien,
   * React puede reutilizar el cliente creado.
   *
   * Esto evita crear un objeto nuevo en cada render
   * cuando sus dependencias siguen iguales.
   */
  return useMemo(() => {

    /**
     * Si no conocemos una cuenta activa,
     * todavía no podemos preparar un cliente.
     */
    if (!accountKey) {
      return null;
    }

    /**
     * Recuperamos la cuenta desde MSAL
     * utilizando su identificador.
     */
    const tokenAccount = instance.getAccount({
      homeAccountId: accountKey,
    });

    /**
     * Si la cuenta existe, creamos el ApiClient.
     *
     * createApiClient pertenece a clienteApi.ts.
     *
     * Si no existe, devolvemos null.
     */
    return tokenAccount
      ? createApiClient(instance, tokenAccount)
      : null;

  }, [instance, accountKey]);
}
