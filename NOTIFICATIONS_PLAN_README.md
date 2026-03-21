# Plan de Implementacion: Correos, Notificaciones y Recuperacion de Contrasenas

## Estado Actual del Proyecto

Ya existe:
- **NotificationsModule** con CRUD completo de notificaciones in-app (create, find, mark-read, count-unread, delete)
- **Prisma `Notifications`** con campos: `type`, `channel`, `title`, `message`, `metadata`, `sentAt`, `isRead`
- **Enums en schema**: `NotificationType` (APPOINTMENT_REMINDER, APPOINTMENT_CONFIRMED, APPOINTMENT_CANCELLED, APPOINTMENT_RESCHEDULED, NEW_APPOINTMENT, GENERAL) y `NotificationChannel` (IN_APP, EMAIL, SMS, PUSH)
- **Redis** (ioredis) ya configurado y en uso para refresh tokens
- **CreateNotificationUseCase** exportado desde el modulo (disponible para inyeccion en otros modulos)

No existe:
- Ningun servicio de envio de email
- Flujo de forgot/reset password (ni backend ni frontend)
- Cron jobs (`@nestjs/schedule` no instalado)
- Campo `reminderSent` en Appointments
- Modelo `PasswordResetToken`

---

## 1. Stack Tecnologico

| Componente | Tecnologia | Justificacion |
|---|---|---|
| **Transporte de email** | **Nodemailer** (gratuito, open-source) | Provider-agnostic: se puede cambiar de SMTP sin tocar codigo. Sin costos de licencia. |
| **Proveedor SMTP** | **Brevo (ex-Sendinblue)** free tier | **300 emails/dia gratis para siempre**. Sin tarjeta de credito. API SMTP estandar. |
| **Plantillas** | **Handlebars** (`handlebars`) | Ligero, sin dependencia de React en servidor. Soporta layouts, partials y helpers. |
| **Cron Jobs** | `@nestjs/schedule` | Nativo de NestJS, decoradores `@Cron()`. |
| **Desacoplamiento** | `@nestjs/event-emitter` | Eventos internos para que el envio de email no bloquee ni rompa flujos de negocio. |
| **Tokens temporales** | **Redis con TTL** | Ya tenemos Redis. Un token con `EX 900` (15 min) se auto-elimina. Sin tabla extra en BD. |

### Comparativa de proveedores SMTP gratuitos

| Proveedor | Free Tier | Notas |
|---|---|---|
| **Brevo** | 300 emails/dia (sin limite mensual) | Mejor opcion gratuita para produccion. SMTP estandar. |
| **Resend** | 100 emails/dia, 3000/mes | Buena DX pero mas limitado. |
| **MailerSend** | 3000 emails/mes | Bajo volumen mensual. |
| **Gmail SMTP** | 500/dia | Solo para desarrollo. Google bloquea uso en produccion. |

**Recomendacion**: Brevo para produccion, Gmail SMTP para desarrollo local.

### Variables de entorno nuevas (`server/.env`)

```env
# Mail
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USER=<brevo-login>
MAIL_PASS=<brevo-smtp-key>
MAIL_FROM="MediClick <noreply@tudominio.com>"

# Para desarrollo con Gmail (opcional)
# MAIL_HOST=smtp.gmail.com
# MAIL_PORT=587
# MAIL_USER=tu@gmail.com
# MAIL_PASS=<app-password>
# MAIL_FROM="MediClick <tu@gmail.com>"

# Frontend URL (ya existe CLIENT_URL)
# CLIENT_URL=http://localhost:3000
```

---

## 2. Modificaciones al Schema (Prisma)

### 2.1 Campo `reminderSent` en Appointments

```prisma
model Appointments {
  // ... campos actuales
  reminderSent Boolean @default(false)
}
```

### 2.2 Nuevo tipo de notificacion

Agregar al enum `NotificationType`:

```prisma
enum NotificationType {
  APPOINTMENT_REMINDER
  APPOINTMENT_CONFIRMED
  APPOINTMENT_CANCELLED
  APPOINTMENT_RESCHEDULED
  NEW_APPOINTMENT
  PRESCRIPTION_CREATED   // NUEVO
  PASSWORD_RESET         // NUEVO
  GENERAL
}
```

