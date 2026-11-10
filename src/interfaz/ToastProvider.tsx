/**
 * ============================================================
 * PEDIDOS360 — PROVEEDOR DE AVISOS FLOTANTES
 * Archivo: src/interfaz/ToastProvider.tsx
 * ============================================================
 *
 * VOCABULARIO:
 * - Toast = aviso pequeño y temporal en pantalla.
 * - Provider = proveedor de datos para otros componentes React.
 * - Polling = consultar repetidamente un servicio cada cierto tiempo.
 * - Endpoint = ruta de una API, como GET /notificaciones.
 *
 * ¿QUÉ HACE?
 * Si el servicio de notificaciones está habilitado y protegido:
 * 1. Consulta GET /notificaciones mediante el cliente HTTP.
 * 2. Recuerda los avisos existentes en la primera consulta.
 * 3. Muestra en pantalla únicamente los eventos nuevos.
 * 4. Retira automáticamente cada aviso después de unos segundos.
 * 5. Comparte el historial con otros componentes (toastContext.ts).
 *
 * CONEXIONES DEL FRONTEND:
 * - App.tsx: envuelve las páginas con <ToastProvider>.
 * - API/useApi.ts: obtiene un ApiClient para la cuenta activa.
 * - conexion/notificacionesApi.ts: función listarNotificaciones().
 * - interfaz/toastContext.ts: comparte datos y función descartar().
 *
 * FLUJO PREVISTO EN AWS (AÚN INCOMPLETO):
 * Lambda pedidos -> SNS -> SQS -> Lambda notificar-frontend
 * -> DynamoDB -> API Gateway GET /notificaciones -> React.
 *
 * SEGURIDAD MUY IMPORTANTE:
 * Según la configuración actual compartida, GET /notificaciones
 * NO está publicado en la API nueva. Además, antes de publicarlo,
 * el backend debe filtrar los avisos por usuario o limitar roles.
 * Por eso el sondeo está DESACTIVADO POR DEFECTO.
 *
 * Solo cuando el endpoint esté implementado y autorizado de forma
 * segura, agrega VITE_ENABLE_NOTIFICATIONS=true a tu .env y reinicia Vite.
 * Esta variable NO es una medida de seguridad: la seguridad real debe
 * estar en API Gateway y Lambda. No uses el flag para publicar datos
 * de otros clientes a través de un endpoint sin aislamiento.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  Bell,
  CheckCircle2,
  ChefHat,
  PackageCheck,
  Truck,
  XCircle,
  X,
} from 'lucide-react';

import { useApi } from '../API/useApi';
import { ApiError } from '../API/clienteApi';
import {
  listarNotificaciones,
  type Notificacion,
} from '../conexion/notificacionesApi';
import { ToastContext, type Toast } from './toastContext';

/** Milisegundos entre consultas exitosas (3 segundos). */
const INTERVALO_MS = 3000;
/** Espera mayor cuando falla la red temporalmente (12 segundos). */
const REINTENTO_MS = 12000;
/** Duración individual de cada aviso visible (7 segundos). */
const DURACION_MS = 7000;
/** Número máximo de mensajes flotantes simultáneos. */
const MAXIMO_VISIBLES = 4;

/**
 * Interruptor de una funcionalidad aún no disponible en AWS.
 * Si no existe en .env, Vite devuelve undefined y queda en false.
 *
 * RECUERDA: las variables VITE_* son visibles en el navegador.
 * Nunca pongas secretos ni credenciales de AWS aquí.
 */
const NOTIFICACIONES_HABILITADAS =
  import.meta.env.VITE_ENABLE_NOTIFICATIONS === 'true';

/**
 * FUNCIÓN: iconoDe(tipo)
 * «tipo» indica el evento que llegó del backend.
 * Devuelve el icono React más apropiado para ese evento.
 * No realiza ninguna solicitud HTTP.
 */
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

/**
 * FUNCIÓN: claseDe(tipo)
 * Devuelve la clase CSS que define el color del aviso.
 * «error», «info», «success» y «neutral» son nombres de estilos,
 * no estados de los pedidos en DynamoDB.
 */
function claseDe(tipo: string) {
  if (tipo === 'PedidoCancelado') return 'toast toast-error';
  if (tipo === 'PedidoDespachado' || tipo === 'PedidoEntregado') {
    return 'toast toast-info';
  }
  if (tipo === 'PedidoAceptado') return 'toast toast-success';
  return 'toast toast-neutral';
}

/**
 * COMPONENTE: AvisoToast()
 * Representa UN mensaje flotante.
 *
 * Corrección: cada aviso tiene su propio temporizador de cierre.
 * Así un aviso nuevo no reinicia el tiempo de los anteriores.
 *
 * El efecto limpia el temporizador cuando el aviso desaparece.
 */
