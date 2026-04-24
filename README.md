# MediClick

![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![MUI](https://img.shields.io/badge/MUI_7-007FFF?style=for-the-badge&logo=mui&logoColor=white)

**Sistema de Gestion de Citas Medicas** multi-tenant de nivel empresarial, construido con Domain-Driven Design (DDD), autenticacion JWT con refresh tokens en Redis, notificaciones por email, generacion de PDFs, y un dashboard de analitica completo.

> **API Docs:** `/api/docs` (Swagger UI)

---

## Tabla de Contenidos

- [Arquitectura](#arquitectura)
- [Funcionalidades](#funcionalidades)
- [Tech Stack](#tech-stack)
- [Inicio Rapido](#inicio-rapido)
- [Variables de Entorno](#variables-de-entorno)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Roles y Permisos](#roles-y-permisos)
- [Seguridad](#seguridad)
- [Testing](#testing)
- [Despliegue](#despliegue)

---

## Arquitectura

### Backend — DDD con NestJS 11

Cada uno de los **22 modulos** del servidor sigue una estructura estricta de 4 capas:

```
modules/{modulo}/
├── application/           # Modulo NestJS, DTOs, Casos de Uso
│   ├── {modulo}.module.ts
│   ├── dto/*.dto.ts
│   └── use-cases/*.use-case.ts
├── domain/                # Entidades puras, interfaces de repositorio, servicios de dominio
│   ├── entities/
│   ├── repositories/      (solo interfaces)
│   └── services/
├── infrastructure/        # Implementacion concreta (Prisma)
│   └── persistence/
└── interfaces/            # Controladores HTTP
    └── controllers/
```

**Principios clave:**
- Casos de Uso con un unico metodo `execute()` — logica de negocio desacoplada del framework
- Inyeccion de dependencias via tokens (`'IUserRepository'`, `'IPasswordService'`)
- Transacciones en la capa de infraestructura (Prisma `$transaction`)
- Imports ESM con extensiones `.js` (`moduleResolution: "nodenext"`)

**Patrón Híbrido REST + GraphQL (CQRS):**
- **REST**: Maneja todas las operaciones transaccionales estándar (CRUD, reservas, horarios).
- **GraphQL**: Impulsa un motor de consulta exclusivo para agregados masivos (como el Expediente Clínico del paciente), resolviendo profundamente las relaciones en base de datos en un solo request y eliminando el problema de *Overfetching/Underfetching*.

### Frontend — Next.js 16 (App Router)

Patron **Controller-Hook** en cada vista:

```
views/{dominio}/
├── index.tsx              # Componente principal (vista)
├── hooks/use{Domain}.ts   # Hook controlador — estado, dispatch, API
├── components/            # Componentes UI del dominio
├── functions/             # Helpers puros
└── types/                 # Tipos locales
```

**Estado hibrido:**
- **Redux Toolkit** + `redux-persist`: datos de listas, paginacion, filtros, auth
- **TanStack React Query**: datos de referencia en formularios (dropdowns en cascada)

### Multi-Tenancy

```
ADMIN (sin clinicId) → Super-administrador, acceso total
ADMIN (con clinicId) → Administrador de clinica
DOCTOR / RECEPTIONIST → Obligatorio clinicId, aislados por sede
PATIENT → Cross-tenant, sin clinicId, puede agendar en cualquier clinica
```

Protegido por `TenantGuard` en la cadena de Guards de NestJS.

---

## Funcionalidades

### Gestion de Citas

- Flujo completo: `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED`
- Cancelacion y manejo de `NO_SHOW`
- Soporte de **overbooking** con limite configurable por doctor
- Generacion automatica de horarios desde reglas de disponibilidad
- Respeto de feriados y bloqueos de agenda
- Filtrado inteligente de slots disponibles

### Pagos con Mercado Pago (Checkout Pro)

- **Pre-pago obligatorio** al reservar: la cita queda `PENDING` con un `pendingUntil` de 15 minutos (configurable)
- Redireccion a `mercadopago.com` (PCI-compliant sin manejar datos de tarjeta)
- Webhook publico en `/payments/webhook`: re-consulta el pago a MP, nunca confia en el body, **idempotente** por `gatewayId`
- Manejo de **race condition**: si el pago se aprueba despues de expirar la cita, marca la transaccion para revision manual (log `[REVIEW]`)
- Cron `EVERY_MINUTE` cancela automaticamente citas `PENDING` vencidas
- Cancelar una cita con pago `PAID` marca la transaccion como `needsRefund` en metadata (refund manual por admin, no automatico en esta fase)
- Paginas de resultado: `/payment/success`, `/payment/failure`, `/payment/pending` (la ultima con polling cada 5s)
- Componente `PaymentStatusBadge` con botones *Pagar ahora* / *Reintentar* embebidos en las listas de citas del paciente y una columna *Pago* read-only en la tabla admin

### Panel de Doctor

- Vista diaria de citas del doctor
- Workspace con notas clinicas, recetas y acciones rapidas
- Escritura de **notas clinicas** (resumen, diagnostico, plan de tratamiento)
- Creacion de **recetas** con items detallados (medicamento, dosis, frecuencia, duracion)

### Portal del Paciente

- Flujo de reserva multi-paso: Categoria → Especialidad → Doctor → Horario → Slot
- Dropdowns en cascada con React Query
- Vista de citas propias con acceso a recetas y notas
- Descarga de recetas en PDF
- Perfil y datos medicos editables

### Historial Medico y Expediente (GraphQL)

- Registro de condiciones con estados: `ACTIVE`, `RESOLVED`, `CHRONIC`
- Expediente Clínico consolidado impulsado por **GraphQL** para recuperación profunda de datos (Citas pasadas, notas, estatus médicos) sin penalizar el rendimiento del Frontend.
- KPIs y resumen visual

### Notificaciones por Email

Plantillas Handlebars con layout compartido:
- Confirmacion de cita
- Cancelacion de cita
- Recordatorio de cita (cron job automatico)
- Receta creada
- Codigo de verificacion para recuperar contrasena

Dispatch event-driven via `@nestjs/event-emitter`.

### Generacion de PDF

- Servicio global `PdfService` (pdfmake)
- Recetas descargables por doctor y paciente

### Dashboard y Reportes

- Resumen de citas por estado
- Tendencia semanal de citas
- Comparacion de ingresos
- Top doctores por volumen de citas
- Tasa de ocupacion de horarios
- KPI cards con metricas clave

### Gestion Administrativa

| Modulo | Descripcion |
|--------|-------------|
| Clinicas | CRUD multi-sede con timezone configurable |
| Categorias | Agrupacion de especialidades medicas |
| Especialidades | Especialidades con duracion de consulta y buffer |
| Doctores | Perfiles con numero de colegiatura y especialidades |
| Disponibilidad | Reglas semanales (REGULAR, EXCEPTION, EXTRA) |
| Horarios | Generacion de slots concretos |
| Bloqueos | Bloqueo de agenda (dia completo o rango horario) |
| Feriados | Feriados publicos/clinica con flag recurrente |
| Usuarios | Gestion de staff (admin, doctor, recepcionista) |
| Pacientes | Gestion con datos de emergencia, sangre, alergias |

### Autenticacion Completa

- Login con JWT (access token 15min + refresh token 7 dias)
- Registro de pacientes con validacion de DNI via RENIEC
- Recuperacion de contrasena por **codigo de verificacion de 6 digitos** via email
- Gestion de sesiones multi-dispositivo
- Cambio de contrasena con revocacion de sesiones
- Input internacional de telefono (formato E.164)

---

## Tech Stack

| Capa | Tecnologias |
|------|-------------|
| **Backend** | NestJS 11, TypeScript (strict), Express, Swagger/OpenAPI, **GraphQL (Apollo Server)** |
| **Frontend** | Next.js 16 (App Router), React 19, MUI 7, Framer Motion, **GraphQL Client** |
| **Base de Datos** | PostgreSQL 17, Prisma 7 ORM (driver adapter) |
| **Cache y Sesiones** | Redis 7 (ioredis) |
| **Estado Cliente** | Redux Toolkit + Persist, TanStack React Query + Table |
| **Formularios** | React Hook Form + Zod 4 |
| **Email** | Nodemailer + Handlebars |
| **PDF** | pdfmake |
| **Pagos** | Mercado Pago SDK v2 (Checkout Pro) + webhook HMAC-SHA256 |
| **Seguridad** | Helmet, bcrypt, JWT, cookie-parser, Throttler |
| **CI/CD** | GitHub Actions (lint, type-check, test, build) |
| **Infraestructura** | Docker multi-stage, Docker Compose |
| **Testing** | Jest, ts-jest |
| **Iconos** | Remixicon |
| **Graficos** | Recharts |

---

## Inicio Rapido

### Requisitos Previos

- [Node.js](https://nodejs.org/) v20+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Docker](https://www.docker.com/) y Docker Compose

### 1. Clonar e instalar

```bash
git clone https://github.com/tu-usuario/mediclick.git
cd mediclick
```

### 2. Levantar infraestructura

```bash
cd server
docker compose up -d    # PostgreSQL (5436) + Redis (6379)
```

### 3. Configurar variables de entorno

```bash
# Server
cp .env.example .env    # Editar con tus credenciales

# Client
cd ../client
cp .env.example .env.local
```

### 4. Iniciar el backend

```bash
cd server
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate
npx prisma db seed       # Datos de prueba
pnpm run start:dev       # http://localhost:5100
```

### 5. Iniciar el frontend

```bash
cd client
pnpm install
pnpm run dev             # http://localhost:3000
```

> Swagger disponible en `http://localhost:5100/api/docs`

---

## Variables de Entorno

### Server (`server/.env`)

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexion PostgreSQL | — |
| `JWT_SECRET` | Secreto para access tokens | — |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens | — |
| `JWT_EXPIRES_IN` | Expiracion del access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiracion del refresh token | `7d` |
| `REDIS_HOST` | Host de Redis | `localhost` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `NODE_ENV` | Entorno | `development` |
| `PORT` | Puerto del servidor | `5100` |
| `CLIENT_URL` | URL del frontend (CORS) | `http://localhost:3000` |
| `MAIL_HOST` | Host SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USER` | Usuario SMTP | — |
| `MAIL_PASS` | Contrasena SMTP | — |
| `MAIL_FROM` | Remitente | `MediClick <noreply@mediclick.com>` |
| `MP_ACCESS_TOKEN` | Access Token del dashboard de Mercado Pago | — |
| `MP_PUBLIC_KEY` | Public Key del dashboard de Mercado Pago | — |
| `MP_WEBHOOK_SECRET` | Secret para validar firma HMAC del webhook (opcional) | — |
| `MP_SUCCESS_URL` | URL de retorno post-pago exitoso | `http://localhost:3000/payment/success` |
| `MP_FAILURE_URL` | URL de retorno post-pago rechazado | `http://localhost:3000/payment/failure` |
| `MP_PENDING_URL` | URL de retorno post-pago pendiente | `http://localhost:3000/payment/pending` |
| `MP_NOTIFICATION_URL` | URL **publica** del webhook (en dev usar `ngrok http 5100`) | — |
| `APPOINTMENT_PAYMENT_TIMEOUT_MINUTES` | Minutos para completar el pago antes de expirar la cita | `15` |

### Client (`client/.env.local`)

| Variable | Descripcion | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend | `http://localhost:5100` |

---

## Estructura del Proyecto

```
MediClick/
├── .github/workflows/ci.yml     # CI/CD pipeline
├── docker-compose.prod.yml      # Stack de produccion
│
├── server/                       # Backend (NestJS 11)
│   ├── Dockerfile                # Build multi-stage
│   ├── docker-compose.yml        # Infra local (Postgres + Redis)
│   ├── prisma/
│   │   ├── schema.prisma         # 20 modelos, 10 enums
│   │   └── seed.ts               # Seeder con datos de prueba
│   └── src/
│       ├── modules/              # 22 modulos DDD
│       │   ├── auth/             #   Autenticacion y sesiones
│       │   ├── users/            #   Gestion de usuarios
│       │   ├── roles/            #   PBAC — roles del sistema y por clinica
│       │   ├── permissions/      #   PBAC — permisos granulares
│       │   ├── clinics/          #   Clinicas multi-tenant
│       │   ├── categories/       #   Categorias medicas
│       │   ├── specialties/      #   Especialidades
│       │   ├── doctors/          #   Doctores
│       │   ├── availability/     #   Disponibilidad semanal
│       │   ├── schedules/        #   Generacion de horarios
│       │   ├── patients/         #   Pacientes
│       │   ├── appointments/     #   Citas medicas
│       │   ├── clinical-notes/   #   Notas clinicas
│       │   ├── prescriptions/    #   Recetas medicas
│       │   ├── reports/          #   Analitica y reportes
│       │   ├── notifications/    #   Notificaciones
│       │   ├── medical-history/  #   Historial medico
│       │   ├── holidays/         #   Feriados
│       │   ├── schedule-blocks/  #   Bloqueos de agenda
│       │   ├── scheduler/        #   Cron jobs (recordatorios, expiracion de pagos)
│       │   ├── patient-records-graphql/ # Resolver GraphQL del expediente
│       │   └── payments/         #   Mercado Pago Checkout Pro + webhook
│       └── shared/               # Servicios globales
│           ├── guards/           #   Auth, Roles, Tenant
│           ├── mail/             #   Nodemailer + Handlebars
│           ├── pdf/              #   pdfmake
│           └── redis/            #   ioredis wrapper
│
└── client/                       # Frontend (Next.js 16)
    └── src/
        ├── app/                  # App Router (layouts y paginas)
        │   ├── (landing)/        #   Landing page
        │   ├── (blank-layout)/   #   Login, Register, Forgot Password
        │   └── (menu)/           #   Todas las paginas protegidas
        ├── views/                # 26 vistas con patron controller-hook
        ├── redux-store/          # Redux slices, thunks, hooks
        ├── services/             # Servicios API (Axios)
        ├── components/           # Componentes compartidos
        ├── libs/                 # Axios config, utils
        └── middleware.ts         # Proteccion de rutas (auth redirect)
```

---

## Roles y Permisos

| Funcionalidad | ADMIN | DOCTOR | RECEPTIONIST | PATIENT |
|----------------|:-----:|:------:|:------------:|:-------:|
| Dashboard y reportes | Si | Si (propio) | — | — |
| Gestionar clinicas | Si | — | — | — |
| Gestionar usuarios | Si | — | — | — |
| Gestionar doctores | Si | — | — | — |
| Gestionar pacientes | Si | — | Si | — |
| Ver/crear citas | Si | Si | Si | Si (propias) |
| Crear notas clinicas | — | Si | — | — |
| Crear recetas | — | Si | — | — |
| Ver recetas/notas | Si | Si | — | Si (propias) |
| Descargar PDF receta | Si | Si | — | Si (propias) |
| Gestionar historial medico | Si | — | — | — |
| Configurar disponibilidad | Si | — | — | — |
| Generar horarios | Si | — | — | — |
| Gestionar feriados/bloqueos | Si | — | — | — |
| Reservar cita (booking) | — | — | — | Si |
| Pagar cita (MP Checkout) | — | — | — | Si (propias) |
| Ver estado de pago | Si | Si | Si | Si (propias) |

---

## Seguridad

| Capa | Implementacion |
|------|---------------|
| **HTTP Headers** | Helmet.js (CSP, HSTS, X-Frame-Options, etc.) |
| **Autenticacion** | JWT en cookies HttpOnly + header Bearer como fallback |
| **Refresh Tokens** | Redis con tracking de Device ID por dispositivo |
| **Hashing** | bcrypt con salt rounds automaticos |
| **Rate Limiting** | 3 niveles: 3 req/1s, 20 req/10s, 100 req/60s |
| **Validacion** | `class-validator` + `ValidationPipe` con whitelist y forbidNonWhitelisted |
| **CORS** | Restringido a `CLIENT_URL` con credentials |
| **Multi-tenancy** | `TenantGuard` valida `clinicId` en cada request |
| **Recuperacion** | Codigo de 6 digitos con limite de 5 intentos y TTL de 10 min |
| **Cookies** | `httpOnly`, `secure` (produccion), `sameSite: lax` |

---

## Testing

```bash
cd server

# Ejecutar todos los tests
pnpm run test

# Ejecutar un test especifico
pnpm run test -- --testPathPattern=login

# Type-check
npx tsc --noEmit
```

Tests unitarios implementados:
- Auth: login, cambio de contrasena, sesiones
- Prescriptions: busqueda por cita
- Guards: RolesGuard (6 tests), TenantGuard (8 tests)
- Payments (21 tests): create-preference (validacion, ownership, expiracion, sin precio), handle-webhook (idempotencia, race CANCELLED, mapeo de estados), get-by-appointment (ownership por rol), expire-pending (cron)
- Appointments: cancel-appointment refund flagging (4 tests)

---

## Despliegue

### Docker (Produccion)

```bash
# Desde la raiz del proyecto
docker compose -f docker-compose.prod.yml up -d
```

El `Dockerfile` del servidor usa un build multi-stage de 3 etapas:
1. **deps** — Instala dependencias con pnpm
2. **build** — Genera Prisma client + compila NestJS
3. **production** — Imagen minima con Node 22 Alpine

### CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push/PR a `main`:

| Job | Pasos |
|-----|-------|
| **server** | Install → Prisma Generate → Lint → Type-check → Test (con Postgres + Redis) |
| **client** | Install → Lint → Type-check → Build |

---

## Modelos de Base de Datos

23 modelos en Prisma:

`Users` · `Profiles` · `Clinics` · `Categories` · `Specialties` · `Doctors` · `DoctorsSpecialties` · `Availability` · `Schedules` · `Patients` · `Appointments` · `ClinicalNotes` · `Prescriptions` · `PrescriptionItems` · `Transactions` · `Reviews` · `Notifications` · `MedicalHistory` · `ScheduleBlocks` · `Holidays` · `Roles` · `Permissions` · `RolePermissions`

---

## Manejo de Fechas y Zonas Horarias

Las citas medicas requieren precision absoluta de tiempo real (*wall-clock time*):

- **Almacenamiento:** Fechas a medianoche UTC, horas relativas al epoch (1970-01-01)
- **Transporte API:** Formatos deterministas (`HH:mm`, `YYYY-MM-DD`)
- **Renderizado:** `Intl.DateTimeFormat` con timezone dinamico por clinica (`Clinic.timezone`)

---

*Desarrollado con NestJS 11, Next.js 16, y una arquitectura DDD multi-tenant real.*
