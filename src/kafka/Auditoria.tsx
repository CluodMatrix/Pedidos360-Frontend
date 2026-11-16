// Pantalla de Auditoría.
//
// Muestra el historial de cada pedido: quién hizo el cambio, qué pasó, cuándo y
// desde dónde. Los datos vienen del servicio audit (proyecto Pedidos360-Kafka),
// que los lee del tópico audit.timeline. NO lee Kafka directamente.
import { useCallback, useEffect, useState } from 'react';
import { History, RefreshCw, Search } from 'lucide-react';

import { obtenerAuditoria, obtenerTimeline } from '../api/auditoria';
import { mensajeErrorKafka } from '../api/serviciosKafka';
import { PageHeader } from '../interfaz/PageHeader';
import { LoadingState } from '../interfaz/LoadingState';
import { ErrorState } from '../interfaz/ErrorState';

const INTERVALO_MS = 5000;
const MINIMO_FEEDBACK_MS = 600;

const ETIQUETA_ESTADO: Record<string, string> = {
  PEDIDO_CREADO: 'Creado',
  PEDIDO_ACEPTADO: 'Aceptado',
  PEDIDO_EN_PREPARACION: 'En preparación',
  PEDIDO_DESPACHADO: 'Despachado',
  PEDIDO_ENTREGADO: 'Entregado',
  PEDIDO_CANCELADO: 'Cancelado',
};

const fechaBonita = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'medium' });
};

export function Auditoria() {
  const [eventos, setEventos] = useState<
    { pedidoId?: string; fecha: string; tipo: string; quien: string; desdeDonde: string }[]
  >([]);
  const [pedidoId, setPedidoId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  const cargar = useCallback(async () => {
    try {
      const datos = pedidoId.trim()
        ? await obtenerTimeline(pedidoId.trim())
        : await obtenerAuditoria();
      setEventos(datos);
      setError(null);
      setUltimaActualizacion(new Date());
    } catch (e) {
      setError(mensajeErrorKafka(e));
    } finally {
      setLoading(false);
    }
  }, [pedidoId]);

  // El clic en "Actualizar" tiene que notarse: el icono gira y el botón cambia
  // de texto durante un mínimo de tiempo, aunque la respuesta llegue al instante.
  const refrescarAhora = useCallback(async () => {
    setActualizando(true);
    const inicio = Date.now();
    await cargar();
    const resto = MINIMO_FEEDBACK_MS - (Date.now() - inicio);
    if (resto > 0) await new Promise((r) => setTimeout(r, resto));
    setActualizando(false);
  }, [cargar]);

  useEffect(() => {
    void cargar();
    const temporizador = setInterval(() => {
      void cargar();
    }, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [cargar]);

  return (
    <section className="page-stack kafka-page">
      <PageHeader
        eyebrow="Trazabilidad"
        title="Auditoría"
        subtitle="Historial completo de cada pedido: quién cambió qué, cuándo y desde dónde."
        actions={
          <>
            {ultimaActualizacion && (
              <span className="kafka-updated">
                Actualizado {ultimaActualizacion.toLocaleTimeString('es-CL')}
              </span>
            )}
            <button
              className={`secondary-button${actualizando ? ' is-busy' : ''}`}
              onClick={() => void refrescarAhora()}
              disabled={actualizando}
            >
              <RefreshCw size={16} className={actualizando ? 'is-spinning' : undefined} />
              {actualizando ? 'Actualizando…' : 'Actualizar'}
            </button>
          </>
        }
      />

      <div className="audit-search">
        <Search size={16} />
        <input
          type="text"
          value={pedidoId}
          placeholder="Filtrar por pedido (ej: P-2001). Vacío = todos los eventos"
          onChange={(e) => setPedidoId(e.target.value)}
          aria-label="Filtrar por pedido"
        />
      </div>

      {error && <ErrorState message={error} onRetry={() => void cargar()} />}
      {!error && loading && eventos.length === 0 && (
        <LoadingState message="Consultando el historial de auditoría…" />
      )}

      {!error && !loading && eventos.length === 0 && (
        <p className="muted-copy">
          Todavía no hay eventos. Publica con <code>npm run producer</code> en el proyecto de Kafka.
        </p>
      )}

      {eventos.length > 0 && (
        <ol className="audit-timeline">
          {[...eventos]
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
            .map((e, i) => (
            <li key={`${e.fecha}-${i}`} className="audit-item">
              <span className="audit-dot" aria-hidden="true" />
              <div className="audit-body">
                <p className="audit-title">
                  {ETIQUETA_ESTADO[e.tipo] ?? e.tipo}
                  {e.pedidoId ? <span className="audit-pedido"> · {e.pedidoId}</span> : null}
                </p>
                <p className="audit-meta">
                  <History size={13} />
                  {fechaBonita(e.fecha)} · {e.quien} · desde {e.desdeDonde}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
