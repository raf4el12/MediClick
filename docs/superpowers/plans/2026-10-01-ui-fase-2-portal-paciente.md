# Fase 2 — Portal del paciente (UI-09 a UI-12 y UI-29): plan de implementación

> **Para agentes:** ejecutar un ítem por vez respetando dependencias. Cada ítem es una rama y un
> PR contra `staging`. Los pasos usan checkbox (`- [ ]`) para seguimiento.

**Objetivo:** rediseñar el portal del paciente con Materio: Inicio con indicadores propios,
Mis citas con todas las acciones permitidas por estado (cancelar, reagendar, pagar, reseñar, ver
receta y comprobante), comprobante de pago y receta imprimibles, y la lista de espera del paciente
con sus ofertas de cupo.

**Arquitectura:** el backend agrega un resumen de citas del paciente (`GET /appointments/my/summary`),
expone la sede en las citas del paciente, publica los comprobantes aprobados de una cita y completa
los datos de las ofertas de cupo. En el cliente, una función pura `appointmentActions` decide qué
acciones ofrece cada cita (probada con Vitest); las pantallas usan las vistas de Materio de
dashboard, listas, factura y timeline como adaptadores visuales; reagendar reutiliza el paso de cupo
del flujo de reserva (UI-08).

**Stack:** NestJS + Prisma + PostgreSQL (backend); Next.js 16, React 19, MUI 7, Materio.0.2,
Tailwind 4, TanStack Query 5, Zod 4, recharts 3 si un indicador lo necesita, Vitest y Playwright + axe.

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) — §2, §5.3, §5.4,
§6 y filas UI-09 a UI-12 de §7 (UI-29 se agrega a §7 con este plan). Decisiones D5–D10.

**Prerrequisitos:** UI-01, UI-02 y UI-03 en `staging`. UI-11 necesita además UI-08 (paso de cupo
reutilizable) y UI-05 (días con cupos).

## Restricciones globales de la fase

- Cada ítem: `git fetch origin && git switch -c <tipo>/ui-NN-<tema> origin/staging`; PR contra `staging`.
- Vocabulario de [`CONTEXT.md`](../../../CONTEXT.md): **portal del paciente**, **cita pendiente**,
  **cita confirmada**, **plazo de pago**, **reagendamiento**, **cancelación**, **penalización por
  cancelación**, **comprobante de pago** (nunca "factura"), **reseña**, **entrada en lista de
  espera**, **oferta de cupo**.
- El paciente es multi-sede: ninguna pantalla asume una sede única; fechas y horas en la zona de
  la sede de cada cita, no en la del navegador.
- El paciente **nunca** consume `GET /payments` (lista transacciones de todas las sedes, §9 del SDD).
  Sus comprobantes salen solo de endpoints por cita con control de pertenencia.
- Cambios de reglas de negocio: si UI-10 decide uno (p. ej. reintentar un pago abandonado), se
  enumera en la spec del ítem y se actualiza `docs/domain/APPOINTMENT-CORE.md` en el mismo PR (D7).
- Reemplazo directo (D9). Verificación por PR como en §6 del SDD.

## Orden

```
UI-10 (prototipo) ──► UI-09 (backend: resumen + sede en mis citas) ──► UI-11 (Inicio + Mis citas)
UI-12 (comprobante y receta; incluye backend de comprobantes) ──────────► enlazado desde UI-11
UI-29 (lista de espera; incluye backend de ofertas) ── independiente de UI-11
```

UI-09 se implementa **después** de UI-10 aunque la tabla del SDD no lo exija: los indicadores
del contrato se confirman con el prototipo.

---

## UI-10 — Prototipo de Inicio y Mis citas

**Rama:** `prototype/ui-10-portal-paciente` desde `origin/staging`. **No se mergea**; las
decisiones entran por un PR de documentación.

**Skill:** `prototype`, rama **UI**, sub-forma **A**: variantes en `/patient?variant=` y
`/patient/appointments?variant=`, con el layout horizontal y la barra inferior de UI-03.

### Preguntas que debe responder