### 2.3 Tokens de recuperacion: Redis (sin tabla nueva)

En vez de crear un modelo `PasswordResetToken`, usar Redis con TTL:

```
Key:    password-reset:{hashedToken}
Value:  { email, userId }
TTL:    900 (15 minutos)
```

Ventajas: auto-expiracion, sin migraciones, sin limpieza manual, ya tenemos Redis.

---

## 3. Arquitectura

### Flujo event-driven para emails

```
[Use-case] --emite evento--> [EventEmitter] --escucha--> [MailListener]
                                                              |
                                                    [MailService.send()]
                                                              |
                                                    [Nodemailer + SMTP]
```

El envio de email **nunca bloquea** la operacion principal. Si falla el email, se loguea el error pero la cita/receta se crea normalmente.

### Estructura del MailModule

```
server/src/modules/mail/
  application/
    mail.module.ts
    dto/
      send-mail.dto.ts
  domain/
    services/
      mail.service.ts              # Nodemailer wrapper
      template.service.ts          # Compilar Handlebars
    listeners/
      appointment-mail.listener.ts # Escucha eventos de citas
      prescription-mail.listener.ts
  infrastructure/
    templates/
      layouts/
        base.hbs                   # Layout HTML base (logo, footer)
      appointment-confirmed.hbs
      appointment-cancelled.hbs
      appointment-reminder.hbs
      prescription-created.hbs
      password-reset.hbs
```

### Estructura del SchedulerModule (Cron)

```
server/src/modules/scheduler/
  application/
    scheduler.module.ts
  domain/
    services/
      appointment-reminder.service.ts  # @Cron('0 8 * * *')
```

---

## 4. Hoja de Ruta (Fases de Implementacion)

### Fase 1: Infraestructura base de email

**Dependencias a instalar:**
```bash
cd server
pnpm add nodemailer handlebars @nestjs/schedule @nestjs/event-emitter
pnpm add -D @types/nodemailer
```

**Tareas:**
- [ ] Instalar dependencias
- [ ] Crear `MailModule` (global) con `MailService` (wrapper de Nodemailer configurado via `ConfigService`)
- [ ] Crear `TemplateService` que carga y compila plantillas `.hbs` desde disco
- [ ] Crear layout base HTML (`base.hbs`) con estilos inline, logo y footer de MediClick
- [ ] Registrar `EventEmitterModule.forRoot()` en `AppModule`
- [ ] Registrar `ScheduleModule.forRoot()` en `AppModule`
- [ ] Agregar variables de entorno a `.env` y `.env.example`
- [ ] Verificar envio con un email de prueba (endpoint temporal o test)

**Criterio de aceptacion:** `MailService.send({ to, subject, template, context })` envia un email correctamente via Brevo/Gmail SMTP.

---

### Fase 2: Recuperacion de contrasena (Forgot/Reset Password)

**Backend:**
- [ ] Crear `POST /auth/forgot-password` — recibe `{ email }`, genera token crypto, guarda en Redis con TTL 15min, envia email con link `CLIENT_URL/reset-password?token=xxx`
- [ ] Crear `POST /auth/reset-password` — recibe `{ token, newPassword }`, valida en Redis, hashea password, actualiza User, elimina token de Redis
- [ ] Rate limit estricto en forgot-password: `@Throttle({ long: { ttl: 60000, limit: 3 } })`
- [ ] El email de forgot-password siempre responde 200 (no revelar si el email existe)

**Frontend:**
- [ ] Vista `/forgot-password` — formulario con campo email, Zod validation, llamada al endpoint, mensaje de confirmacion generico
- [ ] Vista `/reset-password` — lee `token` de query params, formulario con password + confirmacion, Zod validation (min 8 chars), llamada al endpoint, redirect a `/login` en exito
- [ ] Agregar link "Olvidaste tu contrasena?" en la pantalla de login
- [ ] Plantilla de email `password-reset.hbs` con boton/link al reset

**Criterio de aceptacion:** Un usuario puede recuperar su contrasena end-to-end. El token expira en 15 min. No se revela si el email existe.

