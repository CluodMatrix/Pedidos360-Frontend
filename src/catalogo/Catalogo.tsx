/**
 * PEDIDOS360 — CATÁLOGO ADMINISTRATIVO CON DISEÑO PASTEL
 * Archivo: src/catalogo/Catalogo.tsx
 *
 * QUÉ HACE:
 * - Consulta productos REALES del backend, sin inventar cantidades.
 * - Calcula indicadores de stock, busca y filtra SOLO en el navegador.
 * - Conserva crear, editar y eliminar con los permisos existentes.
 * - Presenta una carga pastel sencilla, sin imágenes ni elementos adicionales.
 *
 * CONEXIONES:
 * - usuarios/useAuthorization.ts: roles y permisos del access token.
 * - API/useApi.ts y API/catalogoApi.ts: solicitudes a API Gateway.
 * - ProductoCard.tsx: tarjeta visual por producto.
 * - ProductoForm.tsx / ConfirmDialog.tsx: edición y confirmación.
 * - estilos/catalogo.css: diseño exclusivo de esta pantalla.
 *
 * AWS: listarCatalogo -> GET /catalogo -> API Gateway -> Lambda -> DynamoDB.
 * Esas llamadas no se modifican al cambiar el diseño.
 *
 * VOCABULARIO: filter = filtrar; search = buscar; loading = cargando;
 * state = estado; memo = cálculo conservado; callback = función recibida.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertTriangle, Boxes, CheckCircle2, ChevronRight, PackageX,
  Plus, RefreshCw, Search, SlidersHorizontal, X,
} from 'lucide-react';

import { useApi } from '../API/useApi';
import {
  actualizarProducto,
  crearProducto,
  eliminarProducto,
  listarCatalogo,
  type Producto,
} from '../API/catalogoApi';
import { ApiError, apiErrorDetails, apiErrorMessage } from '../API/clienteApi';
import { useAuthorization } from '../usuarios/useAuthorization';
import { ProductoCard } from './ProductoCard';
import { ProductoForm, type ProductoFormValues } from './ProductoForm';
import { ConfirmDialog } from '../interfaz/ConfirmDialog';
import { EmptyState } from '../interfaz/EmptyState';
import { ErrorState } from '../interfaz/ErrorState';

/** Stock bajo = entre 1 y 5 unidades. Es una regla VISUAL, no del backend. */
const LIMITE_STOCK_BAJO = 5;

type FiltroStock = 'todos' | 'disponibles' | 'bajo' | 'agotados';

const FORMULARIO_VACIO: ProductoFormValues = {
  nombre: '', descripcion: '', precio: '', stock: '',
};

