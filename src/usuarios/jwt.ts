/**
 * ================================================================
 * PEDIDOS360 — LECTURA DE TOKENS JWT
 * Archivo: src/usuarios/jwt.ts
 * ================================================================
 *
 * ¿QUÉ HACE?
 * Extrae información legible de un JWT: emisor, audiencia,
 * roles, permisos y fechas de creación/expiración.
 *
 * CONEXIONES:
 * - API/clienteApi.ts: muestra diagnósticos de solicitudes.
 * - usuarios/useAuthorization.ts y RequireRole.tsx: leen roles/scopes.
 * - usuarios/Perfil.tsx y TokenInspector.tsx: muestran claims.
 *
 * SEGURIDAD FUNDAMENTAL:
 * ¡DECODIFICAR NO ES VALIDAR! Un JWT puede estar manipulado.
 * Solo usamos esta lectura para la interfaz y diagnóstico.
 * API Gateway verifica el JWT, sus firmas, emisor, audiencia, etc.;
 * Lambda debe comprobar además los permisos y reglas de negocio.
 *
 * INGLÉS:
 * claim = dato/afirmación; payload = contenido;
 * issuer (iss) = emisor; audience (aud) = destinatario;
 * scope (scp) = permiso; role = rol; expire (exp) = vencimiento.
 */

/**
 * INTERFAZ: JwtClaims
 *
 * Describe algunos campos posibles dentro del payload del token.
 * El signo ? significa que el campo es opcional.
 * [key: string]: unknown permite otros claims no especificados.
 */
export interface JwtClaims {
  aud?: string | string[];
  iss?: string;
  sub?: string;
  scp?: string;
  roles?: string[] | string;
  exp?: number; // Fecha de expiración en segundos Unix.
  iat?: number; // Fecha de emisión en segundos Unix.
  [key: string]: unknown;
}

/**
 * FUNCIÓN: decodeJwt(token)
 *
 * Recibe una cadena JWT y devuelve sus claims o null si el formato
 * no puede interpretarse.
 *
 * El JWT tiene tres partes separadas por puntos:
 * cabecera.payload.firma
 *
 * Únicamente leemos la segunda parte: payload.
 * NO revisamos la firma, ni comprobamos si el token expiró.
 */
export function decodeJwt(token: string): JwtClaims | null {
  try {
    // split() separa el texto en un arreglo utilizando el punto.
    const partes = token.split('.');
    if (partes.length !== 3 || !partes[1]) return null;

    // Un JWT utiliza Base64URL; atob() necesita Base64 estándar.
    const payload = partes[1];
    const normalizado = payload.replace(/-/g, '+').replace(/_/g, '/');

    // Agregamos el relleno (=) necesario para decodificar Base64.
    const relleno = normalizado.padEnd(
      normalizado.length + ((4 - (normalizado.length % 4)) % 4),
      '=',
    );

    // atob() convierte Base64 en una cadena de bytes.
    const cadenaBytes = atob(relleno);

    // TextDecoder interpreta UTF-8; admite tildes y caracteres Unicode.
    const bytes = Uint8Array.from(cadenaBytes, (caracter) => caracter.charCodeAt(0));
    const textoJson = new TextDecoder().decode(bytes);

    // JSON.parse() transforma el texto en un objeto JavaScript.
    const valor: unknown = JSON.parse(textoJson);

    // Rechazamos valores que no sean objetos de claims.
    if (typeof valor !== 'object' || valor === null || Array.isArray(valor)) {
      return null;
    }

    return valor as JwtClaims;
  } catch {
    // Un token malformado no debe romper toda la aplicación.
    return null;
  }
}

/**
 * FUNCIÓN: scopesOf(claims)
 *
 * Devuelve los permisos (scopes) delegados como un arreglo.
 *
 * Ejemplo de claim:
 * scp: 'catalog.read orders.read'
 * Resultado: ['catalog.read', 'orders.read'].
 *
 * IMPORTANTE: estos datos solo ayudan a mostrar la interfaz;
 * no reemplazan la verificación de API Gateway/Lambda.
 */
export function scopesOf(claims: JwtClaims | null): string[] {
  if (typeof claims?.scp !== 'string') return [];

  return claims.scp.split(/\s+/).map((scope) => scope.trim()).filter(Boolean);
}

/**
 * FUNCIÓN: rolesOf(claims)
 *
 * Devuelve los roles de la cuenta como un arreglo de cadenas.
 *
 * Soporta las representaciones:
 * ['Admin', 'Operador']
 * 'Admin Operador'
 * '[Admin Operador]' (formato textual de algunos sistemas).
 *
 * Set elimina roles duplicados.
 */
export function rolesOf(claims: JwtClaims | null): string[] {
  const roles = claims?.roles;

  const lista = Array.isArray(roles)
    ? roles
    : typeof roles === 'string'
      ? roles.replace(/^\s*\[|\]\s*$/g, '').split(/[,\s]+/)
      : [];

  return [...new Set(lista.filter((rol): rol is string =>
    typeof rol === 'string' && rol.trim().length > 0,
  ).map((rol) => rol.trim()))];
}
