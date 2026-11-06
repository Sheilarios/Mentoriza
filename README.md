# Mentoriza — plataforma completa (frontend + backend)

> **La IA te da respuestas. Mentoriza te enseña el método.**
> Proyecto del equipo **NovaDevs** · Científica Sprint 2026 · Universidad Científica del Sur.

Mentoriza es una plataforma web para universitarios de Lima: estudio guiado paso a paso con el **sílabo y la rúbrica** de cada curso, **modo enfoque** (Pomodoro), **mentores pares** bajo demanda, **planes Gratis / Premium / Universidad aliada**, **panel para universidades** y **administración**. Esta versión (v3) convierte el prototipo frontend (v1/v2) en un sistema real con cuentas seguras, base de datos e IA conectada.

---

## 1. Tecnología elegida y por qué

| Capa | Tecnología | Por qué es la mejor opción para Mentoriza |
|---|---|---|
| Frontend | **React 18 + Vite + TypeScript** + React Router | Mentoriza es una app interactiva y pensada para el celular (chat, temporizador, mentorías en vivo). React es más liviano y rápido de iterar que Angular para un equipo pequeño, reutiliza el JavaScript del prototipo y tiene el mayor ecosistema. Vite compila en segundos. |
| Backend | **Node.js 20 + Express 5 + TypeScript** | Un solo lenguaje (TypeScript) en todo el proyecto: el equipo mantiene frontend y backend sin cambiar de contexto. Ideal para una API REST con llamadas a IA (E/S intensiva). |
| Base de datos | **PostgreSQL + Prisma ORM** | Datos relacionales (usuarios, universidades, cursos, consultas, mentorías, pagos). Prisma da migraciones versionadas y consultas seguras con tipos. |
| IA | API **compatible con OpenAI** (OpenAI, Groq, OpenRouter, Azure, Ollama…) | Se cambia de proveedor solo con variables de entorno. Sin clave, la plataforma sigue funcionando con guías locales. |
| Seguridad | JWT, contraseñas con bcrypt, Helmet, límites de solicitudes, validación con Zod | Requisitos mínimos para publicar con usuarios reales. |
| Despliegue | **Docker** (una sola imagen), docker compose, **Render Blueprint** | Se publica con un clic o en cualquier servidor. |

```text
┌──────────────────────── Navegador ────────────────────────┐
│  React (Vite)  ─── fetch /api ───▶                         │
└───────────────────────────────────┬───────────────────────┘
                                    ▼
                    ┌──────── Node.js / Express ────────┐
                    │  Auth JWT · Cursos · Estudio IA    │──▶ Proveedor de IA
                    │  Enfoque · Mentorías · Planes      │
                    │  Universidades · Admin · Evidencia │
                    └───────────────┬────────────────────┘
                                    ▼
                              PostgreSQL (Prisma)
```

En producción **una sola imagen Docker** sirve el frontend compilado y la API en el mismo dominio (sin problemas de CORS).

---

## 2. Funcionalidades

**Estudiantes**
- Ingreso **por convenio** (universidad aliada + correo institucional + contraseña asignada) o **cuenta personal** (registro con correo). Etiqueta “Prueba sin tarjeta ni costo” (cambio v2 por evidencia de la prueba de prototipo).
- **Bienvenida en 3 pasos**: carrera y ciclo, 1 a 3 cursos, rúbrica del primer curso.
- **Cursos** con sílabo y rúbrica: pegar texto, subir **.txt / .md / PDF / foto** (foto requiere IA). Confirmación verde visible al leer la rúbrica (cambio v2).
- **Estudio guiado**: la IA divide la duda en 3–5 pasos conectados al sílabo y a un criterio de la rúbrica; “No entendí este paso” (analogía); pregunta de verificación con corrección; avance por temas del sílabo; sugerencia de mentor tras 3 intentos.
- **Plan Gratis**: 3 consultas de IA por día (controlado en el servidor, hora de Lima).
- **Modo enfoque** (25/15/45 min) que sigue corriendo al navegar y registra la sesión.
- **Racha de estudio** diaria y **modo nocturno automático** desde las 20:00.
- **Mentores**: Universidad aliada usa **créditos mensuales (1 crédito = 15 min)**; Premium **propone su precio** (referencia S/ 40/h) y recibe ofertas y contraofertas. Sala de chat, cierre, calificación y devolución de créditos al cancelar.
- **Planes**: Premium S/ 15/mes (modo demostración sin cobro real), cancelación e historial de pagos.