/** Facilita la búsqueda incluso si la persona omite las tildes. */
function normalizarBusqueda(texto: string): string {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/** Carga solamente visual: NO llama a AWS ni simula datos. */
function CatalogoLoading({ mensaje }: { mensaje: string }) {
  return (
    <div className="catalogo-loading" role="status" aria-live="polite">
      <span className="catalogo-loading-ring" aria-hidden="true" />
      <strong>{mensaje}</strong>
      <small>Preparando la información de tu catálogo</small>
    </div>
  );
}

export function Catalogo() {
  // Autenticación: los scopes deciden qué controles se ven; AWS valida de verdad.
  const api = useApi();
  const authorization = useAuthorization();
  const { loading: authorizationLoading, hasScope } = authorization;
  const canRead = hasScope('catalog.read');
  const isAdmin = authorization.roles.includes('Admin');
  const canWrite = isAdmin && hasScope('catalog.write');

  // Datos de AWS y estados de la consulta.
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Nuevo: búsqueda y filtros locales. No requieren endpoints adicionales.
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<FiltroStock>('todos');

  // Estados de formularios y eliminación (misma lógica de antes).
  const [formMode, setFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [form, setForm] = useState<ProductoFormValues>({ ...FORMULARIO_VACIO });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | number | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<Producto | null>(null);

  // Identificador de solicitud: evita mostrar respuestas de una carga antigua.
  const numeroSolicitud = useRef(0);

  /** Conecta con GET /catalogo mediante el cliente HTTP existente. */
  const cargarCatalogo = useCallback(async () => {
    const solicitud = ++numeroSolicitud.current;
    if (!api || !canRead) {
      setProductos([]);
      setError(null);
      setErrorDetails(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    try {
      const datos = await listarCatalogo(api);
      if (solicitud !== numeroSolicitud.current) return;
      setProductos(datos);
    } catch (err) {
      if (solicitud !== numeroSolicitud.current) return;
      setError(apiErrorMessage(err));
      setErrorDetails(
        import.meta.env.DEV && err instanceof ApiError && err.status === 403
          ? apiErrorDetails(err)
          : null,
      );
    } finally {
      if (solicitud === numeroSolicitud.current) setLoading(false);
    }
  }, [api, canRead]);

  /** useEffect: consulta automáticamente después de verificar permisos. */
  useEffect(() => {
    if (authorizationLoading) return;
    void cargarCatalogo();
    return () => { numeroSolicitud.current += 1; };
  }, [authorizationLoading, cargarCatalogo]);

  /** Estadísticas REALES calculadas desde el arreglo que devolvió AWS. */
  const indicadores = useMemo(() => ({
    total: productos.length,
    disponibles: productos.filter((p) => p.stock > 0).length,
    bajos: productos.filter((p) => p.stock > 0 && p.stock <= LIMITE_STOCK_BAJO).length,
    agotados: productos.filter((p) => p.stock <= 0).length,
  }), [productos]);

  /** Filtros en memoria. Nunca modifican datos ni inventario de DynamoDB. */
  const productosVisibles = useMemo(() => {
    const consulta = normalizarBusqueda(busqueda);
    return productos.filter((producto) => {
      const texto = normalizarBusqueda(`${producto.nombre} ${producto.descripcion}`);
      const coincideBusqueda = !consulta || texto.includes(consulta);
      const coincideFiltro = filtro === 'todos'
        || (filtro === 'disponibles' && producto.stock > 0)
        || (filtro === 'bajo' && producto.stock > 0 && producto.stock <= LIMITE_STOCK_BAJO)
        || (filtro === 'agotados' && producto.stock <= 0);
      return coincideBusqueda && coincideFiltro;
    });
  }, [productos, busqueda, filtro]);

  /** Solo prepara los campos. Todavía no envía ninguna solicitud. */
  function abrirCreacion() {
    setEditingProduct(null);
    setForm({ ...FORMULARIO_VACIO });
    setFormError(null);
    setNotice(null);
    setFormMode('create');
  }

  function abrirEdicion(producto: Producto) {
    setEditingProduct(producto);
    setForm({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: String(producto.precio),
      stock: String(producto.stock),
    });
    setFormError(null);
    setNotice(null);
    setFormMode('edit');
  }

  /** POST /catalogo al crear; PUT /catalogo/{id} al actualizar. */
  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!api || !canWrite || saving || formMode === 'closed') return;

    const precio = Number(form.precio);
    const stock = Number(form.stock);
    if (
      !form.nombre.trim() || !form.descripcion.trim()
      || !form.precio.trim() || !form.stock.trim()
      || !Number.isFinite(precio) || precio < 0
      || !Number.isInteger(stock) || stock < 0
    ) {
      setFormError('Completa todos los campos. El precio debe ser válido y el stock un entero no negativo.');
      return;
    }
    if (formMode === 'edit' && !editingProduct) {
      setFormError('No se encontró el producto que intentas editar.');
      return;
    }

    const valores = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      precio,
      stock,
    };
    setSaving(true);
    setFormError(null);
    setNotice(null);
    try {
      if (formMode === 'create') {
        const creado = await crearProducto(api, valores);
        setProductos((actuales) => [creado, ...actuales]);
        setNotice('Producto creado correctamente.');
      } else if (editingProduct) {
        const editado = editingProduct;
        const actualizado = await actualizarProducto(api, editado.id, valores);
        setProductos((actuales) => actuales.map((p) =>
          p.id === editado.id ? (actualizado ?? { ...editado, ...valores }) : p,
        ));
        setNotice('Producto actualizado correctamente.');
      }
      setFormMode('closed');
      setEditingProduct(null);
    } catch (err) {
      setFormError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  /** DELETE /catalogo/{id}, únicamente después de confirmar. */
  async function handleDelete(producto: Producto) {
    if (!api || !canWrite || deletingId !== null) return;
    setDeletingId(producto.id);
    setActionError(null);
    setNotice(null);
    try {
      await eliminarProducto(api, producto.id);
      setProductos((actuales) => actuales.filter((p) => p.id !== producto.id));
      setNotice('Producto eliminado correctamente.');
    } catch (err) {
      setActionError(apiErrorMessage(err));
    } finally {
      setDeletingId(null);
      setConfirmingDelete(null);
    }
  }

  const backendPendiente = error === 'El backend aún no está configurado.';
  const catalogoListo = !authorizationLoading && !authorization.error
    && canRead && Boolean(api) && !loading && !error;

  return (
    <section className="page-stack catalogo-page">
      {/* Decoración de burbujas: CSS, sin contenido ni datos falsos. */}
      <div className="catalogo-ambiente" aria-hidden="true" />

      <header className="catalogo-header">
        <div className="catalogo-titulos">
          <p className="catalogo-eyebrow">
            ADMINISTRACIÓN <ChevronRight size={14} aria-hidden="true" /> <span>Catálogo</span>
          </p>
          <div className="catalogo-title-row">
            <span className="catalogo-title-icon" aria-hidden="true"><Boxes size={32} /></span>
            <div>
              <h1>Catálogo</h1>
              <p className="catalogo-subtitle">Gestiona los productos y su disponibilidad.</p>
            </div>
          </div>
        </div>
        <div className="catalogo-header-actions">
          <button
            type="button"
            className="catalogo-button catalogo-button--refresh"
            onClick={() => void cargarCatalogo()}
            disabled={!api || !canRead || authorizationLoading || loading || saving || deletingId !== null}
          >
            <RefreshCw size={17} aria-hidden="true" /> Actualizar
          </button>
          {canWrite && (
            <button
              type="button"
              className="catalogo-button catalogo-button--create"
              onClick={abrirCreacion}
              disabled={saving || deletingId !== null}
            >
              <Plus size={18} aria-hidden="true" /> Nuevo producto
            </button>
          )}
        </div>
      </header>

      {authorizationLoading && <CatalogoLoading mensaje="Verificando permisos…" />}
      {!authorizationLoading && authorization.error && <ErrorState message={authorization.error} />}
      {!authorizationLoading && !authorization.error && !canRead && (
        <ErrorState message="Tu sesión no incluye el permiso catalog.read para consultar productos." />
      )}
      {!authorizationLoading && !authorization.error && canRead && !api && (
        <CatalogoLoading mensaje="Preparando conexión…" />
      )}
      {isAdmin && !canWrite && !authorizationLoading && (
        <p className="permission-note">Tu rol permite administrar el catálogo, pero la sesión no incluye catalog.write.</p>
      )}
      {notice && <p className="success-banner" role="status">{notice}</p>}
      {actionError && <ErrorState title="No se pudo eliminar el producto" message={actionError} />}
      {!authorizationLoading && canRead && error && (
        <ErrorState
          title={backendPendiente ? 'Backend no configurado' : 'No se pudo consultar el catálogo'}
          message={error}
          details={errorDetails}
          onRetry={backendPendiente ? undefined : () => void cargarCatalogo()}
        />
      )}
      {!authorizationLoading && canRead && api && loading && !error && (
        <CatalogoLoading mensaje="Cargando productos…" />
      )}

      {catalogoListo && (
        <>
          {/* Los cuatro valores provienen de la respuesta de AWS. */}
          <section className="catalogo-stats" aria-label="Resumen del inventario">
            <div className="catalogo-stat catalogo-stat--total">
              <span className="catalogo-stat-icon"><Boxes size={27} aria-hidden="true" /></span>
              <div><strong>{indicadores.total}</strong><span>Total de productos</span></div>
            </div>
            <div className="catalogo-stat catalogo-stat--available">
              <span className="catalogo-stat-icon"><CheckCircle2 size={27} aria-hidden="true" /></span>
              <div><strong>{indicadores.disponibles}</strong><span>En stock</span></div>
            </div>
            <div className="catalogo-stat catalogo-stat--low">
              <span className="catalogo-stat-icon"><AlertTriangle size={27} aria-hidden="true" /></span>
              <div><strong>{indicadores.bajos}</strong><span>Stock bajo (1–{LIMITE_STOCK_BAJO})</span></div>
            </div>
            <div className="catalogo-stat catalogo-stat--out">
              <span className="catalogo-stat-icon"><PackageX size={27} aria-hidden="true" /></span>
              <div><strong>{indicadores.agotados}</strong><span>Sin stock</span></div>
            </div>
          </section>

          {/* Buscador local; no genera solicitudes adicionales al backend. */}
          <div className="catalogo-toolbar">
            <div className="catalogo-search">
              <Search size={19} aria-hidden="true" />
              <input
                aria-label="Buscar productos"
                type="search"
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar productos por nombre o descripción..."
              />
              {busqueda && (
                <button type="button" aria-label="Borrar búsqueda" onClick={() => setBusqueda('')}>
                  <X size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* aria-pressed permite anunciar el filtro seleccionado. */}
          <div className="catalogo-filterbar">
            <span className="catalogo-filter-title"><SlidersHorizontal size={17} /> Filtrar:</span>
            {([
              ['todos', 'Todos'],
              ['disponibles', 'Disponibles'],
              ['bajo', 'Stock bajo'],
              ['agotados', 'Agotados'],
            ] as const).map(([valor, etiqueta]) => (
              <button
                type="button"
                key={valor}
                className={`catalogo-filter${filtro === valor ? ' is-active' : ''}`}
                aria-pressed={filtro === valor}
                onClick={() => setFiltro(valor)}
              >
                {etiqueta}
              </button>
            ))}
            <span className="catalogo-visible-count" role="status">
              {productosVisibles.length} de {productos.length} productos
            </span>
          </div>

          {productos.length === 0 ? (
            <div className="catalogo-empty"><EmptyState title="No hay productos registrados" description="Cuando existan productos, aparecerán aquí." /></div>
          ) : productosVisibles.length === 0 ? (
            <div className="catalogo-empty">
              <EmptyState title="No encontramos productos" description="Prueba con otra búsqueda o cambia el filtro." />
              <button type="button" className="catalogo-clear-filters" onClick={() => { setBusqueda(''); setFiltro('todos'); }}>
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="product-grid" aria-label="Productos del catálogo">
              {productosVisibles.map((producto) => (
                <ProductoCard
                  key={producto.id}
                  producto={producto}
                  canWrite={canWrite}
                  deleting={deletingId === producto.id}
                  onEdit={abrirEdicion}
                  onDelete={setConfirmingDelete}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* El formulario mantiene el mismo componente y los mismos endpoints. */}
      {formMode !== 'closed' && (
        <ProductoForm
          mode={formMode}
          values={form}
          saving={saving}
          error={formError}
          onChange={setForm}
          onSubmit={handleSave}
          onClose={() => { if (!saving) setFormMode('closed'); }}
        />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Eliminar producto"
          message={`¿Seguro que quieres eliminar “${confirmingDelete.nombre}”? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar producto"
          busy={deletingId === confirmingDelete.id}
          onConfirm={() => void handleDelete(confirmingDelete)}
          onCancel={() => setConfirmingDelete(null)}
        />
      )}
    </section>
  );
}
