/**
 * ============================================================
 * PEDIDOS360 — ESTADO VISUAL DE UN PEDIDO
 * Archivo: src/pedidos/PedidoEstado.tsx
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Traduce el estado técnico de un pedido a un texto legible
 * y lo muestra usando una etiqueta visual.
 *
 * CONEXIONES:
 * - API/pedidosApi.ts: contiene el tipo EstadoPedido.
 * - interfaz/StatusBadge.tsx: dibuja la etiqueta con CSS.
 * - PedidoCard.tsx: utiliza este componente.
 *
 * ¿SE CONECTA CON AWS?
 * No. Recibe el estado que ya obtuvo otro componente.
 */

import type { EstadoPedido } from '../API/pedidosApi';
import { StatusBadge } from '../interfaz/StatusBadge';

/**
 * CONSTANTE: etiquetasEstado
 *
 * Record<EstadoPedido, string> significa que cada estado
 * definido por TypeScript debe tener su texto equivalente.
 * Así, si se añade un estado nuevo, TypeScript ayuda a
 * detectar que falta su traducción.
 */
const etiquetasEstado: Record<EstadoPedido, string> = {
  CREADO: 'Creado',
  ACEPTADO: 'Aceptado',
  EN_PREPARACION: 'En preparación',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
};

/**
 * COMPONENTE: PedidoEstado()
 *
 * Recibe: estado (EstadoPedido).
 * Devuelve: un StatusBadge de la carpeta interfaz.
 *
 * Por ejemplo, EN_PREPARACION se muestra como
 * «En preparación», mientras StatusBadge utiliza
 * el valor técnico para seleccionar la clase CSS.
 */
export function PedidoEstado({ estado }: { estado: EstadoPedido }) {
  return <StatusBadge value={estado} label={etiquetasEstado[estado]} />;
}
