# Pedidos360 Frontend

Aplicación web (SPA) de Pedidos360: login real con Microsoft Entra ID vía MSAL, paneles por rol (Admin / Operador / Cliente), compra de productos de demostración y consulta/gestion de pedidos contra el backend real desplegado en AWS.

## Arquitectura

```
React 19 + TypeScript + Vite
  → @azure/msal-react / @azure/msal-browser (Authorization Code + PKCE)
  → Microsoft Entra ID (access token JWT v2 para Pedidos360-API)
  → API Gateway HTTP API (JWT Authorizer)
  → Lambda Node.js 22 → DynamoDB
  → SNS + SQS (mensajería asíncrona: email, ticket de cocina, boleta)
```

El navegador pide un access token de Pedidos360-API, lo envía como `Authorization: Bearer <token>` y **nunca** usa `127.0.0.1:5173` como URL de API. El backend real es `https://o3k66b0owk.execute-api.us-east-1.amazonaws.com`.

## Requisitos e inicio

Se requiere Node.js 20.19+ o 22.12+ y npm para Vite 8.

```bash
npm install
npm run dev
npm run lint
npm run build
```

Abre siempre el desarrollo en `http://localhost:5173` (el origen configurado para Entra ID, CORS de API Gateway y el redirect de MSAL; usa `strictPort`).

> El build emite un aviso no bloqueante de chunk > 500 kB (Rolldown). No es un error: `tsc -b && vite build` termina correctamente.

## Variables de entorno

Crea `.env` a partir de `.env.example`. No publiques `.env`; está ignorado por Git. El Client ID y Tenant ID identifican aplicaciones/directorios pero no son secretos. Esta SPA no contiene `client_secret`, claves de AWS ni contraseñas.

```dotenv
VITE_AZURE_CLIENT_ID=<client-id-de-Pedidos360-Frontend>
VITE_AZURE_TENANT_ID=<tenant-id-de-Microsoft-Entra>
VITE_AZURE_REDIRECT_URI=http://localhost:5173
VITE_API_BASE_URL=https://<id-de-tu-api>.execute-api.us-east-1.amazonaws.com
VITE_API_SCOPE=api://<client-id-de-Pedidos360-API>/catalog.read api://<client-id-de-Pedidos360-API>/catalog.write api://<client-id-de-Pedidos360-API>/orders.read api://<client-id-de-Pedidos360-API>/orders.write
```

> Los valores concretos de la cuenta actual ya están en `.env`. Si cambias de cuenta
> o de lab, vuelve a sacarlos de **API Gateway → tu API → Authorizers → `entra-jwt`**
> (de ahí salen el `aud` y el tenant del `iss`) y de **API Gateway → tu API → API
> Endpoint** (sale el `VITE_API_BASE_URL`).

## Microsoft Entra ID

Se registran dos aplicaciones en el tenant del `.env`:

- **Pedidos360-Frontend** (SPA): client id de la app SPA, Redirect URI `http://localhost:5173`.
- **Pedidos360-API**: client id de la app que expone los scopes `catalog.read`, `catalog.write`, `orders.read`, `orders.write` y los App Roles `Admin`, `Operador`, `Cliente`.

Los scopes se solicitan con el prefijo `api://<client-id-de-Pedidos360-API>/` en `VITE_API_SCOPE`; el audience (`aud`) del access token resultante es el GUID de la app API (no `api://GUID`), que es el valor configurado en el JWT Authorizer del backend.

## Inicio de sesión y paneles por rol

- La ruta `/` es pública (login/logout con MSAL, `prompt: select_account`; cambio de cuenta y logout funcionales).
- `/inicio` (destino de "Continuar al panel") resuelve el panel según el rol del access token:
  - **Admin** → `/admin` (Panel de Administración: contadores reales de la API y CRUD de catálogo).
  - **Operador** → `/operador` (Panel de Operaciones: catálogo solo lectura y gestión de pedidos).
  - **Cliente** → `/cliente` (Inicio de Cliente: "Comprar" y "Mis pedidos"). No tiene acceso a `/catalogo`.

`RequireRole` lee `roles` del access token de Pedidos360-API; el hook de autorización también lee `scp` para ajustar la experiencia. Estas comprobaciones son controles UX, no una frontera de seguridad: API Gateway valida el JWT y Lambda reautoriza rol/scope/ownership en cada operación.

### Flujo del Cliente

El Cliente compra en `/comprar`: una galería con los 6 productos de demostración sembrados en DynamoDB (`scripts/seed.js` del backend: `prod-teclado-001` … `prod-soporte-006`), arma un carrito temporal en React y confirma con `POST /pedidos` real. El backend valida existencia y stock, calcula precios y total, y deriva `clienteId` del JWT; el pedido se crea en estado `CREADO`. Desde "Mis pedidos" (`/pedidos`) el Cliente ve **solo sus pedidos** (ownership por `oid`); no puede crear pedidos desde esa pantalla ni cambiar estados.

Al guardarse el pedido, el backend publica un evento en un topic de SNS que se reparte a tres colas SQS (correo, ticket de cocina y boleta), cada una con su propia Lambda consumidora y su DLQ. Es un cambio **solo del backend**: este frontend no cambia ni necesita variables nuevas.

## Rutas

| Ruta | Quién | Contenido |
| --- | --- | --- |
| `/` | público | Login / Landing |
| `/catalogo-demo` | público | Mini catálogo de animales (demo etiquetada) |
| `/inicio` | autenticado | Resuelve el panel por rol |
| `/admin` | Admin | Panel de Administración |
| `/operador` | Operador | Panel de Operaciones |
| `/cliente` | Cliente | Inicio de Cliente |
| `/comprar` | Cliente | Vista de compra con carrito |
| `/catalogo` | Admin, Operador | Catálogo (Admin: CRUD; Operador: lectura) |
| `/pedidos` | Admin, Operador, Cliente | Pedidos (Cliente: solo los suyos, sin creación) |
| `/perfil` | autenticado | Perfil y diagnóstico de sesión |

## Flujo de token

MSAL obtiene el access token de Pedidos360-API con `acquireTokenSilent` y hace redirect interactivo solo cuando es necesario. `ApiClient` añade `Authorization: Bearer <access_token>`; el ID token no se envía al backend y no se guardan tokens manualmente (la caché la administra MSAL). `decodeJwt()` solo decodifica el payload para UX/inspección: no valida firma, issuer, audience ni vigencia; eso lo hace el authorizer y la Lambda.

MSAL Browser implementa Authorization Code Flow con PKCE y gestiona `state` y `nonce` sin código manual. En desarrollo, **TokenInspector** (Panel de Administración) permite comprobar `aud`, `iss`, `sub`, `scp`, `roles` y `exp`; el token completo queda tras un detalle cerrado y solo se muestra en dev.

## Cerrar sesión

**Cerrar sesión** inicia el logout de Entra ID y vuelve a `/`; **Cambiar cuenta** abre el selector de cuentas de Microsoft (`select_account`).

## Documentación relacionada

- Backend: repositorio `CluodMatrix/Pedidos360-Backend` (rama `main`) — README, `docs/GUIA-ENTRA-APIGATEWAY.md` y `docs/GUIA-SNS-SQS.md` (mensajería asíncrona con SNS + SQS).
- Ambos repos trabajan en la rama `main`; no se publican secretos ni credenciales.