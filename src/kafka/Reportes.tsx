// Pantalla de Reportes.
//
// Lee los KPIs que el servicio report (proyecto Pedidos360-Kafka) calculo a
// partir de los eventos. NO lee Kafka: consume la API de solo lectura.
//
// Se actualiza sola cada 5 segundos para que los graficos avancen mientras el
// productor publica.
import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Clock, Package, RefreshCw } from 'lucide-react';

import { obtenerReportes } from '../api/reportes';
import { mensajeErrorKafka } from '../api/serviciosKafka';
import { PageHeader } from '../interfaz/PageHeader';
import { LoadingState } from '../interfaz/LoadingState';
import { ErrorState } from '../interfaz/ErrorState';

const INTERVALO_MS = 5000;

const ETIQUETA_ESTADO: Record<string, string> = {
  PEDIDO_CREADO: 'Creado',
  PEDIDO_ACEPTADO: 'Aceptado',
  PEDIDO_EN_PREPARACION: 'En preparación',
  PEDIDO_DESPACHADO: 'Despachado',
  PEDIDO_ENTREGADO: 'Entregado',
  PEDIDO_CANCELADO: 'Cancelado',
};

const dinero = (n: number) => `$${n.toLocaleString('es-CL')}`;

export function Reportes() {
  const [datos, setDatos] = useState<{
    ventas: { hora: string; total: number }[];
    leadTime: { promedioSeg: number; pedidos: { pedidoId: string; segundos: number }[] };
    topProductos: { productoId: string; unidades: number; nombre?: string }[];
    estados: { estado: string; cantidad: number }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    try {
      const resultado = await obtenerReportes();
      setDatos(resultado);
      setError(null);
    } catch (e) {
      setError(mensajeErrorKafka(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
    const temporizador = setInterval(() => {
      void cargar();
    }, INTERVALO_MS);
    return () => clearInterval(temporizador);
  }, [cargar]);

  const maxVenta = Math.max(1, ...(datos?.ventas ?? []).map((v) => v.total));
  const maxEstado = Math.max(1, ...(datos?.estados ?? []).map((e) => e.cantidad));

  return (
    <section className="page-stack dashboard-page">
      <PageHeader
        eyebrow="Analítica"
        title="Reportes"
        subtitle="Ventas, tiempos de entrega y pedidos por estado, calculados a partir de los eventos."
        actions={
          <button className="secondary-button" onClick={() => void cargar()} disabled={loading}>
            <RefreshCw size={16} />Actualizar
          </button>
        }
      />

      {error && <ErrorState message={error} onRetry={() => void cargar()} />}
      {!error && loading && !datos && <LoadingState message="Consultando los KPIs del servicio report…" />}

      {datos && (
        <>
          <section className="report-grid">
            <article className="surface report-card">
              <div className="report-card-head">
                <span className="report-icon"><Clock size={18} /></span>
                <div>
                  <p className="card-overline">Lead time</p>
                  <h3>{datos.leadTime.promedioSeg} s</h3>
                  <p className="muted-copy">promedio desde CREADO hasta ENTREGADO</p>
                </div>
              </div>
            </article>

            <article className="surface report-card">
              <div className="report-card-head">
                <span className="report-icon"><Package size={18} /></span>
                <div>
                  <p className="card-overline">Top productos</p>
                  <h3>{datos.topProductos.length} en venta</h3>
                  <p className="muted-copy">
                    {datos.topProductos.map((p) => `${p.productoId} (${p.unidades})`).join(' · ') || 'sin datos'}
                  </p>
                </div>
              </div>
            </article>
          </section>

          <section className="surface report-panel">
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">VENTAS POR HORA</p>
                <h2>Ventas</h2>
              </div>
              <span className="muted-copy">{datos.ventas.length} hora(s) con ventas</span>
            </div>
            {datos.ventas.length === 0 ? (
              <p className="muted-copy">Todavía no hay ventas. Publica eventos con <code>npm run producer</code>.</p>
            ) : (
              <ul className="report-bars">
                {datos.ventas.map((v) => (
                  <li key={v.hora} className="report-bar">
                    <span className="report-bar-label">{v.hora.replace('T', ' ')}</span>
                    <span className="report-bar-track">
                      <span
                        className="report-bar-fill"
                        style={{ width: `${Math.round((v.total / maxVenta) * 100)}%` }}
                      />
                    </span>
                    <span className="report-bar-value">{dinero(v.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface report-panel">
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">PEDIDOS ACTIVOS</p>
                <h2>Pedidos por estado</h2>
              </div>
              <span className="muted-copy">{datos.estados.length} estado(s) con pedidos vivos</span>
            </div>
            {datos.estados.length === 0 ? (
              <p className="muted-copy">No hay pedidos activos.</p>
            ) : (
              <ul className="report-bars">
                {datos.estados.map((e) => (
                  <li key={e.estado} className="report-bar">
                    <span className="report-bar-label">
                      {ETIQUETA_ESTADO[e.estado] ?? e.estado}
                    </span>
                    <span className="report-bar-track">
                      <span
                        className="report-bar-fill is-info"
                        style={{ width: `${Math.round((e.cantidad / maxEstado) * 100)}%` }}
                      />
                    </span>
                    <span className="report-bar-value">{e.cantidad}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="surface report-panel">
            <div className="section-heading">
              <div>
                <p className="page-eyebrow">DETALLE</p>
                <h2>Tiempos de entrega por pedido</h2>
              </div>
              <span className="report-icon"><BarChart3 size={18} /></span>
            </div>
            {datos.leadTime.pedidos.length === 0 ? (
              <p className="muted-copy">Ningún pedido entregado todavía.</p>
            ) : (
              <table className="report-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Segundos</th>
                  </tr>
                </thead>
                <tbody>
                  {datos.leadTime.pedidos.map((p) => (
                    <tr key={p.pedidoId}>
                      <td>{p.pedidoId}</td>
                      <td>{p.segundos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      )}
    </section>
  );
}
