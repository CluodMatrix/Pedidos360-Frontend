
/**
 * PEDIDOS360 — CATÁLOGO PÚBLICO DE DEMOSTRACIÓN
 * Archivo: src/catalogo/CatalogoDemo.tsx
 *
 * ¿PARA QUÉ SIRVE?
 * Muestra personajes e ilustraciones de Pedidos360
 * como si fueran productos de una tienda.
 *
 * CONEXIONES:
 * - App.tsx: ruta pública /catalogo-demo.
 * - imagenes/animales: ilustraciones locales.
 * - estilos/catalogo.css: apariencia visual.
 *
 * NO se conecta a AWS.
 * NO consulta DynamoDB.
 * NO utiliza autenticación Microsoft.
 *
 * MEJORA:
 * Las primeras dos imágenes son ilustraciones grupales.
 * Ahora se usan como portada, no como productos.
 */

// useState permite controlar errores de carga de imágenes.
import { useState } from 'react';

// Link permite navegar dentro de React Router.
import { Link } from 'react-router-dom';

/**
 * IMPORTACIONES DE IMÁGENES
 *
 * Vite procesa estos archivos y genera las rutas
 * que el navegador utiliza para mostrarlos.
 *
 * IMPORTANTE:
 * Si renombras una imagen en el Explorador,
 * también debes actualizar su importación.
 *
 * Las primeras dos representan grupos de mascotas.
 */

// Ilustraciones individuales de los personajes.
import img03 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_05.png';
import img04 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_07.png';
import img05 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_11.png';
import img06 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_18.png';
import img07 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_20.png';
import img08 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_42.png';
import img09 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_53.png';
import img10 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_03_57.png';
import img11 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_04_00.png';
import img12 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_04_04.png';
import img13 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_06.png';
import img14 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_15.png';
import img15 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_18.png';
import img16 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_22.png';
import img17 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_08_24.png';
import img18 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_13_25.png';
import img19 from '../imagenes/animales/Imagen de ChatGPT 29 sept 2026, 13_17_52.png';

/**
 * INTERFAZ: ProductoDemo
 *
 * Define los campos de cada producto ficticio.
 *
 * interface = estructura de datos en TypeScript.
 */
interface ProductoDemo {
  id: string;
  nombre: string;
  descripcion: string;
  precio: number;
  imagen: string;
}

/**
 * CONSTANTE: EDICION
 *
 * Nombre de la colección que mostramos.
 * Puedes cambiarlo para crear otra temática.
 */
const EDICION = 'Dorada';

/**
 * LISTA DE PRODUCTOS DE DEMOSTRACIÓN
 *
 * Estos productos no existen necesariamente en DynamoDB.
 *
 * Son datos estáticos:
 * significa que están escritos directamente en el código.
 *
 * Se mantienen los nombres y precios originales
 * de los personajes p03 a p19.
 */
const productos: ProductoDemo[] = [
  { id: 'p03', nombre: 'Rosa', descripcion: 'Figurita de colección de la edición Dorada.', precio: 9990, imagen: img03 },
  { id: 'p04', nombre: 'Crema', descripcion: 'Figurita de colección de la edición Dorada.', precio: 11490, imagen: img04 },
  { id: 'p05', nombre: 'Caramelo', descripcion: 'Figurita de colección de la edición Dorada.', precio: 10990, imagen: img05 },
  { id: 'p06', nombre: 'Tostado', descripcion: 'Figurita de colección de la edición Dorada.', precio: 11990, imagen: img06 },
  { id: 'p07', nombre: 'Bombón', descripcion: 'Figurita de colección de la edición Dorada.', precio: 12990, imagen: img07 },
  { id: 'p08', nombre: 'Avellana', descripcion: 'Figurita de colección de la edición Dorada.', precio: 10990, imagen: img08 },
  { id: 'p09', nombre: 'Gengibre', descripcion: 'Figurita de colección de la edición Dorada.', precio: 11990, imagen: img09 },
  { id: 'p10', nombre: 'Durazno', descripcion: 'Figurita de colección de la edición Dorada.', precio: 9990, imagen: img10 },
  { id: 'p11', nombre: 'Almendra', descripcion: 'Figurita de colección de la edición Dorada.', precio: 10990, imagen: img11 },
  { id: 'p12', nombre: 'Nieve', descripcion: 'Figurita de colección de la edición Dorada.', precio: 12490, imagen: img12 },
  { id: 'p13', nombre: 'Cacao', descripcion: 'Figurita de colección de la edición Dorada.', precio: 11990, imagen: img13 },
  { id: 'p14', nombre: 'Ámbar', descripcion: 'Figurita de colección de la edición Dorada.', precio: 10990, imagen: img14 },
  { id: 'p15', nombre: 'Cobre', descripcion: 'Figurita de colección de la edición Dorada.', precio: 13990, imagen: img15 },
  { id: 'p16', nombre: 'Ocre', descripcion: 'Figurita de colección de la edición Dorada.', precio: 10990, imagen: img16 },
  { id: 'p17', nombre: 'Café', descripcion: 'Figurita de colección de la edición Dorada.', precio: 11490, imagen: img17 },
  { id: 'p18', nombre: 'Rubí', descripcion: 'Figurita de colección de la edición Dorada.', precio: 13990, imagen: img18 },
  { id: 'p19', nombre: 'Moka', descripcion: 'Figurita de colección de la edición Dorada.', precio: 11990, imagen: img19 },
];

