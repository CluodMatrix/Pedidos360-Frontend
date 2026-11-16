/**
 * PEDIDOS360 — VISTA DE COMPRA DEL CLIENTE
 * Archivo: src/catalogo/Comprar.tsx
 *
 * ¿QUÉ HACE?
 * 1. Obtiene el catálogo REAL de AWS.
 * 2. Permite armar un carrito temporal en React.
 * 3. Solicita crear un pedido REAL en el backend.
 * 4. Muestra la confirmación y el total devuelto por el backend.
 *
 * CONEXIONES INTERNAS:
 * - API/useApi.ts: cliente HTTP de la cuenta Microsoft activa.
 * - API/catalogoApi.ts: listarCatalogoCompra() -> GET /catalogo/comprar.
 * - API/pedidosApi.ts: crearPedido() -> POST /pedidos.
 * - API/clienteApi.ts: agrega el JWT y envía las solicitudes con fetch().
 * - interfaz/PageHeader.tsx, LoadingState.tsx, ErrorState.tsx.
 *
 * CONEXIONES AWS:
 * - API Gateway valida JWT y scopes.
 * - Lambda pedidos360-catalogo lee productos desde DynamoDB.
 * - Lambda pedidos360-pedidos valida stock, calcula precios y crea pedido.
 * - El backend puede publicar eventos en SNS -> colas SQS.
 *
 * CORRECCIONES IMPORTANTES:
 * - Se eliminó el catálogo ficticio como sustituto de datos reales cuando
 *   AWS falla. Antes podía mostrar stock/precios inventados como disponibles.
 * - Se usan seis imágenes INDIVIDUALES como ilustraciones decorativas,
 *   vinculadas a IDs conocidos: NO son fotos reales de los artículos.
 * - Se permite reintentar una carga que falló y se muestra el error.
 * - Se reconcilia el carrito con el stock recibido de AWS.
 * - La confirmación conserva el total aun si se vacía el carrito.
 *
 * VOCABULARIO:
 * - Shopping: compra; Cart/Carrito: productos seleccionados.
 * - Submit: enviar o confirmar; Loading: cargando.
 * - Stock: cantidad disponible; Fallback: valor de respaldo.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { useApi } from '../API/useApi';
import { apiErrorMessage } from '../API/clienteApi';
import { listarCatalogoCompra } from '../API/catalogoApi';
import { crearPedido, type Pedido } from '../API/pedidosApi';
import { PageHeader } from '../interfaz/PageHeader';
import { LoadingState } from '../interfaz/LoadingState';
import { ErrorState } from '../interfaz/ErrorState';

// Estas imágenes son ilustraciones de mascotas del proyecto; no representan
// fielmente los productos electrónicos vendidos.
import img03 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_05.png';
import img04 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_07.png';
import img05 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_11.png';
import img06 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_18.png';
import img07 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_20.png';
import img08 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_42.png';

/** ProductoCompra: forma en que la página muestra productos reales. */
interface ProductoCompra {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen: string;
}

/**
 * Relaciona IDs del seed con dibujos decorativos de Pedidos360.
 * No almacenamos aquí precios ni stock para evitar datos engañosos.
 * Map = mapa o diccionario de claves y valores.
 * Si el producto no está en este mapa, se muestra un marcador de texto.
 */
const IMAGENES_POR_ID = new Map<string, string>([
  ['prod-teclado-001', img03],
  ['prod-mouse-002', img04],
  ['prod-audifonos-003', img05],
  ['prod-webcam-004', img06],
  ['prod-hub-005', img07],
  ['prod-soporte-006', img08],
]);

/** LineaCarrito = producto seleccionado junto con su cantidad. */
interface LineaCarrito {
  producto: ProductoCompra;
  cantidad: number;
}

/** Convierte números a moneda chilena (CLP). */
const formatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/**
 * COMPONENTE: Comprar()
 * Controla el catálogo de compra, el carrito y la confirmación.
 */
