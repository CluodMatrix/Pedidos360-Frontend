/**
 * ============================================================
 * PEDIDOS360 — PÁGINA DE PEDIDOS
 * Archivo: src/pedidos/Pedidos.tsx
 * ============================================================
 *
 * ¿QUÉ HACE?
 * Muestra los pedidos del usuario y, según su rol, permite
 * crear pedidos o cambiar su estado.
 *
 * CONEXIONES EN EL FRONTEND:
 * - App.tsx, RequireAuth y RequireRole: protegen la ruta.
 * - usuarios/useAuthorization.ts: consulta roles y scopes.
 * - API/useApi.ts: prepara la conexión para la cuenta activa.
 * - API/pedidosApi.ts: listar, crear y modificar pedidos.
 * - API/catalogoApi.ts: obtiene los productos para el formulario.
 * - PedidoCard.tsx: muestra cada pedido y sus acciones.
 * - PedidoForm.tsx: recoge producto y cantidad.
 * - interfaz/: encabezado y mensajes reutilizables.
 *
 * CONEXIÓN CON AWS:
 * React -> clienteApi.ts -> AWS API Gateway -> Lambda
 * pedidos360-pedidos -> DynamoDB.
 * La Lambda también puede publicar eventos en SNS, que se
 * distribuyen mediante SQS a otras Lambdas consumidoras.
 *
 * SEGURIDAD:
 * - Cliente: consulta sus propios pedidos.
 * - Operador: consulta pedidos, puede crear y cambiar estados.
 * - Admin: consulta pedidos y cambia estados.
 * La Lambda comprueba nuevamente rol, scope y transiciones.
 * Ocultar opciones en React no sustituye esos controles.
 */

// Hooks de React: estado, efectos, referencias y funciones estables.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { RefreshCw } from 'lucide-react';

// useApi entrega el cliente HTTP con la cuenta MSAL activa.
import { useApi } from '../API/useApi';
import { useAuthorization } from '../usuarios/useAuthorization';

// Productos utilizados para elegir artículos del pedido.
import { listarCatalogo, type Producto } from '../API/catalogoApi';

// Operaciones HTTP y tipos de la API de pedidos.
import {
  actualizarEstadoPedido,
  crearPedido,
  listarPedidos,
  transicionesPermitidas,
  type Pedido,
  type EstadoPedido,
} from '../API/pedidosApi';

// Mensajes de error y componentes visuales de uso compartido.
import { apiErrorMessage } from '../API/clienteApi';
import { PageHeader } from '../interfaz/PageHeader';
import { EmptyState } from '../interfaz/EmptyState';
import { ErrorState } from '../interfaz/ErrorState';
import { LoadingState } from '../interfaz/LoadingState';
import { PedidoCard } from './PedidoCard';
import { PedidoForm } from './PedidoForm';

/**
 * FUNCIÓN: formatearEstado()
 *
 * Recibe un código de estado y devuelve una etiqueta en español.
 * Solo prepara texto; no modifica pedidos ni consulta AWS.
 */
function formatearEstado(estado: EstadoPedido): string {
  switch (estado) {
    case 'CREADO': return 'Creado';
    case 'ACEPTADO': return 'Aceptado';
    case 'EN_PREPARACION': return 'En preparación';
    case 'DESPACHADO': return 'Despachado';
    case 'ENTREGADO': return 'Entregado';
    case 'CANCELADO': return 'Cancelado';
  }
}

/**
 * COMPONENTE: Pedidos()
 *
 * «Página contenedora»: organiza componentes, permisos,
 * estados de React y solicitudes al backend.
 */
