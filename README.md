# MediClick

![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![MUI](https://img.shields.io/badge/MUI_7-007FFF?style=for-the-badge&logo=mui&logoColor=white)

**Sistema de Gestión de Citas Médicas** multi-tenant de nivel empresarial. Construido con Domain-Driven Design (DDD), autenticación JWT con refresh tokens en Redis, pagos integrados con MercadoPago, notificaciones por email, generación de PDFs, y un panel de analítica completo.

> **API Docs:** `http://localhost:5100/api/docs` (Swagger UI)

---

## Tabla de Contenidos

1. [Qué es MediClick](#qué-es-mediclick)
2. [Arquitectura](#arquitectura)
3. [Funcionalidades](#funcionalidades)
4. [Accesibilidad — WCAG 2.1 AA *(Feature más reciente)*](#accesibilidad--wcag-21-aa)
5. [Roles y Permisos](#roles-y-permisos)
6. [Seguridad](#seguridad)
7. [Testing](#testing)
8. [Tech Stack](#tech-stack)
9. [Estructura del Proyecto](#estructura-del-proyecto)
10. [Inicio Rápido](#inicio-rápido)
11. [Variables de Entorno](#variables-de-entorno)
12. [Base de Datos](#base-de-datos)
13. [CI/CD y Despliegue](#cicd-y-despliegue)

---

## Qué es MediClick

MediClick es una plataforma web de gestión médica orientada a **clínicas privadas multi-sede**. Cubre el ciclo completo de una consulta médica:

- El **paciente** busca un doctor, reserva un horario y paga en línea.
- El **doctor** gestiona su agenda, escribe notas clínicas y emite recetas digitales.
- El **administrador** controla clínicas, usuarios, disponibilidades y reportes de ingresos.

**Números clave del proyecto:**
- 22 módulos NestJS con arquitectura DDD
- 23 modelos de base de datos
- 4 roles con permisos granulares (ADMIN, DOCTOR, RECEPTIONIST, PATIENT)
- Soporte multi-timezone por clínica (América Latina y España)
- Cumplimiento WCAG 2.1 AA con 9 controles de accesibilidad

---

## Arquitectura

### Backend — DDD con NestJS 11

Cada módulo sigue una arquitectura de **4 capas** estricta:

```
modules/{modulo}/
├── application/       # Módulo NestJS, DTOs, Casos de Uso
├── domain/            # Entidades puras, interfaces de repositorio
├── infrastructure/    # Implementación concreta (Prisma + PostgreSQL)
└── interfaces/        # Controladores HTTP / GraphQL Resolvers
```

**Principios aplicados:**
- Cada Caso de Uso tiene un único método `execute()` — lógica desacoplada del framework
- Inyección de dependencias por tokens (`'IUserRepository'`, `'IPaymentGatewayService'`)
- Transacciones en la capa de infraestructura (`$transaction` de Prisma)
- ESM nativo con extensiones `.js` (`moduleResolution: "nodenext"`)

**API Híbrida REST + GraphQL:**
- **REST**: todas las operaciones transaccionales (CRUD, reservas, pagos)
- **GraphQL (Apollo)**: consultas profundas de múltiples relaciones en un solo request — elimina overfetching en el Expediente Clínico del paciente

### Frontend — Next.js 16 (App Router)

Patrón **Controller-Hook** en cada vista:

```
views/{dominio}/
├── index.tsx          # Vista (solo JSX)
├── hooks/use{Domain}  # Estado, dispatch, llamadas API
├── components/        # Componentes del dominio
└── functions/         # Helpers puros
```

**Estado híbrido:**
- **Redux Toolkit + redux-persist**: auth, listas paginadas, filtros
- **TanStack React Query**: datos de referencia en formularios (dropdowns en cascada)

### Multi-Tenancy

```
ADMIN (sin clinicId)  →  Super-administrador, acceso total
ADMIN (con clinicId)  →  Administrador de clínica específica
DOCTOR / RECEPTIONIST →  Aislados por sede (clinicId obligatorio)
PATIENT               →  Cross-tenant, puede agendar en cualquier clínica
```

Protegido por `TenantGuard` en la cadena de Guards de NestJS.

---

## Funcionalidades

### Gestión de Citas

- Flujo completo de estados: `PENDING → CONFIRMED → IN_PROGRESS → COMPLETED`
- Cancelación con motivo y manejo de `NO_SHOW`
- Soporte de **overbooking** con límite configurable por doctor
- Generación automática de horarios desde reglas de disponibilidad semanal
- Respeto de feriados nacionales y bloqueos de agenda del doctor
- Filtrado inteligente de slots disponibles (timezone por clínica)

### Pagos con MercadoPago (Checkout Pro)

- **Pre-pago obligatorio**: la cita queda `PENDING` con un `pendingUntil` de 15 minutos (configurable)
- Redirección a `mercadopago.com` — PCI compliant, sin manejar datos de tarjeta en MediClick
- Webhook público en `/payments/webhook`: re-consulta el pago a MP, nunca confía en el body del webhook, **idempotente** por `gatewayId`
- **Race condition**: si el pago se aprueba después de expirar la cita, la transacción queda marcada `[REVIEW]` para acción manual
- Cron `EVERY_MINUTE`: cancela automáticamente citas `PENDING` vencidas
- Cancelar una cita con pago `PAID` marca `needsRefund: true` en metadata (refund manual por admin)
- Páginas de resultado con feedback visual: `/payment/success`, `/payment/failure`, `/payment/pending` (con polling cada 5 s)

### Portal del Paciente

- Reserva multi-paso: Categoría → Especialidad → Doctor → Horario → Slot
- Dropdowns en cascada con React Query
- Historial de citas propias con acceso a recetas y notas clínicas
- Descarga de recetas en PDF
- Perfil y datos médicos editables (grupo sanguíneo, alergias, contacto de emergencia)

### Panel del Doctor

- Vista diaria de agenda
- Escritura de notas clínicas (resumen, diagnóstico, plan de tratamiento)
- Emisión de recetas con ítems detallados (medicamento, dosis, frecuencia, duración)

### Historial Médico y Expediente Clínico (GraphQL)

- Registro de condiciones: `ACTIVE`, `RESOLVED`, `CHRONIC`
- Expediente consolidado vía GraphQL: recupera citas pasadas, notas y estatus médicos en un solo request
- KPIs y resumen visual por paciente

### Notificaciones por Email

Plantillas Handlebars con layout compartido, disparadas por eventos (`@nestjs/event-emitter`):

| Evento | Plantilla |
|--------|-----------|
| Cita confirmada | Confirmación con detalles y botón de pago |
| Cita cancelada | Notificación con motivo |
| Recordatorio de cita | Cron job 24h antes |
| Receta emitida | Aviso al paciente |
| Recuperar contraseña | Código de verificación de 6 dígitos |

### Dashboard y Reportes

- KPI cards: total de citas, ingresos, tasa de ocupación, top doctores
- Tendencia semanal de citas (gráfico de líneas)
- Comparación de ingresos por período
- Distribución por estado de cita (donut chart)

### Gestión Administrativa

| Módulo | Descripción |
|--------|-------------|
| Clínicas | CRUD multi-sede con timezone configurable |
| Categorías | Agrupación de especialidades médicas |
| Especialidades | Con duración de consulta y buffer entre citas |
| Doctores | Perfiles con número de colegiatura y especialidades |
| Disponibilidad | Reglas semanales (REGULAR, EXCEPTION, EXTRA) |
| Horarios | Generación de slots concretos |
| Bloqueos | Bloqueo de agenda (día completo o rango horario) |
| Feriados | Feriados públicos/clínica con flag recurrente anual |
| Usuarios | Gestión de staff (admin, doctor, recepcionista) |
| Pacientes | Gestión con datos de emergencia, sangre y alergias |

### Autenticación Completa

- JWT: access token 15 min + refresh token 7 días (almacenado en Redis)
- Registro de pacientes con validación de DNI
- Recuperación de contraseña por **código de 6 dígitos** vía email (TTL 10 min, límite 5 intentos)
- Gestión de sesiones **multi-dispositivo** con revocación individual o total
- Cambio de contraseña con revocación automática de todas las sesiones activas

---

## Accesibilidad — WCAG 2.1 AA

> Feature más reciente del proyecto (mayo 2026).

MediClick incluye un **panel de personalización de accesibilidad** accesible desde cualquier pantalla. Cumple con los estándares **WCAG 2.1 AA** y **NTP-ISO/IEC 40500:2012** (equivalente latinoamericano).

### Los 9 controles de accesibilidad

| Control | Opciones | Estándar WCAG cubierto |
|---------|----------|------------------------|
| **Tamaño de texto** | Normal (16px) · Grande (18px) · Muy grande (20px) | 1.4.4 Resize Text |
| **Alto contraste** | On/Off — paleta blanco/negro puro (ratio 7:1 AAA) | 1.4.6 Contrast Enhanced |
| **Botones grandes** | On/Off — mínimo 44×44 CSS px | 2.5.5 Target Size |
| **Reducir animaciones** | On/Off — duraciones reducidas a 0.001ms | 2.3.3 Animation from Interactions |
| **Modo daltónico** | Ninguno · Deuteranopía · Protanopía · Tritanopía · Escala de grises | 1.4.1 Use of Color |

Siempre activos sin necesidad de configurar:
- **Foco visible reforzado** en todos los elementos interactivos — WCAG 2.4.7
- **`prefers-reduced-motion`** respetado desde el sistema operativo
- **`prefers-color-scheme`** respetado (modo claro/oscuro automático)

### Tipos de daltonismo cubiertos

| Tipo | Descripción | Prevalencia |
|------|-------------|-------------|
| Deuteranopía | Ceguera al verde | ~6% de los hombres |
| Protanopía | Ceguera al rojo | ~1% de los hombres |
| Tritanopía | Ceguera al azul | Rara, ambos sexos |
| Achromatopsia | Sin percepción de color (escala de grises) | Muy rara |

### Impacto en usuarios reales

| Tipo de discapacidad | Controles que ayudan |
|---------------------|---------------------|
| Baja visión | Tamaño de texto, Alto contraste |
| Daltonismo | Filtros de deuteranopía / protanopía / tritanopía |
| Monocromatismo total | Escala de grises (achromatopsia) |
| Motora / Parkinson | Botones grandes (mínimo 44×44 px) |
| Vestibular / Cognitiva | Reducir animaciones |
| Fotosensibilidad | Reducir animaciones |

### Cómo funciona internamente

**Filtros de daltonismo — matrices científicas (Brettel/Viénot/Mollon 1997):**

Los tipos de daltonismo se simulan con matrices SVG `feColorMatrix` inyectadas en el DOM vía React Portal. Los filtros se aplican con CSS (`filter: url(#cb-deuteranopia)`) a todos los elementos marcados con la clase `.cb-target`:

- `<main>` (contenido principal)
- Sidebar / navegación lateral
- Navbar (barra superior)
- Footer

El panel de configuración queda **fuera** del filtro intencionalmente — el usuario ve los colores reales mientras ajusta sus preferencias.

**Por qué Portal en `<body>` y no SVG anidado:**
Un `<svg>` dentro del árbol de componentes interferiría con los gráficos de Recharts (también SVG). El Portal evita el conflicto sin efectos secundarios.

**Alto contraste — integración profunda con MUI:**

Cuando se activa, el tema de Material UI se reconstruye con paleta pura blanco/negro. No es solo CSS: los colores de texto, fondos, divisores y acciones del design system completo cambian para garantizar ratio AAA (7:1).

**Persistencia en cookies HTTP:**

La configuración se guarda en la cookie `mediclick-settings` con duración de 365 días. Al ser una cookie, la preferencia está disponible desde el primer render del servidor (SSR), sin flash de contenido incorrecto (FOUC).

**Data-attributes en `<html>` para CSS selectivo:**

```html
<html
  data-high-contrast="true"
  data-large-targets="true"
  data-reduce-motion="false"
  data-color-blind="deuteranopia"
  style="font-size: 18px"
>
```

Cada ajuste es un atributo independiente. Las reglas CSS apuntan a combinaciones específicas sin requerir clases dinámicas en runtime.

---

## Roles y Permisos

| Funcionalidad | ADMIN | DOCTOR | RECEPTIONIST | PATIENT |
|---------------|:-----:|:------:|:------------:|:-------:|
| Dashboard y reportes | ✓ | ✓ (propio) | — | — |
| Gestionar clínicas / usuarios | ✓ | — | — | — |
| Gestionar doctores y pacientes | ✓ | — | ✓ (pacientes) | — |
| Ver / crear citas | ✓ | ✓ | ✓ | ✓ (propias) |
| Crear notas clínicas | — | ✓ | — | — |
| Crear recetas | — | ✓ | — | — |
| Ver recetas y notas | ✓ | ✓ | — | ✓ (propias) |
| Descargar PDF receta | ✓ | ✓ | — | ✓ (propias) |
| Configurar disponibilidad / horarios | ✓ | — | — | — |
| Reservar y pagar cita | — | — | — | ✓ |
| Ver estado de pago | ✓ | ✓ | ✓ | ✓ (propias) |

---

## Seguridad

| Capa | Implementación |
|------|---------------|
| **HTTP Headers** | Helmet.js (CSP, HSTS, X-Frame-Options) |
| **Autenticación** | JWT en cookies `HttpOnly` + header Bearer como fallback |
| **Refresh Tokens** | Redis con tracking por Device ID |
| **Hashing** | bcrypt con salt automático |
| **Rate Limiting** | 3 niveles: 3 req/1s · 20 req/10s · 100 req/60s |
| **Validación** | `class-validator` + `ValidationPipe` (whitelist + forbidNonWhitelisted) |
| **CORS** | Restringido a `CLIENT_URL` con credentials |
| **Multi-tenancy** | `TenantGuard` valida `clinicId` en cada request |
| **Recuperación** | Código 6 dígitos — TTL 10 min, límite 5 intentos |
| **Cookies** | `httpOnly`, `secure` en producción, `sameSite: lax` |
| **Webhook MP** | Validación HMAC-SHA256; re-consulta a MP, nunca confía en el body |

---

## Testing

Todos los tests son **unitarios** con Jest. Los repositorios y servicios externos se mockean con `jest.fn()` — el foco está en la lógica de dominio y casos de uso. **Total: 152 tests pasando.**

---

### Tests TDD

Escritos bajo el ciclo **Red → Green → Refactor**: cada iteración comienza con el caso de fallo esperado antes de implementar la lógica que lo hace pasar.

| Suite | Tests | Qué cubre |
|-------|------:|-----------|
| **Register Patient** | 9 | Registro exitoso, hashing de contraseña, duplicado de email, duplicado de DNI, no crea si ya existe |
| **Reschedule Appointment** | 11 | Happy path, cita inexistente, estados COMPLETED/CANCELLED bloqueados, CONFIRMED/IN_PROGRESS permitidos, schedule inexistente, slot inválido (`start >= end`), slot fuera del rango del turno, límite exacto |
| **Create Patient Appointment** | 14 | Happy path + `pendingUntil`, paciente sin perfil, schedule inexistente, especialidad sin precio/null, slot inválido, slot fuera de rango, fecha pasada, buffer < 2h, feriado, bloqueo de agenda, superposición, verificaciones en paralelo |

**Ciclo TDD documentado en los tests:**
Los tests marcados `RED→GREEN` representan el primer caso escrito en cada iteración — el test que falla antes de que exista la lógica. Los siguientes tests en el mismo bloque refinan el comportamiento ya implementado.

---

### Tests OWASP Top 10

Mapeo explícito entre cada test y la vulnerabilidad que previene.

#### A01 — Broken Access Control

**`PermissionsGuard`** (10 tests):

| Test | Vulnerabilidad prevenida |
|------|--------------------------|
| Endpoint sin `@RequirePermissions` → acceso libre | No bloquear rutas públicas por error |
| Sin usuario en request → `ForbiddenException` | Acceso anónimo a recursos protegidos |
| Sin `roleId` → `ForbiddenException` | Token sin rol asignado escala privilegios |
| Permiso exacto coincide → acceso concedido | Falso negativo en validación de permisos |
| Sin permiso → `ForbiddenException` | Escalada horizontal de privilegios |
| `MANAGE:ALL` → acceso a cualquier recurso | Wildcard de super-admin mal aplicado |
| `MANAGE:{subject}` → acceso solo a ese recurso | Wildcard parcial mal aplicado |
| `READ:ALL` no cubre `DELETE` | Wildcard de acción no debe cruzar acciones |
| Cache hit → no consulta BD | Race condition en invalidación de caché |
| Cache miss → persiste en Redis | Sin caché = N queries por request |

#### A07 — Identification and Authentication Failures

**`RefreshTokenUseCase`** (7 tests) — Refresh Token Rotation:

| Test | Vulnerabilidad prevenida |
|------|--------------------------|
| Token válido → emite nuevos tokens (rotación) | Tokens de larga vida sin rotación |
| Token inexistente → `UnauthorizedException` | Token expirado aceptado |
| Hash diferente → revoca TODAS las sesiones | Token theft / token reuse no detectado |
| Mensaje indica cierre de sesiones | Usuario no informado del incidente |
| Usuario inactivo → `UnauthorizedException` | Cuenta desactivada sigue autenticando |
| Usuario eliminado → `UnauthorizedException` | Cuenta eliminada sigue autenticando |
| Revoca tokens de usuario inactivo | Tokens huérfanos tras desactivación |
| Redis caído → `503` (no `500`) | Crash de infraestructura expone detalles internos |

**`VerifyResetCodeUseCase`** (8 tests) — Brute Force Protection:

| Test | Vulnerabilidad prevenida |
|------|--------------------------|
| Código válido → retorna `resetToken` | Flujo de recuperación bloqueado |
| Código válido → elimina clave de Redis (uso único) | Código reutilizable tras verificación |
| Código inexistente/expirado → error | Código expirado aceptado |
| Código incorrecto → incrementa intentos | Fuerza bruta sin penalización |
| 5 intentos fallidos → elimina la clave | Fuerza bruta sin límite hard |
| Código correcto tras 5 intentos → igual bloqueado | Bypass del bloqueo por orden de validación |
| TTL preservado al incrementar intentos | Reset del timer con cada intento |

**`ForgotPasswordUseCase`** (10 tests) — User Enumeration Prevention (A01 + A07):

| Test | Vulnerabilidad prevenida |
|------|--------------------------|
| Email inexistente → `void` (sin error) | Enumeración de usuarios registrados |
| Usuario inactivo → `void` (sin error) | Enumeración por estado de cuenta |
| Usuario eliminado → `void` (sin error) | Enumeración por eliminación lógica |
| Email inexistente → no envía email | Side-effect observable revela existencia |
| Email inexistente → no escribe en Redis | Side-effect observable revela existencia |
| Usuario válido → guarda código en Redis | Flujo legítimo bloqueado |
| Usuario válido → envía email | Flujo legítimo bloqueado |
| Código tiene exactamente 6 dígitos | Espacio de búsqueda reducido |
| `attempts` inicial = 0 | Estado corrupto en brute-force check |
| TTL = 600 segundos | Código sin expiración |

---

### Tests existentes (pre-TDD/OWASP)

| Módulo | Tests | Qué cubren |
|--------|------:|------------|
| Auth — Login | 5 | Credenciales válidas, usuario no encontrado, contraseña incorrecta, inactivo, eliminado |
| Auth — Cambio de contraseña | 5 | Éxito + revocación, usuario no encontrado, contraseña incorrecta/igual |
| Auth — Sesiones | 3 | Listado, cierre individual, cierre total |
| TenantGuard | 8 | Todos los roles con/sin clinicId, request sin usuario |
| Payments — Webhook | 7 | Aprobado, rechazado, idempotencia, race condition CANCELLED, payload inválido |
| Payments — Preference | 4 | Validación, ownership, expiración, cita sin precio |
| Payments — Expiración (cron) | 2 | Citas vencidas canceladas, no-op si no hay vencidas |
| Appointments — Cancelación | 4 | Refund pending, preservar metadata, no-op PENDING, no-op sin transacción |
| Prescriptions — Búsqueda | 3 | Por cita, no encontrada, ownership |
| Date utils | 22 | `parseHHmm`, `timeRangesOverlap`, `utcDayRange`, multi-timezone (Lima vs Madrid, DST) |

---

### Patrones de testing aplicados

- **Arrange-Act-Assert (AAA)**: `beforeEach` arma el contexto, `execute()` actúa, `expect()` verifica
- **Aislamiento total**: `beforeEach` recrea mocks en cada test, sin estado compartido
- **Partición de equivalencia**: rangos adyacentes (`09:00-10:00` vs `10:00-11:00`), estados del enum
- **Valores límite**: `"00:00"`, `"23:59"`, slot en límite exacto del turno, 5 intentos de brute force
- **Idempotencia**: webhook de MercadoPago verificado contra `gatewayId` duplicado
- **Casos negativos**: `UnauthorizedException`, `ForbiddenException`, `NotFoundException`, `BadRequestException`, `ConflictException`

### Ejecutar tests

```bash
cd server
pnpm test                              # Todos los tests (152)
pnpm test -- login                     # Test específico
pnpm test -- --coverage                # Con reporte de cobertura
npx tsc --noEmit                       # Type-check sin compilar
```

---

## Tech Stack

| Capa | Tecnologías |
|------|-------------|
| **Backend** | NestJS 11, TypeScript (strict), Express, Apollo Server (GraphQL), Swagger |
| **Frontend** | Next.js 16 (App Router), React 19, MUI 7, Framer Motion |
| **Base de Datos** | PostgreSQL 17, Prisma 7 ORM |
| **Cache y Sesiones** | Redis 7 (ioredis) |
| **Estado Cliente** | Redux Toolkit + Persist, TanStack React Query + Table |
| **Formularios** | React Hook Form + Zod 4 |
| **Email** | Nodemailer + Handlebars |
| **PDF** | pdfmake |
| **Pagos** | MercadoPago SDK v2 (Checkout Pro + webhook HMAC-SHA256) |
| **Seguridad** | Helmet, bcrypt, JWT, Throttler, cookie-parser |
| **Testing** | Jest, ts-jest |
| **Gráficos** | Recharts |
| **Iconos** | Remixicon |
| **Infra** | Docker multi-stage, Docker Compose |
| **CI/CD** | GitHub Actions |

---

## Estructura del Proyecto

```
MediClick/
├── .github/workflows/ci.yml        # Pipeline CI/CD
├── docker-compose.prod.yml         # Stack de producción
│
├── server/                         # Backend NestJS 11
│   ├── docker-compose.yml          # Postgres + Redis local
│   ├── prisma/
│   │   ├── schema.prisma           # 23 modelos, 10 enums
│   │   └── seed.ts                 # Datos de prueba
│   └── src/
│       ├── modules/                # 22 módulos DDD
│       │   ├── auth/               #   JWT, refresh tokens, sesiones
│       │   ├── users/              #   Gestión de usuarios
│       │   ├── roles/              #   Roles del sistema
│       │   ├── permissions/        #   Permisos granulares (PBAC)
│       │   ├── clinics/            #   Multi-tenant por sede
│       │   ├── categories/         #   Categorías médicas
│       │   ├── specialties/        #   Especialidades
│       │   ├── doctors/            #   Perfiles de doctor
│       │   ├── availability/       #   Disponibilidad semanal
│       │   ├── schedules/          #   Generación de slots
│       │   ├── patients/           #   Gestión de pacientes
│       │   ├── appointments/       #   Citas médicas (núcleo)
│       │   ├── clinical-notes/     #   Notas clínicas
│       │   ├── prescriptions/      #   Recetas médicas
│       │   ├── payments/           #   MercadoPago Checkout Pro
│       │   ├── notifications/      #   Email event-driven
│       │   ├── medical-history/    #   Historial de condiciones
│       │   ├── reports/            #   Dashboard y analítica
│       │   ├── holidays/           #   Feriados
│       │   ├── schedule-blocks/    #   Bloqueos de agenda
│       │   ├── scheduler/          #   Cron jobs
│       │   └── patient-records-graphql/  # Expediente clínico (GraphQL)
│       └── shared/
│           ├── guards/             #   JwtAuthGuard, TenantGuard, PermissionsGuard
│           ├── mail/               #   Nodemailer + Handlebars
│           ├── pdf/                #   pdfmake
│           └── redis/              #   ioredis wrapper
│
└── client/                         # Frontend Next.js 16
    └── src/
        ├── app/                    # App Router
        │   ├── (landing)/          #   Landing page pública
        │   ├── (blank-layout)/     #   Login, Register, Forgot Password
        │   └── (menu)/             #   Todas las rutas protegidas
        ├── views/                  # 26 vistas (patrón controller-hook)
        ├── redux-store/            # Slices, thunks, hooks
        ├── services/               # Servicios API (Axios)
        ├── @core/
        │   ├── components/
        │   │   ├── customizer/     #   Panel de personalización + accesibilidad
        │   │   └── accessibility/  #   Filtros SVG daltonismo (ColorBlindFilters)
        │   ├── contexts/           #   SettingsContext (accesibilidad y tema)
        │   ├── hooks/              #   useSettings y otros
        │   └── theme/              #   Tema MUI (soporte alto contraste)
        ├── @layouts/               #   Navbar, Sidebar, Footer (con .cb-target)
        └── middleware.ts           #   Protección de rutas (auth redirect)
```

---

## Inicio Rápido

### Requisitos

- Node.js v20+
- pnpm (`npm install -g pnpm`)
- Docker y Docker Compose

### Pasos

```bash
# 1. Clonar
git clone https://github.com/tu-usuario/mediclick.git && cd mediclick

# 2. Levantar infraestructura (Postgres en :5436, Redis en :6379)
cd server && docker compose up -d

# 3. Configurar variables de entorno
cp .env.example .env          # server
cd ../client && cp .env.example .env.local

# 4. Backend
cd ../server
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate
npx prisma db seed
pnpm run start:dev            # http://localhost:5100

# 5. Frontend (nueva terminal)
cd ../client
pnpm install
pnpm run dev                  # http://localhost:3000
```

> Swagger: `http://localhost:5100/api/docs`

---

## Variables de Entorno

### Server (`server/.env`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | — |
| `JWT_SECRET` | Secreto access token | — |
| `JWT_REFRESH_SECRET` | Secreto refresh token | — |
| `JWT_EXPIRES_IN` | Expiración access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Expiración refresh token | `7d` |
| `REDIS_HOST` | Host Redis | `localhost` |
| `REDIS_PORT` | Puerto Redis | `6379` |
| `PORT` | Puerto del servidor | `5100` |
| `CLIENT_URL` | URL del frontend (CORS) | `http://localhost:3000` |
| `MAIL_HOST` | Host SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USER` | Usuario SMTP | — |
| `MAIL_PASS` | Contraseña SMTP | — |
| `MAIL_FROM` | Remitente | `MediClick <noreply@mediclick.com>` |
| `MP_ACCESS_TOKEN` | Access Token de MercadoPago | — |
| `MP_PUBLIC_KEY` | Public Key de MercadoPago | — |
| `MP_WEBHOOK_SECRET` | Secreto HMAC para validar webhook | — |
| `MP_SUCCESS_URL` | URL post-pago exitoso | `http://localhost:3000/payment/success` |
| `MP_FAILURE_URL` | URL post-pago rechazado | `http://localhost:3000/payment/failure` |
| `MP_PENDING_URL` | URL post-pago pendiente | `http://localhost:3000/payment/pending` |
| `MP_NOTIFICATION_URL` | URL pública del webhook (en dev: ngrok) | — |
| `APPOINTMENT_PAYMENT_TIMEOUT_MINUTES` | Minutos para completar el pago | `15` |

### Client (`client/.env.local`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del backend | `http://localhost:5100` |

---

## Base de Datos

**23 modelos Prisma:**

`Users` · `Profiles` · `Clinics` · `Categories` · `Specialties` · `Doctors` · `DoctorsSpecialties` · `Availability` · `Schedules` · `Patients` · `Appointments` · `ClinicalNotes` · `Prescriptions` · `PrescriptionItems` · `Transactions` · `Reviews` · `Notifications` · `MedicalHistory` · `ScheduleBlocks` · `Holidays` · `Roles` · `Permissions` · `RolePermissions`

**Manejo de fechas y zonas horarias:**

- Fechas almacenadas a medianoche UTC; horas relativas al epoch (`1970-01-01`)
- Transporte API con formatos deterministas (`HH:mm`, `YYYY-MM-DD`)
- Renderizado con `Intl.DateTimeFormat` y el timezone dinámico de cada clínica
- Tests de multi-timezone: Lima (UTC-5) vs Madrid (UTC+1), con casos DST incluidos

---

## CI/CD y Despliegue

### Pipeline GitHub Actions

Ejecuta en cada push/PR a `main`:

| Job | Pasos |
|-----|-------|
| **server** | Install → Prisma Generate → Lint → Type-check → Test (con Postgres + Redis reales) |
| **client** | Install → Lint → Type-check → Build |

### Docker Producción

```bash
docker compose -f docker-compose.prod.yml up -d
```

El `Dockerfile` usa build **multi-stage** de 3 etapas:
1. `deps` — Instala dependencias con pnpm
2. `build` — Genera Prisma client + compila NestJS a JavaScript
3. `production` — Imagen mínima Node 22 Alpine (solo artefactos de build)

---

*MediClick — Sistema de Gestión de Citas Médicas Multi-Tenant · NestJS 11 + Next.js 16 · WCAG 2.1 AA*
