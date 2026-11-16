// src/api/auditoria.ts
//
// API de SOLO LECTURA del servicio audit (proyecto Pedidos360-Kafka).
//
//   GET /api/audit/:pedidoId              -> timeline de un pedido
//   GET /api/audit?usuario=&tipo=&desde=&hasta= -> eventos con filtros
//
// La URL base viene del .env (VITE_AUDIT_URL). Con la app en :5173, el servicio
// audit escucha en :3002.

import { obtenerDeKafka, BASE_AUDIT } from './serviciosKafka';

export interface EventoAuditoria {
  pedidoId?: string;
  fecha: string;
  tipo: string;
  quien: string;
  desdeDonde: string;
}

export interface FiltrosAuditoria {
  usuario?: string;
  tipo?: string;
  desde?: string;
  hasta?: string;
}

/** Timeline de un pedido. */
export async function obtenerTimeline(pedidoId: string): Promise<EventoAuditoria[]> {
  const respuesta = await obtenerDeKafka<EventoAuditoria[]>(
    BASE_AUDIT,
    `/api/audit/${encodeURIComponent(pedidoId)}`,
  );
  return Array.isArray(respuesta) ? respuesta : [];
}

/** Eventos con filtros opcionales. */
export async function obtenerAuditoria(
  filtros: FiltrosAuditoria = {},
): Promise<EventoAuditoria[]> {
  const params = new URLSearchParams();
  if (filtros.usuario) params.set('usuario', filtros.usuario);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.desde) params.set('desde', filtros.desde);
  if (filtros.hasta) params.set('hasta', filtros.hasta);
  const consulta = params.toString();
  const respuesta = await obtenerDeKafka<EventoAuditoria[]>(
    BASE_AUDIT,
    `/api/audit${consulta ? `?${consulta}` : ''}`,
  );
  return Array.isArray(respuesta) ? respuesta : [];
}