/**
 * formatter:
 * Da formato a los precios en pesos chilenos.
 *
 * Intl.NumberFormat pertenece a JavaScript.
 *
 * CLP = peso chileno.
 * maximumFractionDigits = número máximo de decimales.
 */
const formatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
});

/**
 * COMPONENTE: ImagenProductoDemo()
 *
 * ¿PARA QUÉ SIRVE?
 * Muestra la imagen de un producto ficticio.
 *
 * PARÁMETROS:
 * imagen: dirección de la ilustración.
 * nombre: nombre del personaje.
 *
 * CORRECCIÓN:
 * Si una imagen no se puede cargar, muestra
 * las primeras dos letras del nombre.
 *
 * onError = función que se ejecuta cuando
 * ocurre un error al cargar un recurso.
 */
function ImagenProductoDemo({
  imagen,
  nombre,
}: {
  imagen: string;
  nombre: string;
}) {

  // Indica si la imagen tuvo un error de carga.
  const [fallo, setFallo] = useState(false);

  if (fallo) {
    return (
      <span
        className="product-media-placeholder"
        role="img"
        aria-label={`Imagen no disponible de ${nombre}`}
      >
        {nombre.slice(0, 2).toUpperCase()}
      </span>
    );
  }

  return (
    <img
      src={imagen}
      alt={`Ilustración de ${nombre}`}
      loading="lazy"
      decoding="async"
      onError={() => setFallo(true)}
    />
  );
}

/**
 * COMPONENTE: CatalogoDemo()
 *
 * Muestra la página pública completa.
 *
 * NO requiere iniciar sesión.
 * NO utiliza useApi().
 * NO ejecuta fetch().
 *
 * Las tarjetas se construyen desde productos[],
 * que está definido dentro de este archivo.
 */
export function CatalogoDemo() {
  return (
    <main className="catalogo-demo-screen">

      {/* BARRA SUPERIOR */}
      <header className="catalogo-demo-topbar">
        <span className="catalogo-demo-brand">
          🛍️ Pedidos360 · Mini catálogo
        </span>

        <Link className="demo-back" to="/">
          ← Volver al inicio
        </Link>
      </header>

      <div className="catalogo-demo-layout">

        {/* ENCABEZADO DE LA COLECCIÓN */}
        <div className="catalogo-demo-header">
          <p className="card-overline">
            Edición {EDICION}
          </p>

          <h1>Mini catálogo de prueba</h1>

          <p>
            {productos.length} personajes ilustrados de demostración
            (sin backend ni stock real).
          </p>

          {/*
           * ILUSTRACIONES GRUPALES
           *
           * Estas dos imágenes representan conjuntos
           * de mascotas y decoran la portada.
           *
           * Se usan estilos locales para evitar
           * modificar catalogo.css por ahora.
           */}
          <div
            style={{
              display: 'flex',
              gap: 12,
              flexWrap: 'wrap',
              marginTop: 20,
            }}
          >
            <img
              src={img03}
              alt="Personajes de la colección Pedidos360"
              style={{
                width: 'min(100%, 330px)',
                height: 170,
                objectFit: 'contain',
              }}
            />

            <img
              src={img05}
              alt="Mascotas del equipo Pedidos360"
              style={{
                width: 'min(100%, 330px)',
                height: 170,
                objectFit: 'contain',
              }}
            />
          </div>
        </div>

        {/*
         * TARJETAS DE PRODUCTOS
         *
         * map() recorre los productos ficticios.
         *
         * Por cada elemento construye una tarjeta.
         *
         * key ayuda a React a identificar cada tarjeta.
         */}
        <div className="product-grid">
          {productos.map((producto) => (
            <article
              className="product-card"
              key={producto.id}
            >

              {/* IMAGEN DEL PERSONAJE */}
              <div className="product-media">
                <ImagenProductoDemo
                  imagen={producto.imagen}
                  nombre={producto.nombre}
                />
              </div>

              {/* NOMBRE Y ETIQUETA */}
              <div className="product-card-heading">
                <div>
                  <p className="card-overline">
                    Colección
                  </p>
                  <h2>{producto.nombre}</h2>
                </div>

                <span className="stock-badge">
                  Demo
                </span>
              </div>

              {/* DESCRIPCIÓN */}
              <p className="product-description">
                {producto.descripcion}
              </p>

              {/* PRECIO FICTICIO DE DEMOSTRACIÓN */}
              <div className="product-card-footer">
                <strong className="product-price">
                  {formatter.format(producto.precio)}
                </strong>
              </div>

            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