**Mentores** (rol `MENTOR`): panel con sus sesiones y chat en vivo con el estudiante. Los mentores de demostración sin cuenta responden con IA y se indica en pantalla.

**Universidades** (rol `UNI_ADMIN`): panel con datos reales — alumnos registrados y activos, dudas trabajadas, % completadas, créditos usados, mentorías y cursos con más bloqueos. Formulario público “Solicita el convenio”.

**Administración** (rol `ADMIN`): métricas globales, alta/activación de universidades aliadas (dominio, contraseña inicial, créditos), alta de mentores, solicitudes de convenio.

**Evidencia del programa** (sección “Acerca de” y “Ver presentación”): las 15 entrevistas (sin teléfonos ni enlaces privados), 6 hipótesis, TAM/SAM/SOM con fuentes, costos/precio/punto de equilibrio calculados por el servidor, prueba del prototipo con 5 usuarios y cambios v1→v2, Business Model Canvas, ruta de protección y pitch inversionista (F.2) y cliente (F.4).

Valores tomados del cuaderno de entregables (hoja P5): costos fijos **S/ 550**, costo variable **S/ 3.40**, precio **S/ 15**, costo unitario **S/ 8.90**, margen **S/ 6.10 (40.7 %)**, punto de equilibrio **48 suscripciones/mes**.

---

## 3. Cuentas de prueba (visibles debajo del inicio de sesión)

Debajo del formulario de ingreso aparece la tarjeta **Cuentas de prueba**: cada cuenta tiene un botón **Entrar** (ingreso con un clic) y muestra su correo y contraseña para copiarlos.

| Rol | Correo | Contraseña |
|---|---|---|
| Estudiante por convenio (UCSUR) | `ana@cientifica.edu.pe` | `mentoriza2026` |
| Estudiante con plan Gratis | `luis.prueba@gmail.com` | `mentoriza2026` |
| Mentor | `valeria@mentoriza.pe` | `mentoriza2026` |
| Universidad (UCSUR) | `coordinacion@cientifica.edu.pe` | `mentoriza2026` |
| Administrador (no se muestra en la tarjeta) | valor de `ADMIN_EMAIL` (por defecto `admin@mentoriza.pe`) | valor de `ADMIN_PASSWORD` |

- La contraseña mostrada es `SEED_DEMO_PASSWORD` (por defecto `mentoriza2026`).
- Las cuentas de prueba no pueden cambiar su contraseña, y el seed la restablece en cada despliegue.
- Al entrar con un clic como «Estudiante con plan Gratis», la cuenta vuelve al plan Gratis para que cada visitante vea el límite de 3 consultas y la oferta Premium.
- La cuenta de administración nunca se muestra porque ve datos privados.
- Para lanzar con usuarios reales pon `DEMO_ACCOUNTS=false`: la tarjeta desaparece y el ingreso con un clic se desactiva.

Cualquier alumno con correo `@cientifica.edu.pe` o `@utp.edu.pe` puede entrar por convenio con la contraseña `SEED_UNI_ACCESS_CODE` y luego cambiarla en **Cuenta**.

> ⚠️ Antes de publicar cambia `ADMIN_PASSWORD` y `SEED_UNI_ACCESS_CODE`.

---

## 4. Ejecutar en tu computadora

### Opción A — Docker (lo más simple)
Requisitos: Docker Desktop.
```bash
cp .env.example .env          # edita JWT_SECRET y (opcional) AI_API_KEY
docker compose up -d --build
```
Abre **http://localhost:4000**. La base de datos, las migraciones y los datos iniciales se crean solos.

