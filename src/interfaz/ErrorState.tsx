/**
 * PEDIDOS360 — PRESENTACIÓN DE ERRORES
 * Archivo: src/interfaz/ErrorState.tsx
 *
 * ERROR = error; STATE = estado.
 * Muestra fallos de carga o de operaciones de forma comprensible.
 *
 * CONEXIONES:
 * - Catalogo.tsx y PanelAdmin.tsx, entre otras páginas.
 * - apiErrorMessage() de API/clienteApi.ts suele generar el mensaje.
 *
 * Este componente NO contacta AWS. Muestra el mensaje recibido y,
 * si se le pasa onRetry, ofrece un botón para volver a intentarlo.
 */
import { AlertCircle } from 'lucide-react';

/**
 * title?: título opcional (tiene valor predeterminado).
 * message: texto principal del error.
 * details?: detalles técnicos opcionales para depuración.
 * onRetry?: función opcional que proporciona la pantalla padre.
 */
interface ErrorStateProps {
  message: string;
  title?: string;
  details?: string | null;
  onRetry?: () => void;
}

/** COMPONENTE: ErrorState() */
export function ErrorState({
  message,
  title = 'No fue posible cargar la información',
  details,
  onRetry,
}: ErrorStateProps) {
  return (
    // role="alert" ayuda a anunciar un error a lectores de pantalla.
    <div className="error-state" role="alert">
      <AlertCircle size={20} aria-hidden="true" />

      <div>
        <h2>{title}</h2>
        <p>{message}</p>

        {/*
         * details = detalles; summary = encabezado desplegable.
         * Para evitar exponer información de diagnóstico en producción,
         * solo mostramos los detalles técnicos durante desarrollo Vite.
         * Aun en desarrollo, no compartas tokens ni datos personales.
         */}
        {import.meta.env.DEV && details && (
          <details className="api-error-details">
            <summary>Detalles de la respuesta</summary>
            <pre>{details}</pre>
          </details>
        )}

        {/*
         * Retry = reintentar.
         * No hace una petición por sí mismo: ejecuta onRetry,
         * que debe proporcionar la pantalla que conoce la operación.
         */}
        {onRetry && (
          <button type="button" className="text-button" onClick={onRetry}>
            Reintentar
          </button>
        )}
      </div>
    </div>
  );
}
