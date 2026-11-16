/**
 * PEDIDOS360 — ESTADO VACÍO
 * Archivo: src/interfaz/EmptyState.tsx
 *
 * EMPTY = vacío; STATE = estado.
 * Muestra un mensaje amable cuando una lista no contiene elementos.
 * Ejemplo: en Catalogo.tsx cuando no hay productos registrados.
 *
 * SOLO presenta información: no consulta AWS y no cambia datos.
 */
import { Inbox } from 'lucide-react';

// Props: textos que debe mostrar el componente.
interface EmptyStateProps {
  title: string;
  description: string;
}

/**
 * COMPONENTE: EmptyState()
 *
 * Ejemplo de uso:
 * <EmptyState title="Sin productos" description="Agrega tu primer producto." />
 *
 * Inbox = bandeja de entrada (ícono decorativo).
 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state-icon" aria-hidden="true">
        <Inbox size={22} strokeWidth={1.8} />
      </span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}
