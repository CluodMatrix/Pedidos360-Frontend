// src/components/toastContext.ts
//
// Contexto de los avisos flotantes. Vive en su propio archivo para que
// ToastProvider.tsx exporte solo el componente (regla de react-refresh).

import { createContext, useContext } from 'react';

import type { Notificacion } from '../api/notificaciones';

export type Toast = Notificacion;

export interface ToastContextValue {
  /** Avisos visibles ahora mismo. */
  toasts: Toast[];
  /** Ultimos eventos recibidos (los mas recientes primero). */
  notificaciones: Notificacion[];
  /** false cuando el endpoint no responde. */
  conectado: boolean;
  descartar: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

/** Hook para usar los avisos desde cualquier parte de la app. */
export function useToasts(): ToastContextValue {
  const contexto = useContext(ToastContext);
  if (!contexto) {
    throw new Error('useToasts debe usarse dentro de <ToastProvider>.');
  }
  return contexto;
}