---

### Fase 3: Correos transaccionales (Event-Driven)

**Migracion Prisma:**
- [ ] Agregar `PRESCRIPTION_CREATED` y `PASSWORD_RESET` al enum `NotificationType`
- [ ] Ejecutar `pnpm run prisma:migrate`

**Listener de citas (`AppointmentMailListener`):**
- [ ] Escuchar evento `appointment.confirmed` — envia email al paciente con datos de la cita (doctor, fecha, hora, especialidad, sede)
- [ ] Escuchar evento `appointment.cancelled` — envia email al paciente con motivo de cancelacion

**Emision de eventos desde use-cases existentes:**
- [ ] `create-appointment.use-case.ts` — emitir `appointment.confirmed` al final del execute
- [ ] `cancel-appointment.use-case.ts` — emitir `appointment.cancelled` al final del execute

**Listener de recetas (`PrescriptionMailListener`):**
- [ ] Escuchar evento `prescription.created` — envia email al paciente con detalle de medicamentos e indicaciones

**Emision de eventos:**
- [ ] `create-prescription.use-case.ts` — emitir `prescription.created` al final del execute

**Notificacion in-app simultanea:**
- [ ] Cada listener tambien crea una notificacion in-app usando `CreateNotificationUseCase` con el tipo correspondiente

**Plantillas de email:**
- [ ] `appointment-confirmed.hbs` — datos de la cita, doctor, horario, sede
- [ ] `appointment-cancelled.hbs` — datos + motivo de cancelacion
- [ ] `prescription-created.hbs` — medicamentos, dosis, indicaciones

**Criterio de aceptacion:** Al crear/cancelar una cita o crear una receta, el paciente recibe email + notificacion in-app. Si el email falla, la operacion principal no se ve afectada.

---

### Fase 4: Cron de recordatorios diarios

**Migracion Prisma:**
- [ ] Agregar `reminderSent Boolean @default(false)` al modelo `Appointments`
- [ ] Ejecutar `pnpm run prisma:migrate`

**Servicio de recordatorios (`AppointmentReminderService`):**
- [ ] Decorar con `@Cron('0 8 * * *', { timeZone: 'America/Lima' })` (8:00 AM hora Peru)
- [ ] Calcular "manana" usando `todayStartInTimezone(tz)` + 1 dia (NO `new Date()`)
- [ ] Query: citas con `status = CONFIRMED`, scheduleDate = manana, `reminderSent = false`, `deleted = false`
- [ ] Para cada cita: formatear fecha/hora usando el timezone de la clinica, enviar email, crear notificacion in-app tipo `APPOINTMENT_REMINDER`, actualizar `reminderSent = true`
- [ ] Envolver en try/catch individual por cita (que una falla no detenga las demas)
- [ ] Log de cuantos recordatorios se enviaron

**Plantilla:**
- [ ] `appointment-reminder.hbs` — "Tu cita es manana", datos del doctor, hora (formateada en timezone local), indicaciones

**Criterio de aceptacion:** Cada dia a las 8 AM (hora Peru), los pacientes con cita al dia siguiente reciben email + notificacion in-app. El flag `reminderSent` previene duplicados. Las horas se muestran en el horario local de la clinica.

---

## 5. Consideraciones Importantes

### Seguridad
- **Forgot password**: siempre responder HTTP 200 sin importar si el email existe (prevenir enumeracion)
- **Token**: usar `crypto.randomBytes(32).toString('hex')`, guardar hasheado en Redis (`sha256`)
- **Rate limiting**: 3 intentos/minuto en forgot-password
- **Sanitizar** datos en plantillas Handlebars (escapa HTML por defecto)

### Resiliencia
- Los emails se envian de forma **fire-and-forget** via eventos. Si SMTP falla, se loguea con `Logger.error()` pero NO se lanza excepcion al usuario
- El cron usa try/catch individual por cita para no detener el lote

### Limites del free tier (Brevo)
- 300 emails/dia. Para un MVP con pocas clinicas, es mas que suficiente
- Monitorear uso via dashboard de Brevo
- Si se supera: upgrade a plan Starter ($9/mes = 5000 emails/mes) o migrar a Amazon SES ($0.10/1000 emails)

