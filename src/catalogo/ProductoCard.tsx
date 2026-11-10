/**
 * PEDIDOS360 — TARJETA PASTEL DE PRODUCTO
 * Archivo: src/catalogo/ProductoCard.tsx
 *
 * Solo presenta información real y comunica los clics a Catalogo.tsx.
 * Imágenes: primero usa imagenUrl si algún día el backend la devuelve;
 * después busca una imagen local con el nombre del producto y,
 * finalmente, muestra un icono. Este archivo NO sube imágenes a AWS.
 */
import {
  Camera,
  Cable,
  Headphones,
  Keyboard,
  Laptop,
  Mouse,
  Package,
  Pencil,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import type { Producto } from '../API/catalogoApi';

interface ProductoCardProps {
  producto: Producto;
  canWrite: boolean;
  deleting: boolean;
  onEdit: (producto: Producto) => void;
  onDelete: (producto: Producto) => void;
}

const formatoCLP = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/** Carga referencias a recursos locales incluidos en el build de Vite. */
const imagenesLocales = import.meta.glob<string>(
  '../imagenes/productos/*.{png,jpg,jpeg,webp,svg,avif}',
  { eager: true, query: '?url', import: 'default' },
);

function normalizarNombre(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const indiceImagenes = new Map<string, string>(
  Object.entries(imagenesLocales).map(([ruta, url]) => {
    const nombreArchivo = (ruta.split('/').pop() ?? '').replace(/\.[^.]+$/, '');
    return [normalizarNombre(nombreArchivo), url];
  }),
);

function elegirIcono(nombre: string): LucideIcon {
  const nombreNormalizado = normalizarNombre(nombre);
  if (/audifon|auricular|headphone|headset/.test(nombreNormalizado)) return Headphones;
  if (/mouse|raton/.test(nombreNormalizado)) return Mouse;
  if (/teclado|keyboard/.test(nombreNormalizado)) return Keyboard;
  if (/webcam|camara|camera/.test(nombreNormalizado)) return Camera;
  if (/notebook|portatil|laptop|soporte/.test(nombreNormalizado)) return Laptop;
  if (/hub|usb|cable|adaptador/.test(nombreNormalizado)) return Cable;
  return Package;
}

/** Mismo producto, mismo color, aunque cambien los filtros o el orden. */
function elegirTono(nombre: string): string {
  const tonos = ['violet', 'cyan', 'pink', 'blue', 'purple', 'coral'];
  const codigo = [...nombre].reduce((suma, letra) => suma + letra.charCodeAt(0), 0);
  return tonos[codigo % tonos.length];
}

export function ProductoCard({
  producto,
  canWrite,
  deleting,
  onEdit,
  onDelete,
}: ProductoCardProps) {
  const agotado = producto.stock <= 0;
  const stockBajo = producto.stock > 0 && producto.stock <= 5;
  const Icono = elegirIcono(producto.nombre);
  const tono = elegirTono(producto.nombre);

  // Compatibilidad visual para cuando la API incorpore imagenUrl.
  // Esto NO crea ni guarda ese campo en DynamoDB.
  const productoConImagen = producto as Producto & { imagenUrl?: string | null };
  const urlDeApi = productoConImagen.imagenUrl;
  const imagenRemota = typeof urlDeApi === 'string' && /^https:\/\//i.test(urlDeApi)
    ? urlDeApi
    : undefined;
  const imagen = imagenRemota ?? indiceImagenes.get(normalizarNombre(producto.nombre));

  return (
    <article className={`product-card product-card--${tono}`} aria-busy={deleting}>
      <div className="product-card-visual">
        {imagen ? (
          <img src={imagen} alt={`Imagen de ${producto.nombre}`} loading="lazy" />
        ) : (
          <Icono className="product-card-placeholder-icon" size={55} strokeWidth={1.7} aria-hidden="true" />
        )}
      </div>

      <div className="product-card-body">
        <div className="product-card-heading">
          <h2>{producto.nombre}</h2>
          <span className={`stock-badge${agotado ? ' is-empty' : stockBajo ? ' is-low' : ''}`}>
            {agotado ? 'Sin stock' : `${producto.stock} en stock`}
          </span>
        </div>

        <p className="product-description">{producto.descripcion}</p>

        <div className="product-card-footer">
          <strong className="product-price">{formatoCLP.format(producto.precio)}</strong>
          {canWrite && (
            <div className="card-actions">
              <button
                type="button"
                className="icon-button product-edit"
                aria-label={`Editar ${producto.nombre}`}
                title="Editar producto"
                onClick={() => onEdit(producto)}
                disabled={deleting}
              >
                <Pencil size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="icon-button danger-action product-delete"
                aria-label={`Eliminar ${producto.nombre}`}
                title="Eliminar producto"
                onClick={() => onDelete(producto)}
                disabled={deleting}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>
      {deleting && <span className="card-pending" role="status">Eliminando…</span>}
    </article>
  );
}