1. Inicio: ¿qué indicadores muestra? Candidatos: próxima cita, citas pendientes de pago con su
   plazo, reseñas pendientes, citas completadas, entradas activas en lista de espera.
2. Próxima cita: ¿tarjeta destacada con qué acciones? (reagendar, cancelar, pagar, cómo llegar,
   código QR de check-in).
3. ¿Se muestra el QR de check-in? `GET /appointments/:id/check-in-qr` existe y no tiene interfaz;
   requiere una librería de QR en el cliente.
4. Mis citas: ¿tarjetas, tabla (`InvoiceListTable` de Materio) o timeline agrupado por mes? ¿Y en móvil?
5. Filtros: Próximas / Todas / Completadas / Canceladas como pestañas o chips.
6. Detalle de una cita: panel lateral, página `/patient/appointments/[id]` o diálogo (hoy diálogo).
7. Matriz de acciones por estado (ver UI-11, Task 1) y su ubicación en la tarjeta.
8. Cancelación: ¿se avisa la penalización por cancelación tardía antes de confirmar? Hoy no hay
   endpoint que la calcule por adelantado (sería backend nuevo).
9. Reagendar: diálogo con el paso de cupo de UI-08 o navegar al flujo de reserva con la cita precargada.
10. Pago abandonado: `createPreference` rechaza una cita con una transacción `PENDING`, así que un
    paciente que cerró el checkout no puede reintentar. ¿Se permite reintentar? (cambio de regla de pagos).
11. Lista de espera (UI-29): ¿pestaña de Mis citas o entrada propia del menú?

### Datos falsos

Un paciente con citas en dos sedes de zona distinta (America/Lima y
America/Argentina/Buenos_Aires) en todos los estados: pendiente con plazo vigente, pendiente
vencida, confirmada, en curso, completada con y sin reseña, con y sin receta, cancelada con
penalización, inasistencia y una con seña (`PARTIAL`); dos entradas en lista de espera y una
oferta de cupo vigente.

### Steps

- [ ] **Step 1:** crear la rama; anotar "Tres variantes de Inicio y de Mis citas, conmutables con `?variant=`".
- [ ] **Step 2:** crear `client/src/views/patient/dashboard/prototype/*` y
  `client/src/views/patient/appointments/prototype/*` con 3 variantes estructuralmente distintas cada uno
  y el `PrototypeSwitcher` oculto en producción.
- [ ] **Step 3:** `cd client && pnpm dev`; recorrer con el usuario en escritorio y móvil.
- [ ] **Step 4:** commit y push de la rama del prototipo.
- [ ] **Step 5:** PR `docs/ui-10-decisiones` contra `staging` que complete "Decisiones de UI-10" y
  el contrato final de UI-09.

**Criterio de cierre:** las 11 preguntas respondidas, variantes elegidas, contrato de UI-09
cerrado y toda regla de negocio nueva enumerada.

### Decisiones de UI-10

_Pendiente de completar al cerrar el prototipo._

---

## UI-09 — Resumen de citas del paciente y sede en sus citas (backend)

**Rama:** `feat/ui-09-resumen-paciente` · **PR:** contra `staging`

**Skills:** `mediclick-appointment-core` (estado asistencial y estado de pago se leen por separado;
hora local de la sede de cada cita), `mediclick-tenant-safety` (paciente multi-sede: el paciente se
resuelve por `userId`, nunca por un id de la petición), `tdd` y `mediclick-core-review` al cierre.

### Contrato (provisional hasta UI-10)

```
GET /appointments/my/summary
@Auth() + @RequirePermissions('READ', 'APPOINTMENTS')

200 {
  "nextAppointment": AppointmentResponseDto | null,
  "upcomingCount": 2,
  "awaitingPaymentCount": 1,
  "earliestPaymentDeadline": "2026-10-02T15:30:00.000Z" | null,
  "completedCount": 8,
  "pendingReviewCount": 1
}
404  el usuario no tiene perfil de paciente
```

- **Próxima cita:** la `PENDING` o `CONFIRMED` no eliminada cuyo instante de inicio (fecha de
  agenda + `startTime` en la zona de la sede del médico, vía `localDateAndTimeToInstant`) es
  posterior a ahora, con el menor instante entre todas las sedes. `upcomingCount` cuenta ese conjunto.
