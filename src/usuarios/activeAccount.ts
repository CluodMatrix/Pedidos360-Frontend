/**
 * ================================================================
 * PEDIDOS360 — SELECCIÓN DE CUENTA ACTIVA
 * Archivo: src/usuarios/activeAccount.ts
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Decide qué cuenta de Microsoft Entra ID utilizar cuando MSAL
 * conoce una o varias cuentas en el navegador.
 *
 * CONEXIONES:
 * - main.tsx: selecciona la cuenta al arrancar la aplicación.
 * - API/useApi.ts: vincula las solicitudes HTTP a esa cuenta.
 * - usuarios/RequireRole.tsx y usuarios/useAuthorization.ts:
 *   comprueban sus permisos.
 * - inicio/ y interfaz/: muestran información de la cuenta.
 *
 * AWS: NO llama a AWS, API Gateway ni DynamoDB.
 * Esta función selecciona una identidad; no verifica permisos.
 *
 * INGLÉS:
 * active = activa; account = cuenta; resolve = determinar/resolver;
 * cache = almacenamiento temporal o persistente de MSAL.
 */

// import type: trae únicamente tipos para TypeScript, no código ejecutable.
import type {
  AccountInfo,
  IPublicClientApplication,
} from '@azure/msal-browser';

/**
 * FUNCIÓN: resolveActiveAccount(instance, accounts)
 *
 * Parámetros:
 * - instance: instancia de MSAL que gestiona el inicio de sesión.
 * - accounts: cuentas conocidas por MSAL en esta sesión del navegador.
 *
 * Devuelve AccountInfo (información de una cuenta) o null (ninguna).
 *
 * REGLAS:
 * 1. Priorizar la cuenta marcada como activa por MSAL.
 * 2. Si solo hay una cuenta conocida, utilizarla.
 * 3. Si hay varias y ninguna está activa, no elegir al azar.
 *
 * Esto evita entrar accidentalmente al panel de otra cuenta
 * después de utilizar «Cambiar cuenta».
 */
export function resolveActiveAccount(
  instance: IPublicClientApplication,
  accounts: AccountInfo[],
): AccountInfo | null {
  // Consultamos la cuenta que MSAL recuerda como activa.
  const activeAccount = instance.getActiveAccount();

  // Si hay una cuenta activa con información de inquilino, la usamos.
  // tenantId = identificador del directorio de Microsoft Entra ID.
  if (activeAccount?.tenantId) {
    return activeAccount;
  }

  // Si solamente conocemos una cuenta, no hay ambigüedad.
  if (accounts.length === 1) {
    return accounts[0];
  }

  // Cero cuentas, o varias sin selección: la aplicación debe pedir login.
  return null;
}
