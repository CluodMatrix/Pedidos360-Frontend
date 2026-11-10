/**
 * PEDIDOS360 — CONSULTA DE NOTIFICACIONES
 * Archivo: src/conexion/notificacionesApi.ts
 *
 * FUNCIÓN PRINCIPAL:
 * - listarNotificaciones(api): solicita avisos a una API HTTP.
 *
 * CONEXIONES:
 * - API/clienteApi.ts: aporta el método get() con JWT.
 * - interfaz/ToastProvider.tsx: puede usar estas notificaciones para avisos.
 * - API Gateway: GET /notificaciones (todavía NO publicada en tu API nueva).
 *
 * FLUJO PREVISTO EN AWS:
 * SNS -> cola SQS q-notificaciones -> Lambda notificar-frontend
 * -> DynamoDB Pedidos360-Notificaciones -> API de consulta -> frontend.
 *
 * IMPORTANTE: tener la Lambda consumidora y la tabla DynamoDB NO significa
 * que exista GET /notificaciones. Antes de publicar esa ruta hay que
 * garantizar que cada usuario vea SOLO las notificaciones autorizadas.
 * Esta función no se conecta directamente a SNS, SQS o DynamoDB.
 */

import type { ApiClient } from '../API/clienteApi';

/**
 * INTERFAZ: Notificacion
 * Define el formato de un aviso recibido desde el backend.
 *
 * id: identificador del aviso.
 * tipo: tipo de evento, por ejemplo, PedidoCreado.
 * pedidoId: pedido relacionado con el aviso.
 * clienteNombre: nombre asociado al pedido (dato potencialmente privado).
 * total: monto del pedido; puede ser null si no corresponde.
 * texto: mensaje que verá el usuario.
 * fecha: fecha del evento.
 *
 * Una interfaz TypeScript describe tipos; no valida datos en ejecución.
 */
export interface Notificacion {
  id: string;
  tipo: string;
  pedidoId: string;
  clienteNombre: string;
  total: number | null;
  texto: string;
  fecha: string;
}

/**
 * FUNCIÓN: listarNotificaciones(api)
 *
 * ¿QUÉ HACE?
 * 1. Usa el cliente autenticado para enviar GET /notificaciones.
 * 2. Devuelve la lista recibida si la respuesta es un arreglo.
 * 3. Si la respuesta tiene un formato inesperado, informa un error.
 *
 * PARÁMETRO:
 * api: cliente HTTP preparado por useApi().
 *
 * DEVUELVE:
 * Promise<Notificacion[]>: promesa de una lista de avisos.
 *
 * TRADUCCIONES:
 * - GET: obtener información.
 * - response / respuesta: datos devueltos por el backend.
 * - Promise: resultado de una operación asíncrona.
 *
 * Este archivo NO activa la consulta periódica: si aparecen muchos 404,
 * hay que revisar el intervalo de consulta en ToastProvider.tsx.
 * La API nueva no dispone todavía de esta ruta.
 */
export async function listarNotificaciones(
  api: ApiClient,
): Promise<Notificacion[]> {
  // Esta línea realiza la solicitud HTTP por medio de clienteApi.ts.
  const respuesta = await api.get<unknown>('/notificaciones');

  // Antes se devolvía [] ante cualquier formato inesperado. Eso podía
  // ocultar un error de integración haciéndolo parecer "sin avisos".
  if (!Array.isArray(respuesta)) {
    throw new Error('La API de notificaciones devolvió un formato inesperado.');
  }

  // TypeScript no valida la forma interna de cada aviso; se conserva
  // aquí la estructura esperada por el frontend. Podemos agregar un
  // validador más adelante, cuando exista el contrato del endpoint.
  return respuesta as Notificacion[];
}