### Opción B — Modo desarrollo
Requisitos: Node.js 20+, PostgreSQL 14+.
```bash
# 1) Base de datos
createdb mentoriza

# 2) Backend
cd backend
cp .env.example .env          # ajusta DATABASE_URL
npm install
npm run db:migrate
npm run db:seed
npm run dev                   # API en http://localhost:4000

# 3) Frontend (otra terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173 (redirige /api al backend)
```

### Pruebas
```bash
cd backend
npm test        # reglas de negocio + pruebas de la API (requiere la base de datos con migraciones y seed)
```

---

## 5. Publicar en internet

### Opción 1 — Render (un clic, plan gratuito)
1. Sube esta carpeta a un repositorio de GitHub.
2. En [render.com](https://render.com) → **New → Blueprint** → elige el repositorio. Render lee `render.yaml` y crea la base PostgreSQL y el servicio web.
3. Completa las variables marcadas: `AI_API_KEY` (opcional), `ADMIN_PASSWORD`, `SEED_UNI_ACCESS_CODE`.
4. Al terminar, tu app queda en `https://mentoriza.onrender.com` (o el nombre que elijas). Puedes conectar un dominio propio desde Render.

### Opción 2 — Railway / Fly.io / cualquier servicio con Docker
- Crea una base PostgreSQL y un servicio desde el `Dockerfile` de la raíz.
- Variables mínimas: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`. El puerto es `PORT` (por defecto 4000).
- Ruta de salud: `/api/health`.

### Opción 3 — Servidor propio (VPS con Ubuntu)
```bash
git clone <tu-repo> mentoriza && cd mentoriza
cp .env.example .env && nano .env
docker compose up -d --build
```
Coloca Nginx o Caddy delante para HTTPS (Caddy: `mentoriza.pe { reverse_proxy localhost:4000 }`).

### Opción 4 — Frontend y API separados (Vercel + Render)
- API: despliega `backend/` (o el Dockerfile) y define `CORS_ORIGIN=https://tu-frontend.vercel.app`.
- Frontend: en Vercel importa `frontend/`, comando `npm run build`, carpeta `dist`, variable `VITE_API_URL=https://tu-api.onrender.com`. `vercel.json` ya incluye las reglas de rutas.

---

## 6. Variables de entorno

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Conexión PostgreSQL. |
| `JWT_SECRET` | Sí (producción) | Clave larga y aleatoria para firmar sesiones. |
| `JWT_EXPIRES_IN` | No | Duración de la sesión (por defecto `7d`). |
| `PORT` | No | Puerto HTTP (por defecto 4000). |
| `CORS_ORIGIN` | No | Dominios permitidos si el frontend está en otro dominio. |
| `AI_API_KEY` | No | Clave del proveedor de IA. Sin ella se usan guías locales. |
| `AI_BASE_URL` | No | URL compatible con OpenAI (por defecto `https://api.openai.com/v1`). |
| `AI_MODEL` | No | Modelo (por defecto `gpt-4o-mini`; debe aceptar imágenes para leer fotos de rúbricas). |
| `PAYMENTS_MODE` | No | `demo` registra pagos sin cobrar. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | No | Cuenta de administración inicial. |
| `SEED_UNI_ACCESS_CODE` | No | Contraseña inicial de los alumnos por convenio. |
| `SEED_DEMO_PASSWORD` | No | Contraseña de las cuentas de mentor y universidad de demostración. |
| `STATIC_DIR` | No | Carpeta del frontend compilado que sirve la API (la imagen Docker ya lo define). |

---

## 7. Estructura del proyecto

```text
mentoriza/
├── Dockerfile               Imagen única (frontend + API)
├── docker-compose.yml       App + PostgreSQL
├── render.yaml              Despliegue con un clic en Render
├── .env.example
├── .github/workflows/ci.yml Pruebas automáticas en GitHub
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    Modelo de datos
│   │   ├── migrations/      Migraciones SQL versionadas
│   │   ├── seed.ts          Datos iniciales (idempotente)
│   │   └── data/program.json Evidencia extraída del cuaderno de entregables
│   └── src/
│       ├── app.ts / index.ts
│       ├── lib/rules.ts     Reglas de negocio (con pruebas)
│       ├── lib/ai.ts        Cliente de IA + respuestas locales
│       ├── middleware/      Autenticación, roles y errores
│       └── routes/          auth, me, courses, study, focus, mentors, plans, universities, validation
└── frontend/
    ├── index.html
    └── src/
        ├── App.tsx          Rutas y navegación por rol
        ├── state.tsx        Sesión, tema, avisos y temporizador
        ├── api.ts           Cliente HTTP
        ├── components/ui.tsx Logo, mascota, iconos
        └── pages/           Login, Bienvenida, Inicio, Curso, Estudiar, Enfoque, Mentores,
                             Cuenta, Más (pitch), Planes, Universidad, Acerca, paneles
```

---

## 8. API (resumen)

Todas las rutas usan el prefijo `/api`. Las privadas requieren `Authorization: Bearer <token>`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Estado del servicio |
| GET | `/auth/universities` | Universidades aliadas activas |
| POST | `/auth/register` · `/auth/login` · `/auth/institutional` | Registro e ingreso |
| GET · POST | `/auth/demo-accounts` · `/auth/demo` | Lista de cuentas de prueba e ingreso con un clic (si `DEMO_ACCOUNTS` no es `false`) |
| GET/PATCH | `/me` · PATCH `/me/password` · POST `/me/onboarding` | Perfil y bienvenida |
| GET/POST/PATCH/DELETE | `/courses` · POST `/courses/:id/document` | Cursos, sílabo y rúbrica |
| POST | `/study/ask` · `/study/questions/:id/steps/:j/understood` · `/explain` · `/check` | Estudio guiado |
| GET | `/study/history` · `/study/quota` | Historial y cupo diario |
| POST/GET | `/focus` · `/focus/summary` | Sesiones de enfoque |
| GET | `/mentors` | Mentores disponibles |
| POST/GET | `/mentorings` · `/:id/accept` · `/raise` · `/enter` · `/messages` · `/end` · `/rate` · `/cancel` | Mentorías |
| GET | `/mentor-panel/sessions` | Panel del mentor |
| GET · POST | `/plans` · `/billing/premium` · `/billing/cancel` · `/billing/payments` | Planes y pagos |
| POST | `/leads` | Solicitud de convenio |
| GET | `/uni-admin/dashboard` | Panel universitario |
| GET/POST/PATCH | `/admin/stats` · `/admin/universities` · `/admin/mentors` · `/admin/leads` | Administración |
| GET | `/validation` · `/validation/business` | Evidencia y modelo económico |

---

## 9. Próximos pasos para operar con usuarios reales

- **Pagos reales**: integrar una pasarela peruana (Culqi, Mercado Pago o Niubiz) en `backend/src/routes/plans.ts` y cambiar `PAYMENTS_MODE`. Hoy los pagos se registran como “demostración”.
- **Inicio de sesión con Microsoft/Google** (SSO institucional): requiere registrar la app en Azure AD / Google Cloud.
- **Correos** (bienvenida, recuperar contraseña, aviso de convenio): conectar un proveedor como Resend o SendGrid.
- **Mentores reales**: crear cuentas con rol `MENTOR` y vincularlas a su perfil (campo `userId` en la tabla `Mentor`).
- **Datos personales**: publicar política de privacidad conforme a la Ley N.° 29733 antes de abrir el registro.

---

## 10. Créditos y licencias

© 2026 NovaDevs — Sheila Betty Rios Cordova (representante), Alexander Andri Yupanqui Segura, Erick Alexander Colan Espinoza, Ariana Sofia Medina Capcha.
Iconos: Font Awesome Free 6.7.2 (iconos CC BY 4.0, fuentes SIL OFL 1.1, código MIT). Tipografía Nunito (Google Fonts, SIL OFL).