export function Pedidos() {
  /**
   * 1. AUTENTICACIÓN Y PERMISOS
   *
   * api: objeto HTTP que se crea para la cuenta activa.
   * authorization: roles, scopes, carga y error de permisos.
   */
  const api = useApi();
  const authorization = useAuthorization();
  const { loading: authorizationLoading, hasScope } = authorization;
  const roles = authorization.roles;

  // Permiso necesario para GET /pedidos.
  const canRead = hasScope('orders.read');
  const canReadCatalog = hasScope('catalog.read');

  /**
   * Si una cuenta tiene más de un rol, damos prioridad
   * al personal en el título, igual que el menú principal.
   */
  const esCliente = roles.includes('Cliente') &&
    !roles.includes('Admin') && !roles.includes('Operador');

  // POST /pedidos: en el backend lo autorizan Cliente u Operador.
  // En esta página el formulario se ofrece al Operador;
  // el Cliente normalmente utiliza la pantalla Comprar.tsx.
  const puedeCrear = roles.includes('Operador') &&
    hasScope('orders.write');

  // PUT /pedidos/{id}/estado: Admin u Operador.
  const puedeCambiarEstado = (
    roles.includes('Admin') || roles.includes('Operador')
  ) && hasScope('orders.write');

  /**
   * 2. ESTADOS DE REACT (useState)
   *
   * State = estado: valores que cambian durante el uso.
   * Cuando cambiamos un estado, React vuelve a dibujar
   * la parte de la pantalla que depende de él.
   */
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ID del pedido que está cambiando de estado.
  const [pendingId, setPendingId] = useState<string | number | null>(null);

  // Datos del formulario de creación.
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);

  // Catálogo utilizado por el formulario del Operador.
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productError, setProductError] = useState<string | null>(null);

  /**
   * useRef guarda un contador sin provocar nuevos renders.
   * Cada vez que cambia el usuario o comienza una carga,
   * invalidamos las respuestas de solicitudes anteriores.
   */
  const numeroSolicitud = useRef(0);

  /**
   * 3. FUNCIÓN: cargarPedidos()
   *
   * ¿QUÉ HACE?
   * Solicita al backend los pedidos visibles para la cuenta.
   *
   * CONEXIÓN:
   * listarPedidos(api) -> GET /pedidos -> API Gateway
   * -> Lambda pedidos360-pedidos -> DynamoDB.
   *
   * useCallback: memoriza la función mientras sus
   * dependencias no cambien. La usan useEffect y Actualizar.
   *
   * CORRECCIÓN:
   * Antes había dos consultas equivalentes (en cargarPedidos
   * y en useEffect). Ahora ambas acciones usan esta función.
   */
  const cargarPedidos = useCallback(async () => {
    const solicitud = ++numeroSolicitud.current;

    // No se consultan datos sin cuenta o sin permiso de lectura.
    if (!api || authorizationLoading || !canRead) {
      setPedidos([]);
      setError(null);
      setLoading(false);
      return;
    }

    // Limpiamos información de otra sesión o consulta anterior.
    setLoading(true);
    setError(null);
    setPedidos([]);

    try {
      const datos = await listarPedidos(api);

      // Solo aceptamos la respuesta de la solicitud vigente.
      if (solicitud === numeroSolicitud.current) {
        setPedidos(datos);
      }
    } catch (err) {
      if (solicitud === numeroSolicitud.current) {
        setError(apiErrorMessage(err));
      }
    } finally {
      if (solicitud === numeroSolicitud.current) {
        setLoading(false);
      }
    }
  }, [api, authorizationLoading, canRead]);

  /**
   * 4. useEffect — CARGA AUTOMÁTICA DE PEDIDOS
   *
   * Effect = efecto: operación que React realiza cuando
   * se monta la página o cambian sus dependencias.
   *
   * La función devuelta es la limpieza (cleanup):
   * invalida cualquier respuesta HTTP antigua.
   */
  useEffect(() => {
    if (authorizationLoading) return;

    void cargarPedidos();

    return () => {
      numeroSolicitud.current += 1;
    };
  }, [authorizationLoading, cargarPedidos]);

  /**
   * 5. useEffect — CARGA DEL CATÁLOGO PARA EL FORMULARIO
   *
   * Solo el Operador con permisos de lectura del catálogo
   * necesita esta lista en la pantalla de Pedidos.
   *
   * CONEXIÓN:
   * GET /catalogo -> Lambda pedidos360-catalogo -> DynamoDB.
   *
   * «vigente» evita mostrar productos antiguos si cambiamos
   * de usuario mientras AWS responde.
   */
  useEffect(() => {
    let vigente = true;

    // Restablecemos el formulario al cambiar cuenta o permisos.
    setProductos([]);
    setProductoId('');
    setCantidad(1);
    setProductError(null);

    if (authorizationLoading || !puedeCrear) {
      setLoadingProducts(false);
      return () => { vigente = false; };
    }

    if (!canReadCatalog) {
      setLoadingProducts(false);
      setProductError('Tu sesión necesita catalog.read para seleccionar productos.');
      return () => { vigente = false; };
    }

    if (!api) {
      setLoadingProducts(false);
      return () => { vigente = false; };
    }

    setLoadingProducts(true);

    void listarCatalogo(api)
      .then((datos) => {
        if (vigente) {
          setProductos(datos);
          setProductError(null);
        }
      })
      .catch((err: unknown) => {
        if (vigente) {
          setProductError(apiErrorMessage(err));
        }
      })
      .finally(() => {
        if (vigente) setLoadingProducts(false);
      });

    return () => {
      vigente = false;
    };
  }, [api, authorizationLoading, puedeCrear, canReadCatalog]);

  /**
   * 6. FUNCIÓN: actualizar()
   *
   * Se ejecuta al presionar el botón «Actualizar».
   * Reutiliza la misma función de la carga inicial;
   * no contiene una segunda implementación HTTP.
   */
  function actualizar() {
    void cargarPedidos();
  }

  /**
   * 7. FUNCIÓN: handleCreate()
   *
   * Handle = manejar; Create = crear.
   *
   * Recibe el evento submit del formulario.
   * preventDefault() evita recargar el navegador.
   *
   * CONEXIÓN:
   * PedidoForm -> handleCreate -> crearPedido(api, ...)
   * -> POST /pedidos -> API Gateway
   * -> Lambda pedidos360-pedidos -> DynamoDB.
   *
   * DynamoDB valida el descuento de stock mediante una
   * transacción; la Lambda también calcula el total.
   * El frontend solo valida para orientar al usuario.
   */
  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!api || !puedeCrear || !canRead || creating || pendingId !== null) {
      return;
    }

    // Comprobamos que el ID pertenezca al catálogo cargado.
    const elegido = productos.find(
      (producto) => String(producto.id) === productoId.trim(),
    );

    if (!elegido || !Number.isInteger(cantidad) || cantidad < 1) {
      setFormError('Selecciona un producto y una cantidad entera mayor que cero.');
      return;
    }

    if (cantidad > elegido.stock) {
      setFormError(`Stock insuficiente. Hay ${elegido.stock} unidades disponibles.`);
      return;
    }

    setCreating(true);
    setFormError(null);
    setNotice(null);

    try {
      // La Lambda calcula los datos definitivos del pedido.
      const nuevoPedido = await crearPedido(api, {
        productos: [{ productoId: elegido.id, cantidad }],
      });

      // Mostramos el pedido creado inmediatamente en la lista.
      setPedidos((actuales) => [nuevoPedido, ...actuales]);
      setProductoId('');
      setCantidad(1);
      setNotice('El pedido fue enviado.');

      /**
       * La creación descuenta stock en DynamoDB.
       * Volvemos a consultar el catálogo para que el formulario
       * no siga mostrando cantidades antiguas.
       * Si falla esta recarga, el pedido YA se creó; por eso
       * gestionamos el error por separado.
       */
      try {
        const productosActualizados = await listarCatalogo(api);
        setProductos(productosActualizados);
        setProductError(null);
      } catch (err) {
        setProductError(
          `El pedido se creó, pero no pudimos actualizar el stock: ${apiErrorMessage(err)}`,
        );
      }
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  /**
   * 8. FUNCIÓN: handleTransition()
   *
   * Transition = transición o cambio de estado.
   *
   * Recibe un pedido y el nuevo estado seleccionado.
   * Este evento llega desde el botón de PedidoCard.tsx.
   *
   * CONEXIÓN:
   * PedidoCard -> handleTransition -> actualizarEstadoPedido
   * -> PUT /pedidos/{id}/estado -> API Gateway
   * -> Lambda pedidos360-pedidos -> DynamoDB.
   *
   * La Lambda comprueba el rol, el scope y que el cambio
   * de estado esté permitido. Puede publicar eventos en SNS.
   */
  async function handleTransition(pedido: Pedido, estado: EstadoPedido) {
    if (!api || !puedeCambiarEstado || pendingId !== null || creating) {
      return;
    }

    // Evitamos proponer un salto de estado que ya sabemos inválido.
    if (!transicionesPermitidas(pedido.estado).includes(estado)) {
      setActionError('El cambio de estado solicitado no está permitido.');
      return;
    }

    setPendingId(pedido.id);
    setActionError(null);
    setNotice(null);

    try {
      const actualizado = await actualizarEstadoPedido(api, pedido.id, estado);

      /**
       * map(): construye una nueva lista.
       * Solo reemplazamos el pedido que cambió de estado.
       * String() permite comparar IDs numéricos o de texto.
       */
      setPedidos((actuales) => actuales.map((item) =>
        String(item.id) === String(pedido.id) ? actualizado : item,
      ));

      setNotice(`Pedido #${pedido.id}: ${formatearEstado(estado)}.`);
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setPendingId(null);
    }
  }

  // Esta comparación identifica un error de configuración del backend.
  const backendPendiente = error === 'El backend aún no está configurado.';

  /**
   * 9. JSX — INTERFAZ VISUAL
   *
   * JSX = sintaxis para describir la pantalla en React.
   * Los componentes reciben props y muestran datos.
   */
  return (
    <section className="page-stack">
      {/* Título de página y botón de recarga. */}
      <PageHeader
        eyebrow={esCliente ? 'Cuenta' : 'Operación'}
        title={esCliente ? 'Mis pedidos' : 'Pedidos'}
        subtitle={
          esCliente
            ? 'Consulta el estado de tus pedidos.'
            : 'Consulta, crea y da seguimiento a los pedidos.'
        }
        actions={(
          <button
            type="button"
            className="secondary-button"
            onClick={actualizar}
            disabled={loading || authorizationLoading || !api || !canRead}
          >
            <RefreshCw size={16} aria-hidden="true" /> Actualizar
          </button>
        )}
      />

      {/* Mensajes de éxito, configuración y autorización. */}
      {notice && <p className="form-success" role="status">{notice}</p>}

      {backendPendiente && (
        <div className="state-panel state-info" role="status">
          <h2>Backend pendiente</h2>
          <p>Configura la conexión a AWS antes de consultar o gestionar pedidos.</p>
        </div>
      )}

      {authorizationLoading && (
        <LoadingState message="Comprobando tus permisos…" />
      )}

      {!authorizationLoading && authorization.error && (
        <ErrorState title="No se pudieron verificar los permisos" message={authorization.error} />
      )}

      {!authorizationLoading && !authorization.error && !canRead && (
        <ErrorState
          title="Permiso de consulta no disponible"
          message="Tu cuenta necesita orders.read para consultar pedidos."
        />
      )}

      {!authorizationLoading && !authorization.error && canRead && !api && (
        <LoadingState message="Preparando la conexión con el backend…" />
      )}

      {/* Formulario del Operador para crear pedidos. */}
      {!backendPendiente && !authorizationLoading &&
        !authorization.error && canRead && puedeCrear && (
          <PedidoForm
            productoId={productoId}
            cantidad={cantidad}
            products={productos}
            productsLoading={loadingProducts}
            submitting={creating || pendingId !== null}
            error={formError ?? productError}
            onProductChange={(nuevoId) => {
              setProductoId(nuevoId);
              setCantidad(1);
              setFormError(null);
            }}
            onQuantityChange={(nuevaCantidad) => {
              setCantidad(nuevaCantidad);
              setFormError(null);
            }}
            onSubmit={(event) => void handleCreate(event)}
          />
        )}

      {/* Errores de la lista y de cambios de estado. */}
      {error && !backendPendiente && (
        <ErrorState message={error} onRetry={actualizar} />
      )}

      {actionError && (
        <ErrorState
          title="No se pudo actualizar el pedido"
          message={actionError}
        />
      )}

      {/* Loading = cargando información desde AWS. */}
      {!error && loading && !backendPendiente &&
        !authorizationLoading && !authorization.error && canRead && api && (
          <LoadingState message="Cargando pedidos…" />
        )}

      {/* Empty = vacío: el usuario no tiene pedidos visibles. */}
      {!error && !loading && !backendPendiente &&
        !authorizationLoading && !authorization.error && canRead && api &&
        pedidos.length === 0 && (
          <EmptyState
            title={esCliente
              ? 'Aún no has realizado pedidos.'
              : 'No hay pedidos registrados todavía.'}
            description={esCliente
              ? 'Cuando realices una compra desde Comprar, la verás aquí.'
              : 'Los pedidos creados aparecerán aquí.'}
          />
        )}

      {/*
       * LISTA DE PEDIDOS:
       * map() construye una tarjeta PedidoCard por cada pedido.
       * Las tarjetas comunican los clics mediante onTransition.
       */}
      {!error && !loading && !backendPendiente &&
        !authorizationLoading && !authorization.error && canRead && api &&
        pedidos.length > 0 && (
          <div className="orders-list">
            {pedidos.map((pedido) => (
              <PedidoCard
                key={pedido.id}
                pedido={pedido}
                canChangeStatus={puedeCambiarEstado}
                pending={pendingId !== null || creating}
                saving={pendingId === pedido.id}
                onTransition={(seleccionado, estado) =>
                  void handleTransition(seleccionado, estado)}
              />
            ))}
          </div>
        )}
    </section>
  );
}