- **Pendientes de pago:** las que `createPaymentPreference` aceptaría: `PENDING` + pago `PENDING` con
  `pendingUntil` futuro, o `CONFIRMED` + pago `PARTIAL`. `earliestPaymentDeadline` es el menor
  `pendingUntil` del primer grupo.
- **Reseñas pendientes:** citas `COMPLETED` sin `review` (relación `Appointments.review`).
- `AppointmentResponseDto` de `/appointments/my` y de este resumen agrega
  `clinic: { id, name, address, currency } | null`, derivada de la sede del médico. Hoy el paciente
  no ve en qué sede es cada cita.

### Task 1: Caso de uso del resumen (TDD)

**Files:**
- Create: `server/src/modules/appointments/application/dto/my-appointments-summary-response.dto.ts`
- Create: `server/src/modules/appointments/application/use-cases/get-my-appointments-summary.use-case.ts`
- Create: `server/src/modules/appointments/application/use-cases/get-my-appointments-summary.use-case.spec.ts`
- Modify: `server/src/modules/appointments/domain/repositories/appointment.repository.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`

**Interfaces:**
- Consumes: `IPatientRepository.findByUserId`, `localDateAndTimeToInstant`, `DEFAULT_TIMEZONE`.
- Produces: `IAppointmentRepository.findPatientSummarySource(patientId, fromDate: Date)` (citas
  `PENDING`/`CONFIRMED` desde el día anterior en UTC con sede y zona horaria, más los conteos de
  completadas y sin reseña) y `GetMyAppointmentsSummaryUseCase.execute(userId)`.

Una prueba por ciclo (`cd server && pnpm test -- get-my-appointments-summary --runInBand`):

- [ ] 1. Sin citas → `nextAppointment: null` y contadores en 0.
- [ ] 2. Dos citas el mismo día: Lima 10:00 (15:00 UTC) y Buenos Aires 11:00 (14:00 UTC) → la próxima es la de Buenos Aires.
- [ ] 3. Una cita de hoy cuyo inicio ya pasó en la zona de su sede no es próxima ni cuenta en `upcomingCount`.
- [ ] 4. Citas `CANCELLED`, `NO_SHOW`, `COMPLETED` e `IN_PROGRESS` no son próximas.
- [ ] 5. Pendiente con plazo vigente cuenta como pendiente de pago; con plazo vencido no; `CONFIRMED` + `PARTIAL` sí.
- [ ] 6. `pendingReviewCount` cuenta las completadas sin reseña y no las reseñadas.
- [ ] 7. Usuario sin perfil de paciente → `NotFoundException`.
- [ ] 8. El repositorio se consulta solo por `patientId` (sin filtro de sede): un paciente con citas en dos sedes ve ambas.

### Task 2: Sede en las citas del paciente

**Files:**
- Modify: `server/src/modules/appointments/application/dto/appointment-response.dto.ts` (`AppointmentClinicDto`)
- Modify: `server/src/modules/appointments/application/use-cases/get-my-appointments.use-case.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts` (include de la sede)
- Modify: spec existente o nuevo de `get-my-appointments` con el mapeo de `clinic`

- [ ] **Step 1 (rojo):** prueba que `/appointments/my` devuelve `clinic` con nombre, dirección y moneda de la sede del médico.
- [ ] **Step 2 (verde):** incluir la sede en la consulta y mapearla.
- [ ] **Step 3 (rojo):** pruebas de `/appointments/my?upcoming`: una cita de hoy cuyo inicio ya
  pasó en la zona de su sede no aparece; dos citas en sedes con zonas distintas salen ordenadas por
  instante de inicio (no por `createdAt` ni por la zona del navegador).
- [ ] **Step 4 (verde):** reutilizar el criterio de "próxima" de Task 1 (`localDateAndTimeToInstant`
  con la zona de cada sede) para el filtro `upcoming` y ordenar por ese instante. Así la pestaña
  "Próximas" de UI-11 y el resumen comparten la misma definición.

### Task 3: Controlador, cliente y verificación

