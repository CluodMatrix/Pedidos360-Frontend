/**
 * PEDIDOS360 — ENCABEZADO REUTILIZABLE
 * Archivo: src/interfaz/PageHeader.tsx
 *
 * PAGE = página; HEADER = encabezado o cabecera.
 * Se utiliza en páginas de inicio, catálogo y pedidos para
 * mantener el mismo diseño de títulos y botones.
 *
 * NO consulta AWS ni gestiona autenticación.
 */
import type { ReactNode } from 'react';

/**
 * PROPS = datos que otro componente le entrega.
 * eyebrow?: texto pequeño encima del título (ej.: "INVENTARIO").
 * title: título principal obligatorio.
 * subtitle?: descripción secundaria.
 * actions?: otros elementos React, normalmente botones.
 *
 * ReactNode = contenido que React puede mostrar: texto, componentes, etc.
 */
interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

/**
 * COMPONENTE: PageHeader()
 * Ejemplo desde Catalogo.tsx:
 * <PageHeader title="Catálogo" subtitle="Gestiona productos" actions={...} />
 *
 * Las acciones no se ejecutan aquí: los botones vienen configurados
 * desde la página padre, con sus respectivas funciones onClick.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-heading">
        {/* El operador && muestra este elemento solo si existe eyebrow. */}
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      {/* Aquí pueden aparecer botones como Actualizar o Nuevo producto. */}
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
