  // src/api/catalogo.ts
  //
  // Funciones relacionadas con el catálogo de productos.
  // Este archivo no contiene componentes visuales.
  // Solo se encarga de comunicarse con el backend mediante ApiClient.

  import type { ApiClient } from './client';

  export interface Producto {
    id: string | number;
    nombre: string;
    descripcion: string;
    precio: number;
    stock: number;
  }

  export type CrearProductoRequest = Omit<Producto, 'id'>;
  export type ActualizarProductoRequest = Partial<CrearProductoRequest>;

  interface CatalogoResponse {
    items?: Producto[];
    productos?: Producto[];
    catalogo?: Producto[];
    data?: Producto[];
  }

  function esProducto(value: unknown): value is Producto {
    if (typeof value !== 'object' || value === null) return false;
    const producto = value as Record<string, unknown>;
    return (typeof producto.id === 'string' || typeof producto.id === 'number') &&
      typeof producto.nombre === 'string' &&
      typeof producto.descripcion === 'string' &&
      typeof producto.precio === 'number' &&
      typeof producto.stock === 'number';
  }

  function extraerProductos(response: unknown): Producto[] {
    const candidate = Array.isArray(response)
      ? response
      : typeof response === 'object' && response !== null
        ? (() => {
            const wrapper = response as CatalogoResponse;
            return wrapper.items ?? wrapper.productos ?? wrapper.catalogo ?? wrapper.data;
          })()
        : undefined;

    if (!Array.isArray(candidate) || !candidate.every(esProducto)) {
      throw new Error('La respuesta del catálogo tiene un formato no reconocido.');
    }

    return candidate;
  }

  export async function listarCatalogo(
    api: ApiClient,
  ): Promise<Producto[]> {
    const response = await api.get<unknown>('/catalogo');
    return extraerProductos(response);
  }

  export function obtenerProducto(api: ApiClient, id: string | number): Promise<Producto> {
    return api.get<Producto>(`/catalogo/${encodeURIComponent(id)}`);
  }

  export function crearProducto(api: ApiClient, producto: CrearProductoRequest): Promise<Producto> {
    return api.post<Producto>('/catalogo', producto);
  }

  /**
   * Catalogo de escaparate (la vista de compra).
   *
   * Es distinto del catalogo administrativo: el Cliente no puede leer
   * `GET /catalogo` (403 por rol), pero si puede leer esta vista, que devuelve
   * solo los datos publicos del producto y el stock REAL.
   */
  export async function listarCatalogoCompra(api: ApiClient): Promise<Producto[]> {
    const respuesta = await api.get<unknown>('/catalogo/comprar');
    return extraerProductos(respuesta);
  }

  export function actualizarProducto(
    api: ApiClient,
    id: string | number,
    producto: ActualizarProductoRequest,
  ): Promise<Producto> {
    return api.put<Producto>(`/catalogo/${encodeURIComponent(id)}`, producto);
  }

  export function eliminarProducto(api: ApiClient, id: string | number): Promise<void> {
    return api.delete<void>(`/catalogo/${encodeURIComponent(id)}`);
  }