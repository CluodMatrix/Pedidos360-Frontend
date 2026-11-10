
/**
 * ==========================================================
 * PEDIDOS360 — PANEL PERSONAL DEL CLIENTE
 * Archivo: src/inicio/InicioCliente.tsx
 * ==========================================================
 *
 * QUÉ HACE:
 * - Saluda al cliente usando su cuenta Microsoft.
 * - Muestra una ilustración del proyecto.
 * - Ofrece botones para Comprar y Mis pedidos.
 * - Consulta sus pedidos para calcular indicadores.
 * - Muestra los últimos tres pedidos.
 *
 * CONEXIONES:
 *
 * App.tsx -> RequireRole -> InicioCliente
 *
 * usuarios/activeAccount.ts:
 * Identifica la cuenta seleccionada.
 *
 * usuarios/useAuthorization.ts:
 * Comprueba si tiene orders.read.
 *
 * API/useApi.ts:
 * Prepara el cliente HTTP autenticado.
 *
 * API/pedidosApi.ts:
 * listarPedidos() consulta GET /pedidos.
 *
 * pedidos/PedidoEstado.tsx:
 * Muestra el estado visual de cada pedido.
 *
 * BACKEND:
 * React -> ApiClient -> API Gateway -> Lambda
 *                         -> Base de datos
 *
 * SEGURIDAD:
 * El backend debe devolver al Cliente solamente
 * sus propios pedidos.
 *
 * VOCABULARIO:
 * Dashboard = panel de información.
 * State = estado.
 * Hook = función reutilizable de React.
 * Fetch = solicitar datos.
 * Loading = cargando.
 * Refresh = actualizar.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMsal } from '@azure/msal-react';

import {
  ArrowRight,
  ClipboardList,
  Clock3,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';

import { useAuthorization } from '../usuarios/useAuthorization';
import { resolveActiveAccount } from '../usuarios/activeAccount';

import { useApi } from '../API/useApi';
import { listarPedidos, type Pedido } from '../API/pedidosApi';
import { apiErrorMessage } from '../API/clienteApi';

import { PageHeader } from '../interfaz/PageHeader';
import { PedidoEstado } from '../pedidos/PedidoEstado';

// Mascota decorativa de la carpeta de imágenes.
import mascotaCliente from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_42.png';

/**
 * ESTRUCTURA: ResultadoConsulta
 *
 * Guarda la respuesta de la API y la cuenta
 * a la que corresponde.
 *
 * Esto evita mostrar datos de otra cuenta cuando
 * el usuario cambia de sesión.
 */
interface ResultadoConsulta {
  key: string;
  pedidos: Pedido[];
  error: string | null;
}

/**
 * Formatea números como pesos chilenos.
 *
 * Por ejemplo: 12990 -> $12.990
 */
const formatoDinero = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/**
 * FUNCIÓN: formatearFecha()
 *
 * Convierte una fecha del backend en una fecha legible.
 */
function formatearFecha(valor: string): string {
  const fecha = new Date(valor);

  if (Number.isNaN(fecha.getTime())) {
    return 'Fecha no disponible';
  }

  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
  }).format(fecha);
}

/**
 * COMPONENTE PRINCIPAL: InicioCliente()
 */
