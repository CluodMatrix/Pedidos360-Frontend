/**
 * ============================================================
 * PEDIDOS360 — API DEL CATÁLOGO
 * Archivo: src/API/catalogoApi.ts
 * ============================================================
 *
 * ¿PARA QUÉ SIRVE?
 * Contiene las operaciones necesarias para administrar
 * los productos del catálogo de Pedidos360.
 *
 * FUNCIONES:
 * - listarCatalogo(): obtiene todos los productos.
 * - obtenerProducto(): obtiene un producto por ID.
 * - crearProducto(): registra un producto.
 * - listarCatalogoCompra(): obtiene productos para comprar.
 * - actualizarProducto(): modifica un producto.
 * - eliminarProducto(): elimina un producto.
 *
 * CONEXIONES:
 * - API/clienteApi.ts: ejecuta las solicitudes HTTP.
 * - catalogo/Catalogo.tsx: interfaz del catálogo.
 * - catalogo/Comprar.tsx: interfaz de compras.
 * - AWS API Gateway: recibe las solicitudes.
 * - Lambda pedidos360-catalogo: procesa las operaciones.
 * - DynamoDB: almacena los productos.
 *
 * IMPORTANTE:
 * Este archivo NO consulta directamente DynamoDB.
 * Siempre utiliza el cliente HTTP para llamar al backend.
 */

// Importamos solamente el tipo ApiClient.
// Se encuentra dentro de nuestra misma carpeta API.
//
// "import type" significa que TypeScript necesita conocer
// la estructura del tipo, pero no requiere importar
// un valor de JavaScript durante la ejecución.
import type { ApiClient } from './clienteApi';

/**
 * INTERFAZ: Producto
 * Define cómo debe representarse un producto
 * dentro de nuestro frontend.
 * id:
 * Identificador único del producto.
 * nombre:
 * Nombre visible del producto.
 * descripcion:
 * Información descriptiva.
 * precio:
 * Precio numérico del producto.
 * stock:
 * Cantidad disponible en inventario.
 * Esta interfaz también puede importarse desde
 * los componentes que muestran productos.
 */

export interface Producto {
  id: string | number;
  nombre: string;
  descripcion: string;
  precio: number;
  stock: number;
}

/**
 * TIPO: CrearProductoRequest
 * Request = solicitud.
 
 * Define los datos que enviamos al crear un producto.
 
 * Omit<Producto, 'id'>:
 * Utiliza los campos de Producto, excepto id.
 
 * El backend es responsable de generar o asignar
 * el identificador del producto.
 */

export type CrearProductoRequest = Omit<Producto, 'id'>;

/**
 * TIPO: ActualizarProductoRequest
 *
 * Partial convierte los campos en opcionales.
 *
 * ¿Para qué sirve?
 * Permite actualizar uno o varios atributos
 * sin tener que enviar todo el producto.
 *
 * Ejemplo:
 * { precio: 15000 }
 *
 * Esto depende de que el backend admita
 * actualizaciones parciales, como en tu proyecto.
 */
export type ActualizarProductoRequest =
  Partial<CrearProductoRequest>;

/**
 * INTERFAZ: CatalogoResponse
 * Response = respuesta.
 *
 * Algunas API devuelven listas dentro de objetos
 * con nombres diferentes.
 *
 * Ejemplos:
 * { items: [...] }
 * { productos: [...] }
 *
 * Esta interfaz permite reconocer distintos formatos.
 */

interface CatalogoResponse {
  items?: Producto[];
  productos?: Producto[];
  catalogo?: Producto[];
  data?: Producto[];
}