**Files:**
- Modify: `server/src/modules/appointments/interfaces/controllers/appointment.controller.ts` → `@Get('my/summary')`
- Modify: `client/src/services/appointments.service.ts` (`getMySummary`)
- Modify: `client/src/views/appointments/types/index.ts` (`MyAppointmentsSummary`, `clinic` en `Appointment`)

- [ ] **Step 1:** `cd server && pnpm test -- appointments --runInBand && pnpm build` → PASS.
- [ ] **Step 2:** `cd client && pnpm exec tsc --noEmit` → OK.
- [ ] **Step 3:** `mediclick-core-review` sobre el diff (carriles: estado asistencial vs de pago,
  hora local de cada sede, paciente multi-sede).

---

## UI-11 — Inicio del paciente y Mis citas

**Rama:** `feat/ui-11-inicio-y-mis-citas` · **PR:** contra `staging`

**Skills:** `tdd` (seams: `appointmentActions` con Vitest; las dos pantallas con el arnés §5.3).

### Componentes de Materio

Rutas de la v5 local (`/home/rafael/materio-mui-nextjs-admin-template-ts/full-version/src/`);
**v5 local, con la adaptación del Paso 0 de la Fase 0** y elegir según las decisiones de UI-10:

| Uso | Ruta en la plantilla |
|---|---|
| Saludo | `views/pages/widget-examples/gamification/WelcomeBack.tsx` o `views/dashboards/ecommerce/Congratulations.tsx` |
| Indicadores | `components/card-statistics/HorizontalWithSubtitle.tsx` |
| Próxima cita y lista breve | `views/dashboards/crm/MeetingSchedule.tsx` |
| Lista de citas (escritorio) | `views/apps/invoice/list/InvoiceListTable.tsx` (patrón TanStack Table con chips de estado) |
| Pestañas de filtro | `@core/components/mui/TabList.tsx` |
| Menú de acciones | `@core/components/option-menu/index.tsx` |
| Confirmar cancelación | `components/dialogs/confirmation-dialog/index.tsx` |
| Historial de la cita | `views/apps/user/view/user-right/overview/UserActivityTimeline.tsx` |

### Files

- Create: `client/src/views/patient/appointments/functions/appointmentActions.ts` + `appointmentActions.test.ts`
- Modify: `client/src/views/patient/dashboard/index.tsx` → se reescribe sobre
  `components/{WelcomeCard,PatientStats,NextAppointmentCard,RecentAppointments}.tsx`
- Modify: `client/src/views/patient/appointments/index.tsx` → se reescribe sobre
  `components/{AppointmentList,AppointmentCard,AppointmentDetail,CancelAppointmentDialog,RescheduleAppointmentDialog}.tsx`
- Modify: `client/src/views/reviews/components/ReviewDialog.tsx` → estética Materio, mismo contrato
- Modify: `client/src/app/(patient)/patient/page.tsx`, `client/src/app/(patient)/patient/appointments/page.tsx`
- Create (solo si UI-10 lo decide): `components/CheckInQrDialog.tsx` + dependencia de QR cuyo
  `peerDependencies` admita `react@^19`
- Create: `client/tests/e2e/patient-home.spec.ts`, `client/tests/e2e/patient-appointments.spec.ts`

### Interfaces

- Consumes: `GET /appointments/my/summary` y `clinic` en `/appointments/my` (UI-09); `GET /appointments/my`;
  `PATCH /appointments/:id/cancel`; `PATCH /appointments/:id/reschedule`
  (`{ newScheduleId, startTime, endTime, reason? }`); `GET /schedules/available-days` (UI-05) y
  `GET /schedules/time-slots`; `POST /payments/preferences`; `GET /reviews/my`, `POST /reviews`;
  `GET /prescriptions/my/appointment/:id` (para saber si hay receta); `SlotStep` de
  `client/src/views/booking/components/` (UI-08).
- Reagendar limita el destino al mismo médico y especialidad de la cita: el backend hoy acepta un
  `newScheduleId` de otro médico o especialidad (pregunta abierta del SDD §10), y la interfaz no
  debe depender de esa laxitud.
