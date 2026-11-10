/**
 * PEDIDOS360 — FORMULARIO DE PRODUCTOS
 * Archivo: src/catalogo/ProductoForm.tsx
 *
 * PROPÓSITO: dibujar los campos para CREAR o EDITAR un producto.
 * CONEXIONES:
 * - Catalogo.tsx controla los valores, abre/cierra este formulario y guarda.
 * - ProductoForm NO importa catalogoApi ni clienteApi.
 * - El archivo CSS de formularios define las clases form-dialog y form-grid.
 *
 * ¿CONEXIÓN CON AWS? NINGUNA directa.
 * Al enviar, llama a onSubmit del padre (Catalogo.tsx); el padre decide si
 * corresponde hacer POST /catalogo o PUT /catalogo/{id}.
 *
 * VOCABULARIO:
 * - Form: formulario; Values: valores; Submit: enviar; Close: cerrar.
 * - Controlled input: campo cuyo valor lo controla React mediante props.
 * - Backdrop: fondo oscuro detrás de una ventana modal.
 * - Dialog: cuadro de diálogo o ventana emergente.
 */

import { X } from 'lucide-react';
import type { FormEvent, KeyboardEvent } from 'react';

/**
 * Los datos del formulario son strings porque <input> y <textarea>
 * entregan texto. Catalogo.tsx convierte precio y stock a number y valida.
 */
export interface ProductoFormValues {
  nombre: string;
  descripcion: string;
  precio: string;
  stock: string;
}

/**
 * Props que proporciona Catalogo.tsx:
 * - mode: create (crear) o edit (editar).
 * - values: contenido actual de los campos.
 * - saving: indica si se está guardando.
 * - error: mensaje de validación o error del backend.
 * - onChange: comunica un cambio de los campos al padre.
 * - onSubmit: comunica el envío del formulario al padre.
 * - onClose: solicita cerrar la ventana al padre.
 */
interface ProductoFormProps {
  mode: 'create' | 'edit';
  values: ProductoFormValues;
  saving: boolean;
  error: string | null;
  onChange: (values: ProductoFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}

/** COMPONENTE: ProductoForm() — muestra el formulario, no guarda en AWS. */
export function ProductoForm({
  mode,
  values,
  saving,
  error,
  onChange,
  onSubmit,
  onClose,
}: ProductoFormProps) {
  /**
   * FUNCIÓN: update(field, value)
   * Traducción: actualizar(campo, valor).
   *
   * Recibe el nombre de un campo y el nuevo texto escrito.
   * [field] es una propiedad calculada: modifica solo ese campo.
   * ...values copia los demás valores sin perderlos.
   * onChange comunica el nuevo objeto a Catalogo.tsx.
   */
  function update(field: keyof ProductoFormValues, value: string) {
    onChange({ ...values, [field]: value });
  }

  /**
   * FUNCIÓN: handleEscape()
   * Cierra la ventana con Escape solamente cuando no está guardando.
   * No realiza operaciones de red ni elimina información del backend.
   */
  function handleEscape(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !saving) {
      event.stopPropagation();
      onClose();
    }
  }

  const creando = mode === 'create';

  return (
    <div
      className="dialog-backdrop"
      role="presentation"
      onKeyDown={handleEscape}
    >
      {/* aria-modal: identifica que la ventana requiere atención. */}
      <section
        className="form-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="producto-form-title"
        aria-describedby={error ? 'producto-form-error' : undefined}
      >
        {/* ENCABEZADO Y BOTÓN DE CIERRE */}
        <header className="dialog-header">
          <div>
            <p className="card-overline">Catálogo</p>
            <h2 id="producto-form-title">
              {creando ? 'Nuevo producto' : 'Editar producto'}
            </h2>
          </div>

          <button
            type="button"
            className="icon-button"
            aria-label="Cerrar formulario"
            onClick={onClose}
            disabled={saving}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        {/*
         * onSubmit es una función proporcionada por Catalogo.tsx.
         * Allí se validan los números y se ejecuta la petición a AWS.
         */}
        <form className="form-grid" onSubmit={onSubmit}>
          <label className="form-field">
            <span>Nombre</span>
            <input
              name="nombre"
              value={values.nombre}
              onChange={(event) => update('nombre', event.target.value)}
              required
              maxLength={120}
              autoFocus
              disabled={saving}
            />
          </label>

          <label className="form-field">
            <span>Descripción</span>
            <textarea
              name="descripcion"
              value={values.descripcion}
              onChange={(event) => update('descripcion', event.target.value)}
              required
              maxLength={1000}
              rows={3}
              disabled={saving}
            />
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Precio (CLP)</span>
              <input
                name="precio"
                type="number"
                min="0"
                step="0.01"
                value={values.precio}
                onChange={(event) => update('precio', event.target.value)}
                required
                disabled={saving}
              />
            </label>

            <label className="form-field">
              <span>Stock</span>
              <input
                name="stock"
                type="number"
                min="0"
                step="1"
                value={values.stock}
                onChange={(event) => update('stock', event.target.value)}
                required
                disabled={saving}
              />
            </label>
          </div>

          {/* Error de validación o de la operación real de AWS. */}
          {error && (
            <p id="producto-form-error" className="inline-error" role="alert">
              {error}
            </p>
          )}

          <footer className="dialog-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>

            <button className="primary-button" type="submit" disabled={saving}>
              {saving
                ? 'Guardando…'
                : creando
                  ? 'Crear producto'
                  : 'Guardar cambios'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
