/**
 * ============================================================
 * PEDIDOS360 — TARJETA DE PEDIDO
 * Archivo: src/pedidos/PedidoCard.tsx
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Muestra un pedido: número, fecha, cliente, productos, total
 * y botones para pasar a otro estado.
 *
 * CONEXIONES:
 * - Pedidos.tsx: le entrega los datos y recibe los clics.
 * - API/pedidosApi.ts: define Pedido, EstadoPedido y las
 *   transiciones de estado permitidas.
 * - PedidoEstado.tsx: muestra el estado con una etiqueta.
 *
 * ¿SE CONECTA CON AWS?
 * No directamente. Los datos llegan desde Pedidos.tsx.
 * Cuando se presiona un botón, llama a onTransition(), que
 * Pedidos.tsx conecta con API Gateway y Lambda.
 */

// Iconos de la biblioteca lucide-react (solo presentación visual).
import { ArrowRight, CalendarDays, Package2 } from 'lucide-react';

// Tipos y reglas de negocio compartidas con la API de pedidos.
import type { EstadoPedido, Pedido } from '../API/pedidosApi';
import { transicionesPermitidas } from '../API/pedidosApi';
import { PedidoEstado } from './PedidoEstado';

/**
 * PROPS = propiedades que recibe un componente de React.
 *
 * pedido: pedido que se mostrará.
 * canChangeStatus: si corresponde ofrecer acciones de cambio.
 * pending: si hay una operación en curso que bloquea botones.
 * saving: si se está guardando un cambio de ESTA tarjeta.
 * onTransition: función que recibe un pedido y su nuevo estado.
 */
interface PedidoCardProps {
  pedido: Pedido;
  canChangeStatus: boolean;
  pending: boolean;
  saving: boolean;
  onTransition: (pedido: Pedido, estado: EstadoPedido) => void;
}

/**
 * FORMATTERS = formateadores.
 *
 * Intl.NumberFormat presenta valores como pesos chilenos.
 * Intl.DateTimeFormat presenta una fecha y hora legibles.
 * Los declaramos fuera del componente para reutilizarlos.
 */
const formatoPrecio = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

const formatoFecha = new Intl.DateTimeFormat('es-CL', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/**
 * FUNCIÓN: etiquetaAccion()
 *
 * Traduce el código de un estado al texto del botón.
 * Recibe: EstadoPedido. Devuelve: string.
 * No realiza ninguna solicitud HTTP.
 */
function etiquetaAccion(estado: EstadoPedido): string {
  switch (estado) {
    case 'ACEPTADO': return 'Aceptar';
    case 'CANCELADO': return 'Cancelar';
    case 'EN_PREPARACION': return 'En preparación';
    case 'DESPACHADO': return 'Despachar';
    case 'ENTREGADO': return 'Entregar';
    case 'CREADO': return 'Creado';
  }
}

/**
 * COMPONENTE: PedidoCard()
 *
 * React llama a este componente para construir una tarjeta.
 * «Desestructurar props» significa extraer los valores recibidos
 * directamente entre las llaves de los parámetros.
 */
export function PedidoCard({
  pedido,
  canChangeStatus,
  pending,
  saving,
  onTransition,
}: PedidoCardProps) {
  /**
   * Convertimos la fecha enviada por el backend en un Date.
   * Si está mal formada, mostramos un mensaje de respaldo.
   */
  const fecha = new Date(pedido.fechaCreacion);
  const fechaLegible = Number.isNaN(fecha.getTime())
    ? 'Fecha no disponible'
    : formatoFecha.format(fecha);

  // El total es calculado por el backend; aquí solo lo formateamos.
  const totalLegible = formatoPrecio.format(pedido.total);

  /**
   * Obtenemos UNA vez las transiciones posibles del estado actual.
   * Ejemplo: CREADO -> [ACEPTADO, CANCELADO].
   * La Lambda debe validar nuevamente la transición; la interfaz
   * solamente decide qué botones ofrecer.
   */
  const siguientesEstados = transicionesPermitidas(pedido.estado);

  return (
    <article className="order-card" aria-busy={saving}>
      {/* CABECERA: número y estado del pedido. */}
      <header className="order-card-header">
        <div>
          <p className="card-overline">Pedido</p>
          <h2>#{pedido.id}</h2>
        </div>
        <PedidoEstado estado={pedido.estado} />
      </header>

      {/* INFORMACIÓN DEL PEDIDO. */}
      <div className="order-meta">
        <span>
          <CalendarDays size={15} aria-hidden="true" />
          {fechaLegible}
        </span>
        <span>
          <strong>Cliente</strong>
          {pedido.clienteNombre || pedido.clienteId}
        </span>
      </div>

      {/*
       * PRODUCTOS:
       * map() recorre el arreglo pedido.productos y construye
       * una fila por cada producto.
       * key ayuda a React a distinguir cada fila.
       */}
      <div className="order-items">
        <p className="order-section-label">
          <Package2 size={15} aria-hidden="true" /> Productos
        </p>
        {pedido.productos.map((producto, indice) => (
          <div
            className="order-item"
            key={`${producto.productoId}-${indice}`}
          >
            <span>
              {producto.nombre ?? `Producto ${producto.productoId}`}
            </span>
            <span>{producto.cantidad} un.</span>
          </div>
        ))}
      </div>

      {/* TOTAL MONETARIO DEL PEDIDO. */}
      <footer className="order-card-footer">
        <span>Total</span>
        <strong>{totalLegible}</strong>
      </footer>

      {/*
       * ACCIONES DE ESTADO:
       * - Solo aparecen si el usuario puede gestionar pedidos.
       * - No aparecen si el pedido ya terminó su ciclo.
       * - pending impide enviar cambios simultáneos.
       * - onTransition NO llama AWS aquí: avisa a Pedidos.tsx.
       */}
      {canChangeStatus && siguientesEstados.length > 0 && (
        <div
          className="order-transitions"
          aria-label={`Acciones para el pedido ${pedido.id}`}
        >
          {siguientesEstados.map((estado) => (
            <button
              type="button"
              className={
                estado === 'CANCELADO'
                  ? 'text-button danger-text'
                  : 'transition-button'
              }
              key={estado}
              onClick={() => onTransition(pedido, estado)}
              disabled={pending}
            >
              {saving ? 'Guardando…' : etiquetaAccion(estado)}
              {estado !== 'CANCELADO' && (
                <ArrowRight size={14} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