- Produces: `appointmentActions(appointment, ctx: { now: Date; reviewed: boolean }) → AppointmentAction[]`
  con `AppointmentAction = 'pay' | 'reschedule' | 'cancel' | 'review' | 'prescription' | 'receipt' | 'checkInQr'`.

### Task 1: Matriz de acciones (TDD con Vitest)

Una prueba por ciclo (`cd client && pnpm test -- appointmentActions`); las reglas reflejan las del
servidor para no ofrecer acciones que el backend rechazará:

- [ ] 1. `PENDING` + pago `PENDING` con plazo vigente → `pay`, `reschedule`, `cancel`.
- [ ] 2. `PENDING` con plazo vencido → no ofrece `pay`.
- [ ] 3. `CONFIRMED` + `PARTIAL` → `pay` (saldo), `reschedule`, `cancel`.
- [ ] 4. `CONFIRMED` + `PAID` → `reschedule`, `cancel`, `receipt` (y `checkInQr` si UI-10 lo decide).
- [ ] 5. Una cita cuyo inicio ya pasó en la zona de su sede no ofrece `reschedule` ni `cancel`.
- [ ] 6. `COMPLETED` sin reseña → `review`, `prescription`; reseñada → sin `review`.
- [ ] 7. `CANCELLED` o `NO_SHOW` → solo `receipt` si hubo un pago aprobado.
- [ ] 8. `IN_PROGRESS` → ninguna acción del paciente.

### Task 2: Pantallas (rojo → verde con Playwright)

- [ ] **Step 1 (rojo):** `patient-home.spec.ts` (`actor: 'PATIENT'`, escritorio y móvil): saludo,
  indicadores tomados del resumen, próxima cita con sede y hora local, accesos a Reservar y Mis
  citas, `expectAccessible`.
- [ ] **Step 2 (rojo):** `patient-appointments.spec.ts`:
  1. pestañas Próximas / Todas / Completadas piden `/appointments/my` con el filtro esperado;
  2. cancelar: diálogo con motivo → `PATCH /appointments/:id/cancel` → aviso de éxito y la lista se refresca;
  3. reagendar: elegir día y cupo → `PATCH /appointments/:id/reschedule` con `newScheduleId`,
     `startTime` y `endTime`; un 409 vuelve a mostrar los cupos con el aviso de cupo tomado;
  4. pagar: `POST /payments/preferences` → navega al `initPoint`; un 400 "preferencia pendiente"
     muestra el mensaje decidido en UI-10;
  5. reseñar una completada → `POST /reviews` → la acción desaparece;
  6. receta y comprobante enlazan a las rutas de UI-12;
  7. `expectAccessible` en lista, detalle y cada diálogo.
- [ ] **Step 3:** `cd client && pnpm exec playwright test tests/e2e/patient-*` → FAIL.
- [ ] **Step 4:** implementar Inicio y Mis citas con los componentes de Materio y `appointmentActions`.
- [ ] **Step 5:** repetir Step 3 → PASS.
- [ ] **Step 6:** borrar el código reemplazado de los dos monolitos (diálogos inline, `canCancel`,
  `isCompleted`, el cálculo de "próxima cita" por `createdAt`) y comprobar con `rg` que no quedan referencias.
- [ ] **Step 7:** `cd client && pnpm test && pnpm exec tsc --noEmit && pnpm build && pnpm exec eslint <archivos tocados> && pnpm test:a11y` → PASS.

---

## UI-12 — Comprobante de pago y receta imprimibles

**Rama:** `feat/ui-12-comprobante-y-receta` · **PR:** contra `staging`

**Skills:** `mediclick-tenant-safety` y `mediclick-appointment-core` para la Task 1 (control de
pertenencia sobre pagos), `tdd`, y `mediclick-core-review` al cierre.

**Hueco detectado:** `GET /payments/appointment/:id` devuelve solo la **última** transacción. Una cita
con seña y saldo tiene dos transacciones aprobadas, y si la última es un reintento `PENDING` el
comprobante aprobado queda oculto. El comprobante necesita las transacciones aprobadas de la cita.
La receta no tiene hueco: `GET /prescriptions/my/appointment/:id` y su `/pdf` ya existen para el paciente.