export function Comprar() {
  // useApi obtiene el cliente HTTP vinculado a la cuenta autenticada.
  const api = useApi();

  /** ESTADOS DE REACT (useState = memoria temporal de la interfaz). */
  const [productos, setProductos] = useState<ProductoCompra[]>([]);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);
  const [errorCatalogo, setErrorCatalogo] = useState<string | null>(null);
  const [reintentos, setReintentos] = useState(0);

  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<Pedido | null>(null);
  const [totalConfirmado, setTotalConfirmado] = useState<number | null>(null);

  /**
   * EFECTO: carga productos desde AWS cuando tenemos un ApiClient.
   * CONEXIÓN: listarCatalogoCompra(api) -> GET /catalogo/comprar
   * -> API Gateway -> Lambda catálogo -> DynamoDB.
   *
   * La variable vigente impide que una respuesta atrasada cambie la
   * pantalla después de salir o cambiar de cuenta.
   */
  useEffect(() => {
    if (!api) {
      setProductos([]);
      setCarrito([]);
      setErrorCatalogo(null);
      setCargandoCatalogo(true);
      return;
    }

    let vigente = true;
    setCargandoCatalogo(true);
    setErrorCatalogo(null);
    setProductos([]);
    setCarrito([]);

    void listarCatalogoCompra(api)
      .then((datos) => {
        if (!vigente) return;

        // Convertimos los productos reales a la forma requerida por la vista.
        const nuevos: ProductoCompra[] = datos.map((producto) => ({
          id: String(producto.id),
          nombre: producto.nombre,
          descripcion: producto.descripcion,
          precio: producto.precio,
          stock: producto.stock,
          imagen: IMAGENES_POR_ID.get(String(producto.id)) ?? '',
        }));

        setProductos(nuevos);
      })
      .catch((motivo: unknown) => {
        if (!vigente) return;
        // ¡No mostrar stock ficticio cuando AWS está caído!
        setErrorCatalogo(apiErrorMessage(motivo));
        setProductos([]);
      })
      .finally(() => {
        if (vigente) setCargandoCatalogo(false);
      });

    // Limpieza de useEffect: invalida una respuesta antigua.
    return () => { vigente = false; };
  }, [api, reintentos]);

  /**
   * FUNCIÓN: enCarrito(id)
   * find = buscar: devuelve la línea que contiene ese producto,
   * o undefined si todavía no ha sido agregado.
   * NO hace llamadas HTTP.
   */
  const enCarrito = (id: string) =>
    carrito.find((linea) => linea.producto.id === id);

  /**
   * FUNCIÓN: agregar(producto)
   * Incorpora un producto al carrito o aumenta su cantidad,
   * sin superar el stock conocido. Solo cambia el estado de React.
   * El backend vuelve a verificar el stock al confirmar.
   */
  function agregar(producto: ProductoCompra) {
    if (producto.stock <= 0) return;
    setError(null);
    setCarrito((actual) => {
      const existente = actual.find((linea) => linea.producto.id === producto.id);
      if (!existente) return [...actual, { producto, cantidad: 1 }];
      if (existente.cantidad >= producto.stock) return actual;

      // map crea otra lista con la cantidad actualizada de este producto.
      return actual.map((linea) =>
        linea.producto.id === producto.id
          ? { ...linea, cantidad: linea.cantidad + 1 }
          : linea,
      );
    });
  }

  /**
   * FUNCIÓN: cambiarCantidad(id, delta)
   * Delta = variación: -1 para disminuir, +1 para aumentar.
   * Math.min y Math.max mantienen la cantidad entre 1 y el stock.
   * Para eliminar la línea completa se usa quitar().
   * No se realizan solicitudes a AWS.
   */
  function cambiarCantidad(id: string, delta: number) {
    setCarrito((actual) =>
      actual.map((linea) =>
        linea.producto.id === id
          ? {
              ...linea,
              cantidad: Math.min(
                linea.producto.stock,
                Math.max(1, linea.cantidad + delta),
              ),
            }
          : linea,
      ),
    );
  }

  /**
   * FUNCIÓN: quitar(id)
   * filter = filtrar: conserva todas las líneas excepto la elegida.
   */
  function quitar(id: string) {
    setCarrito((actual) =>
      actual.filter((linea) => linea.producto.id !== id),
    );
  }

  /**
   * TOTAL MOSTRADO (estimación del frontend).
   * reduce = acumular: suma precio * cantidad para cada línea.
   * El total definitivo lo calcula Lambda y se recibe en el pedido creado.
   */
  const total = carrito.reduce(
    (suma, linea) => suma + linea.producto.precio * linea.cantidad,
    0,
  );

  /**
   * FUNCIÓN: confirmarPedido()
   * CONEXIÓN REAL CON AWS:
   * crearPedido(api, { productos }) -> POST /pedidos -> API Gateway
   * -> Lambda pedidos360-pedidos -> DynamoDB (y posible publicación SNS).
   *
   * Enviamos IDs y cantidades, NO un precio ni identidad declarados
   * por el navegador. El backend debe obtener identidad del JWT,
   * calcular el importe y validar/descontar stock.
   */
  async function confirmarPedido() {
    if (!api || carrito.length === 0 || submitting || cargandoCatalogo || errorCatalogo) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const pedido = await crearPedido(api, {
        productos: carrito.map((linea) => ({
          productoId: linea.producto.id,
          cantidad: linea.cantidad,
        })),
      });

      // Guardamos el total antes de vaciar el carrito.
      setTotalConfirmado(total);
      setConfirmado(pedido);
      setCarrito([]);
    } catch (motivo) {
      setError(apiErrorMessage(motivo));
    } finally {
      setSubmitting(false);
    }
  }

  // Sin cuenta activa, todavía no hay cliente autenticado.
  if (!api) {
    return <LoadingState message="Conectando con el backend…" />;
  }

  /** PANTALLA DE CONFIRMACIÓN: se muestra cuando AWS creó el pedido. */
  if (confirmado) {
    return (
      <section className="page-stack">
        <PageHeader
          eyebrow="Compra realizada"
          title="¡Pedido creado!"
          subtitle="Tu pedido quedó registrado en el sistema."
        />
        <div className="state-panel state-success surface" role="status">
          <p className="form-success">
            Pedido #{confirmado.id} creado en estado {confirmado.estado}.
          </p>
          <p className="muted-copy">
            Total: {formatter.format(confirmado.total ?? totalConfirmado ?? 0)}
          </p>
        </div>
        <div className="shortcut-grid">
          <Link to="/pedidos" className="shortcut-card">
            <span className="shortcut-icon"><ShoppingBag size={20} strokeWidth={1.8} /></span>
            <span className="shortcut-copy">
              <strong>Mis pedidos</strong>
              <small>Ver el seguimiento de tu pedido</small>
            </span>
            <ArrowRight className="shortcut-arrow" size={17} />
          </Link>
        </div>
      </section>
    );
  }

  /** PANTALLA PRINCIPAL DE COMPRA. */
  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Comprar"
        title="Productos disponibles"
        subtitle="Catálogo del backend con el stock real. El pedido se crea contra la base de datos."
      />

      {/* Muestra carga, error con reintento o ausencia real de productos. */}
      {cargandoCatalogo && (
        <LoadingState message="Cargando catálogo real desde AWS…" />
      )}

      {!cargandoCatalogo && errorCatalogo && (
        <ErrorState
          title="No se pudo cargar el catálogo"
          message={errorCatalogo}
          onRetry={() => setReintentos((actual) => actual + 1)}
        />
      )}

      {!cargandoCatalogo && !errorCatalogo && productos.length === 0 && (
        <p className="muted-copy">Todavía no hay productos disponibles para comprar.</p>
      )}

      {/* PRODUCTOS: cada elemento de la API se muestra como tarjeta. */}
      {!cargandoCatalogo && !errorCatalogo && (
        <div className="product-grid">
          {productos.map((producto) => {
            const linea = enCarrito(producto.id);
            return (
              <article className="product-card comprar-card" key={producto.id}>
                <div className="product-media">
                  {producto.imagen ? (
                    <img
                      src={producto.imagen}
                      alt={`Ilustración decorativa de Pedidos360 asociada a ${producto.nombre}`}
                      loading="lazy"
                    />
                  ) : (
                    <span className="product-media-placeholder" aria-hidden="true">
                      {producto.nombre.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="product-card-heading">
                  <div>
                    <p className="card-overline">Catálogo</p>
                    <h2>{producto.nombre}</h2>
                  </div>
                  <span className={producto.stock > 0 ? 'stock-badge' : 'stock-badge is-empty'}>
                    {producto.stock > 0 ? `${producto.stock} en stock` : 'Agotado'}
                  </span>
                </div>

                <p className="product-description">{producto.descripcion}</p>
                <div className="product-card-footer">
                  <strong className="product-price">
                    {formatter.format(producto.precio)}
                  </strong>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={() => agregar(producto)}
                    disabled={producto.stock <= 0 || submitting || (linea?.cantidad ?? 0) >= producto.stock}
                  >
                    <Plus size={15} aria-hidden="true" />
                    {linea ? `Agregar (${linea.cantidad})` : 'Agregar'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* CARRITO TEMPORAL: se pierde al recargar; no se registra en AWS aún. */}
      <section className="surface carrito-panel" aria-labelledby="carrito-heading">
        <div className="section-heading">
          <div>
            <p className="page-eyebrow">CARRITO</p>
            <h2 id="carrito-heading">Tu selección</h2>
          </div>
          <span className="security-note">Carrito temporal en esta sesión</span>
        </div>

        {error && <p className="inline-error" role="alert">{error}</p>}

        {carrito.length === 0 ? (
          <p className="muted-copy">Agrega productos para crear un pedido.</p>
        ) : (
          <>
            <div className="carrito-lineas">
              {carrito.map(({ producto, cantidad }) => (
                <div className="carrito-linea" key={producto.id}>
                  {producto.imagen ? (
                    <img className="carrito-thumb" src={producto.imagen} alt="" />
                  ) : (
                    <span className="carrito-thumb product-media-placeholder" aria-hidden="true" />
                  )}

                  <div className="carrito-info">
                    <strong>{producto.nombre}</strong>
                    <small>{formatter.format(producto.precio)} c/u</small>
                  </div>

                  {/* Stepper = control de cantidad con botones + y -. */}
                  <div className="stepper" aria-label={`Cantidad de ${producto.nombre}`}>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(producto.id, -1)}
                      disabled={submitting || cantidad <= 1}
                      aria-label={`Disminuir cantidad de ${producto.nombre}`}
                    >
                      <Minus size={14} aria-hidden="true" />
                    </button>
                    <span>{cantidad}</span>
                    <button
                      type="button"
                      onClick={() => cambiarCantidad(producto.id, 1)}
                      disabled={submitting || cantidad >= producto.stock}
                      aria-label={`Aumentar cantidad de ${producto.nombre}`}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>

                  <strong className="carrito-subtotal">
                    {formatter.format(producto.precio * cantidad)}
                  </strong>
                  <button
                    type="button"
                    className="icon-button carrito-remove"
                    onClick={() => quitar(producto.id)}
                    disabled={submitting}
                    aria-label={`Quitar ${producto.nombre}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>

            <div className="carrito-footer">
              <p className="carrito-total">
                Total <strong>{formatter.format(total)}</strong>
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={() => void confirmarPedido()}
                disabled={submitting || cargandoCatalogo || Boolean(errorCatalogo)}
              >
                {submitting ? (
                  'Creando pedido…'
                ) : (
                  <><ShoppingBag size={16} /> Confirmar pedido</>
                )}
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  );
}
