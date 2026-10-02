# InventiQ

Sistema de gestión para una tienda Mype tipo bazar/papelería: inventario, punto de venta (POS), compras a proveedores, caja diaria y reportes.

## Stack

- **Backend**: NestJS + Prisma + PostgreSQL, autenticación JWT.
- **Frontend**: React 19 + Vite + Tailwind CSS 4 + React Router.

## Estructura

```
backend/    API REST (NestJS + Prisma)
frontend/   Aplicación web (React + Vite)
```

## Requisitos previos

- Node.js 20+
- npm

No hace falta instalar PostgreSQL por separado: `backend` incluye un Postgres embebido solo para desarrollo local (ver [Base de datos](#base-de-datos-desarrollo-local)).

## Puesta en marcha

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env   # ajusta los valores si hace falta
```

Levanta la base y crea las tablas:

```bash
npm run dev:db          # levanta Postgres embebido en :5433 (déjalo corriendo en su propia terminal)
npx prisma migrate dev   # aplica prisma/migrations a la base local
npm run start:dev        # API en http://localhost:3000/api
```

### Primer usuario (bootstrap)

No hay registro público: crear usuarios desde la app requiere ya estar autenticado como Administrador (por diseño — ver RF-U2). Para crear el primer Administrador:

```bash
cd backend
npm run crear-admin      # pregunta nombre, email y contraseña
```

También acepta `ADMIN_NOMBRE`, `ADMIN_EMAIL` y `ADMIN_PASSWORD` como variables de entorno para correrlo sin preguntas (útil en la consola del hosting). Con ese usuario ya puedes iniciar sesión y crear el resto del equipo desde **Usuarios → Nuevo** dentro de la propia app. Si quieres datos de ejemplo (categorías/productos) para probar, crea tu propio `backend/prisma/seed.ts` local — `npm run seed` ya está configurado para correrlo, pero no se incluye uno en el repo.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # apunta VITE_API_URL al backend
npm run dev             # http://localhost:5173
```

## Base de datos y migraciones

Las migraciones de `backend/prisma/migrations/` **sí se versionan**: son la forma en que cualquier base (local o de producción) llega al esquema actual. `0_init` contiene el esquema completo de partida.

### Si modificas el modelo de datos

1. Edita `backend/prisma/schema.prisma`.
2. Genera la migración:
   ```bash
   npx prisma migrate dev --name describe_tu_cambio
   ```
3. Commitea el `schema.prisma` **y** la carpeta nueva de `prisma/migrations/`.

### Producción

```bash
npm run migrate:deploy   # aplica solo las migraciones pendientes, nunca genera ni borra datos
npm run build && npm run start:prod
```

Variables obligatorias en el servidor: `DATABASE_URL`, `JWT_SECRET` (aleatorio, ≥ 32 caracteres: `openssl rand -hex 32`), `NODE_ENV=production`, `CORS_ORIGIN` (URL del frontend). El backend se niega a arrancar si `JWT_SECRET` falta o es el de ejemplo.

## Scripts útiles (backend)

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API en modo watch |
| `npm run build` | Compila a `dist/` |
| `npm run dev:db` | Postgres embebido para desarrollo local |
| `npm run seed` | Corre `prisma/seed.ts` si creaste uno local (no incluido en el repo) |
| `npm run crear-admin` | Crea un usuario Administrador |
| `npm run migrate:deploy` | Aplica migraciones pendientes (producción) |
| `npx prisma studio` | Explorador visual de la base de datos |

## Roles

- **Administrador**: acceso total (usuarios, inventario, compras, proveedores, configuración, reportes).
- **Vendedor**: punto de venta, consulta de inventario, caja diaria. Sin acceso a compras/reportes/configuración.
