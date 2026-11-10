/**
 * ============================================================
 * PEDIDOS360 — FORMULARIO PARA CREAR PEDIDOS
 * Archivo: src/pedidos/PedidoForm.tsx
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Presenta campos para elegir un producto y su cantidad.
 *
 * CONEXIONES:
 * - Pedidos.tsx: controla los datos y ejecuta onSubmit().
 * - API/catalogoApi.ts: define el tipo Producto.
 *
 * ¿SE CONECTA CON AWS?
 * No directamente. Pedidos.tsx carga los productos y,
 * cuando envías el formulario, llama a crearPedido(),
 * que llega a API Gateway -> Lambda -> DynamoDB.
 *
 * CORRECCIÓN:
 * No permitimos sustituir un catálogo fallido por un ID
 * escrito manualmente: solo se puede elegir un producto
 * realmente obtenido del backend y con stock disponible.
 */

// FormEvent = tipo de evento que ocurre al enviar un formulario.
import type { FormEvent } from 'react';
import type { Producto } from '../API/catalogoApi';

/**
 * PROPS = datos y funciones que recibe el formulario.
 *
 * productoId: ID seleccionado (como texto).
 * cantidad: unidades que queremos comprar.
 * products: lista de productos obtenidos del backend.
 * productsLoading: indica si el catálogo se está cargando.
 * submitting: indica si la operación está en curso.
 * error: mensaje de error que entrega Pedidos.tsx.
 * onProductChange: comunica un nuevo producto al padre.
 * onQuantityChange: comunica la nueva cantidad al padre.
 * onSubmit: pide al padre crear el pedido.
 */
interface PedidoFormProps {
  productoId: string;
  cantidad: number;
  products: Producto[];
  productsLoading: boolean;
  submitting: boolean;
  error: string | null;
  onProductChange: (value: string) => void;
  onQuantityChange: (value: number) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

/**
 * COMPONENTE: PedidoForm()
 *
 * «Componente controlado»: NO almacena sus propios campos
 * con useState. Los valores se reciben de Pedidos.tsx y
 * cada cambio se comunica mediante una función onChange.
 */
export function PedidoForm({
  productoId,
  cantidad,
  products,
  productsLoading,
  submitting,
  error,
  onProductChange,
  onQuantityChange,
  onSubmit,
}: PedidoFormProps) {
  /**
   * Buscamos el producto elegido para conocer su stock.
   * find() devuelve el primer elemento que cumple la condición.
   * String() unifica IDs numéricos y de texto para compararlos.
   */
  const seleccionado = products.find(
    (producto) => String(producto.id) === productoId,
  );

  // Solo se habilita enviar cuando los campos son coherentes.
  const cantidadValida = Number.isInteger(cantidad) && cantidad > 0;
  const hayStock = seleccionado !== undefined &&
    seleccionado.stock >= cantidad;
  const puedeEnviar = !productsLoading && !submitting &&
    cantidadValida && hayStock;

  return (
    <section className="create-order-panel" id="nuevo-pedido">
      {/* CABECERA. */}
      <div className="create-order-heading">
        <span className="create-order-mark" aria-hidden="true">+</span>
        <div>
          <h2>Nuevo pedido</h2>
          <p>El cliente se determina desde tu sesión autenticada.</p>
        </div>
      </div>

      {/*
       * onSubmit se recibe de Pedidos.tsx.
       * Allí se valida de nuevo y se solicita crear el pedido.
       */}
      <form className="order-form" onSubmit={onSubmit}>
        <label className="form-field">
          <span>Producto</span>
          <select
            value={productoId}
            onChange={(event) => onProductChange(event.target.value)}
            disabled={productsLoading || submitting || products.length === 0}
            required
          >
            <option value="">
              {productsLoading
                ? 'Cargando catálogo…'
                : products.length === 0
                  ? 'No hay productos disponibles para seleccionar'
                  : 'Selecciona un producto'}
            </option>
            {products.map((producto) => (
              <option
                key={producto.id}
                value={String(producto.id)}
                disabled={producto.stock <= 0}
              >
                {producto.nombre} · {producto.stock} disponibles
              </option>
            ))}
          </select>
        </label>

        {/* CANTIDAD: debe ser entera, positiva y no superar el stock. */}
        <label className="form-field quantity-field">
          <span>Cantidad</span>
          <input
            type="number"
            min="1"
            max={seleccionado?.stock}
            step="1"
            value={cantidad}
            onChange={(event) => onQuantityChange(Number(event.target.value))}
            disabled={productsLoading || submitting || !seleccionado}
            required
          />
        </label>

        <button
          className="primary-button"
          type="submit"
          disabled={!puedeEnviar}
        >
          {submitting ? 'Enviando…' : 'Enviar pedido'}
        </button>
      </form>

      {/* role="alert" ayuda a los lectores de pantalla. */}
      {error && <p className="inline-error" role="alert">{error}</p>}
    </section>
  );
}
