# GymPro v2

App de entrenamiento para gimnasios: el entrenador arma y asigna rutinas, el cliente las sigue desde el celular, marca lo que hace, registra pesos y ve su progreso.

**Stack:** Next.js 16 (App Router, Server Actions) · React 19 · Tailwind CSS 4 · Drizzle ORM + mysql2 · MySQL/MariaDB (Hostinger) · Docker standalone (Dokploy).

---

## Qué hay de nuevo respecto a la v1

### Rendimiento
- **Sin Prisma**: se reemplazó por Drizzle + `mysql2` (sin motor binario, sin `prisma generate`, arranque y consultas más rápidos, imagen Docker mucho más chica).
- Pool de conexiones con keep-alive, ajustado a MySQL remoto (Hostinger).
- Cada página hace pocas consultas y **en paralelo**; el panel ya no carga *todas* las rutinas de la historia, solo la semana que ves.
- Configuración del sistema en caché de memoria (no consulta la base en cada página).
- Imágenes subidas se convierten a **WebP** (máx. 1280 px) con `sharp`: 5–10× más ligeras.
- Videos de YouTube "ligeros": solo carga la miniatura; el reproductor (~1 MB) aparece al tocar play.
- Videos subidos se sirven con *streaming* y soporte de `Range` (ya se pueden adelantar y funcionan en iPhone).
- Pantallas de carga (skeletons) y actualizaciones optimistas (marcar ejercicio es instantáneo).

### Seguridad
- La sesión ahora es un **JWT firmado**. Antes la cookie era JSON plano y cualquiera podía editarla para hacerse admin.
- Todas las server actions verifican sesión y rol (antes cualquiera podía llamar `createUser`, `deleteExercise`, etc.).
- Validación de todos los datos con `zod`.
- Contraseñas antiguas en texto plano se convierten a bcrypt automáticamente al iniciar sesión.
- Límite de intentos de login, cuentas desactivadas expulsadas al instante, subida de archivos solo para el personal y con tipo/tamaño validados.
- Se eliminó `/api/debug-db` (exponía errores internos). En su lugar: `/api/health`.

### Funciones nuevas — Cliente
- **Semana navegable** con estado de cada día (hecho / parcial / pendiente / no hecho).
- **Marcar ejercicios como hechos** con barra de progreso del día.
- **Registrar el peso usado** y una nota por ejercicio; aviso de **récord personal** 🏆.
- **Temporizador de descanso** flotante (sonido + vibración).
- **Progreso**: racha de días, % de cumplimiento, mapa de constancia de 18 semanas, evolución de fuerza por ejercicio, **peso corporal** con gráfica.
- Perfil con cambio de contraseña y objetivo.
- **Instalable en el celular** (PWA: icono y pantalla completa).

### Funciones nuevas — Entrenador
- **Resumen del día**: quién entrena hoy y cuánto lleva, clientes sin rutina pendiente, actividad reciente.
- **Constructor de rutinas**: varios ejercicios a la vez, para **varios clientes**, y **repetir cada semana** hasta 12 semanas. Series, reps, descanso y nota por ejercicio.
- **Plantillas de rutina** reutilizables ("Pierna A", "Full body"…).
- **Copiar un día** a otra fecha y/o a otros clientes; eliminar un día completo.
- Vista semanal de rutinas filtrable por cliente.
- **Ficha del cliente** con estadísticas, semana, constancia, fuerza, peso corporal, teléfono, objetivo y notas privadas.
- Biblioteca de ejercicios con búsqueda y filtro por grupo muscular. Borrar un ejercicio con historial lo **archiva** (antes fallaba por la llave foránea).
- **Equipo** (solo admin): crear entrenadores/administradores, activar/desactivar.

---

## Base de datos (MySQL en Hostinger)

La v2 **usa tus mismas tablas** y solo **agrega** columnas y tablas nuevas. No borra ni modifica datos.

Las migraciones están en `database/migrations/` y se aplican **solas al arrancar** el contenedor (`AUTO_MIGRATE=true`). Llevan registro en la tabla `schema_migrations` y se pueden correr varias veces sin problema.

