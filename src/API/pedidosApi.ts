
/**
 * ============================================================
 * PEDIDOS360 — API DE PEDIDOS
 * Archivo: src/API/pedidosApi.ts
 * ============================================================
 *
 * ¿PARA QUÉ SIRVE?
 * Contiene los tipos y funciones necesarios para
 * gestionar pedidos desde el frontend.
 *
 * FUNCIONES:
 * - transicionesPermitidas(): indica los cambios de estado.
 * - listarPedidos(): obtiene los pedidos.
 * - obtenerPedido(): consulta un pedido por ID.
 * - crearPedido(): registra un pedido.
 * - actualizarEstadoPedido(): cambia el estado.
 * - cancelarPedido(): solicita la cancelación.
 *
 * CONEXIONES:
 * - API/clienteApi.ts: realiza solicitudes HTTP.
 * - pedidos/Pedidos.tsx: muestra y gestiona pedidos.
 * - catalogo/Comprar.tsx: permite crear pedidos.
 * - AWS API Gateway: recibe las solicitudes.
 * - Lambda pedidos360-pedidos: ejecuta las operaciones.
 * - DynamoDB: guarda la información.
 *
 * EVENTOS:
 * El backend también puede publicar eventos en SNS
 * cuando se crean o cambian pedidos.
 *
 * IMPORTANTE:
 * Las reglas definitivas de stock, precios y estados
 * deben comprobarse siempre en el backend.
 */

// Importamos el tipo de cliente HTTP.
import type { ApiClient } from './clienteApi';

/**
 * TIPO: EstadoPedido
 *
 * Define los estados que puede tener un pedido.
 *
 * Union type = tipo unión.
 *
 * Significa que el valor solamente puede ser
 * una de las alternativas definidas.
 *
 * ESTADOS:
 * CREADO: pedido registrado.
 * ACEPTADO: pedido aceptado.
 * EN_PREPARACION: pedido en preparación.
 * DESPACHADO: pedido enviado.
 * ENTREGADO: pedido recibido.
 * CANCELADO: pedido cancelado.
 */
export type EstadoPedido =
  | 'CREADO'
  | 'ACEPTADO'
  | 'EN_PREPARACION'
  | 'DESPACHADO'
  | 'ENTREGADO'
  | 'CANCELADO';

/**
 * INTERFAZ: Pedido
 *
 * Define la estructura de un pedido en React.
 *
 * id: identificador único.
 * clienteId: identificador del cliente.
 * clienteNombre: nombre del cliente.
 * estado: situación actual del pedido.
 * fechaCreacion: fecha de registro.
 * fechaActualizacion: última actualización.
 * total: importe total calculado por el backend.
 * productos: artículos incluidos en el pedido.
 */
export interface Pedido {
  id: string | number;
  clienteId: string;
  clienteNombre: string;
  estado: EstadoPedido;
  fechaCreacion: string;
  fechaActualizacion: string;
  total: number;
  productos: ProductoPedido[];
}

/**
 * INTERFAZ: ProductoPedido
 *
 * Representa un producto dentro de un pedido.
 *
 * productoId: identificador del artículo.
 * nombre?: campo opcional.
 * cantidad: unidades solicitadas.
 * precio?: precio asociado al producto.
 *
 * El signo ? significa que una propiedad
 * puede estar ausente.
 */
export interface ProductoPedido {
  productoId: string | number;
  nombre?: string;
  cantidad: number;
  precio?: number;
}

/**
 * INTERFAZ: CrearPedidoRequest
 *
 * Define los datos que enviamos al crear un pedido.
 *
 * El frontend envía productos y cantidades.
 *
 * IMPORTANTE:
 * No enviamos un total como valor de confianza.
 * El backend calcula el total y comprueba
 * precios, existencia y stock.
 */
export interface CrearPedidoRequest {
  productos: {
    productoId: string | number;
    cantidad: number;
  }[];
}