### Task 1: Comprobantes aprobados de una cita (backend, TDD) ✅

Hecho en la rama `feat/ui-12-comprobantes-backend`, antes que las vistas imprimibles (dependen de UI-03).

**Files:**
- Create: `server/src/modules/payments/application/use-cases/list-appointment-receipts.use-case.ts` + `.spec.ts`
- Modify: `server/src/modules/payments/interfaces/controllers/payment.controller.ts` → `@Get('appointment/:id/receipts')`
- Modify: `client/src/services/payments.service.ts` (`getReceipts`) y sus tipos

**Interfaces:**
- Consumes: `AppointmentAccessPolicy.authorize(actor, 'READ_PAYMENT', ...)` (mismo armado que
  `GetPaymentByAppointmentUseCase`), `ITransactionRepository.findByAppointmentId`.
- Produces: `GET /payments/appointment/:id/receipts` → `PaymentResponseDto[]` solo con transacciones
  `PAID`, ordenadas por `paidAt`; `@RequirePermissions('READ', 'APPOINTMENTS')`.

- [ ] 1. El paciente dueño recibe sus transacciones aprobadas (seña y saldo), sin las `PENDING` ni `FAILED`.
- [ ] 2. Otro paciente → rechazado por la política (mismo error que el endpoint existente).
- [ ] 3. Personal de otra sede → rechazado; personal de la sede de la cita → permitido.
- [ ] 4. Cita eliminada o inexistente → `NotFoundException`.

Comando: `cd server && pnpm test -- list-appointment-receipts --runInBand` (FAIL → PASS por prueba).

### Task 2: Vistas imprimibles

**Componentes de Materio** ((v5 local, con la adaptación del Paso 0 de la Fase 0)): `views/apps/invoice/preview/{index,PreviewCard,PreviewActions}.tsx`
y `views/apps/invoice/preview/print.css`; ruta de referencia `app/[lang]/(dashboard)/(private)/apps/invoice/preview/[id]/page.tsx`.

**Files:**
- Create: `client/src/app/(patient)/patient/appointments/[id]/comprobante/page.tsx`
- Create: `client/src/app/(patient)/patient/appointments/[id]/receta/page.tsx`
- Create: `client/src/views/patient/printables/{ReceiptPreview,PrescriptionPreview,PrintActions}.tsx` + `print.css`
- Modify: `client/src/views/patient/appointments/index.tsx` → el diálogo de receta actual se reemplaza por el enlace a la vista imprimible
- Create: `client/tests/e2e/patient-printables.spec.ts`

**Contenido:**
- Comprobante: sede (nombre y dirección), paciente, médico, especialidad, fecha y hora en la zona
  de la sede, monto con la moneda de la transacción, método, fecha de pago, identificador de la
  transacción y la leyenda "Constancia de pago; no es un documento fiscal".
- Receta: datos de la cita, ítems (medicamento, dosis, frecuencia, duración, notas), indicaciones y
  vigencia; se conserva "Descargar PDF" (`/prescriptions/my/appointment/:id/pdf`).

- [ ] **Step 1 (rojo):** `patient-printables.spec.ts` (`actor: 'PATIENT'`): el comprobante muestra
  los datos y la leyenda; con dos transacciones aprobadas muestra ambas; sin pagos aprobados muestra
  un estado vacío; la receta muestra sus ítems; el botón Imprimir llama a `window.print`; en
  `emulateMedia({ media: 'print' })` se ocultan navegación y barra inferior; `expectAccessible`.
- [ ] **Step 2:** implementar las vistas → PASS.
- [ ] **Step 3:** `rg -n -i "factura|invoice" client/src/views/patient` → sin textos visibles.
- [ ] **Step 4:** verificación completa del cliente y `pnpm test -- payments --runInBand && pnpm build` en el servidor.

---

## UI-29 — Lista de espera del paciente

**Rama:** `feat/ui-29-lista-de-espera-paciente` · **PR:** contra `staging`

**Skills:** `mediclick-appointment-core` (ofertas de cupo exclusivas y temporales; aceptar crea una
cita pendiente con plazo de pago), `tdd`, y `mediclick-core-review` si se toca el backend.

