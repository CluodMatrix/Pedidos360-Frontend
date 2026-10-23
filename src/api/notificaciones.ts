// src/api/notificaciones.ts
//
// Eventos que ya pasaron por SNS + SQS y que la interfaz muestra como avisos.
//
// El recorrido completo es:
//   SNS pedidos360-eventos -> q-notificaciones -> Lambda notificar-frontend
//     -> DynamoDB Pedidos360-Notificaciones -> GET /notificaciones -> toast
//
// El navegador no puede suscribirse a SQS, asi que el frontend consulta el
// endpoint periodicamente.

import type { ApiClient } from './client';

export interface Notificacion {
  id: string;
  tipo: string;
  pedidoId: string;
  clienteNombre: string;
  total: number | null;
  texto: string;
  fecha: string;
}

/** Trae los eventos mas recientes (el backend los ordena de mas nuevo a mas viejo). */
export async function listarNotificaciones(api: ApiClient): Promise<Notificacion[]> {
  const respuesta = await api.get<Notificacion[]>('/notificaciones');
  return Array.isArray(respuesta) ? respuesta : [];
}