/**
 * INTERFAZ: ActualizarEstadoPedidoRequest
 *
 * Define la información enviada al modificar
 * el estado de un pedido.
 *
 * Ejemplo:
 * { estado: 'ACEPTADO' }
 */
export interface ActualizarEstadoPedidoRequest {
  estado: EstadoPedido;
}

/**
 * INTERFAZ: PedidosResponse
 *
 * Define posibles formatos de respuesta
 * utilizados por una API para devolver pedidos.
 *
 * items: artículos o elementos.
 * pedidos: lista de pedidos.
 * data: datos.
 */
interface PedidosResponse {
  items?: Pedido[];
  pedidos?: Pedido[];
  data?: Pedido[];
}

/**
 * FUNCIÓN: transicionesPermitidas()
 *
 * ¿PARA QUÉ SIRVE?
 * Indica a qué estados puede pasar un pedido
 * desde su estado actual.
 *
 * PARÁMETRO:
 * estado: estado actual del pedido.
 *
 * DEVUELVE:
 * EstadoPedido[]: lista de estados posibles.
 *
 * switch:
 * Estructura que selecciona un resultado
 * dependiendo del valor recibido.
 *
 * EJEMPLO:
 * transicionesPermitidas('CREADO')
 * Devuelve ['ACEPTADO', 'CANCELADO'].
 *
 * CONEXIÓN:
 * La interfaz puede utilizar esta función
 * para mostrar las acciones disponibles.
 *
 * IMPORTANTE:
 * Esta función no cambia ningún pedido.
 * El backend aplica y valida las transiciones reales.
 */
export function transicionesPermitidas(
  estado: EstadoPedido,
): EstadoPedido[] {
  switch (estado) {

    // Pedido recién creado.
    case 'CREADO':
      return ['ACEPTADO', 'CANCELADO'];

    // Pedido aceptado por el negocio.
    case 'ACEPTADO':
      return ['EN_PREPARACION', 'CANCELADO'];

    // Pedido actualmente en preparación.
    case 'EN_PREPARACION':
      return ['DESPACHADO', 'CANCELADO'];

    // Pedido enviado y pendiente de entrega.
    case 'DESPACHADO':
      return ['ENTREGADO'];

    // Estados finales: sin transiciones disponibles.
    case 'ENTREGADO':
    case 'CANCELADO':
      return [];
  }
}

/**
 * FUNCIÓN: listarPedidos()
 *
 * ¿PARA QUÉ SIRVE?
 * Consulta los pedidos registrados en el backend.
 *
 * MÉTODO HTTP: GET
 * RUTA: /pedidos
 * SCOPE: orders.read
 *
 * CONEXIÓN AWS:
 * React -> clienteApi.ts -> API Gateway
 * -> Lambda pedidos360-pedidos -> DynamoDB.
 *
 * IMPORTANTE:
 * El backend debe decidir qué pedidos puede
 * consultar el usuario según su rol e identidad.
 *
 * Por ejemplo:
 * - Cliente: solamente sus pedidos.
 * - Personal autorizado: pedidos según sus permisos.
 */
export async function listarPedidos(
  api: ApiClient,
): Promise<Pedido[]> {

  // Solicitamos los pedidos al backend.
  const response = await api.get<
    Pedido[] | PedidosResponse
  >('/pedidos');

  // Si recibimos directamente un arreglo, lo devolvemos.
  if (Array.isArray(response)) {
    return response;
  }

  // Si la respuesta contiene la propiedad items.
  if (response.items) {
    return response.items;
  }

  // Si la respuesta contiene la propiedad pedidos.
  if (response.pedidos) {
    return response.pedidos;
  }

  // Si la respuesta contiene la propiedad data.
  if (response.data) {
    return response.data;
  }

  /**
   * Si no encontramos alguna de las estructuras
   * esperadas, devolvemos una lista vacía.
   *
   * OBSERVACIÓN:
   * Esto conserva el comportamiento original,
   * aunque podría ocultar un formato inesperado.
   */
  return [];
}

