
/**
 * PEDIDOS360 — TARJETA DEL USUARIO
 * Archivo: src/interfaz/SidebarUser.tsx
 *
 * QUÉ HACE:
 * - Muestra nombre y cuenta Microsoft.
 * - Genera un avatar con las iniciales.
 * - Enseña los roles de la sesión.
 * - Muestra el botón para cerrar sesión.
 *
 * CONEXIONES:
 * Sidebar -> SidebarUser
 * SidebarUser -> onLogout -> AppShell -> Microsoft MSAL
 *
 * No solicita directamente datos a AWS.
 *
 * VOCABULARIO:
 * User = usuario.
 * Avatar = imagen o representación del usuario.
 * Role = rol.
 * Logout = cerrar sesión.
 * Disabled = deshabilitado.
 */

import { Crown, LogOut } from 'lucide-react';

interface SidebarUserProps {
  userName: string;
  username: string;
  roles: string[];
  onLogout: () => void;
  logoutDisabled: boolean;
}

export function SidebarUser({
  userName,
  username,
  roles,
  onLogout,
  logoutDisabled,
}: SidebarUserProps) {
  /**
   * CREACIÓN DEL AVATAR
   *
   * trim() elimina espacios de los extremos.
   * split() separa las palabras.
   * slice(0, 2) selecciona las primeras dos.
   * map() obtiene las letras iniciales.
   * join('') las une.
   *
   * Ejemplo: Laura Fontecilla -> LF.
   */
  const initials = userName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  // Indica si se debe mostrar una corona de administrador.
  const esAdmin = roles.includes('Admin');

  return (
    <div className="sidebar-user">
      {/* Tarjeta de la cuenta conectada. */}
      <div className="sidebar-account">
        <span className="user-avatar" aria-hidden="true">
          {initials || 'M'}
        </span>

        <div className="user-copy">
          <strong title={userName}>{userName}</strong>

          <small title={username}>
            {username || 'Sesión autenticada'}
          </small>

          {/* Insignias de los roles de la sesión. */}
          {roles.length > 0 && (
            <div className="sidebar-role-list">
              {roles.map((role) => (
                <span
                  className={`user-role-label${
                    role === 'Admin' ? ' is-admin' : ''
                  }`}
                  key={role}
                >
                  {role === 'Admin' && (
                    <Crown size={12} aria-hidden="true" />
                  )}
                  {role}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* El botón conserva el logout original de Microsoft. */}
      <div className="sidebar-account-actions">
        <button
          type="button"
          className="sidebar-logout"
          onClick={onLogout}
          disabled={logoutDisabled}
        >
          <LogOut size={18} strokeWidth={1.9} aria-hidden="true" />
          <span>
            {logoutDisabled ? 'Procesando sesión…' : 'Cerrar sesión'}
          </span>
        </button>

        {esAdmin && (
          <span className="sidebar-account-hint">
            Panel de administración
          </span>
        )}
      </div>
    </div>
  );
}