/**
 * FUNCIÓN: esProducto()
 *
 * ¿PARA QUÉ SIRVE?
 * Comprueba en tiempo de ejecución si un valor
 * tiene los campos esperados de un Producto.
 *
 * PARÁMETRO:
 * value: valor de origen desconocido.
 *
 * DEVUELVE:
 * true si cumple la estructura;
 * false en caso contrario.
 *
 * "value is Producto":
 * Es un type guard de TypeScript.
 *
 * Type guard = comprobación que ayuda a TypeScript
 * a reconocer el tipo de un dato.
 *
 * CONEXIÓN:
 * Se utiliza dentro de extraerProductos().
 */

function esProducto(value: unknown): value is Producto {

  // Primero comprobamos que sea un objeto.
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  // Convertimos el dato en un registro de propiedades.
  const producto = value as Record<string, unknown>;

  // Revisamos los tipos de sus propiedades.
  return (
    (typeof producto.id === 'string' ||
      typeof producto.id === 'number') &&
    typeof producto.nombre === 'string' &&
    typeof producto.descripcion === 'string' &&
    typeof producto.precio === 'number' &&
    typeof producto.stock === 'number'
  );
}

/**
 * FUNCIÓN: extraerProductos()
 *
 * ¿PARA QUÉ SIRVE?
 * Convierte una respuesta del backend
 * en una lista válida de productos.
 *
 * PARÁMETRO:
 * response: respuesta obtenida desde la API.
 *
 * DEVUELVE:
 * Producto[]: arreglo de productos.
 *
 * FLUJO:
 * 1. Comprueba si la respuesta ya es un arreglo.
 * 2. Si es un objeto, busca la lista en varios campos.
 * 3. Verifica que cada elemento sea un producto.
 * 4. Devuelve la lista o genera un error.
 *
 * CONEXIÓN:
 * - esProducto(): verifica cada producto.
 * - listarCatalogo(): procesa su respuesta.
 * - listarCatalogoCompra(): procesa su respuesta.
 */
function extraerProductos(response: unknown): Producto[] {

  // Buscamos el arreglo de productos.
  const candidate = Array.isArray(response)
    ? response
    : typeof response === 'object' && response !== null
      ? (() => {
          const wrapper = response as CatalogoResponse;
          return (
            wrapper.items ??
            wrapper.productos ??
            wrapper.catalogo ??
            wrapper.data
          );
        })()
      : undefined;

  /**
   * every(esProducto):
   * Comprueba que todos los elementos
   * cumplan la estructura de Producto.
   *
   * Si el formato es incorrecto, avisamos
   * en lugar de mostrar información inválida.
   */
  if (!Array.isArray(candidate) || !candidate.every(esProducto)) {
    throw new Error(
      'La respuesta del catálogo tiene un formato no reconocido.',
    );
  }

  return candidate;
}

/**
 * FUNCIÓN: listarCatalogo()
 *
 * ¿PARA QUÉ SIRVE?
 * Obtiene el catálogo administrativo desde AWS.
 *
 * PARÁMETRO:
 * api: cliente HTTP configurado para el usuario activo.
 *
 * DEVUELVE:
 * Promise<Producto[]>: lista de productos.
 *
 * CONEXIÓN AWS:
 * GET /catalogo
 *      ↓
 * API Gateway (catalog.read)
 *      ↓
 * Lambda pedidos360-catalogo
 *      ↓
 * DynamoDB
 *
 * El backend decide qué roles pueden consultar esta ruta.
 */
export async function listarCatalogo(
  api: ApiClient,
): Promise<Producto[]> {

  // Ejecutamos la solicitud GET.
  const response = await api.get<unknown>('/catalogo');

  // Validamos y extraemos los productos.
  return extraerProductos(response);
}

/**
 * FUNCIÓN: obtenerProducto()
 *
 * ¿PARA QUÉ SIRVE?
 * Busca un producto específico utilizando su ID.
 *
 * MÉTODO HTTP: GET
 * RUTA: /catalogo/{id}
 *
 * encodeURIComponent:
 * Convierte caracteres especiales del ID
 * en una forma segura para colocarlos en la URL.
 *
 * EJEMPLO:
 * obtenerProducto(api, 'prod-teclado-001')
 *
 * DEVUELVE:
 * Promise<Producto>
 */
