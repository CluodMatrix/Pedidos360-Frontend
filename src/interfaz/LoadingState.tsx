/**
 * PEDIDOS360 — INDICADOR DE CARGA
 * Archivo: src/interfaz/LoadingState.tsx
 *
 * LOADING = cargando; STATE = estado.
 * Muestra un indicador visual mientras otra parte del programa
 * espera una respuesta o termina de preparar información.
 *
 * Ejemplos: Catalogo.tsx y PanelAdmin.tsx durante consultas a AWS.
 * NO inicia esas consultas: solo presenta el estado recibido.
 */
interface LoadingStateProps {
  // Mensaje que explica qué se está esperando.
  message: string;
}

/** COMPONENTE: LoadingState() */
export function LoadingState({ message }: LoadingStateProps) {
  return (
    // role="status": anuncia actualizaciones sin interrumpir abruptamente.
    <div className="state-panel loading-state" role="status">
      {/* El círculo de carga es decorativo; el texto indica el estado. */}
      <span className="loading-indicator" aria-hidden="true" />
      <p>{message}</p>
    </div>
  );
}
 