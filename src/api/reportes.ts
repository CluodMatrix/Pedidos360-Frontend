// src/api/reportes.ts
//
// API de SOLO LECTURA del servicio report (proyecto Pedidos360-Kafka).
//
// El frontend NUNCA lee Kafka: llama a estos endpoints, que responden con lo que
// el consumidor ya calculo a partir de los eventos.
//
// La URL base viene del .env (VITE_REPORT_URL). Con la app en :5173, el servicio
// report escucha en :3001.

import { obtenerDeKafka, BASE_REPORT } from './serviciosKafka';

export interface VentaPorHora {
  hora: string;
  total: number;
}

export interface LeadTime {
  promedioSeg: number;
  pedidos: { pedidoId: string; segundos: number }[];
}

export interface TopProducto {
  productoId: string;
  unidades: number;
  nombre?: string;
}

export interface PedidoPorEstado {
  estado: string;
  cantidad: number;
}

/** Reportes: los 4 KPIs del servicio. */
export async function obtenerReportes(): Promise<{
  ventas: VentaPorHora[];
  leadTime: LeadTime;
  topProductos: TopProducto[];
  estados: PedidoPorEstado[];
}> {
  const [ventas, leadTime, topProductos, estados] = await Promise.all([
    obtenerDeKafka<VentaPorHora[]>(BASE_REPORT, '/api/report/ventas-por-hora'),
    obtenerDeKafka<LeadTime>(BASE_REPORT, '/api/report/lead-time'),
    obtenerDeKafka<TopProducto[]>(BASE_REPORT, '/api/report/top-productos'),
    obtenerDeKafka<PedidoPorEstado[]>(BASE_REPORT, '/api/report/estados'),
  ]);

  return {
    ventas: Array.isArray(ventas) ? ventas : [],
    leadTime: leadTime && typeof leadTime === 'object' ? leadTime : { promedioSeg: 0, pedidos: [] },
    topProductos: Array.isArray(topProductos) ? topProductos : [],
    estados: Array.isArray(estados) ? estados : [],
  };
}