export function obtenerProducto(
  api: ApiClient,
  id: string | number,
): Promise<Producto> {
  return api.get<Producto>(
    `/catalogo/${encodeURIComponent(id)}`,
  );
}

/**
 * FUNCIÓN: crearProducto()
 *
 * ¿PARA QUÉ SIRVE?
 * Envía al backend los datos de un nuevo producto.
 *
 * MÉTODO HTTP: POST
 * RUTA: /catalogo
 * SCOPE: catalog.write
 *
 * POST = enviar información para crear un recurso.
 *
 * PARÁMETROS:
 * api: cliente de conexión.
 * producto: datos del producto que queremos crear.
 *
 * CONEXIÓN:
 * Catalogo.tsx -> crearProducto()
 * -> clienteApi.ts -> API Gateway -> Lambda
 * -> DynamoDB.
 *
 * El backend debe verificar que el usuario
 * tenga los permisos para crear productos.
 */
export function crearProducto(
  api: ApiClient,
  producto: CrearProductoRequest,
): Promise<Producto> {
  return api.post<Producto>('/catalogo', producto);
}

/**
 * FUNCIÓN: listarCatalogoCompra()
 *
 * ¿PARA QUÉ SIRVE?
 * Obtiene los productos disponibles para la vista de compra.
 *
 * Esta consulta es diferente del catálogo administrativo.
 *
 * MÉTODO HTTP: GET
 * RUTA: /catalogo/comprar
 *
 * En tu backend, esta ruta permite ofrecer la
 * información necesaria para que un Cliente compre,
 * incluyendo el stock real de los productos.
 *
 * CONEXIÓN:
 * Comprar.tsx -> listarCatalogoCompra()
 * -> clienteApi.ts -> API Gateway
 * -> Lambda pedidos360-catalogo.
 *
 * IMPORTANTE:
 * Aunque esta ruta y GET /catalogo puedan requerir
 * catalog.read en API Gateway, el backend aplica
 * sus propias reglas de roles.
 */
export async function listarCatalogoCompra(
  api: ApiClient,
): Promise<Producto[]> {

  const respuesta = await api.get<unknown>('/catalogo/comprar');

  return extraerProductos(respuesta);
}

/**
 * FUNCIÓN: actualizarProducto()
 *
 * ¿PARA QUÉ SIRVE?
 * Modifica los datos de un producto existente.
 *
 * MÉTODO HTTP: PUT
 * RUTA: /catalogo/{id}
 * SCOPE: catalog.write
 *
 * PUT = enviar cambios de un recurso.
 *
 * En este proyecto el backend permite
 * recibir campos parciales para actualizar.
 *
 * PARÁMETROS:
 * id: identificador del producto.
 * producto: campos que queremos modificar.
 */
export function actualizarProducto(
  api: ApiClient,
  id: string | number,
  producto: ActualizarProductoRequest,
): Promise<Producto> {
  return api.put<Producto>(
    `/catalogo/${encodeURIComponent(id)}`,
    producto,
  );
}

/**
 * FUNCIÓN: eliminarProducto()
 *
 * ¿PARA QUÉ SIRVE?
 * Solicita eliminar un producto del catálogo.
 *
 * MÉTODO HTTP: DELETE
 * RUTA: /catalogo/{id}
 * SCOPE: catalog.write
 *
 * DELETE = eliminar.
 *
 * Promise<void>:
 * La función no espera devolver un producto.
 *
 * IMPORTANTE:
 * La eliminación real ocurre en el backend,
 * después de comprobar los permisos.
 */
export function eliminarProducto(
  api: ApiClient,
  id: string | number,
): Promise<void> {
  return api.delete<void>(
    `/catalogo/${encodeURIComponent(id)}`,
  );
}