/**
 * FUNCIÓN: obtenerPedido()
 *
 * ¿PARA QUÉ SIRVE?
 * Consulta un pedido específico por ID.
 *
 * MÉTODO HTTP: GET
 * RUTA: /pedidos/{id}
 * SCOPE: orders.read
 *
 * encodeURIComponent:
 * Codifica el identificador para utilizarlo
 * correctamente en una URL.
 *
 * DEVUELVE:
 * Promise<Pedido>
 *
 * El backend debe verificar que el usuario
 * esté autorizado a consultar ese pedido.
 */
export async function obtenerPedido(
  api: ApiClient,
  id: string | number,
): Promise<Pedido> {
  return api.get<Pedido>(
    `/pedidos/${encodeURIComponent(id)}`,
  );
}

/**
 * FUNCIÓN: crearPedido()
 *
 * ¿PARA QUÉ SIRVE?
 * Envía una nueva compra al backend.
 *
 * MÉTODO HTTP: POST
 * RUTA: /pedidos
 * SCOPE: orders.write
 *
 * PARÁMETROS:
 * api: cliente HTTP.
 * pedido: productos y cantidades solicitadas.
 *
 * CONEXIÓN AWS:
 * Comprar.tsx -> crearPedido()
 * -> clienteApi.ts -> API Gateway
 * -> Lambda pedidos360-pedidos.
 *
 * En el backend se realizan tareas como:
 * - Validar los productos.
 * - Comprobar stock.
 * - Calcular el importe total.
 * - Registrar el pedido en DynamoDB.
 * - Descontar stock.
 * - Publicar un evento en SNS si corresponde.
 *
 * IMPORTANTE:
 * Esta función frontend solo envía la solicitud;
 * las operaciones de negocio ocurren en AWS.
 */
export async function crearPedido(
  api: ApiClient,
  pedido: CrearPedidoRequest,
): Promise<Pedido> {
  return api.post<Pedido>(
    '/pedidos',
    pedido,
  );
}

/**
 * FUNCIÓN: actualizarEstadoPedido()
 *
 * ¿PARA QUÉ SIRVE?
 * Solicita cambiar el estado de un pedido.
 *
 * MÉTODO HTTP: PUT
 * RUTA: /pedidos/{id}/estado
 * SCOPE: orders.write
 *
 * PARÁMETROS:
 * id: identificador del pedido.
 * estado: nuevo estado solicitado.
 *
 * CONEXIÓN:
 * Pedidos.tsx -> actualizarEstadoPedido()
 * -> clienteApi.ts -> API Gateway
 * -> Lambda pedidos360-pedidos.
 *
 * Lambda debe comprobar que la transición
 * sea válida y que el usuario pueda realizarla.
 */
export async function actualizarEstadoPedido(
  api: ApiClient,
  id: string | number,
  estado: EstadoPedido,
): Promise<Pedido> {

  // Construimos el cuerpo de la solicitud.
  const body: ActualizarEstadoPedidoRequest = {
    estado,
  };

  // Enviamos la actualización al backend.
  return api.put<Pedido>(
    `/pedidos/${encodeURIComponent(id)}/estado`,
    body,
  );
}

/**
 * FUNCIÓN: cancelarPedido()
 *
 * ¿PARA QUÉ SIRVE?
 * Solicita la cancelación de un pedido.
 *
 * No realiza una solicitud diferente.
 * Reutiliza actualizarEstadoPedido().
 *
 * ESTADO SOLICITADO:
 * CANCELADO
 *
 * CONEXIÓN:
 * cancelarPedido()
 * -> actualizarEstadoPedido()
 * -> clienteApi.ts
 * -> API Gateway
 * -> Lambda pedidos360-pedidos.
 *
 * El backend debe decidir si todavía puede
 * cancelarse y gestionar la restitución
 * del stock cuando corresponda.
 */
export async function cancelarPedido(
  api: ApiClient,
  id: string | number,
): Promise<Pedido> {
  return actualizarEstadoPedido(
    api,
    id,
    'CANCELADO',
  );
}
