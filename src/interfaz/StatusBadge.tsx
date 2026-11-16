/**
 * ============================================================
 * PEDIDOS360 — ETIQUETA VISUAL DE ESTADO
 * Archivo: src/interfaz/StatusBadge.tsx
 * ============================================================
 *
 * «Status» = estado. «Badge» = etiqueta o distintivo.
 *
 * ¿QUÉ HACE?
 * Dibuja un texto corto con una clase CSS según el estado.
 *
 * CONEXIONES:
 * - Componentes de pedidos: pueden usarlo para mostrar
 *   CREADO, ACEPTADO, DESPACHADO, etc.
 * - estilos/: define los colores de las clases status-*.
 *
 * NO modifica pedidos y NO envía solicitudes a AWS.
 */

/**
 * value: valor técnico del estado, utilizado en CSS.
 * label: texto legible que se mostrará al usuario.
 *
 * Ejemplo:
 * <StatusBadge value="CREADO" label="Pedido creado" />
 */
interface StatusBadgeProps {
  value: string;
  label: string;
}

/**
 * COMPONENTE: StatusBadge()
 * toLowerCase(): convierte el valor a minúsculas.
 * La plantilla `status-${...}` genera la clase de estilo.
 *
 * Se conserva el nombre exacto de las clases originales
 * para no romper el CSS actual (por ejemplo, status-creado).
 */
export function StatusBadge({ value, label }: StatusBadgeProps) {
  const claseEstado = `status-${value.toLowerCase()}`;

  return (
    <span className={`status-badge ${claseEstado}`}>
      {label}
    </span>
  );
}