export function InicioCliente() {
  // Sesión de Microsoft.
  const { instance, accounts } = useMsal();

  // Roles y scopes del token de acceso.
  const authorization = useAuthorization();

  // Cliente HTTP que añade el token a las solicitudes.
  const api = useApi();

  // Cuenta Microsoft seleccionada.
  const account = resolveActiveAccount(instance, accounts);

  // Primer nombre para personalizar el saludo.
  const nombreCorto =
    account?.name?.trim().split(/\s+/)[0] || 'bienvenido';

  // Permiso necesario para consultar pedidos.
  const puedeConsultar = authorization.hasScope('orders.read');

  /**
   * ESTADOS DE REACT:
   *
   * consulta: último resultado del backend.
   * revision: contador utilizado al pulsar Actualizar.
   */
  const [consulta, setConsulta] =
    useState<ResultadoConsulta | null>(null);

  const [revision, setRevision] = useState(0);

  /**
   * CLAVE DE CONSULTA
   *
   * Identifica la cuenta, el directorio y la versión
   * de los datos solicitados.
   *
   * Cuando cambia de cuenta o se actualiza la página,
   * una respuesta anterior no se utiliza como actual.
   */
  const consultaKey = [
    account?.homeAccountId ?? '',
    account?.tenantId ?? '',
    revision,
  ].join(':');

  // Solo consultamos cuando la autorización está lista.
  const listoParaConsultar =
    !authorization.loading &&
    !authorization.error &&
    puedeConsultar &&
    api !== null;

  /**
   * EFECTO: CARGAR PEDIDOS DESDE AWS
   *
   * 1. Comprueba que exista un cliente HTTP.
   * 2. Llama a listarPedidos().
   * 3. Guarda los pedidos recibidos.
   * 4. Guarda un mensaje si ocurre un error.
   *
   * La variable vigente evita actualizar un componente
   * que ya se desmontó o que cambió de cuenta.
   */
  useEffect(() => {
    if (!listoParaConsultar || !api) return;

    let vigente = true;

    void listarPedidos(api)
      .then((pedidos) => {
        if (!vigente) return;

        setConsulta({
          key: consultaKey,
          pedidos,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (!vigente) return;

        setConsulta({
          key: consultaKey,
          pedidos: [],
          error: apiErrorMessage(error),
        });
      });

    return () => {
      vigente = false;
    };
  }, [api, listoParaConsultar, consultaKey]);

  /**
   * Solo utilizamos resultados correspondientes
   * a la cuenta y consulta actuales.
   */
  const resultadoActual =
    consulta?.key === consultaKey ? consulta : null;

  const pedidos = resultadoActual?.pedidos ?? [];

  const cargandoPedidos =
    listoParaConsultar && resultadoActual === null;

  /**
   * INDICADORES DEL CLIENTE
   *
   * Los contadores se calculan con datos de la API.
   * No contienen cantidades inventadas.
   */
  const pedidosActivos = pedidos.filter(
    (pedido) =>
      pedido.estado !== 'ENTREGADO' &&
      pedido.estado !== 'CANCELADO',
  ).length;

  const pedidosEntregados = pedidos.filter(
    (pedido) => pedido.estado === 'ENTREGADO',
  ).length;

  /**
   * ÚLTIMOS PEDIDOS
   *
   * sort() ordena desde el más reciente.
   * slice(0, 3) conserva los primeros tres.
   */
  const ultimosPedidos = [...pedidos]
    .sort(
      (a, b) =>
        new Date(b.fechaCreacion).getTime() -
        new Date(a.fechaCreacion).getTime(),
    )
    .slice(0, 3);

  /**
   * FUNCIÓN: actualizarPedidos()
   *
   * Cambia revision y provoca una nueva consulta
   * mediante useEffect.
   */
  function actualizarPedidos() {
    setRevision((anterior) => anterior + 1);
  }

  return (
    <section className="page-stack cliente-inicio">
      {/* ENCABEZADO DEL CLIENTE */}
      <PageHeader
        eyebrow="MI ESPACIO"
        title={`¡Hola, ${nombreCorto}!`}
        subtitle="Organiza tus compras y acompaña tus pedidos."
      />

      {/* TARJETA PRINCIPAL DE BIENVENIDA */}
      <section className="cliente-hero">
        <div className="cliente-hero-copy">
          <span className="cliente-kicker">
            <Sparkles size={15} />
            TU ESPACIO PERSONAL
          </span>

          <h2>
            Tus pedidos,
            <span> ¡siempre contigo!</span>
          </h2>

          <p>
            Descubre productos, prepara tu próxima compra
            y sigue cada pedido hasta su entrega.
          </p>

          <div className="cliente-acciones">
            <Link to="/comprar" className="cliente-boton-principal">
              <ShoppingBag size={18} />
              Comprar ahora
              <ArrowRight size={17} />
            </Link>

            <Link to="/pedidos" className="cliente-boton-secundario">
              <ClipboardList size={18} />
              Mis pedidos
            </Link>
          </div>

          <p className="cliente-seguridad">
            <ShieldCheck size={15} />
            Sesión protegida con Microsoft Entra ID
          </p>
        </div>

        {/* Imagen local, decorativa y sin conexión al backend. */}
        <img
          className="cliente-mascota"
          src={mascotaCliente}
          alt=""
          aria-hidden="true"
        />
      </section>

      {/* INDICADORES PERSONALES */}
      <section
        className="cliente-seccion"
        aria-labelledby="cliente-resumen-titulo"
      >
        <div className="cliente-seccion-encabezado">
          <div>
            <p className="page-eyebrow">MIS INDICADORES</p>
            <h2 id="cliente-resumen-titulo">
              Resumen de mis pedidos
            </h2>
          </div>

          <button
            type="button"
            className="cliente-actualizar"
            onClick={actualizarPedidos}
            disabled={!listoParaConsultar || cargandoPedidos}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>
        </div>

        {/* ESTADOS DE AUTORIZACIÓN Y CONSULTA */}
        {authorization.loading && (
          <p className="cliente-aviso" role="status">
            Verificando permisos de tu cuenta…
          </p>
        )}

        {!authorization.loading && authorization.error && (
          <p className="cliente-aviso cliente-aviso-error" role="alert">
            {authorization.error}
          </p>
        )}

        {!authorization.loading &&
          !authorization.error &&
          !puedeConsultar && (
            <p className="cliente-aviso" role="status">
              Tu sesión no incluye el permiso orders.read.
              No podemos consultar tus pedidos.
            </p>
          )}

        {!authorization.loading &&
          !authorization.error &&
          puedeConsultar &&
          !api && (
            <p className="cliente-aviso" role="status">
              Preparando la conexión con el servicio de pedidos…
            </p>
          )}

        {cargandoPedidos && (
          <p className="cliente-aviso" role="status">
            Consultando tus pedidos…
          </p>
        )}

        {resultadoActual?.error && (
          <div className="cliente-aviso cliente-aviso-error" role="alert">
            <p>{resultadoActual.error}</p>
            <button
              type="button"
              onClick={actualizarPedidos}
              className="cliente-enlace"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* INDICADORES CON RESPUESTA VÁLIDA */}
        {listoParaConsultar &&
          resultadoActual &&
          !resultadoActual.error && (
            <div className="cliente-indicadores">
              <article className="cliente-indicador">
                <span className="cliente-indicador-icono">
                  <ClipboardList size={22} />
                </span>
                <div>
                  <small>Pedidos realizados</small>
                  <strong>{pedidos.length}</strong>
                </div>
              </article>

              <article className="cliente-indicador">
                <span className="cliente-indicador-icono">
                  <Clock3 size={22} />
                </span>
                <div>
                  <small>En proceso</small>
                  <strong>{pedidosActivos}</strong>
                </div>
              </article>

              <article className="cliente-indicador">
                <span className="cliente-indicador-icono">
                  <PackageCheck size={22} />
                </span>
                <div>
                  <small>Entregados</small>
                  <strong>{pedidosEntregados}</strong>
                </div>
              </article>
            </div>
          )}
      </section>

      {/* LISTA DE PEDIDOS RECIENTES */}
      {listoParaConsultar &&
        resultadoActual &&
        !resultadoActual.error && (
          <section
            className="cliente-seccion"
            aria-labelledby="cliente-recientes-titulo"
          >
            <div className="cliente-seccion-encabezado">
              <div>
                <p className="page-eyebrow">SEGUIMIENTO</p>
                <h2 id="cliente-recientes-titulo">
                  Mis últimos pedidos
                </h2>
              </div>

              <Link to="/pedidos" className="cliente-enlace">
                Ver todos <ArrowRight size={16} />
              </Link>
            </div>

            {ultimosPedidos.length === 0 ? (
              <div className="cliente-vacio">
                <ShoppingBag size={29} />
                <h3>¡Tu primera compra te espera!</h3>
                <p>
                  Todavía no tienes pedidos registrados.
                </p>
                <Link to="/comprar" className="cliente-enlace">
                  Explorar productos <ArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <div className="cliente-pedidos-recientes">
                {ultimosPedidos.map((pedido) => (
                  <article
                    className="cliente-pedido"
                    key={pedido.id}
                  >
                    <div className="cliente-pedido-info">
                      <strong>Pedido #{pedido.id}</strong>
                      <small>
                        {formatearFecha(pedido.fechaCreacion)}
                      </small>
                    </div>

                    {/* Reutiliza el componente de estados. */}
                    <PedidoEstado estado={pedido.estado} />

                    <strong className="cliente-pedido-total">
                      {formatoDinero.format(pedido.total)}
                    </strong>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
    </section>
  );
}
