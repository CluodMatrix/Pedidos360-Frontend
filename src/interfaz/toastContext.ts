/**
 * ============================================================
 * PEDIDOS360 — CONTEXTO DE NOTIFICACIONES
 * Archivo: src/interfaz/toastContext.ts
 * ============================================================
 *
 * «Toast» = aviso flotante y temporal.
 * «Context» = contexto: mecanismo de React que comparte datos
 * entre componentes sin pasar props por todos los niveles.
 *
 * ¿QUÉ HACE?
 * Define qué datos de las notificaciones pueden consultar
 * otros componentes mediante el hook useToasts().
 *
 * CONEXIONES:
 * - conexion/notificacionesApi.ts: define la estructura Notificacion.
 * - ToastProvider.tsx: entrega los valores reales del contexto.
 * - Cualquier componente dentro de ToastProvider puede usar useToasts().
 *
 * Este archivo NO hace peticiones HTTP ni llama a AWS.
 */
import { createContext, useContext } from 'react';
import type { Notificacion } from '../conexion/notificacionesApi';

/**
 * «type» crea un alias de tipo.
 * En este proyecto, cada Toast utiliza los datos de Notificacion.
 */
export type Toast = Notificacion;

/**
 * INTERFAZ: ToastContextValue
 *
 * toasts: avisos breves que están visibles ahora.
 * notificaciones: historial recibido de la API (si está habilitada).
 * conectado: true si la consulta más reciente funcionó.
 * descartar(id): oculta un aviso localmente, sin borrar DynamoDB.
 */
export interface ToastContextValue {
  toasts: Toast[];
  notificaciones: Notificacion[];
  conectado: boolean;
  descartar: (id: string) => void;
}

/**
 * createContext(): crea el contexto compartido.
 * El valor inicial es null porque ToastProvider debe proporcionarlo.
 */
export const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * HOOK: useToasts()
 * «Hook» = función especial de React para reutilizar lógica.
 *
 * Permite obtener los avisos desde otro componente:
 *   const { toasts, conectado, descartar } = useToasts();
 *
 * useContext(ToastContext) lee los valores que proporciona
 * ToastProvider. Lanza un error claro si se utiliza fuera de él.
 */
export function useToasts(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToasts debe usarse dentro de <ToastProvider>.');
  }
  return contexto;
}