### Multi-tenancy
- Los emails son cross-tenant (van al paciente, no a la clinica)
- Las plantillas deben incluir el nombre de la clinica correspondiente a la cita
- El cron recorre TODAS las clinicas (no filtra por tenant)

### Manejo de fechas y zonas horarias (CRITICO)

El proyecto tiene un sistema de timezone establecido que las notificaciones DEBEN respetar:

**Convencion existente:**
- Horas (timeFrom, timeTo, startTime, endTime) se almacenan como UTC con fecha base `1970-01-01`. Ej: "13:00" = `1970-01-01T13:00:00.000Z`
- Fechas reales (scheduleDate, holidays) se almacenan como UTC midnight. Ej: "2026-03-19" = `2026-03-19T00:00:00.000Z`
- Cada clinica tiene un campo `timezone` (IANA, ej: `'America/Lima'`)
- `TimezoneResolverService.resolveByDoctorId(doctorId)` obtiene la zona horaria de la clinica del doctor

**Utilidades existentes a reutilizar (`shared/utils/date-time.utils.ts`):**
- `todayStartInTimezone(tz)` — inicio del dia actual en una zona horaria, como UTC midnight. Usar para calcular "manana" en el cron.
- `nowInTimezone(tz)` — hora actual wall-clock en una zona horaria.
- `dateToTimeString(date)` — convierte Date UTC base-1970 a "HH:mm".

**Reglas para notificaciones:**
1. **Cron de recordatorios**: NO usar `new Date()` para calcular "manana". Usar `todayStartInTimezone(clinicTz)` y sumar 1 dia. Agrupar citas por timezone de su clinica.
2. **Fechas en plantillas de email**: Formatear con `Intl.DateTimeFormat` usando el timezone de la clinica. Ej: `new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', dateStyle: 'long', timeStyle: 'short' })`.
3. **Hora del cron**: Usar `@Cron('0 8 * * *', { timeZone: 'America/Lima' })` para ejecucion a las 8 AM Peru. Si en el futuro hay clinicas en otros paises, el cron debera iterar por timezone distinto.
4. **Evento payloads**: Incluir `clinicTimezone: string` en cada evento para que los listeners formateen correctamente.

---

## 6. Dependencias entre fases

```
Fase 1 (Mail infra) ----> Fase 2 (Forgot password)
         |
         +--------------> Fase 3 (Transaccionales) ----> Fase 4 (Cron recordatorios)
```

Fase 2 y Fase 3 son independientes entre si, pero ambas dependen de Fase 1. Fase 4 depende de Fase 3 (plantilla de reminder) y de la migracion de `reminderSent`.

---

## 7. Desglose Detallado por Features (Checklist de Progreso)

Este desglose sirve para llevar el control y orden estricto de cada avance.

### Feature 1: Infraestructura Core de Mails (Base)
*Toda la base de conexion SMTP, templating y configuracion de eventos.*

- [ ] **1.1 Instalacion de dependencias:**
  - [ ] `pnpm add nodemailer handlebars @nestjs/schedule @nestjs/event-emitter`
  - [ ] `pnpm add -D @types/nodemailer`
- [ ] **1.2 Variables de entorno:**
  - [ ] Agregar `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` al `.env`
  - [ ] Documentar en `.env.example` con valores placeholder
- [ ] **1.3 Registro en AppModule:**
  - [ ] Importar `EventEmitterModule.forRoot()` en `AppModule`
  - [ ] Importar `ScheduleModule.forRoot()` en `AppModule`
- [ ] **1.4 Crear MailModule (`server/src/modules/mail/`):**
  - [ ] `mail.module.ts` — decorar con `@Global()` para disponibilidad en todo el proyecto
  - [ ] `MailService` — wrapper de Nodemailer, inyecta `ConfigService` para leer SMTP config, metodo `send({ to, subject, template, context })` con try/catch + `Logger.error` (nunca lanza excepcion hacia arriba)
  - [ ] `TemplateService` — carga archivos `.hbs` desde disco, compila con Handlebars, registra el partial `base` como layout