Si prefieres hacerlo a mano: abre **phpMyAdmin en Hostinger** → tu base → pestaña SQL → pega el contenido de `database/migrations/002_v2_features.sql` → Continuar. (El `001_base.sql` solo crea las tablas si no existen; en tu base ya existen.)

> **Importante — acceso remoto:** en hPanel → *Bases de datos* → *MySQL remoto*, agrega la IP pública de tu servidor Dokploy (o `%` para cualquier IP). El host de la base es el que aparece ahí (algo como `srv123.hstgr.io`), no `localhost`.

---

## Despliegue en Dokploy (desde GitHub)

1. Sube este código a tu repo de GitHub (rama que Dokploy vigila, normalmente `main`).
2. En Dokploy → tu aplicación:
   - **Build Type:** `Dockerfile` (recomendado; ruta `Dockerfile`, contexto `.`).
     También funciona con Nixpacks/Railpack: usan `npm run build` y `npm start`.
   - **Environment:**
     ```env
     DATABASE_URL=mysql://USUARIO:CLAVE@HOST_HOSTINGER:3306/NOMBRE_BD
     SESSION_SECRET=<64 caracteres aleatorios>
     UPLOAD_DIR=/app/uploads
     APP_TIMEZONE=America/Mexico_City
     ```
     Genera `SESSION_SECRET` con: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
   - **Volumes / Mounts:** un volumen montado en **`/app/uploads`** (si ya tenías uno con otra ruta, deja tu misma ruta y pon esa misma en `UPLOAD_DIR`; los archivos anteriores siguen funcionando).
   - **Port:** `3000`.
   - **Auto Deploy:** activado → cada `git push` redepliega solo.
3. Health check: `https://tu-dominio/api/health` (incluye ping a la base) o `/api/health?live=1` (sin base).

Al cambiar a la v2 todos tendrán que **iniciar sesión una vez más** (el formato de sesión cambió por seguridad).

Si la base está vacía, al arrancar se crea un usuario `admin` (contraseña en `ADMIN_PASSWORD` o una temporal impresa en los logs).

### ¿No puedes entrar?

| Lo que ves | Causa | Solución |
| --- | --- | --- |
| Vuelve al login sin ningún error | Versión anterior: la cookie se marcaba *Secure* y el dominio es `http://` | Ya corregido: la cookie usa *Secure* solo cuando la petición llega por HTTPS |
| "Usuario o contraseña incorrectos" | El admin ya existía y `ADMIN_PASSWORD` solo se usa con la base vacía | En Dokploy agrega `ADMIN_RESET=true` (con `ADMIN_USERNAME` y `ADMIN_PASSWORD`), redepliega, entra y quita `ADMIN_RESET`. O en la terminal del contenedor: `npm run admin -- usuario contraseña` |
| "No pudimos conectar con el servidor" | La app no llega a la base | Revisa MySQL remoto en Hostinger y `DATABASE_URL`; prueba `/api/health` |
| "Demasiados intentos" | 8 intentos fallidos en 15 min | Espera o reinicia la app |

---

## Desarrollo local

```bash
npm install
cp .env.example .env    # y pon tu DATABASE_URL
npm run db:migrate
npm run dev
```

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción (standalone) |
| `npm start` | Migra y arranca el build |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run admin -- usuario clave` | Crea o restablece un administrador |
| `npm run typecheck` / `npm run lint` | Verificaciones |

## Estructura

```
app/
  login/                  Inicio de sesión
  client/                 App del cliente (hoy, progreso, perfil)
  trainer/                Panel (resumen, rutinas, clientes, ejercicios, plantillas, ajustes)
  api/upload              Subida de archivos (streaming a disco)
  api/uploads/[...path]   Servir archivos con Range/caché
  api/health              Health check
actions/                  Server actions (con auth + validación)
lib/                      DB, sesión, consultas, fechas, utilidades
components/               UI compartida
database/migrations/      SQL versionado
scripts/                  migrate / start / postbuild / entrypoint Docker
proxy.ts                  Redirecciones por rol (antes middleware.ts)
```
