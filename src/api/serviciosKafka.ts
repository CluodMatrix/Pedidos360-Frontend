// src/api/serviciosKafka.ts
//
// Cliente de los servicios de Kafka (proyecto Pedidos360-Kafka): report y audit.
//
// A diferencia del backend de AWS (que exige el JWT de Entra ID), estos servicios
// locales son de SOLO LECTURA y no validan token: por eso llevan su propio
// cliente y no el ApiClient de API Gateway.
//
//   VITE_REPORT_URL -> http://localhost:3001   (report)
//   VITE_AUDIT_URL  -> http://localhost:3002   (audit)
//
// Con las variables vacias se usan los puertos por defecto, que son los que
// usa `npm run report` y `npm run audit` del proyecto de Kafka.

const BASE_REPORT = (import.meta.env.VITE_REPORT_URL || 'http://localhost:3001').replace(/\/$/, '');
const BASE_AUDIT = (import.meta.env.VITE_AUDIT_URL || 'http://localhost:3002').replace(/\/$/, '');

export const URLS_KAFKA = { report: BASE_REPORT, audit: BASE_AUDIT };

/** Error de los servicios de Kafka (no son de API Gateway). */
export class ErrorServicioKafka extends Error {
  status: number;
  url: string;

  constructor(mensaje: string, status: number, url: string) {
    super(mensaje);
    this.name = 'ErrorServicioKafka';
    this.status = status;
    this.url = url;
  }
}

/** Mensaje legible segun el estado de la respuesta. */
export function mensajeErrorKafka(error: unknown): string {
  if (error instanceof ErrorServicioKafka) {
    if (error.status === 0) {
      return 'No se pudo contactar el servicio de Kafka. ¿Está corriendo (npm run report / npm run audit)?';
    }
    return `El servicio de Kafka respondió ${error.status}.`;
  }
  return 'No se pudo obtener la información de Kafka.';
}

/** GET a un servicio de Kafka y devuelve el JSON (o [] si no hay cuerpo). */
export async function obtenerDeKafka<T>(base: string, path: string): Promise<T> {
  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;
  let respuesta: Response;
  try {
    respuesta = await fetch(url, { headers: { Accept: 'application/json' } });
  } catch {
    throw new ErrorServicioKafka('sin conexion', 0, url);
  }
  if (!respuesta.ok) {
    throw new ErrorServicioKafka('error del servicio', respuesta.status, url);
  }
  const texto = await respuesta.text();
  if (!texto) return [] as unknown as T;
  try {
    return JSON.parse(texto) as T;
  } catch {
    throw new ErrorServicioKafka('respuesta no es JSON', respuesta.status, url);
  }
}

export { BASE_REPORT, BASE_AUDIT };
