/**
 * PEDIDOS360 — CUADRO DE CONFIRMACIÓN
 * Archivo: src/interfaz/ConfirmDialog.tsx
 *
 * DIALOG = diálogo o ventana de confirmación.
 * Se reutiliza antes de acciones que necesitan confirmación,
 * por ejemplo eliminar un producto en catalogo/Catalogo.tsx.
 *
 * No llama a AWS por su cuenta: al confirmar ejecuta onConfirm,
 * una función recibida desde la pantalla que lo utiliza.
 */
import { useEffect, useId } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * PROPS = propiedades recibidas desde el componente padre.
 * title: título del cuadro.
 * message: explicación de la acción.
 * confirmLabel: texto del botón de confirmación.
 * busy?: true si la acción está procesándose (opcional).
 * onConfirm: callback que se ejecuta al confirmar.
 * onCancel: callback que se ejecuta al cancelar.
 */
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * COMPONENTE: ConfirmDialog()
 * Muestra un cuadro con dos decisiones: volver o confirmar.
 * No guarda productos ni pedidos; delega la acción al padre.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  // useId() crea identificadores únicos para vincular título y mensaje.
  const titleId = useId();
  const messageId = useId();

  /**
   * EFECTO: cerrar con Escape.
   * Antes dependía de que las teclas llegaran al fondo del diálogo.
   * Ahora se escucha Escape mientras el diálogo esté abierto.
   * Cuando busy=true, no se puede cancelar el proceso en curso.
   */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        onCancel();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    // Cleanup = limpieza: elimina el listener al cerrar el componente.
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [busy, onCancel]);

  return (
    // Backdrop = fondo detrás de una ventana emergente.
    <div className="dialog-backdrop" role="presentation">
      <section
        className="confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
      >
        {/* Ícono decorativo de advertencia. */}
        <span className="confirm-icon" aria-hidden="true">
          <AlertTriangle size={22} />
        </span>

        <h2 id={titleId}>{title}</h2>
        <p id={messageId}>{message}</p>

        <div className="dialog-actions">
          {/* onCancel proviene de la pantalla padre. */}
          <button
            type="button"
            className="secondary-button"
            onClick={onCancel}
            disabled={busy}
            autoFocus
          >
            Volver
          </button>

          {/*
           * onConfirm inicia la acción real en el componente padre.
           * Texto genérico 'Procesando…' porque el cuadro también podría
           * confirmar otras acciones, no solo una eliminación.
           */}
          <button
            type="button"
            className="danger-button"
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Procesando…' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
