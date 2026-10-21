// src/components/ToastProvider.tsx
//
// Avisos flotantes (toasts) abajo a la derecha, alimentados por la mensajeria
// asincrona: cada evento que recorre SNS -> SQS -> Lambda aparece en pantalla.
//
// Como el navegador no puede suscribirse a SQS, se consulta el endpoint cada
// pocos segundos. En la primera consulta solo se memorizan los ids que ya
// existian (para no repetir avisos al recargar) y a partir de ahi se avisa de
// los nuevos.
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Bell, CheckCircle2, ChefHat, PackageCheck, Truck, XCircle, X } from 'lucide-react';

import { useApi } from './useApi';
import { listarNotificaciones, type Notificacion } from '../api/notificaciones';
import { ToastContext, type Toast } from './toastContext';

/** Cada cuanto se consulta el endpoint, en milisegundos. */
const INTERVALO_MS = 3000;
/** Cuanto dura cada aviso en pantalla. */
const DURACION_MS = 7000;
/** Maximo de avisos visibles a la vez. */
const MAXIMO_VISIBLES = 4;

/** Icono segun el tipo de evento. */
function iconoDe(tipo: string) {
  switch (tipo) {
    case 'PedidoCreado':
      return <PackageCheck size={18} />;
    case 'PedidoAceptado':
      return <CheckCircle2 size={18} />;
    case 'PedidoEnPreparacion':
      return <ChefHat size={18} />;
    case 'PedidoDespachado':
    case 'PedidoEntregado':
      return <Truck size={18} />;
    case 'PedidoCancelado':
      return <XCircle size={18} />;
    default:
      return <Bell size={18} />;
  }
}

function claseDe(tipo: string) {
  if (tipo === 'PedidoCancelado') return 'toast toast-error';
  if (tipo === 'PedidoDespachado' || tipo === 'PedidoEntregado') return 'toast toast-info';
  if (tipo === 'PedidoAceptado') return 'toast toast-success';
  return 'toast toast-neutral';
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [conectado, setConectado] = useState(false);
  // Ids ya conocidos. Sirve para no repetir avisos al recargar la pagina.
  const vistos = useRef<Set<string>>(new Set());
  const primeraCarga = useRef(true);

  const descartar = useCallback((id: string) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!api) return undefined;

    let vigente = true;

    const consultar = async () => {
      try {
        const datos = await listarNotificaciones(api);
        if (!vigente) return;
        setConectado(true);

        const nuevos = datos.filter((n) => !vistos.current.has(n.id));

        if (primeraCarga.current) {
          // Primera vez: se memorizan todos para no爆出 los avisos viejos.
          datos.forEach((n) => vistos.current.add(n.id));
          primeraCarga.current = false;
          setNotificaciones(datos);
          return;
        }

        if (nuevos.length > 0) {
          nuevos.forEach((n) => vistos.current.add(n.id));
          setToasts((actuales) => [...nuevos, ...actuales].slice(0, MAXIMO_VISIBLES));
          setNotificaciones(datos);
        }
      } catch {
        if (vigente) setConectado(false);
      }
    };

    void consultar();
    const temporizador = setInterval(() => {
      void consultar();
    }, INTERVALO_MS);

    return () => {
      vigente = false;
      clearInterval(temporizador);
    };
  }, [api]);

  // Cada aviso se cierra solo pasado un tiempo.
  useEffect(() => {
    if (toasts.length === 0) return undefined;
    const temporizador = setTimeout(() => {
      setToasts((actuales) => actuales.slice(1));
    }, DURACION_MS);
    return () => clearTimeout(temporizador);
  }, [toasts]);

  const valor = useMemo(
    () => ({ toasts, notificaciones, conectado, descartar }),
    [toasts, notificaciones, conectado, descartar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div className="toast-container" role="region" aria-label="Notificaciones del sistema" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={claseDe(toast.tipo)}>
            <span className="toast-icon" aria-hidden="true">
              {iconoDe(toast.tipo)}
            </span>
            <div className="toast-body">
              <p className="toast-title">{toast.texto}</p>
              <p className="toast-meta">
                {toast.tipo}
                {toast.total !== null ? ` · $${toast.total.toLocaleString('es-CL')}` : ''}
              </p>
            </div>
            <button
              type="button"
              className="toast-close"
              onClick={() => descartar(toast.id)}
              aria-label="Cerrar notificación"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
