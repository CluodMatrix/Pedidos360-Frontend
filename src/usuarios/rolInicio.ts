/**
 * ================================================================
 * PEDIDOS360 — SELECCIÓN DEL PANEL DE INICIO
 * Archivo: src/usuarios/rolInicio.ts
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Convierte los roles de la cuenta en la ruta a la que debe ir el usuario.
 *
 * CONEXIONES:
 * - inicio/Inicio.tsx: redirige a la ruta que devuelve esta función.
 * - interfaz/AppShell.tsx: comunica la ruta de inicio al menú lateral.
 * - usuarios/useAuthorization.ts: obtiene los roles que llegan hasta aquí.
 *
 * ¿LLAMA A AWS O MICROSOFT?
 * NO. Solo recibe un arreglo de roles y devuelve un texto.
 * Los roles se obtuvieron antes desde el access token de Microsoft.
 *
 * INGLÉS:
 * role = rol; route = ruta; include = incluir; readonly = solo lectura.
 */

/**
 * FUNCIÓN: rutaInicioPorRol(roles)
 *
 * PARÁMETRO:
 * roles: lista de nombres de roles (por ejemplo, ['Cliente']).
 * readonly impide modificar ese arreglo dentro de esta función.
 *
 * DEVUELVE:
 * Una ruta como '/admin', '/operador', '/cliente' o '/perfil'.
 *
 * ORDEN DE PRIORIDAD:
 * Admin > Operador > Cliente.
 * Si una cuenta tiene varios roles, utiliza el de mayor prioridad.
 * Si ninguno coincide, envía al perfil (ruta privada disponible para
 * cualquier cuenta que ya esté autenticada).
 *
 * IMPORTANTE: elegir una ruta no concede permisos. RequireRole.tsx
 * y, sobre todo, el backend deben comprobar el acceso real.
 */
export function rutaInicioPorRol(roles: readonly string[]): string {
  if (roles.includes('Admin')) return '/admin';
  if (roles.includes('Operador')) return '/operador';
  if (roles.includes('Cliente')) return '/cliente';
  return '/perfil';
}
