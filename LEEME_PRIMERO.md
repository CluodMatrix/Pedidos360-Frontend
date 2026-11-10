# Pedidos360 — versión ordenada para estudiar 💛

**Esta es una COPIA del proyecto original; no sobreescribas tu carpeta que funciona.**

La organización ahora sigue lo que haces en la aplicación y no los términos internos de React.
**Se cambiaron ubicaciones/importaciones y se añadieron comentarios breves, pero no se rediseñaron las pantallas ni las operaciones.**

## Mapa de carpetas (dentro de `src/`)

```text
src/
├── main.tsx                  → inicia React
├── App.tsx                   → define las direcciones del navegador
├── inicio/                   → portada y paneles de Admin, Operador y Cliente
├── usuarios/                 → Microsoft Entra, inicio de sesión, roles y perfil
├── catalogo/                 → productos, compras, formularios y peticiones al catálogo
├── pedidos/                  → pedidos, formularios, estados y peticiones a pedidos
├── conexion/                 → cliente HTTP que se comunica con API Gateway
├── interfaz/                 → menú, encabezados, avisos y componentes comunes
├── estilos/                  → todos los archivos CSS
└── imagenes/                 → imágenes que usa la interfaz
```

## ¿Por dónde empezar?

1. **Cómo inicia:** abre `src/main.tsx` y después `src/App.tsx`.
2. **Quién puede entrar:** revisa `src/usuarios/RequireAuth.tsx`, `RequireRole.tsx` y `authConfig.ts`.
3. **Cómo se conecta a AWS:** revisa `src/conexion/clienteApi.ts` y `useApi.ts`.
4. **Cómo se ven los productos:** abre `src/catalogo/Catalogo.tsx`, `catalogoApi.ts`, `ProductoCard.tsx` y `ProductoForm.tsx`.
5. **Cómo se hacen pedidos:** abre `src/pedidos/Pedidos.tsx` y `pedidosApi.ts`.
6. **Cómo cambias colores o menú:** revisa `src/estilos/` y `src/interfaz/`.

## ¿Qué cambió y qué NO cambió?

- **Sí:** se movieron archivos y se actualizaron todas las rutas relativas de importación.
- **Sí:** se añadieron comentarios de orientación en archivos TypeScript/React.
- **No:** no se cambiaron las URL de navegación (`/admin`, `/comprar`, etc.).
- **No:** no se cambiaron nombres de funciones ni reglas de autenticación/roles.
- **No:** no se tocaron AWS, API Gateway, Lambda, DynamoDB, Microsoft Entra ni el backend.
- **No:** no se corrigió el error de `/notificaciones`; sigue pendiente de revisión con seguridad.

## Atención con tu trabajo actual

El ZIP que compartiste **no incluía tu archivo `.env`** (correcto: está excluido de Git y de la copia).
Si luego pruebas esta versión, copia tu `.env` local desde la carpeta anterior a la nueva, **sin compartirlo**.

Además, el `main.tsx`, `App.tsx`, `authConfig.ts` y `activeAccount.ts` del ZIP parecen tener sus comentarios ORIGINALES, no todas las anotaciones extensas que escribimos en la Etapa 1. Si agregaste comentarios en tu carpeta actual después de generar el ZIP, **conserva esa carpeta como referencia**. Esta copia añade cabeceras de ayuda, pero no puede recuperar ediciones locales que no llegaron al ZIP.

### Probar sin riesgo en Windows / VS Code

1. Guarda el proyecto original y descomprime este ZIP en una **carpeta diferente**.
2. Copia tu propio `.env` a la raíz del proyecto nuevo (al lado de `package.json`).
3. Abre **esa nueva carpeta** desde VS Code.
4. Abre una terminal y ejecuta `npm ci`, seguido de `npm run build`.
5. Si el build termina bien, inicia con `npm run dev` y comprueba login, catálogo y pedidos.
6. **No ejecutes dos Vite a la vez** con el mismo puerto 5173. Cierra el anterior antes de iniciar este.

Si algo falla, conserva el proyecto original y pega el error. El original no ha sido modificado.

## ¿Qué significan estos nombres?

- **`.tsx`:** código de React que puede dibujar HTML/JSX.
- **`.ts`:** funciones, tipos, utilidades o comunicación, sin JSX.
- **`.css`:** apariencia: colores, tamaños, márgenes.
- **`Api`:** archivos con solicitudes HTTP al backend; **no son el backend**.
- **`use...`:** hooks de React, funciones reutilizables que gestionan estado u otros recursos.
- **`Require...`:** componentes que restringen páginas del frontend.
- **`Provider`:** hace funciones/estado disponibles para otros componentes.

## ¿Qué mostrarme en la siguiente conversación?

En vez de buscar por carpetas técnicas, basta con decir: **«Quiero estudiar Catálogo»** y empezamos con `src/catalogo/Catalogo.tsx`.

*Las guías originales en `docs/` pueden mencionar nombres de archivos de una versión anterior; para encontrar los archivos de esta copia, usa el mapa siguiente.*