- [ ] **1.5 Layout HTML base:**
  - [ ] Crear `infrastructure/templates/layouts/base.hbs` — estructura HTML con estilos inline, logo MediClick, footer con datos de la clinica
- [ ] **1.6 Verificacion:**
  - [ ] Test manual o unitario que confirme que `MailService.send()` conecta al SMTP y envia un email de prueba

---

### Feature 2: Recuperacion de Contrasena (Forgot & Reset Password)
*Depende de Feature 1 para enviar los enlaces por correo.*

- [ ] **2.1 DTOs y validacion (Backend):**
  - [ ] `ForgotPasswordDto` — `{ email: string }` con `@IsEmail()`
  - [ ] `ResetPasswordDto` — `{ token: string, newPassword: string }` con `@MinLength(8)`
- [ ] **2.2 Endpoint `POST /auth/forgot-password`:**
  - [ ] Rate limit estricto: `@Throttle({ long: { ttl: 60000, limit: 3 } })`
  - [ ] Buscar usuario por email. Si no existe, **retornar 200 igual** (no revelar si el email existe)
  - [ ] Generar token con `crypto.randomBytes(32).toString('hex')`
  - [ ] Hashear token con `sha256` antes de guardar en Redis (key: `password-reset:{hash}`, value: `{ email, userId }`, TTL: 900s)
  - [ ] Enviar email con link: `CLIENT_URL/reset-password?token={tokenPlano}`
  - [ ] Swagger: `@ApiOperation`, `@ApiResponse`
- [ ] **2.3 Plantilla `password-reset.hbs`:**
  - [ ] Boton/link al reset, nombre del usuario, texto de expiracion (15 min)
- [ ] **2.4 Endpoint `POST /auth/reset-password`:**
  - [ ] Recibir token plano, hashear con sha256, buscar en Redis
  - [ ] Si no existe o expirado: `BadRequestException('Token invalido o expirado')`
  - [ ] Hashear nueva password con bcrypt (usar `IPasswordService` existente)
  - [ ] Actualizar password del usuario en Prisma
  - [ ] Eliminar token de Redis
  - [ ] Eliminar refresh tokens del usuario en Redis (forzar re-login en todos los dispositivos)
  - [ ] Swagger: `@ApiOperation`, `@ApiResponse`
- [ ] **2.5 Frontend — Rutas bajo `(blank-layout-pages)/`:**
  - [ ] Agregar link "Olvidaste tu contrasena?" en la pantalla de Login existente
  - [ ] Vista `/forgot-password` — formulario email, schema Zod, llamada API con Axios, mensaje de confirmacion generico ("Si el email existe, recibiras un enlace")
  - [ ] Vista `/reset-password` — leer `token` de query params, formulario password + confirmacion, schema Zod (min 8 chars, match), llamada API, redirect a `/login` en exito con toast de confirmacion
  - [ ] Actualizar `middleware.ts` para permitir acceso anonimo a estas rutas

---

### Feature 3: Correos Transaccionales Dinamicos (Event-driven)
*Se encarga de inyectar notificaciones a las Citas y las Recetas.*

- [ ] **3.1 Migracion Prisma:**
  - [ ] Agregar `PRESCRIPTION_CREATED` y `PASSWORD_RESET` al enum `NotificationType`
  - [ ] Ejecutar `pnpm run prisma:migrate` y `pnpm run prisma:generate`
- [ ] **3.2 Definir interfaces de eventos (`server/src/modules/mail/domain/events/`):**
  - [ ] `AppointmentConfirmedEvent` — `{ appointmentId, patientEmail, patientName, patientUserId, doctorName, specialty, clinicName, clinicTimezone, date, startTime, endTime }`
  - [ ] `AppointmentCancelledEvent` — `{ appointmentId, patientEmail, patientName, patientUserId, doctorName, clinicName, clinicTimezone, date, cancelReason }`
  - [ ] `PrescriptionCreatedEvent` — `{ prescriptionId, patientEmail, patientName, patientUserId, doctorName, clinicName, clinicTimezone, medications: Array<{ name, dose, frequency, instructions }> }`
  - [ ] Todos los eventos incluyen `patientUserId` (para notificacion in-app) y `clinicTimezone` (para formatear fechas en hora local)
