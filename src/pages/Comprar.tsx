// src/pages/Comprar.tsx
//
// Vista "Comprar" del Cliente. Muestra los productos de demostración
// sembrados en DynamoDB (mismos IDs que scripts/seed_products.py del
// backend) y permite armar un carrito temporal en React. Al confirmar se
// crea un pedido REAL en el backend (POST /pedidos); el backend valida que
// el producto exista, calcula precios y total, y deriva la identidad del JWT.
//
// Esta pantalla NO es el catálogo administrativo: no usa GET /catalogo
// (que el Cliente no tiene permitido) y no ofrece opciones de gestión.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';

import { useApi } from '../components/useApi';
import { apiErrorMessage } from '../api/client';
import { listarCatalogoCompra } from '../api/catalogo';
import { crearPedido, type Pedido } from '../api/pedidos';
import { PageHeader } from '../components/layout/PageHeader';
import { LoadingState } from '../components/common/LoadingState';

import img01 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 11_25_45.png';
import img02 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 11_47_53.png';
import img03 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_05.png';
import img04 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_07.png';
import img05 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_11.png';
import img06 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_18.png';

interface ProductoCompra {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
  imagen: string;
}

// Fuente de demostración de compra: los IDs coinciden 1:1 con el seed
// del backend (scripts/seed_products.py). Precios y stock = valores del seed.
const PRODUCTOS_DEMO: ProductoCompra[] = [
  { id: 'prod-teclado-001', nombre: 'Teclado Mecánico Compacto', descripcion: 'Teclado compacto para trabajo y estudio.', precio: 39990, stock: 20, imagen: img01 },
  { id: 'prod-mouse-002', nombre: 'Mouse Inalámbrico', descripcion: 'Mouse ergonómico para uso diario.', precio: 18990, stock: 30, imagen: img02 },
  { id: 'prod-audifonos-003', nombre: 'Audífonos USB', descripcion: 'Audífonos con micrófono integrado.', precio: 24990, stock: 15, imagen: img03 },
  { id: 'prod-webcam-004', nombre: 'Webcam Full HD', descripcion: 'Cámara para reuniones y videollamadas.', precio: 32990, stock: 12, imagen: img04 },
  { id: 'prod-hub-005', nombre: 'Hub USB-C', descripcion: 'Adaptador multipuerto para notebook.', precio: 28990, stock: 18, imagen: img05 },
  { id: 'prod-soporte-006', nombre: 'Soporte para Notebook', descripcion: 'Soporte ajustable para escritorio.', precio: 21990, stock: 25, imagen: img06 },
];

interface LineaCarrito {
  producto: ProductoCompra;
  cantidad: number;
}

const formatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

