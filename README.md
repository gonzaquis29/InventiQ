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

Genera la migración inicial (no se versiona, ver por qué en la sección de abajo) y levanta la base:

```bash
npm run dev:db          # levanta Postgres embebido en :5433 (déjalo corriendo en su propia terminal)
npx prisma migrate dev --name init   # crea prisma/migrations a partir de prisma/schema.prisma
npm run start:dev        # API en http://localhost:3000/api
```

### Primer usuario (bootstrap)

No hay registro público: crear usuarios desde la app requiere ya estar autenticado como Administrador (por diseño — ver RF-U2). Para crear el primer Administrador, insértalo directo en la base:

```bash
cd backend
npx prisma studio
```

En la tabla `usuarios`, crea una fila con `rol = ADMIN` y `passwordHash` igual al resultado de:

```bash
node -e "console.log(require('bcrypt').hashSync('TU_CONTRASEÑA', 10))"
```

Con ese usuario ya puedes iniciar sesión y crear el resto del equipo desde **Usuarios → Nuevo** dentro de la propia app. Si quieres datos de ejemplo (categorías/productos) para probar, crea tu propio `backend/prisma/seed.ts` local — `npm run seed` ya está configurado para correrlo, pero no se incluye uno en el repo.

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env   # apunta VITE_API_URL al backend
npm run dev             # http://localhost:5173
```

## Base de datos (desarrollo local)

Este proyecto **no versiona `backend/prisma/migrations/`**. Cada quien genera su propia migración inicial a partir de `schema.prisma` (que sí es la fuente de verdad y está en el repo):

```bash
cd backend
npx prisma migrate dev --name init
```

Esto crea una única migración con el esquema completo actual, sin arrastrar el historial de cambios incrementales del desarrollo original.

### Si modificas el modelo de datos

1. Edita `backend/prisma/schema.prisma`.
2. Genera la migración:
   ```bash
   npx prisma migrate dev --name describe_tu_cambio
   ```
3. Commitea el `schema.prisma` (las migraciones quedan fuera del control de versiones, cada entorno las regenera/aplica localmente).

Para producción, `npx prisma migrate deploy` aplica las migraciones pendientes sin generar nuevas.

## Scripts útiles (backend)

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API en modo watch |
| `npm run build` | Compila a `dist/` |
| `npm run dev:db` | Postgres embebido para desarrollo local |
| `npm run seed` | Corre `prisma/seed.ts` si creaste uno local (no incluido en el repo) |
| `npx prisma studio` | Explorador visual de la base de datos |

## Roles

- **Administrador**: acceso total (usuarios, inventario, compras, proveedores, configuración, reportes).
- **Vendedor**: punto de venta, consulta de inventario, caja diaria. Sin acceso a compras/reportes/configuración.
