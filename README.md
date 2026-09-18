# Bookmark Manager

Aplicación full-stack para guardar enlaces, etiquetarlos y encontrarlos después.
Cada usuario ve solo sus propios marcadores, y entra con Google o GitHub.

- **Backend**: Node + Fastify 5 + TypeScript + Prisma + PostgreSQL
- **Frontend**: React + Vite + TypeScript + Tailwind CSS 4 + Mantine 7
- **Sesión**: OAuth 2.0 (Google / GitHub) → JWT firmado en cookie `httpOnly`

## Puesta en marcha

### 1. Base de datos

```bash
docker compose up -d
```

O usa cualquier PostgreSQL y ajusta `DATABASE_URL`.

### 2. Credenciales OAuth

**Google** — Cloud Console → APIs & Services → Credentials → *OAuth client ID* (tipo Web):

- Authorized redirect URI: `http://localhost:3333/api/auth/google/callback`

**GitHub** — Settings → Developer settings → OAuth Apps → *New OAuth App*:

- Homepage URL: `http://localhost:5173`
- Authorization callback URL: `http://localhost:3333/api/auth/github/callback`

Puedes configurar solo uno de los dos: el que falte aparece deshabilitado en la
pantalla de acceso (`GET /api/auth/providers` indica cuáles están activos).

### 3. Backend

```bash
cd backend
cp .env.example .env     # rellena secretos y credenciales OAuth
pnpm install
pnpm db:migrate       # crea las tablas
pnpm dev              # http://localhost:3333
```

Genera los secretos con `openssl rand -hex 32`.

### 4. Frontend

```bash
cd frontend
pnpm install
pnpm dev              # http://localhost:5173
```

Vite reenvía `/api` a `http://localhost:3333`, así que en desarrollo todo viaja
por el mismo origen y la cookie de sesión funciona sin ajustes de CORS.

## Modelo de datos

| Modelo     | Notas |
|------------|-------|
| `User`     | Identificado por email. Un mismo email con Google y con GitHub es un solo usuario. |
| `Account`  | Vínculo `(provider, providerAccountId) → user`. Permite añadir más proveedores. |
| `Bookmark` | `url` único por usuario. Favicon resuelto al guardar. |
| `Tag`      | Nombre único por usuario, en minúsculas. Relación N:M con `Bookmark`. |

Las etiquetas se crean solas al escribirlas en el formulario (`connectOrCreate`),
así que no hace falta gestionarlas antes de usarlas.

## API

Todas las rutas cuelgan de `/api`. Las de marcadores y etiquetas exigen sesión.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/auth/providers` | Proveedores configurados |
| `GET` | `/auth/google` · `/auth/github` | Inicia el flujo OAuth |
| `GET` | `/auth/{provider}/callback` | Callback: crea sesión y redirige al front |
| `GET` | `/auth/me` | Usuario de la sesión actual |
| `POST` | `/auth/logout` | Borra la cookie |
| `GET` | `/bookmarks` | `?q=&tag=&favorite=&sort=&page=&pageSize=` |
| `POST` | `/bookmarks` | Crear (409 si la URL ya está guardada) |
| `GET` | `/bookmarks/:id` | Detalle |
| `PATCH` | `/bookmarks/:id` | Actualizar (enviar `tags` reemplaza el conjunto) |
| `DELETE` | `/bookmarks/:id` | Eliminar |
| `GET` | `/tags` | Etiquetas con número de marcadores |
| `POST` | `/tags` | Crear con color propio |
| `PATCH` | `/tags/:id` | Renombrar o recolorear |
| `DELETE` | `/tags/:id` | Eliminar (los marcadores se conservan) |

Los cuerpos y query params se validan con Zod; un fallo devuelve `400` con el
detalle por campo.