**Alcance:** `/patient/waitlist` (hoy `client/src/app/(menu)/patient/waitlist/page.tsx` →
`client/src/views/waitlist/index.tsx`, con `components/{JoinWaitlistDialog,OfferCard,WaitlistEntryCard}.tsx`).
Pasa a `client/src/app/(patient)/patient/waitlist/page.tsx`. La vista del personal
(`views/waitlist/staff`) no es parte de este ítem.

**Huecos detectados:**
- `WaitlistOfferResponseDto` envía `startTime`/`endTime` como `HH:mm` (`toOfferDto` usa
  `dateToTimeString`) y no incluye la fecha del cupo, el médico ni la sede. `OfferCard.formatSlot`
  hace `new Date('09:00')` y muestra fechas inválidas: la oferta no dice para qué día es.
- La entrada en lista de espera toma su sede de `specialty.clinicId` (`join-waitlist.use-case.ts:84`):
  con una especialidad global queda sin sede, aunque `CONTEXT.md` define la entrada por sede. Es una
  pregunta de dominio: se plantea al usuario, no se decide en este ítem.

### Task 1: Datos completos de la oferta de cupo (backend, TDD)

**Files:**
- Modify: `server/src/modules/waitlist/application/dto/waitlist-response.dto.ts`
- Modify: `server/src/modules/waitlist/application/dto/waitlist-dto.mapper.ts`
- Modify: `server/src/modules/waitlist/domain/interfaces/waitlist-data.interface.ts` y el repositorio de ofertas (include de `schedule` con fecha, médico y sede)
- Create/Modify: spec del mapper o del use case de "mis ofertas"

- [ ] 1. La oferta incluye `scheduleDate` (`YYYY-MM-DD`), `doctorName`, `clinic: { id, name, timezone }` y conserva `startTime`/`endTime` en `HH:mm`.
- [ ] 2. La entrada incluye `clinicName` (nulo si no tiene sede).
- [ ] 3. `cd server && pnpm test -- waitlist --runInBand && pnpm build` → PASS.

### Task 2: Pantalla

**Componentes de Materio** ((v5 local, con la adaptación del Paso 0 de la Fase 0)): tarjetas con cuenta regresiva sobre
`components/card-statistics/HorizontalWithSubtitle.tsx`, `@core/components/option-menu/index.tsx`
para acciones de la entrada y `components/dialogs/confirmation-dialog/index.tsx` para salir de la lista.

**Files:**
- Modify: `client/src/views/waitlist/index.tsx`, `components/{JoinWaitlistDialog,OfferCard,WaitlistEntryCard}.tsx`, `types.ts`
- Move: la página a `client/src/app/(patient)/patient/waitlist/page.tsx` (si UI-03 no lo hizo)
- Create: `client/tests/e2e/patient-waitlist.spec.ts`

- [ ] **Step 1 (rojo):** `patient-waitlist.spec.ts` (`actor: 'PATIENT'`, escritorio y móvil):
  1. las entradas muestran especialidad, médico opcional, sede, rango de fechas y preferencia horaria;
  2. una oferta de cupo muestra fecha, hora en la zona de la sede, médico, sede y la cuenta
     regresiva hasta `expiresAt`; al vencer se deshabilita y se vuelve a pedir `/waitlist/my/offers`;
  3. aceptar → `POST /waitlist/offers/:id/accept` → `POST /payments/preferences` → navega al
     `initPoint`; un 409 (oferta tomada o vencida) muestra el aviso y refresca;
  4. rechazar → `POST /waitlist/offers/:id/reject` → desaparece;
  5. unirse con el diálogo (validación Zod de `waitlist.schema.ts`) → `POST /waitlist`;
  6. salir de la lista con confirmación → `DELETE /waitlist/:id`;
  7. `expectAccessible` en la página y en cada diálogo.
- [ ] **Step 2:** implementar con los componentes de Materio y el vocabulario de `CONTEXT.md`
  (**entrada en lista de espera**, **oferta de cupo**, **prioridad de espera**).
- [ ] **Step 3:** verificación completa del cliente → PASS.