export function Comprar() {
  const api = useApi();
  const [carrito, setCarrito] = useState<LineaCarrito[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<Pedido | null>(null);
  // Productos del catalogo REAL (endpoint /catalogo/comprar). Si el endpoint
  // no responde, se usa la lista demo como respaldo para no dejar la pantalla
  // vacia.
  const [productos, setProductos] = useState<ProductoCompra[]>(PRODUCTOS_DEMO);
  const [cargandoCatalogo, setCargandoCatalogo] = useState(true);

  useEffect(() => {
    if (!api) return undefined;
    let vigente = true;
    listarCatalogoCompra(api)
      .then((datos) => {
        if (!vigente || !datos.length) return;
        // Se conservan las imagenes de la demo para los productos conocidos.
        const imagenes = new Map(PRODUCTOS_DEMO.map((p) => [p.id, p.imagen]));
        setProductos(
          datos.map((p) => ({
            id: String(p.id),
            nombre: p.nombre,
            descripcion: p.descripcion,
            precio: p.precio,
            stock: p.stock,
            imagen: imagenes.get(String(p.id)) ?? '',
          })),
        );
      })
      .catch(() => {
        /* se mantiene la lista demo */
      })
      .finally(() => {
        if (vigente) setCargandoCatalogo(false);
      });
    return () => {
      vigente = false;
    };
  }, [api]);

  const enCarrito = (id: string) => carrito.find((linea) => linea.producto.id === id);

  function agregar(producto: ProductoCompra) {
    setError(null);
    setCarrito((actual) => {
      const existente = actual.find((linea) => linea.producto.id === producto.id);
      if (!existente) return [...actual, { producto, cantidad: 1 }];
      if (existente.cantidad >= producto.stock) return actual;
      return actual.map((linea) =>
        linea.producto.id === producto.id
          ? { ...linea, cantidad: linea.cantidad + 1 }
          : linea,
      );
    });
  }

  function cambiarCantidad(id: string, delta: number) {
    setCarrito((actual) =>
      actual
        .map((linea) =>
          linea.producto.id === id
            ? { ...linea, cantidad: Math.min(linea.producto.stock, Math.max(1, linea.cantidad + delta)) }
            : linea,
        )
        .filter((linea) => linea.cantidad > 0),
    );
  }

  function quitar(id: string) {
    setCarrito((actual) => actual.filter((linea) => linea.producto.id !== id));
  }

  const total = carrito.reduce((suma, linea) => suma + linea.producto.precio * linea.cantidad, 0);

  async function confirmarPedido() {
    if (!api || carrito.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const pedido = await crearPedido(api, {
        productos: carrito.map((linea) => ({ productoId: linea.producto.id, cantidad: linea.cantidad })),
      });
      setConfirmado(pedido);
      setCarrito([]);
    } catch (reason) {
      setError(apiErrorMessage(reason));
    } finally {
      setSubmitting(false);
    }
  }

  if (!api) {
    return <LoadingState message="Conectando con el backend…" />;
  }

  if (confirmado) {
    return (
      <section className="page-stack">
        <PageHeader eyebrow="Compra realizada" title="¡Pedido creado!" subtitle="Tu pedido quedó registrado en el sistema." />
        <div className="state-panel state-success surface" role="status">
          <p className="form-success">Pedido #{confirmado.id} creado en estado {confirmado.estado}.</p>
          <p className="muted-copy">Total: {formatter.format(confirmado.total ?? total)}</p>
        </div>
        <div className="shortcut-grid">
          <Link to="/pedidos" className="shortcut-card">
            <span className="shortcut-icon"><ShoppingBag size={20} strokeWidth={1.8} /></span>
            <span className="shortcut-copy"><strong>Mis pedidos</strong><small>Ver el seguimiento de tu pedido</small></span>
            <ArrowRight className="shortcut-arrow" size={17} />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Comprar"
        title="Productos disponibles"
        subtitle="Catálogo del backend con el stock real. El pedido se crea contra la base de datos."
      />

      <div className="product-grid">
        {productos.map((producto) => {
          const linea = enCarrito(producto.id);
          return (
            <article className="product-card comprar-card" key={producto.id}>
              <div className="product-media">
                {producto.imagen ? (
                  <img src={producto.imagen} alt={producto.nombre} />
                ) : (
                  <span className="product-media-placeholder" aria-hidden="true">
                    {producto.nombre.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="product-card-heading">
                <div>
                  <p className="card-overline">{cargandoCatalogo ? 'Cargando' : 'Catálogo'}</p>
                  <h2>{producto.nombre}</h2>
                </div>
                <span className={producto.stock > 0 ? 'stock-badge' : 'stock-badge is-empty'}>
                  {producto.stock > 0 ? `${producto.stock} en stock` : 'Agotado'}
                </span>
              </div>
              <p className="product-description">{producto.descripcion}</p>
              <div className="product-card-footer">
                <strong className="product-price">{formatter.format(producto.precio)}</strong>
                <button
                  className="primary-button"
                  onClick={() => agregar(producto)}
                  disabled={producto.stock === 0 || submitting}
                >
                  <Plus size={15} />{linea ? `Agregar (${linea.cantidad})` : 'Agregar'}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <section className="surface carrito-panel" aria-labelledby="carrito-heading">
        <div className="section-heading">
          <div><p className="page-eyebrow">CARRITO</p><h2 id="carrito-heading">Tu selección</h2></div>
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
                  <div className="stepper" aria-label={`Cantidad de ${producto.nombre}`}>
                    <button onClick={() => cambiarCantidad(producto.id, -1)} disabled={submitting} aria-label="Disminuir cantidad"><Minus size={14} /></button>
                    <span>{cantidad}</span>
                    <button onClick={() => cambiarCantidad(producto.id, 1)} disabled={submitting || cantidad >= producto.stock} aria-label="Aumentar cantidad"><Plus size={14} /></button>
                  </div>
                  <strong className="carrito-subtotal">{formatter.format(producto.precio * cantidad)}</strong>
                  <button className="icon-button carrito-remove" onClick={() => quitar(producto.id)} disabled={submitting} aria-label={`Quitar ${producto.nombre}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <div className="carrito-footer">
              <p className="carrito-total">Total <strong>{formatter.format(total)}</strong></p>
              <button className="primary-button" onClick={() => void confirmarPedido()} disabled={submitting || carrito.length === 0}>
                {submitting ? 'Creando pedido…' : <><ShoppingBag size={16} />Confirmar pedido</>}
              </button>
            </div>
          </>
        )}
      </section>
    </section>
  );
}