function AvisoToast({
  toast,
  descartar,
}: {
  toast: Toast;
  descartar: (id: string) => void;
}) {
  useEffect(() => {
    const temporizador = setTimeout(() => {
      descartar(toast.id);
    }, DURACION_MS);

    return () => clearTimeout(temporizador);
  }, [toast.id, descartar]);

  return (
    <div className={claseDe(toast.tipo)}>
      <span className="toast-icon" aria-hidden="true">
        {iconoDe(toast.tipo)}
      </span>

      <div className="toast-body">
        <p className="toast-title">{toast.texto}</p>
        <p className="toast-meta">
          {toast.tipo}
          {toast.total !== null
            ? ` · $${toast.total.toLocaleString('es-CL')}`
            : ''}
        </p>
      </div>

      {/* Cierra solo este aviso, sin eliminar registros del backend. */}
      <button
        type="button"
        className="toast-close"
        onClick={() => descartar(toast.id)}
        aria-label="Cerrar notificación"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}

/**
 * COMPONENTE: ToastProvider()
 * «children» = componentes hijos envueltos por este proveedor.
 *
 * Se utiliza en App.tsx para compartir el contexto con las páginas.
 * No altera las rutas ni el inicio de sesión de Microsoft Entra.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  // Cliente HTTP ligado a la cuenta Microsoft activa.
  const api = useApi();

  // Historial y avisos flotantes: estados de React.
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [conectado, setConectado] = useState(false);

  /**
   * useRef(): mantiene valores sin volver a dibujar la interfaz.
   * vistos: identificadores que ya se recibieron.
   * primeraCarga: indica si aún estamos leyendo el historial inicial.
   */
  const vistos = useRef<Set<string>>(new Set());
  const primeraCarga = useRef(true);

  /**
   * FUNCIÓN: descartar(id)
   * Quita un toast de la pantalla mediante filter().
   * No borra ninguna fila de DynamoDB ni marca eventos como leídos.
   * useCallback conserva una referencia estable de la función.
   */
  const descartar = useCallback((id: string) => {
    setToasts((actuales) => actuales.filter((t) => t.id !== id));
  }, []);

  /**
   * EFECTO: CONSULTAR NOTIFICACIONES
   *
   * Cambia cuando cambia «api», es decir, la cuenta activa.
   * Al cambiar de cuenta, reseteamos el historial y los ids vistos
   * para no mezclar avisos de dos sesiones diferentes.
   *
   * Corrección de los 404 observados:
   * - Si la función NO está habilitada, no hacemos ningún fetch.
   * - Si el servidor responde 401, 403 o 404, detenemos el sondeo.
   * - Si hay un fallo temporal de red, reintentamos más lentamente.
   * - Las solicitudes no se superponen: una termina antes de programar otra.
   */
  useEffect(() => {
    // Reiniciamos el estado visible al cambiar de sesión o cliente.
    vistos.current = new Set();
    primeraCarga.current = true;
    setNotificaciones([]);
    setToasts([]);
    setConectado(false);

    // Por defecto la ruta no está habilitada en tu API nueva.
    if (!NOTIFICACIONES_HABILITADAS || !api) {
      return;
    }

    const client = api;
    let vigente = true;
    let detener = false;
    let temporizador: ReturnType<typeof setTimeout> | undefined;

    /**
     * FUNCIÓN INTERNA: consultar()
     *
     * Se conecta con listarNotificaciones() de conexion/.
     * Esa función llama a GET /notificaciones por medio de ApiClient.
     * ApiClient añade el JWT y realiza fetch() hacia API Gateway.
     */
    async function consultar() {
      let esperaSiguiente = INTERVALO_MS;
      try {
        // «client» es la cuenta activa capturada al iniciar este efecto.
        const datos = await listarNotificaciones(client);
        if (!vigente) return;

        setConectado(true);

        // «filter» encuentra eventos que todavía no hemos mostrado.
        const nuevos = datos.filter((n) => !vistos.current.has(n.id));

        // Siempre actualizamos el historial tras una respuesta correcta.
        setNotificaciones(datos);

        if (primeraCarga.current) {
          /**
           * Primera consulta: recordamos los avisos antiguos,
           * pero NO los mostramos como emergentes otra vez.
           */
          datos.forEach((n) => vistos.current.add(n.id));
          primeraCarga.current = false;
          return;
        }

        if (nuevos.length > 0) {
          nuevos.forEach((n) => vistos.current.add(n.id));

          // «slice» limita la cantidad de mensajes simultáneos.
          setToasts((actuales) =>
            [...nuevos, ...actuales].slice(0, MAXIMO_VISIBLES),
          );
        }
      } catch (error) {
        if (!vigente) return;
        setConectado(false);
        esperaSiguiente = REINTENTO_MS;

        // Errores de autorización o ruta inexistente: no insistimos.
        if (
          error instanceof ApiError &&
          [401, 403, 404].includes(error.status)
        ) {
          detener = true;
          if (import.meta.env.DEV) {
            console.warn(
              'Notificaciones detenidas: verifica la ruta y su autorización en AWS.',
              error.status,
            );
          }
        }
      } finally {
        /**
         * setTimeout programa SOLO la siguiente consulta,
         * una vez terminada la actual.
         * Esto evita solicitudes simultáneas y errores repetidos.
         */
        if (vigente && !detener) {
          temporizador = setTimeout(() => {
            void consultar();
          }, esperaSiguiente);
        }
      }
    }

    void consultar();

    /**
     * LIMPIEZA:
     * Cuando cambia la cuenta o se desmonta el componente,
     * ignoramos respuestas tardías y detenemos futuras consultas.
     */
    return () => {
      vigente = false;
      if (temporizador) clearTimeout(temporizador);
    };
  }, [api]);

  /**
   * useMemo(): evita reconstruir este objeto si nada ha cambiado.
   * El contexto comparte estos valores con useToasts().
   */
  const valor = useMemo(
    () => ({ toasts, notificaciones, conectado, descartar }),
    [toasts, notificaciones, conectado, descartar],
  );

  return (
    <ToastContext.Provider value={valor}>
      {/* Contenido normal de la aplicación. */}
      {children}

      {/* Región que anuncia nuevos avisos a lectores de pantalla. */}
      <div
        className="toast-container"
        role="region"
        aria-label="Notificaciones del sistema"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <AvisoToast
            key={toast.id}
            toast={toast}
            descartar={descartar}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