- [ ] **3.3 Plantillas HTML:**
  - [ ] `appointment-confirmed.hbs` — datos de cita, doctor, horario, sede, especialidad
  - [ ] `appointment-cancelled.hbs` — datos + motivo de cancelacion
  - [ ] `prescription-created.hbs` — tabla de medicamentos, dosis, indicaciones del doctor
- [ ] **3.4 Listeners (dentro de `MailModule`):**
  - [ ] `AppointmentMailListener` — `@OnEvent('appointment.confirmed')` y `@OnEvent('appointment.cancelled')`, formatear fechas/horas usando `clinicTimezone` del evento con `Intl.DateTimeFormat('es-PE', { timeZone })`, enviar email via `MailService`, crear notificacion in-app via `CreateNotificationUseCase`, todo envuelto en try/catch + `Logger.error`
  - [ ] `PrescriptionMailListener` — `@OnEvent('prescription.created')`, misma logica
- [ ] **3.5 Emision de eventos desde use-cases existentes:**
  - [ ] Inyectar `EventEmitter2` en `create-appointment.use-case.ts`, emitir `appointment.confirmed` al final del execute (despues de crear la cita). Construir el payload resolviendo: email del paciente (via patient->profile->user), nombre del doctor, clinica, y **timezone de la clinica** via `TimezoneResolverService.resolveByDoctorId()` (ya inyectado en este use-case).
  - [ ] Inyectar `EventEmitter2` en `cancel-appointment.use-case.ts`, emitir `appointment.cancelled`
  - [ ] Inyectar `EventEmitter2` en `create-prescription.use-case.ts`, emitir `prescription.created`
  - [ ] Importar `MailModule` en los modulos que tengan listeners (no necesario si MailModule es `@Global()`)

---

### Feature 4: Tareas Programadas Automaticas (Cron Job Recordatorios)
*Cron autonomo que alerta de citas proximas.*

- [ ] **4.1 Migracion Prisma:**
  - [ ] Agregar `reminderSent Boolean @default(false)` al modelo `Appointments`
  - [ ] Ejecutar `pnpm run prisma:migrate` y `pnpm run prisma:generate`
- [ ] **4.2 Plantilla HTML:**
  - [ ] `appointment-reminder.hbs` — "Tu cita es manana", datos del doctor, hora, sede, indicaciones de preparacion
- [ ] **4.3 Crear SchedulerModule (`server/src/modules/scheduler/`):**
  - [ ] `scheduler.module.ts` — importar dependencias necesarias (PrismaModule ya es global)
  - [ ] Registrar en `AppModule`
- [ ] **4.4 Servicio `AppointmentReminderService`:**
  - [ ] `@Cron('0 8 * * *', { timeZone: 'America/Lima' })` — ejecucion diaria a las 8:00 AM hora Peru (independiente del TZ del servidor)
  - [ ] Calcular "manana" con `todayStartInTimezone('America/Lima')` + 1 dia. NO usar `new Date()` directamente (falla si el servidor esta en UTC). Ejemplo: `const tomorrow = new Date(todayStart.getTime() + 86400000)`
  - [ ] Query: citas con `status = CONFIRMED`, `deleted = false`, `reminderSent = false`, `schedule.scheduleDate` dentro del rango [tomorrowStart, tomorrowEnd)
  - [ ] Incluir en el query: relacion patient -> profile -> user (para email), relacion schedule -> doctor -> profile (para nombre), relacion schedule -> doctor -> clinic (para nombre sede y **timezone**)
  - [ ] Ciclo con `for...of` + try/catch individual por cita (que un fallo no detenga el lote)
  - [ ] Por cada cita: formatear fecha/hora usando el **timezone de la clinica** con `Intl.DateTimeFormat('es-PE', { timeZone: clinic.timezone })`, enviar email, crear notificacion in-app tipo `APPOINTMENT_REMINDER`, actualizar `reminderSent = true`
  - [ ] Log final: `Logger.log('Recordatorios enviados: X de Y')`
