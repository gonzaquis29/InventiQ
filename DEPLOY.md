# Despliegue gratuito (Render + Neon)

Todo en planes gratuitos, sin tarjeta: **Neon** (base de datos) y **Render** (API y web). **UptimeRobot es opcional** — solo si la API se queda sin usar 15+ minutos (ej. cuando haya múltiples vendedores). Ahora, con solo el admin, no es necesario.

## 1. Base de datos — Neon
1. Crea una cuenta en https://neon.tech y un proyecto (región más cercana, ej. São Paulo).
2. Copia la **connection string directa** (desactiva "Pooled connection" en el panel). Debe terminar con `?sslmode=require`; agrega `&connect_timeout=15`.
   Ejemplo: `postgresql://usuario:clave@ep-xxxx.sa-east-1.aws.neon.tech/neondb?sslmode=require&connect_timeout=15`

> No uses la base Postgres gratuita de Render: **se borra a los 30 días**. Neon no vence.

## 2. API y web — Render
1. Sube el repo a GitHub (ya está).
2. En https://render.com → **New → Blueprint** → elige el repo. Render lee `render.yaml` y crea `inventiq-api` y `inventiq-web`.
3. Te pedirá tres valores:
   | Variable | Valor |
   |---|---|
   | `DATABASE_URL` (api) | la string de Neon del paso 1 |
   | `CORS_ORIGIN` (api) | URL de la web, ej. `https://inventiq-web.onrender.com` |
   | `VITE_API_URL` (web) | URL de la API + `/api`, ej. `https://inventiq-api.onrender.com/api` |
   `JWT_SECRET` se genera solo. Si Render asigna URLs distintas (porque el nombre estaba ocupado), corrige `CORS_ORIGIN` y `VITE_API_URL` en el panel y haz **Manual Deploy** de la web.
4. Al arrancar, la API aplica las migraciones sola (`migrate deploy`). Comprueba `https://<tu-api>.onrender.com/api/health` → `{"status":"ok"}`.

## 3. Primer administrador
Render free no tiene consola, así que se crea **desde tu computadora** apuntando a Neon:
```bash
cd backend
DATABASE_URL="<string de Neon>" npm run crear-admin
```
Luego entra a la web con ese usuario y crea al resto del equipo en **Configuración → Usuarios**. El inventario real se carga desde **Inventario → Importar**.

## 4. Que la API no se duerma — UptimeRobot (opcional)
**Render free duerme la API tras 15 min sin uso.** Si es solo el admin estos meses, no es problema. Cuando agregues vendedores y haya pausas de 15+ minutos sin actividad, agrega UptimeRobot:
1. Cuenta gratis en https://uptimerobot.com → **Add monitor** → tipo HTTP(s).
2. URL: `https://<tu-api>.onrender.com/api/health`, intervalo **5 minutos**.

**Nota:** Render free da 750 horas al mes por cuenta: alcanza para **una** API encendida todo el mes (la web estática no cuenta). No crees más servicios *web* gratuitos en la misma cuenta.

## Límites a tener presentes
- Neon se suspende tras 5 min sin consultas y despierta en ~1 s: la primera consulta después de un rato puede tardar un poco.
- Neon gratis: 0,5 GB de datos, de sobra para un bazar.
- Los backups automáticos de Neon gratis son limitados (historial corto). Si el negocio depende de estos datos, exporta periódicamente (Reportes → CSV).
