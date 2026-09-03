# MediClick

![NestJS](https://img.shields.io/badge/NestJS_11-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL_17-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis_7-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript_5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![MUI](https://img.shields.io/badge/MUI_7-007FFF?style=for-the-badge&logo=mui&logoColor=white)
![HL7 FHIR](https://img.shields.io/badge/FHIR_R4-Firebrick?style=for-the-badge&logo=health&logoColor=white)
![WCAG](https://img.shields.io/badge/WCAG_2.1_AA-Passed-success?style=for-the-badge&logo=w3c&logoColor=white)

**Sistema de Gestión de Citas Médicas e Historia Clínica Interoperable** multi-tenant de nivel empresarial. Construido bajo Domain-Driven Design (DDD), patrón Transactional Outbox, almacén de recursos HL7 FHIR R4, pagos conciliados con MercadoPago, lista de espera reactiva con recuperación atómica de cupos, sistema de reseñas verificadas, autenticación JWT con rotación de refresh tokens en Redis, accesibilidad WCAG 2.1 AA certificada en CI y un panel integral de analítica médica.

> **API Docs (Swagger UI):** `http://localhost:5100/api/docs`  
> **GraphQL Playground:** `http://localhost:5100/graphql` (Entorno de desarrollo)

---

## Tabla de Contenidos

1. [Qué es MediClick](#qué-es-mediclick)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Últimas Características y Capacidades Core](#últimas-características-y-capacidades-core)
   - [Transactional Outbox Pattern (ADR-0002)](#1-transactional-outbox-pattern-adr-0002)
   - [Lista de Espera Inteligente y Recuperación Atómica de Cupos](#2-lista-de-espera-inteligente-y-recuperación-atómica-de-cupos)
   - [Interoperabilidad en Salud — Almacén FHIR R4 y EHR (ADR-0001)](#3-interoperabilidad-en-salud--almacén-fhir-r4-y-ehr-adr-0001)
   - [Endurecimiento de Integridad, Concurrencia y Multi-Tenant (SDD-Hardening)](#4-endurecimiento-de-integridad-concurrencia-y-multi-tenant-sdd-hardening)
   - [Sistema de Reseñas y Reputación Verificada](#5-sistema-de-reseñas-y-reputación-verificada)
   - [Planificador Puro de Generación de Agenda](#6-planificador-puro-de-generación-de-agenda)
   - [Conciliación Financiera y Webhooks de Pago con MercadoPago](#7-conciliación-financiera-y-webhooks-de-pago-con-mercadopago)
4. [Accesibilidad — WCAG 2.1 AA & Gate Automatizado en CI](#accesibilidad--wcag-21-aa--gate-automatizado-en-ci)
5. [Roles y Matriz Declarativa de Permisos (PBAC/RBAC)](#roles-y-matriz-declarativa-de-permisos-pbacrbac)
6. [Seguridad y Auditoría Forense](#seguridad-y-auditoría-forense)
7. [Testing y Garantía de Calidad](#testing-y-garantía-de-calidad)
8. [Tech Stack](#tech-stack)
9. [Estructura del Proyecto](#estructura-del-proyecto)
10. [Inicio Rápido](#inicio-rápido)
11. [Variables de Entorno](#variables-de-entorno)
12. [Base de Datos y Persistencia](#base-de-datos-y-persistencia)
13. [CI/CD y Despliegue en Producción](#cicd-y-despliegue-en-producción)

---

## Qué es MediClick

MediClick coordina la demanda de atención de pacientes con la capacidad asistencial de médicos en sedes clínicas privadas multi-sede. Abarca el ciclo completo de consulta médica, administrativo, financiero e interoperabilidad clínica:

- **Pacientes:** Búsqueda guiada por especialidad y médico, reserva con bloqueo temporal de cupo, pago digital, ingreso a lista de espera con auto-match, consulta de historial clínico, recetas digitales con PDF y emisión de reseñas verificadas.
- **Médicos:** Control de agenda diaria, bloqueo puntual o por rango, atención con notas clínicas estructuradas, emisión de recetas farmacológicas y seguimiento de reputación profesional.
- **Personal de Sede y Recepción:** Agendamiento asistido sin costo forzado, gestión de cola de espera en tiempo real con elevación de prioridad y control de flujo de pacientes.
- **Administradores:** Gestión multi-sede, configuración de reglas de disponibilidad semanal, feriados recurrentes, tarifas de especialidades, catálogo médico, auditoría de seguridad y analítica de ingresos y ocupación.
- **Sistemas Externos y Redes de Salud:** Base de datos interoperable preparada para el marco OpenHIE mediante proyecciones durables a recursos HL7 FHIR R4 (IPS / HL7 LAC).

### Números clave del proyecto

- **25 módulos NestJS** organizados bajo principios de Domain-Driven Design (DDD).
- **7 módulos transversales** (Transactional Outbox, Security Audit, Health, Redis, Prisma, Mail, PDF).
- **30 modelos de base de datos** Prisma y **13 enums** en PostgreSQL 17.
- **5 roles de sistema canónicos** (`SUPER_ADMIN`, `ADMIN`, `DOCTOR`, `RECEPTIONIST`, `PATIENT`) gobernados por una matriz declarativa unificada.
- **389 tests unitarios pasando** en backend bajo metodología TDD.
- **13 suites de integración con PostgreSQL 17 real** (`Serializable`, transacciones de concurrencia, constraints únicos y locks).
- **Gate automatizado de Accesibilidad (WCAG 2.1 AA)** en CI con Playwright y Axe-core.
- **31 vistas frontend en Next.js 16 (App Router)** estructuradas con el patrón Controller-Hook.

---

## Arquitectura del Sistema

### Backend — DDD Estratégico con NestJS 11

Cada módulo de negocio aísla sus responsabilidades en 4 capas estrictas, desacoplando la lógica de dominio de los detalles del framework y de la base de datos:

```
server/src/modules/{modulo}/
├── application/       # Módulo NestJS, Casos de Uso (un método execute()), DTOs, Listeners
├── domain/            # Entidades puras, Enums, Interfaces de Repositorio (independientes de NestJS/Prisma)
├── infrastructure/    # Implementación concreta (Prisma, PostgreSQL, Gateways externos, Mappers)
└── interfaces/        # Controladores REST con OpenAPI / Resolvers GraphQL (Apollo)
```

**Principios arquitectónicos:**
- **Inversión de Dependencias:** Inyección por tokens de interfaz (`'IAppointmentRepository'`, `'IPaymentGatewayService'`, `'IFhirResourceRepository'`).
- **ESM Nativo:** Compilación con soporte nativo de módulos ECMAScript (`moduleResolution: "nodenext"`, extensiones `.js`).
- **Superficie de API Híbrida:**
  - **REST:** Operaciones transaccionales, mutaciones de reserva, webhooks de pago, lista de espera, reseñas y endpoints administrativos.
  - **GraphQL (Apollo Server):** Agregados clínicos complejos (`PatientRecordsGraphqlModule`) para consultar expedientes médicos consolidados (consultas, citas pasadas, diagnósticos) en una única petición sin overfetching.

### Frontend — Next.js 16 (App Router) y Patrón Controller-Hook

El frontend desacopla completamente la interfaz de usuario de la lógica de presentación y el consumo de datos:

```
client/src/views/{dominio}/
├── index.tsx          # Vista pura (JSX y layout declarativo)
├── hooks/use{Domain}  # Lógica de estado, mutaciones, selectores y llamadas API
├── components/        # Componentes desacoplados y reusables del dominio
└── functions/         # Transformaciones y utilidades de formato puras
```

- **Estado Global:** Redux Toolkit + `redux-persist` para sesión, tokens, navegación y tablas.
- **Caché y Server-State:** TanStack React Query v5 para dropdowns en cascada, revalidación en segundo plano y listas reactivas.
- **Diseño y Estilos:** Material UI 7 (MUI) con integración profunda de paletas de alto contraste y temas dinámicos.

### Modelo Multi-Tenant y Aislamiento por Sede

El sistema aplica aislamiento por sede clínica (`clinicId`) garantizado por la cadena de interceptores y guards de NestJS:

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                           SUPER_ADMIN                                   │
│            Acceso global cross-tenant a todas las sedes                 │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
          ┌──────────────────────────┴──────────────────────────┐
          ▼                                                     ▼
┌───────────────────────────────────┐ ┌───────────────────────────────────┐
│     SEDE CLÍNICA A (clinicId=1)   │ │     SEDE CLÍNICA B (clinicId=2)   │
│ ───────────────────────────────── │ │ ───────────────────────────────── │
│  • ADMIN de Sede                  │ │  • ADMIN de Sede                  │
│  • DOCTOR (agenda y pacientes)    │ │  • DOCTOR (agenda y pacientes)    │
│  • RECEPTIONIST (citas y espera)  │ │  • RECEPTIONIST (citas y espera)  │
└───────────────────────────────────┘ └───────────────────────────────────┘
                                     ▲
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                             PACIENTE                                    │
│         Multi-sede por diseño: puede agendar en cualquier clínica       │
└─────────────────────────────────────────────────────────────────────────┘
```

- `TenantInterceptor` y `TenantGuard` validan y resuelven el `clinicId` en cada petición HTTP y GraphQL.
- Dentro de transacciones `$transaction`, el aislamiento se aplica explícitamente en cada consulta sensible, ya que los clientes tenant-aware no se heredan en callbacks transaccionales.

---

## Últimas Características y Capacidades Core

### 1. Transactional Outbox Pattern ([ADR-0002](./docs/adr/0002-transactional-outbox.md))

Para resolver el problema del doble commit (*dual-write*) y prevenir la pérdida de eventos críticos si ocurre una caída del servidor tras persistir en base de datos, MediClick implementa un **Outbox Transaccional nativo en PostgreSQL**.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                      TRANSACCIÓN SERIALIZABLE PRISMA                        │
│                                                                             │
│  1. Mutación de Negocio (ej. cancelar cita / confirmar pago / nuevo cupo)   │
│  2. Inserción atómica en OutboxEvents con dedupeKey determinista            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Commit exitoso
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            OUTBOX WORKER                                    │
│                                                                             │
│  • Polling con leases distribuidos (lockedBy, lockedUntil)                  │
│  • Entrega al menos una vez (at-least-once delivery)                        │
│  • Backoff exponencial y Dead-Letter Queue (deadLetteredAt) tras N intentos │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
         ┌──────────────────────────────┐ ┌──────────────────────────────┐
         │     CONSUMIDOR WAITLIST      │ │     CONSUMIDOR FHIR R4       │
         │  Recuperación de cupos libre │ │  Proyección de Patient,      │
         │  Registro en                 │ │  Encounter y Provenance      │
         │  OutboxConsumptions (no-op)  │ │  en OutboxConsumptions       │
         └──────────────────────────────┘ └──────────────────────────────┘
```

- **Envelope canónico inmutable:** `eventId` (UUID), `type`, `schemaVersion`, `aggregateType`, `aggregateId`, `operationId`, `clinicId`, `occurredAt`, `payload`, `dedupeKey`.
- **Clave de deduplicación única:** `<type>:v<schemaVersion>:<aggregateType>:<aggregateId>:<operationId>` con constraint único en PostgreSQL.
- **Consumo idempotente:** Registro de recibo durable en la tabla `OutboxConsumptions` (`consumerName`, `eventId`). Si un consumidor recibe un reintento por timeout o lease vencido, lo convierte en un `no-op` seguro.

### 2. Lista de Espera Inteligente y Recuperación Atómica de Cupos

El módulo `waitlist` recupera automáticamente la capacidad perdida cuando una cita se cancela, se reagenda a otro cupo o expira por falta de pago:

- **Suscripción durable a eventos:** Consume el evento `appointment.slot_released` persistido en la Outbox en la misma transacción que liberó el horario.
- **Criterios de emparejamiento (Matching):** Coincidencia por sede, especialidad, médico preferido (opcional), rango de fechas y preferencia horaria (`ANY`, `MORNING` 06:00–12:00, `AFTERNOON` 12:00–18:00, `EVENING` 18:00–22:00).
- **Algoritmo de prioridad:** Selección por mayor prioridad operativa (`priority`, ajustable por personal de sede para casos VIP o cancelaciones de la clínica) y antigüedad FIFO.
- **Ofertas con temporizador (`WaitlistOffers`):** Ventana de 15 minutos (`OFFER_TTL_MINUTES`) con cuenta regresiva para que el paciente acepte.
- **Locks atómicos en Redis + Constraint de Base de Datos:** Lock de slot con token criptográfico seguro y liberación con compare-and-delete (evita desbloqueos cruzados), respaldado por un índice único parcial en PostgreSQL (`UNIQUE ("scheduleId") WHERE status = 'PENDING'`).
- **Aceptación 100% atómica (`acceptOfferAtomically`):** Reclama la oferta, crea la cita `PENDING`, establece precio y plazo de pago, y marca la solicitud como completada en una única transacción serializable.
- **Jobs de expiración y re-ofrecimiento:** Barren ofertas vencidas y las reasignan al siguiente paciente elegible en la cola sin reofrecer el mismo cupo a quien ya lo rechazó.

### 3. Interoperabilidad en Salud — Almacén FHIR R4 y EHR ([ADR-0001](./docs/adr/0001-fhir-resource-store.md))

MediClick sienta las bases para actuar como un **Point-of-Service (PoS) interoperable** bajo el estándar **HL7 FHIR R4** y el marco de referencia **OpenHIE**:

- **Arquitectura de proyección desacoplada:** Las tablas relacionales de PostgreSQL continúan siendo la fuente de verdad operativa. El almacén FHIR es una proyección derivada y reconstruible.
- **Modelo de persistencia polimórfico:** Tabla `FhirResource` con contenido clínico completo en columna `jsonb` e indexación GIN con operador `jsonb_path_ops` para búsquedas eficientes.
- **Trazabilidad append-only inmutable:** Toda mutación escribe una fila en `FhirResourceHistory` dentro de la misma transacción, habilitando auditoría legal y endpoints FHIR `vread` y `_history`.
- **Identidad lógica desacoplada:** Los recursos usan su propio UUID como identificador lógico FHIR, enlazando los IDs relacionales autoincrementales internos mediante identificadores formales (`urn:mediclick:patient-id`, `urn:mediclick:appointment-id`).
- **Proyecciones sincronizadas mediante Outbox:**
  - `Patient`: Generación de recurso con datos demográficos, identificador nacional (DNI/cédula) y contactos de emergencia.
  - `Encounter`: Mapeo del ciclo de vida de la cita (`planned`, `arrived`, `in-progress`, `finished`, `cancelled`) a códigos estándar FHIR.
  - `Provenance`: Registro automático del autor, actor que efectuó la mutación y marca temporal inmutable.

### 4. Endurecimiento de Integridad, Concurrencia y Multi-Tenant (SDD-Hardening)

Implementación exhaustiva de los hitos de endurecimiento P0 y P1 ([`SDD-Hardening`](./docs/SDD-hardening-integridad-seguridad-operacion.md)):

- **Aislamiento en Consultas Clínicas Profundas (F-01 / F-02):** El agregador GraphQL de expedientes clínicos (`PatientRecordsGraphqlModule`) valida de forma estricta que el personal solo acceda a historiales de su sede y que los médicos solo vean expedientes de pacientes con citas asignadas a su propio perfil en esa sede.
- **Conciliación Serializable de Pagos (F-03 / F-04):** El estado asistencial (`AppointmentStatus`) y el estado de pago (`PaymentStatus`) operan como máquinas de estados independientes. El webhook de pago corre bajo nivel de aislamiento `Serializable` de PostgreSQL: un pago aprobado tardío confirma la transacción, pero **jamás revive una cita que ya fue cancelada** concurrentemente (*monotonicity* de cancelación), marcándola en su lugar para revisión financiera manual (`[REVIEW]`).
- **Servicio Compartido de Cancelación (`AppointmentCancellationService`):** Ruta única de cancelación que centraliza:
  - Liberación de cupo y emisión atómica a la outbox.
  - Política de penalización por cancelación tardía (si el paciente cancela con menos de 24 horas, retención del 50% de la consulta marcada para conciliación manual).
  - Marcado de transacciones pagadas como `needsRefund: true` para reembolso manual por administración.
- **Eventos de Modificación de Restricciones (`availability.restriction_changed`):** Al crear, editar o eliminar un feriado o un bloqueo de agenda, se recalculan y cancelan ordenadamente las citas afectadas en el rango modificado, notificando a los pacientes y generando alertas de reembolso.

### 5. Sistema de Reseñas y Reputación Verificada

- **Reseñas 1:1 verificadas:** El modelo `Reviews` requiere una cita completada existente (`appointmentId` con `@unique`). No es posible emitir reseñas ficticias ni duplicar calificaciones para la misma consulta.
- **Puntuación y feedback:** Escala de 1 a 5 estrellas con comentarios libres del paciente sobre su atención.
- **Promedios denormalizados:** Cada nueva reseña actualiza en tiempo real los campos `ratingAvg` y `ratingCount` en el perfil del médico (`Doctors`) de forma transaccional.
- **Panel de moderación:** Endpoints protegidos (`PATCH /reviews/:id/visibility`) para que los administradores puedan auditar u ocultar comentarios que violen normas de conducta.

### 6. Planificador Puro de Generación de Agenda

- **`ScheduleGenerationPlannerService`:** Motor desacoplado y libre de efectos secundarios que calcula los cupos de atención evaluando:
  - Reglas de disponibilidad semanal (`REGULAR`, `EXCEPTION`, `EXTRA`).
  - Duración de consulta y minutos de descanso entre citas (`bufferMinutes`).
  - Feriados nacionales y feriados específicos de la sede.
  - Bloqueos de agenda parciales o de día completo.
- **Identidad compuesta en base de datos:** Restricción única en PostgreSQL sobre `[doctorId, specialtyId, clinicId, scheduleDate, timeFrom, timeTo]`. Dos especialidades de un médico pueden coexistir sin colisionar ni borrarse entre sí.
- **Reemplazo atómico de reglas:** Al actualizar la disponibilidad de un doctor para una especialidad, el reemplazo desactiva y recrea el conjunto completo dentro de una transacción con reintentos exponenciales ante posibles conflictos de serialización (`P2034`).

### 7. Conciliación Financiera y Webhooks de Pago con MercadoPago

- **Pre-pago obligatorio con reserva temporal:** La cita se crea en estado `PENDING` con un plazo límite de pago (`pendingUntil`, configurable a 15 minutos).
- **Checkout Pro de MercadoPago:** Redirección segura fuera de la aplicación (PCI-DSS compliant; MediClick no procesa ni almacena números de tarjeta).
- **Validación criptográfica estricta:** El webhook en `/payments/webhook` valida firmas `x-signature` mediante HMAC-SHA256 usando `crypto.timingSafeEqual` para prevenir ataques de temporización.
- **Idempotencia de transacción:** Índice único condicional en PostgreSQL (`UNIQUE ("gatewayId") WHERE "gatewayId" IS NOT NULL`) que asegura que una notificación duplicada de Mercado Pago jamás procese dos veces el mismo cobro.
- **Expiración automática por Cron:** Job por minuto que cancela reservas vencidas no pagadas y publica su liberación a la outbox.

---

## Accesibilidad — WCAG 2.1 AA & Gate Automatizado en CI

MediClick incorpora un sistema nativo de accesibilidad médica que cumple con **WCAG 2.1 nivel AA** y la norma técnica **NTP-ISO/IEC 40500:2012**:

### Los 9 Controles de Accesibilidad

| Control | Opciones | Criterio WCAG |
|---------|----------|---------------|
| **Tamaño de texto** | Normal (16px) · Grande (18px) · Muy grande (20px) | 1.4.4 Resize Text |
| **Alto contraste** | Activado / Desactivado — Paleta pura blanco/negro (Ratio 7:1 AAA) | 1.4.6 Contrast Enhanced |
| **Botones y blancos táctiles** | Activado / Desactivado — Mínimo de 44×44 CSS px | 2.5.5 Target Size |
| **Reducir animaciones** | Activado / Desactivado — Transiciones limitadas a 0.001ms | 2.3.3 Animation from Interactions |
| **Modo daltónico** | Deuteranopía · Protanopía · Tritanopía · Acromatopsia (Escala de grises) | 1.4.1 Use of Color |

**Garantías activas por defecto:**
- Foco visible reforzado en todos los elementos interactivos con teclado (WCAG 2.4.7).
- Respeto automático a las preferencias del sistema operativo (`prefers-reduced-motion` y `prefers-color-scheme`).
- Inyección de matrices científicas SVG de color (algoritmo Brettel/Viénot/Mollon) mediante React Portal sobre contenedores `.cb-target`, aislando el panel de control para permitir ajustes visuales en tiempo real.
- Persistencia de configuración en la cookie HTTP `mediclick-settings` (365 días), garantizando renderizado del lado del servidor (SSR) sin parpadeo de estilos (FOUC).

### Gate de Accesibilidad en CI

El pipeline de integración continua ejecuta un gate automatizado con **Playwright + `@axe-core/playwright`** (`pnpm run test:a11y`) sobre las vistas públicas, formularios de autenticación y flujos principales, bloqueando cualquier regresión en contraste, etiquetas ARIA, estructura de encabezados o navegación accesible por teclado.

---

## Roles y Matriz Declarativa de Permisos (PBAC/RBAC)

El acceso al sistema está regido por **PBAC (Permission-Based Access Control)** con una **fuente declarativa única de verdad** definida en [`server/prisma/rbac-policy.ts`](./server/prisma/rbac-policy.ts) ([SDD-012](./docs/SDD-hardening-integridad-seguridad-operacion.md)). Cualquier cambio en permisos se propaga de manera determinista mediante `seed.ts` o `seed-rbac.ts`.

### Roles del Sistema Canónicos

1. **`SUPER_ADMIN`:** Acceso irrestricto a todos los recursos y sedes del sistema (`MANAGE:ALL`).
2. **`ADMIN` (de sede):** Control total de la operación, staff, agenda, reportes y pacientes de su clínica específica.
3. **`DOCTOR`:** Gestión de agenda propia, notas clínicas, recetas médicas y consulta de reseñas.
4. **`RECEPTIONIST`:** Creación de citas, gestión del padrón de pacientes de la sede y administración de la lista de espera.
5. **`PATIENT`:** Usuario multi-sede con permisos para agendar, pagar, reagendar/cancelar citas propias, gestionar sus entradas de lista de espera y calificar sus consultas finalizadas.

### Matriz de Permisos por Funcionalidad

| Funcionalidad | SUPER_ADMIN | ADMIN | DOCTOR | RECEPTIONIST | PATIENT |
|---------------|:-----------:|:-----:|:------:|:------------:|:-------:|
| **Dashboard y reportes de ingresos** | ✓ | ✓ | ✓ *(propio)* | — | — |
| **Gestión de clínicas y sedes** | ✓ | — | — | — | — |
| **Gestión de roles y permisos** | ✓ | ✓ *(sede)* | — | — | — |
| **Gestión de staff y doctores** | ✓ | ✓ | — | — | — |
| **Gestión de pacientes** | ✓ | ✓ | — | ✓ | — |
| **Ver y agendar citas** | ✓ | ✓ | ✓ | ✓ | ✓ *(propias)* |
| **Reagendar o cancelar citas** | ✓ | ✓ | ✓ | ✓ | ✓ *(propias)* |
| **Escribir notas clínicas y recetas** | — | — | ✓ | — | — |
| **Consultar historial y recetas** | ✓ | ✓ | ✓ | — | ✓ *(propias)* |
| **Descargar receta en PDF** | ✓ | ✓ | ✓ | — | ✓ *(propias)* |
| **Configurar disponibilidad y horarios** | ✓ | ✓ | — | — | — |
| **Bloqueos y feriados** | ✓ | ✓ | ✓ *(bloqueos)*| — | — |
| **Lista de espera (ingresar / salir)** | — | — | — | — | ✓ |
| **Lista de espera (administrar cola/prioridad)** | ✓ | ✓ | — | ✓ | — |
| **Pagar cita médica en línea** | — | — | — | — | ✓ |
| **Ver transacciones financieras** | ✓ | ✓ | — | ✓ | ✓ *(propias)* |
| **Publicar reseña de doctor** | — | — | — | — | ✓ *(verificada)*|
| **Moderar visibilidad de reseñas** | ✓ | ✓ | — | — | — |

---

## Seguridad y Auditoría Forense

MediClick incorpora defensas alineadas con las recomendaciones de **OWASP Top 10**:

| Vulnerabilidad | Mecanismo de Mitigación Implementado |
|----------------|--------------------------------------|
| **A01: Broken Access Control** | `TenantGuard` para validación estricta de `clinicId`; `PermissionsGuard` con caché en Redis; queries transaccionales scoped explícitamente; filtrado en agregados GraphQL. |
| **A02: Cryptographic Failures** | Hashing de contraseñas con bcrypt; cookies de sesión `HttpOnly`, `Secure` y `SameSite: Lax`; validación de webhooks con HMAC-SHA256 y comparación en tiempo constante. |
| **A03: Injection** | Consultas tipadas con Prisma ORM (parámetros sanitizados por defecto); validación estricta de DTOs en entrada con `class-validator` (`whitelist: true`, `forbidNonWhitelisted: true`). |
| **A04: Insecure Design** | Máquinas de estado asistencial y financiero desacopladas; transacciones `Serializable` para pagos y reservas; patrón Transactional Outbox; locks atómicos en Redis para lista de espera. |
| **A05: Security Misconfiguration** | Cabeceras HTTP seguras con Helmet (CSP, HSTS, X-Frame-Options); Docker multi-stage con imagen final Node 22 Alpine sin privilegios de root. |
| **A06: Vulnerable Components** | Auditoría periódica de dependencias en CI (`pnpm audit --prod --audit-level high`); stack bloqueado con `pnpm-lock.yaml` estricto. |
| **A07: Identification Failures** | Refresh Token Rotation con tracking de dispositivos en Redis (la reutilización de un token revoca inmediatamente todas las sesiones del usuario); recuperación de contraseña por código numérico de 6 dígitos con TTL de 10 min y límite de 5 intentos fallidos (protección contra fuerza bruta). |
| **A08: Software & Data Integrity** | Deduplicación canónica en outbox; verificación de integridad de firmas de pago; transacciones serializables en PostgreSQL. |
| **A09: Logging & Monitoring** | Bitácora append-only `SecurityAuditLogs` (registra `LOGIN_FAILED`, `PERMISSION_DENIED`, IP, User-Agent y recurso sin claves foráneas para preservar evidencia forense); healthcheck en `/health`. |
| **A10: SSRF / Webhook Abuse** | El webhook de pagos re-consulta el estado directamente a la API de Mercado Pago; nunca confía en el cuerpo de la notificación enviada por el cliente. |

---

## Testing y Garantía de Calidad

La confiabilidad del sistema se valida a través de una pirámide de pruebas automatizadas:

```text
       ▲
      / \        Playwright WCAG Gate (a11y tests con Axe-core)
     /   \       + Smoke Test de Contenedor de Producción
    /─────\
   /       \     13 Suites de Integración con PostgreSQL 17 Real
  /         \    (Concurrencia, Serializable, Outbox Worker, Locks Redis)
 /───────────\
/             \  389 Tests Unitarios (Jest)
═══════════════  (TDD Red-Green-Refactor, OWASP A01/A07, Casos Límite, DDD)
```

### 1. Tests Unitarios (389 tests pasando)

Desarrollados bajo el ciclo **TDD (Red → Green → Refactor)** y estructurados bajo el patrón **AAA (Arrange-Act-Assert)**:
- Casos de reserva concurrente, cálculo de plazos de pago y solapamientos.
- Validadores de cupos y alineación con descansos entre citas.
- Casos de seguridad OWASP (control de acceso, rotación de tokens, prevención de enumeración de usuarios).
- Lógica de dominio de lista de espera y selección de candidatos.
- Mapeadores y lógica de proyecciones FHIR R4 (`Patient`, `Encounter`, `Provenance`).
- Manejo determinista de zonas horarias (`America/Lima` vs `Europe/Madrid`, cambios de horario de verano DST).

### 2. Tests de Integración con Base de Datos Real (13 suites)

Ubicados en archivos `*.integration.spec.ts`, se ejecutan contra un contenedor PostgreSQL real con nivel de aislamiento `Serializable` y siempre en un único hilo (`jest.integration.config.cjs`, `--runInBand`):
- Persistencia y reintentos de leases en `OutboxWorker`.
- Deduplicación física de eventos en `OutboxEvents` y recibos en `OutboxConsumptions`.
- Idempotencia de pagos ante colisiones en `Transactions` (`gatewayId`).
- Aceptación atómica y constraints condicionales de ofertas en `WaitlistOffers`.
- Locks distribuidos de cupos en Redis con validación de tokens.
- Reemplazo concurrente de reglas de disponibilidad y reintento ante abortos `P2034`.
- Aislamiento de consultas de expedientes médicos en GraphQL.

### 3. Tests de Accesibilidad y E2E

- Suite de Playwright en el cliente (`pnpm run test:a11y`) que inspecciona automáticamente contraste de color, estructura semántica, landmarks y atributos de accesibilidad con el motor Axe.

### Comandos de Testing

```bash
# Backend — Tests unitarios completos (389 tests)
cd server && pnpm test

# Backend — Test unitario específico
cd server && pnpm test -- waitlist

# Backend — Tests de integración con PostgreSQL real (requiere Docker levantado)
cd server && RUN_DB_INTEGRATION=1 DATABASE_URL=postgresql://mediclick:testpass@localhost:5436/mediclick?schema=public pnpm run test:integration

# Backend — Type-check sin compilar
cd server && npx tsc --noEmit

# Frontend — Gate de accesibilidad WCAG 2.1 AA
cd client && pnpm run test:a11y

# Frontend — Lint y type-check
cd client && pnpm run lint && npx tsc --noEmit
```

---

## Tech Stack

| Capa | Tecnologías Principales |
|------|-------------------------|
| **Backend Core** | NestJS 11, TypeScript 5 (Strict ESM), Node.js 22, Express 5, Apollo Server 5 (GraphQL), Swagger / OpenAPI |
| **Persistencia y ORM** | PostgreSQL 17, Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`, migración con constraints SQL nativos) |
| **Caché y Concurrencia** | Redis 7 (`ioredis`, `@nest-lab/throttler-storage-redis`, locks distribuidos atómicos) |
| **Interoperabilidad** | HL7 FHIR R4 (`@medplum/fhirtypes`), almacén en columnas `jsonb` con índices GIN `jsonb_path_ops` |
| **Arquitectura de Eventos** | Patrón Transactional Outbox nativo con worker distribuido de reintentos |
| **Frontend Core** | Next.js 16 (App Router), React 19, MUI 7 (Material UI), Emotion, Framer Motion |
| **Estado Cliente** | Redux Toolkit, `redux-persist`, TanStack React Query v5, TanStack Table v8 |
| **Formularios y Validación** | React Hook Form, Zod 4 en cliente; `class-validator` y `class-transformer` en backend |
| **Pasarela de Pagos** | MercadoPago SDK v2 (Checkout Pro con webhooks idempotentes validados con HMAC-SHA256) |
| **Comunicaciones y Docs** | Nodemailer con plantillas Handlebars compiladas; generación de recetas en PDF con `pdfmake` |
| **Testing** | Jest 30, `ts-jest`, Playwright Test, `@axe-core/playwright` |
| **Infraestructura y CI/CD** | Docker Multi-Stage (Node 22 Alpine), Docker Compose, GitHub Actions |

---

## Estructura del Proyecto

```
MediClick/
├── .github/
│   └── workflows/
│       └── ci.yml                     # Pipeline CI con jobs de server, client y auditoría OWASP
├── docker-compose.prod.yml              # Orquestación para despliegue productivo
├── CONTEXT.md                           # Glosario canónico del lenguaje ubicuo del negocio
├── docs/
│   ├── domain/
│   │   └── APPOINTMENT-CORE.md          # Especificación de invariantes del núcleo de reservas
│   ├── adr/
│   │   ├── 0001-fhir-resource-store.md  # ADR: Persistencia para interoperabilidad FHIR R4
│   │   └── 0002-transactional-outbox.md# ADR: Outbox transaccional para eventos críticos
│   ├── SDD-hardening-integridad-seguridad-operacion.md # Diseño técnico de integridad
│   └── ROADMAP-interoperabilidad.md    # Hitos y fases del programa EHR / OpenHIE
│
├── server/                              # Backend NestJS 11
│   ├── docker-compose.yml               # PostgreSQL 17 (:5436) y Redis 7 (:6379) local
│   ├── Dockerfile                       # Build multi-stage en Node 22 Alpine
│   ├── prisma/
│   │   ├── schema.prisma                # 30 modelos y 13 enums
│   │   ├── rbac-policy.ts               # Matriz declarativa única de roles y permisos
│   │   ├── seed.ts                      # Datos de prueba para desarrollo
│   │   └── seed-rbac.ts                 # Sincronización idempotente de permisos
│   ├── scripts/
│   │   └── smoke-production-entrypoint.mjs # Smoke test del artefacto de producción
│   └── src/
│       ├── modules/                     # 25 módulos de dominio (DDD)
│       │   ├── appointments/            #   Núcleo de reservas, estados y cancelaciones
│       │   ├── auth/                    #   JWT, rotación de refresh tokens y sesiones
│       │   ├── availability/            #   Reglas de disponibilidad semanal y reemplazo
│       │   ├── categories/              #   Categorías médicas
│       │   ├── clinical-notes/          #   Notas clínicas del expediente
│       │   ├── clinics/                 #   Configuración multi-sede y timezones
│       │   ├── doctors/                 #   Perfiles médicos y especialidades
│       │   ├── holidays/                #   Feriados globales y por clínica
│       │   ├── interoperability/        #   Almacén y proyecciones FHIR R4 (EHR)
│       │   ├── medical-history/         #   Condiciones crónicas y antecedentes
│       │   ├── notifications/           #   Notificaciones in-app y por email
│       │   ├── patient-records-graphql/ #   Expediente clínico agregado en GraphQL
│       │   ├── patients/                #   Padrón de pacientes y datos médicos
│       │   ├── payments/                #   MercadoPago Checkout Pro y conciliación
│       │   ├── permissions/             #   Gestión PBAC
│       │   ├── prescriptions/           #   Recetas médicas farmacológicas
│       │   ├── reports/                 #   Analítica, KPIs y ocupación
│       │   ├── reviews/                 #   Reseñas verificadas 1:1 de pacientes
│       │   ├── roles/                   #   Roles de sistema y personalizados
│       │   ├── schedule-blocks/         #   Bloqueos de agenda de doctores
│       │   ├── scheduler/               #   Cron jobs de expiración y mantenimiento
│       │   ├── schedules/               #   Planificador de slots concretos
│       │   ├── specialties/             #   Especialidades médicas y tarifas
│       │   ├── users/                   #   Usuarios del sistema
│       │   └── waitlist/                #   Lista de espera inteligente y auto-fill
│       └── shared/                      # Módulos transversales e infraestructura
│           ├── access/                  #   Políticas granulares de acceso
│           ├── guards/                  #   JwtAuthGuard, TenantGuard, PermissionsGuard
│           ├── health/                  #   Terminus HealthCheck (/health)
│           ├── interceptors/            #   TenantInterceptor
│           ├── mail/                    #   Nodemailer + plantillas Handlebars
│           ├── outbox/                  #   Patrón Transactional Outbox (worker y persistencia)
│           ├── pdf/                     #   Motor de generación de PDFs
│           ├── redis/                   #   Wrapper y pool de conexiones Redis
│           ├── security-audit/          #   Bitácora append-only SecurityAuditLogs
│           └── utils/                   #   Utilidades puras de fecha y zona horaria
│
└── client/                              # Frontend Next.js 16
    ├── playwright.config.ts             # Configuración del gate de accesibilidad
    └── src/
        ├── app/                         # App Router de Next.js
        │   ├── (landing)/               #   Página de inicio pública accesible
        │   ├── (blank-layout)/          #   Login, Registro y Recuperación de clave
        │   └── (menu)/                  #   31 vistas autenticadas por rol
        ├── views/                       # Vistas estructuradas (Controller-Hook)
        │   ├── appointments/            #   Gestión y reserva de citas
        │   ├── waitlist/                #   Panel de lista de espera (paciente y clínica)
        │   ├── reviews/                 #   Componentes de calificación y moderación
        │   └── ...                      #   Vistas administrativas y clínicas
        ├── redux-store/                 # Slices de Redux Toolkit
        ├── services/                    # Clientes de API REST y GraphQL
        └── @core/
            ├── components/customizer/   #   Panel lateral de accesibilidad
            ├── components/accessibility/#   Filtros SVG científicos de daltonismo
            └── theme/                   #   Temas MUI con paletas de alto contraste AAA
```

---

## Inicio Rápido

### Requisitos Previos

- **Node.js:** v22.x LTS (recomendado) o v20.x+
- **Gestor de paquetes:** pnpm v10 (`npm install -g pnpm@10.28.0`)
- **Contenedores:** Docker y Docker Compose

### Pasos de Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/mediclick.git && cd mediclick

# 2. Levantar la base de datos PostgreSQL y Redis local
cd server
docker compose up -d

# 3. Configurar variables de entorno
cp .env.example .env                 # Variables del backend
cd ../client && cp .env.example .env.local # Variables del frontend

# 4. Inicializar el Backend
cd ../server
pnpm install
pnpm run prisma:generate
pnpm run prisma:migrate
npx prisma db seed                   # Carga roles, permisos y datos base
pnpm run start:dev                   # Disponible en http://localhost:5100

# 5. Inicializar el Frontend (en otra terminal)
cd ../client
pnpm install
pnpm run dev                         # Disponible en http://localhost:3000
```

- **Swagger UI:** `http://localhost:5100/api/docs`
- **GraphQL Playground:** `http://localhost:5100/graphql`
- **Healthcheck:** `http://localhost:5100/health`

---

## Variables de Entorno

### Backend (`server/.env`)

| Variable | Descripción | Valor Típico / Default |
|----------|-------------|------------------------|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://mediclick:testpass@localhost:5436/mediclick?schema=public` |
| `JWT_SECRET` | Secreto de firma para access tokens | Cadena criptográfica aleatoria |
| `JWT_REFRESH_SECRET` | Secreto de firma para refresh tokens | Cadena criptográfica aleatoria |
| `JWT_EXPIRES_IN` | Tiempo de vida del access token | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Tiempo de vida del refresh token | `7d` |
| `REDIS_HOST` | Host de Redis | `localhost` (en Docker: `redis`) |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `PORT` | Puerto HTTP del backend | `5100` |
| `CLIENT_URL` | Origen permitido para CORS | `http://localhost:3000` |
| `MP_ACCESS_TOKEN` | Token de API de Mercado Pago | Credencial de prueba o producción |
| `MP_WEBHOOK_SECRET` | Secreto HMAC para validar webhooks de pago | Secreto provisto por Mercado Pago |
| `MP_SUCCESS_URL` | URL de retorno tras pago aprobado | `http://localhost:3000/payment/success` |
| `MP_FAILURE_URL` | URL de retorno tras pago rechazado | `http://localhost:3000/payment/failure` |
| `MP_PENDING_URL` | URL de retorno tras pago pendiente | `http://localhost:3000/payment/pending` |
| `APPOINTMENT_PAYMENT_TIMEOUT_MINUTES` | Plazo para pagar la reserva en minutos | `15` |
| `MAIL_HOST` | Host del servidor SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Puerto SMTP | `587` |
| `MAIL_USER` | Usuario SMTP | Correo emisor |
| `MAIL_PASS` | Contraseña de aplicación SMTP | Contraseña |
| `MAIL_FROM` | Cabecera From en notificaciones | `MediClick <noreply@mediclick.com>` |

### Frontend (`client/.env.local`)

| Variable | Descripción | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | URL del servidor NestJS | `http://localhost:5100` |

---

## Base de Datos y Persistencia

El modelo relacional está compuesto por **30 modelos Prisma** y **13 enums**:

- **Identidad y Accesos:** `Users`, `Profiles`, `Roles`, `Permissions`, `RolePermissions`, `SecurityAuditLogs`
- **Sedes y Servicios:** `Clinics`, `Categories`, `Specialties`, `Doctors`, `DoctorsSpecialties`
- **Capacidad y Agenda:** `Availability`, `Schedules`, `ScheduleBlocks`, `Holidays`
- **Atención Clínica:** `Patients`, `Appointments`, `ClinicalNotes`, `Prescriptions`, `PrescriptionItems`, `MedicalHistory`
- **Finanzas y Reputación:** `Transactions`, `Reviews`
- **Comunicaciones:** `Notifications`
- **Lista de Espera:** `WaitlistEntries`, `WaitlistOffers`
- **Interoperabilidad FHIR:** `FhirResource`, `FhirResourceHistory`
- **Transactional Outbox:** `OutboxEvents`, `OutboxConsumptions`

### Manejo Determinista de Zonas Horarias

- Las fechas se persisten a medianoche UTC (`00:00:00.000Z`) y las horas relativas al epoch (`1970-01-01`).
- Los DTOs de transporte serializan horas y fechas en cadenas deterministas (`HH:mm`, `YYYY-MM-DD`).
- Cada sede (`Clinics`) posee su propia zona horaria (`timezone`, ej. `America/Lima`, `Europe/Madrid`). Todas las validaciones de anticipación, feriados, descansos y bloqueos se evalúan en la hora local correspondiente antes de cualquier mutación.

---

## CI/CD y Despliegue en Producción

### Pipeline de Integración Continua (GitHub Actions)

El archivo [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) ejecuta tres trabajos paralelos en cada push o pull request a `main`:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GITHUB ACTIONS CI                                │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│       JOB: SERVER       │       JOB: CLIENT       │       JOB: AUDIT        │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ • Install (pnpm frozen) │ • Install (pnpm frozen) │ • pnpm audit --prod     │
│ • Prisma Generate       │ • Type-check (tsc)      │   (OWASP A06 dep audit) │
│ • Prisma Migrate Deploy │ • Next.js Build         │   en server y client    │
│ • ESLint                │ • Playwright WCAG       │                         │
│ • Type-check (tsc)      │   Gate (test:a11y)      │                         │
│ • Unit Tests (389 tests)│ • ESLint                │                         │
│ • Integration Tests     │                         │                         │
│   (Postgres/Redis real) │                         │                         │
│ • NestJS Build          │                         │                         │
│ • Smoke Test Prod Entry │                         │                         │
└─────────────────────────┴─────────────────────────┴─────────────────────────┘
```

### Despliegue con Docker en Producción

El archivo [`docker-compose.prod.yml`](./docker-compose.prod.yml) define el entorno productivo con aislamiento de redes y healthchecks encadenados:

```bash
docker compose -f docker-compose.prod.yml up -d
```

El [`Dockerfile`](./server/Dockerfile) del backend utiliza una compilación **multi-stage en 3 fases**:
1. **`deps`:** Instalación reproducible con `pnpm install --frozen-lockfile`.
2. **`build`:** Generación del cliente Prisma y transpilación NestJS a JavaScript.
3. **`production`:** Imagen ultraligera basada en `node:22-alpine` que copia únicamente los artefactos compilados (`dist`), `node_modules` de producción y esquemas Prisma, ejecutando bajo healthcheck activo en `/health`.

---

*MediClick — Sistema de Gestión de Citas Médicas e Historia Clínica Interoperable · NestJS 11 + Next.js 16 · HL7 FHIR R4 · WCAG 2.1 AA*
