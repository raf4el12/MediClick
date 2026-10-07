# SDD — Migración de la interfaz de MediClick a Materio

- **Estado:** En implementación; los ítems terminados llevan ✅ en la tabla del §7
- **Fecha:** 2026-10-01
- **Alcance:** cliente Next.js completo y los endpoints de backend que piden los flujos rediseñados
- **Decisión de base:** [ADR-0003](./adr/0003-materio-sistema-de-diseno.md)
- **Investigación:** [`docs/research/2026-10-01-materio-stack-compatibility.md`](./research/2026-10-01-materio-stack-compatibility.md)
- **Fuentes de verdad:** [`CONTEXT.md`](../CONTEXT.md),
  [`APPOINTMENT-CORE.md`](./domain/APPOINTMENT-CORE.md), código, tests y
  [`schema.prisma`](../server/prisma/schema.prisma)
- **Planes por fase:** `docs/superpowers/plans/2026-10-01-ui-fase-<N>-<tema>.md`

## 1. Resumen

El cliente es hoy un derivado recortado de Materio: conserva `@core` y `@layouts`, pero tiene un
menú propio de 502 líneas, 8 de los 37 overrides de tema, ningún uso de Tailwind y flujos que
crecieron como pantallas monolíticas (`patient/book` 660 líneas, `CreateAppointmentDialog` 881,
`patient/appointments` 746, `AppointmentWorkspaceDialog` 600). Este SDD reemplaza toda la interfaz
por Materio (v5.0.0 adaptada a MUI 7 / React 19, ADR-0003) y rediseña los siete flujos principales en 8 fases y 31 ítems `UI-NN`.

La migración no es solo visual. Los flujos rediseñados necesitan datos que la API REST no expone
hoy (cupos por rango, agenda agregada, indicadores, perfil público), así que cada fase incluye los
endpoints que su interfaz consume, entregados antes que la pantalla.

## 2. Estado actual verificado

| Hallazgo | Evidencia | Impacto en el plan |
|---|---|---|
| La API es REST; GraphQL solo expone `patientRecord` y `myPatientRecord` | `server/src/schema.gql`, `client/src/services/*.service.ts` | Los mocks de prueba simulan REST; `CLAUDE.md` se corrige en UI-01 |
| `time-slots` responde un solo día | `schedule.controller.ts:100` | Marcar un mes en el datepicker cuesta ~30 llamadas → UI-05 |
| `time-slots` solo descuenta citas de su propio bloque de agenda: un cupo que se solapa con una cita de otra especialidad del mismo médico figura libre y la reserva luego lo rechaza | `GetAvailableTimeSlotsUseCase` | UI-05 corrige el cálculo compartido (§5.2) |
| `RescheduleAppointmentUseCase` acepta un `newScheduleId` de otro médico o especialidad | `server/src/modules/appointments` | Pregunta abierta (§10) |
| Bloqueos y feriados no filtran por rango; DOCTOR no tiene `READ:HOLIDAYS` | `schedule-block.controller.ts:61`, `holiday.controller.ts:81`, `server/prisma/rbac-policy.ts` | La agenda del médico daría 403 → UI-13 |
| No hay indicadores para médico ni paciente | `report.controller.ts` exige `READ:REPORTS` | UI-09 y UI-13 |
| Todos los endpoints exigen `@Auth()` | módulos `doctors` y `reviews` | Perfil público requiere endpoints `@Public` → UI-26 |
| La moderación de reseñas existe pero no acota por sede: un ADMIN puede ocultar reseñas de otra sede | `set-review-visibility.use-case.ts`, `prisma-review.repository.ts:76` | UI-24 incluye backend con alcance de sede |
| `/schedules` ya tiene un calendario propio (`ScheduleCalendar`, ~643 líneas) | `client/src/views/schedules` | UI-19 lo reemplaza con la capa de agenda |
| Hay pantallas sin flujo asignado: lista de espera (personal y paciente), notas clínicas, recetas, historia médica, cuenta, perfil y notificaciones | `client/src/app/(menu)` | UI-28 a UI-31 |
| El endpoint de pago por cita devuelve solo la última transacción: con seña y saldo, o con un reintento pendiente, el comprobante aprobado queda oculto | `GET /payments/appointment/:id` | UI-12 agrega `GET /payments/appointment/:id/receipts`; la receta ya tiene endpoint y PDF |
| La oferta de cupo de lista de espera solo trae `startTime`/`endTime` sin fecha, médico ni sede, y la tarjeta hace `new Date('09:00')`; la entrada toma la sede de `specialty.clinicId` y queda sin sede con una especialidad global | `client/src/views/patient` (`OfferCard`), módulo `waitlist` | UI-29 incluye backend; la sede de la entrada es pregunta abierta (§10) |
| `GET /payments` no acota al paciente, y la pantalla `/payments` es alcanzable por URL para un paciente | `prisma-transaction.repository.ts:111`, `Navigation.tsx` (`staffOnly` solo oculta el menú) | Backend fuera de alcance (§9); UI-25 deja `/payments` dentro de `(staff)` |
| El cliente solo prueba `/` y `/login` con axe, sin pruebas unitarias | `client/tests/a11y/` | UI-02 agrega Vitest y el arnés REST |

## 3. Objetivos y no objetivos

### 3.1 Objetivos

- Una sola base visual: Materio v5 adaptada con Tailwind 3.4, tema MUI con variables CSS y primario
  `#7E4EE6` que cumple WCAG AA.
- Layout por actor: vertical para el personal de sede; horizontal con barra inferior móvil para
  el portal del paciente.
- Rediseñar los siete flujos: reserva del paciente, creación administrativa, jornada del médico,
  mis citas, disponibilidad visual, registro y expediente.
- Agregar comprobante y receta imprimibles, indicadores de médico y paciente, perfil público del
  médico y moderación de reseñas.
- Que cada pantalla migrada tenga prueba de navegador con REST simulado y escaneo axe, y que la
  lógica con estado del flujo de reserva y de la agenda esté probada con Vitest.

### 3.2 No objetivos

- Búsqueda global y verificación en dos pasos (SDD propio, §9).
- Internacionalización: la interfaz sigue solo en español.
- Corregir el alcance de `GET /payments` (pertenece al SDD de hardening, §9).
- Mantener pantallas viejas en paralelo: cada PR reemplaza la pantalla directamente.

## 4. Decisiones

| # | Decisión | Origen |
|---|---|---|
| D1 | Base Materio v5.0.0 local (`~/materio-mui-nextjs-admin-template-ts/full-version`), adaptada al copiar cada archivo (Grid2→Grid, sin i18n/next-auth/valibot); la v6 no está disponible | ADR-0003 (enmienda 2026-10-06) |
| D2 | Tailwind 3.4 (LTS) + `tailwindcss-logical@3` + plugin propio de Materio; Tailwind solo para layout y espaciado, color y estado por tema MUI | ADR-0003 (enmienda 2026-10-06) |
| D3 | Primario `#7E4EE6`; los presets del customizer se reemplazan por presets AA | ADR-0003 |
| D4 | Gráficos con recharts 3; ApexCharts excluido | ADR-0003 |
| D5 | Se rediseñan los flujos, no solo su aspecto | Usuario |
| D6 | El backend puede cambiar sin límite, incluidas mutaciones nuevas y reglas de negocio | Usuario |
| D7 | Una regla de negocio que cambie se lista en la spec del ítem y actualiza `APPOINTMENT-CORE.md` en el mismo PR | `AGENTS.md` |
| D8 | Prototipo descartable (skill `prototype`) antes de implementar reserva, portal del paciente, jornada del médico y disponibilidad visual | Usuario |
| D9 | Reemplazo directo, sin rutas paralelas ni feature flags | Usuario (no hay usuarios reales) |
| D10 | Cada ítem en su rama desde `origin/staging` actualizado; PR contra `staging`; `staging → main` al cerrar cada fase | Usuario |
| D11 | Se mantienen Zod, la autenticación JWT propia, `middleware.ts` y el sistema de accesibilidad | Usuario |

## 5. Diseño de módulos

Cuatro módulos concentran la lógica que hoy está repartida en pantallas monolíticas. Cada uno
expone una interfaz pequeña; las pantallas de Materio son adaptadores visuales sobre ella.

### 5.1 Flujo de reserva (`client/src/views/booking/model`)

Hoy dos implementaciones independientes (`patient/book/index.tsx` y `useAppointmentForm.ts`)
repiten selección, invalidación en cascada, validación y armado del comando. Se reemplazan por un
núcleo puro sin I/O (dependencia en proceso) y un hook que lo conecta a los datos.

```ts
type BookingMode = 'online' | 'administrative'; // Reserva en línea | creación administrativa

initialBooking(mode: BookingMode, preset?: { clinicId?: number; specialtyId?: number; doctorId?: number }): BookingState
bookingReducer(state: BookingState, event: BookingEvent): BookingState
describeBooking(state: BookingState): BookingView   // pasos, paso activo, canAdvance, faltantes, resumen
toBookingCommand(state: BookingState): BookingCommand // discriminado por modo
```

- **Invariantes:** cambiar una selección invalida todo lo que depende de ella (sede → especialidad
  → médico → fecha → cupo); los pasos dependen del modo (`online`: sede, especialidad, médico,
  cupo, resumen; `administrative`: especialidad, médico, cupo, paciente, resumen); no se puede
  avanzar con un paso incompleto; `toBookingCommand` falla si el estado no está completo; un
  `preset` (p. ej. `/patient/book?doctorId=` desde el perfil público) salta los pasos que resuelve
  y se descarta si es inconsistente con el resto de la selección.
- **Hook:** `useBooking(mode)` devuelve `{ view, dispatch, options, submit }`. `options` agrupa
  sedes, especialidades, médicos, días con cupos (UI-05), cupos del día y pacientes. `submit()`
  devuelve un resultado (`{ kind: 'redirect', url }` en línea, `{ kind: 'created', appointment }`
  administrativa); la pantalla decide la navegación.
- **Pruebas:** Vitest sobre las cuatro funciones del núcleo (TDD); Playwright con REST simulado
  sobre el hook y la pantalla. No se introduce un puerto de red: solo habría un adaptador.

### 5.2 Capa de agenda (`client/src/views/agenda`)

La jornada del médico y la disponibilidad visual pintan el mismo dominio sobre FullCalendar.

```ts
useAgenda(scope: { doctorId: number } | { clinicId: number }, range: DateRange): {
  events: AgendaEvent[]; isLoading: boolean;
  reschedule(appointmentId: number, target: SlotTarget): Promise<void>;
}
toAgendaEvents(agenda: AgendaSnapshot): AgendaEvent[]          // puro
resolveDropTarget(agenda: AgendaSnapshot, appointmentId: number, start: Date): SlotTarget | null // puro
```

- **Backend:** un único `GET /agenda` (UI-13) devuelve cupos, citas, bloqueos de agenda, feriados
  que la afectan y la zona horaria de la sede. Concentra en el servidor el alcance de sede y los
  permisos, en lugar de tres llamadas con permisos distintos. Se protege con un permiso nuevo
  `READ:AGENDA` (DOCTOR y RECEPTIONIST) en lugar de dar `READ:HOLIDAYS` al médico, y filtra
  feriados por sede de forma explícita (el filtro automático no actúa con `clinicId` nulo).
- **Cálculo de cupos compartido:** UI-05 y UI-13 necesitan el cálculo hoy privado de
  `GetAvailableTimeSlotsUseCase`; el ítem que llegue primero lo extrae a un módulo de dominio
  reutilizable, contando todas las citas del médico y no solo las de su bloque de agenda.
- **Invariantes:** las horas se interpretan en la zona horaria de la sede, nunca en la del
  navegador; bloqueos y feriados se pintan como fondo no arrastrable; una cita solo se suelta
  sobre un cupo libre del mismo médico y especialidad (`resolveDropTarget` devuelve `null` en
  otro caso y FullCalendar revierte).
- **Pruebas:** Vitest sobre las dos funciones puras (zona horaria, bloqueo de día completo vs
  intervalo, feriado global vs de sede, destino inválido).

### 5.3 Arnés de pruebas de navegador (`client/tests/support`)

```ts
test.use({ actor: 'PATIENT' | 'DOCTOR' | 'RECEPTIONIST' | 'ADMIN' })
api.on('GET /appointments', fixtureOrHandler)   // sobre page.route y NEXT_PUBLIC_API_URL
expectAccessible(page)                          // axe WCAG 2.0/2.1 A y AA
```

- El fixture `actor` siembra la cookie `accessToken` que lee `middleware.ts`, el estado persistido
  `localStorage['persist:auth']` (de ahí salen `user.permissions`, no del JWT) y los fixtures REST
  por defecto de ese actor; cada prueba sobrescribe solo los endpoints que le importan.
- `POST /graphql` se enruta por el primer campo raíz de la query (`api.on('GQL patientRecord', …)`),
  porque `client/src/libs/graphql.ts` no envía `operationName`.
- Una llamada REST o una operación GraphQL sin fixture falla la prueba con su identificación, para
  que ningún test dependa de un backend real.
- `page.route` no intercepta `fetch` hechos en el servidor de Next; las páginas públicas con SSR
  (UI-27) usan un servidor stub propio.

### 5.4 Layout por actor (`client/src/app/(staff)`, `(patient)`, `(shared)`)

- Tres grupos de rutas: `(staff)` usa el layout vertical de Materio; `(patient)` usa el horizontal
  y una barra inferior en móvil (Inicio, Reservar, Mis citas, Perfil); `(shared)` aloja las URLs
  que usan ambos actores (`/notifications`, `/settings/account`) con un `ActorShell` que elige el
  layout según el rol. Las URLs no cambian.
- `navigationFor(actor, can)` (puro) reemplaza el arreglo de `Navigation.tsx` y el mapa de títulos
  por ruta de `Navbar.tsx`: devuelve las secciones del menú filtradas por permiso, el título de
  cada ruta y, para el paciente, los accesos de la barra inferior. Se prueba con Vitest contra
  `client/tests/fixtures/role-permissions.json`; una prueba del servidor compara ese archivo con
  `ROLE_PERMISSIONS` de `rbac-policy.ts` (que el cliente no puede importar por depender de Prisma).

## 6. Restricciones globales

- **Ramas:** `git fetch origin && git switch -c <tipo>/ui-NN-<tema> origin/staging`. PR contra
  `staging`. Nunca desde el `main` local.
- **Vocabulario:** la interfaz usa los términos de `CONTEXT.md` (cupo, cita, reserva en línea,
  agenda, jornada, comprobante de pago, reseña oculta). Ningún texto visible dice "slot",
  "turno", "factura" ni "invoice".
- **Accesibilidad:** cada pantalla migrada pasa axe WCAG 2.0/2.1 A y AA y conserva las opciones
  del customizer de accesibilidad.
- **Estilos:** Tailwind solo para layout y espaciado; color, tipografía y estado por el tema MUI.
  Como en Materio, Tailwind va sin preflight y con `important: '#__next'`, sin `enableCssLayer`;
  el reset sin capa de `globals.css` se elimina.
- **Dependencias:** versiones fijadas según la investigación (`@mui/lab@7.0.1-beta.21`,
  `react-datepicker@^7.6`, `react-toastify@10`); nunca `@latest` de `@mui/*` (apunta a 9.x).
  `classnames`, `react-use`, `@floating-ui/react` y `@mui/utils` como dependencias directas.
- **Backend:** todo ítem que toque citas, cupos, disponibilidad, pagos o lista de espera usa
  `mediclick-appointment-core`; todo lo que toque `clinicId`, permisos o repositorios usa
  `mediclick-tenant-safety`; ambos cierran con `mediclick-core-review`. Fechas con
  `shared/utils/date-time.utils.ts` y la zona horaria de la sede.
- **Verificación por PR:** `tsc --noEmit`, `pnpm build`, eslint sobre los archivos tocados
  (el lint completo arrastra deuda previa), `pnpm test` (Vitest) y `pnpm test:a11y`; en backend,
  `pnpm test -- <patrón> --runInBand` y `pnpm build`. La compuerta pre-commit aplica igual. El
  job `client` del CI corre `pnpm run lint` completo y sigue rojo por deuda previa; ese gate es
  SDD-023 del SDD de hardening, no de esta migración, y ningún PR de UI agrega errores nuevos.
- **Código heredado:** lo que un ítem reemplaza se borra en ese mismo PR.

## 7. Fases y backlog

| ID | Fase | Entrega y criterio de aceptación | Backend | Depende de | Skills |
|---|---|---|---|---|---|
| UI-01 | 0 Base | Fundación Materio (v5 adaptada): dependencias, Tailwind 3.4, tema con `colorSchemes` + `cssVariables` y `#7E4EE6` (el modo alto contraste pasa a ser una transformación de ambos esquemas), 37 overrides, `@core`/`@layouts`/`@menu`, `libs/styles`; `CLAUDE.md` refleja el stack real | — | UI-02 | `codebase-design` |
| UI-02 ✅ | 0 Base | Vitest en el cliente y arnés Playwright (§5.3) con puerto propio (3100); CI corre ambos. Va antes que UI-01 para que el cambio de base visual ya tenga pruebas | — | — | `tdd` |
| UI-03 | 0 Base | Layout por actor (§5.4), dropdowns de navbar, toastify en lugar de `SuccessSnackbar`, customizer Materio con sección de accesibilidad | — | UI-01, UI-02 | `codebase-design` + `tdd` |
| UI-04 | 0 Base | Login, recuperar y restablecer contraseña en versión v2; respuesta al recordatorio (`/appointment/respond`); páginas 401/404/500 (la 500 se adapta desde la 404; `RoleGuard` deja de redirigir en silencio y muestra 401) | — | UI-03 | `tdd` |
| UI-05 ✅ | 1 Reserva | `GET` de días con cupos por rango (médico, especialidad, desde/hasta) que descuenta feriados, bloqueos y todas las citas del médico; extrae o reutiliza el cálculo de cupos compartido (§5.2) | Sí | — | `mediclick-appointment-core` + `tdd` |
| UI-06 | 1 Reserva | Prototipo del flujo de reserva en ambos modos y decisiones de UX registradas | — | UI-03 | `prototype` |
| UI-07 | 1 Reserva | Núcleo del flujo de reserva (§5.1) con Vitest | — | UI-02, UI-06 | `tdd` |
| UI-08 | 1 Reserva | Pantalla de reserva con wizard, custom inputs, datepicker con días disponibles, pago y confirmación; reemplaza `patient/book` y `CreateAppointmentDialog` | — | UI-05, UI-07 | `tdd` |
| UI-09 | 2 Portal | Resumen del paciente (`GET /appointments/my/summary`), sede en sus citas y `upcoming` calculado con la zona de cada sede | Sí | UI-10 | `mediclick-appointment-core` + `mediclick-tenant-safety` + `tdd` |
| UI-10 | 2 Portal | Prototipo de Inicio y Mis citas | — | UI-03 | `prototype` |
| UI-11 | 2 Portal | Inicio del paciente y Mis citas (cancelar, reagendar, pagar, reseñar) | — | UI-09, UI-10, UI-08 | `tdd` |
| UI-12 | 2 Portal | Comprobante de pago y receta imprimibles; comprobantes de todas las transacciones aprobadas de la cita (backend ✅; vistas imprimibles pendientes de UI-03) | Sí | UI-03 | `mediclick-appointment-core` + `tdd` |
| UI-29 | 2 Portal | Lista de espera del paciente: entradas y ofertas de cupo con fecha, médico, sede y vencimiento | Sí | UI-03 | `mediclick-appointment-core` + `tdd` |
| UI-13 | 3 Jornada | `GET /agenda` por rango (§5.2) con alcance de sede, permiso `READ:AGENDA` en la matriz RBAC e indicadores del médico; reutiliza el cálculo de cupos compartido | Sí | — | `mediclick-appointment-core` + `mediclick-tenant-safety` + `tdd` |
| UI-14 | 3 Jornada | Prototipo de jornada y agenda | — | UI-03 | `prototype` |
| UI-15 | 3 Jornada | Capa de agenda (§5.2) y adaptador FullCalendar con estilo Materio | — | UI-02, UI-13 | `codebase-design` + `tdd` |
| UI-16 | 3 Jornada | Jornada del médico: inicio, agenda, espacio de atención y reagendamiento por arrastre | — | UI-14, UI-15 | `tdd` |
| UI-17 | 4 Disponibilidad | Prototipo de disponibilidad visual | — | UI-15 | `prototype` |
| UI-18 | 4 Disponibilidad | Mutaciones que pida el prototipo (p. ej. bloqueo desde una selección de rango), sobre la restricción unificada de SDD-010 | Sí | UI-17 | `mediclick-appointment-core` + `tdd` |
| UI-19 | 4 Disponibilidad | Reglas, bloqueos, feriados y cupos generados sobre el calendario; reemplaza `WeeklyScheduleConfigurator`, las listas y el `ScheduleCalendar` de `/schedules` | — | UI-18 | `tdd` |
| UI-20 | 5 Registro | Rediseño del registro del paciente, que ya tiene 4 pasos, con el wizard de Materio | — | UI-04 | `tdd` |
| UI-21 | 5 Expediente | Expediente con la vista de usuario de Materio sobre `patientRecord` (el arnés enruta su GraphQL) | — | UI-02, UI-03 | `tdd` |
| UI-31 | 5 Cuenta | Cuenta y notificaciones en el grupo `(shared)`: `/profile` y `/patient/profile` editan los mismos datos que `/settings/account`, se unifican ahí y pasan a redirigir | — | UI-03 | `tdd` |
| UI-22 | 6 Admin | Tablas de gestión con filtros, tarjetas y drawer (pacientes, médicos, usuarios, sedes, especialidades, categorías); un PR por entidad si hace falta | — | UI-03 | `tdd` |
| UI-23 | 6 Admin | Roles y permisos con las vistas de Materio | — | UI-22 | `tdd` |
| UI-24 | 6 Admin | Moderación de reseñas con alcance de sede y listado por sede (backend ✅; pantalla pendiente de UI-03) | Sí | UI-22 | `mediclick-tenant-safety` + `tdd` |
| UI-25 | 6 Admin | Pagos, dashboard de administración y reportes en recharts; `/payments` solo en `(staff)` | — | UI-22 | `tdd` |
| UI-28 | 6 Admin | Pantallas clínicas del personal: notas clínicas, recetas e historia médica | — | UI-22 | `tdd` |
| UI-30 | 6 Admin | Lista de espera del personal | — | UI-22 | `tdd` |
| UI-26 ✅ | 7 Público | Endpoints públicos del perfil del médico: solo campos profesionales y reseñas visibles, con throttle; bloqueado hasta corregir el throttle evadible (§9) | Sí | — | `mediclick-tenant-safety` + `tdd` |
| UI-27 | 7 Público | Landing de Materio y perfil público del médico | — | UI-26, UI-04, UI-08 (médico preseleccionado) | `tdd` |

UI-02 se adelantó a UI-01: no usa nada de Materio y deja cubierto por pruebas el cambio de base
visual. La tabla se ordena por fase; los ID UI-28 a UI-31 se agregaron al revisar las pantallas sin
flujo asignado. Los ítems de backend no dependen de la base visual y pueden avanzar en paralelo a
su fase.

## 8. Riesgos

| Riesgo | Mitigación |
|---|---|
| Tailwind y MUI compiten en especificidad | UI-01 replica el esquema de Materio (sin preflight, `important: '#__next'`, sin reset global sin capa) y lo verifica con axe y revisión visual en ambos modos |
| La v5 es MUI 6 / React 18 / Next 15 | Adaptación mecánica al copiar (Paso 0 del plan de la Fase 0); solo se copia lo que usa cada pantalla |
| Tailwind 3.4 queda una versión mayor atrás | Pasar a Tailwind 4 es un trabajo aparte (reescribir el plugin de Materio como `@theme`), fuera de esta migración |
| `react-perfect-scrollbar` sin mantenimiento | Se acepta como herencia de la plantilla (ADR-0003); reemplazo solo si falla con React 19 |
| Cambiar reglas de negocio dentro de un rediseño | D7: la regla se enumera en la spec y en `APPOINTMENT-CORE.md`; `mediclick-core-review` antes del merge |
| Datos públicos del médico | UI-26 enumera los campos expuestos y prueba que una reseña oculta nunca sale |

## 9. Fuera de alcance

| Tema | Destino |
|---|---|
| Búsqueda global (`Ctrl+K`) | SDD propio pendiente: búsqueda entre entidades con alcance de sede y datos personales por rol |
| Verificación en dos pasos | SDD propio pendiente |
| `GET /payments` lista transacciones de todas las sedes para un paciente | SDD de hardening; hasta entonces ninguna pantalla del paciente lo consume |
| `GET /appointments` solo restringe por rol al médico: un paciente (`READ:APPOINTMENTS`, `clinicId` nulo) podría listar citas de todas las sedes con datos de otros pacientes (leído en código, no ejecutado) | SDD de hardening, prioridad alta; ninguna pantalla del paciente lo consume |
| `GqlThrottlerGuard.getTracker` toma el `sub` de un JWT sin verificar: en `/auth/login` y `/auth/register` un token forjado por request evade el límite por IP | SDD de hardening, prioridad alta porque afecta al login hoy; UI-26 queda bloqueado hasta que esté en `staging` |

## 10. Preguntas abiertas

1. ~~Rutas de Materio v6~~: resuelto, la base es la v5 local (D1).
2. Forma final de cada flujo rediseñado: la fijan los prototipos UI-06, UI-10, UI-14 y UI-17.
3. Mutaciones de UI-18: dependen del prototipo UI-17.
4. ¿Reagendar puede cambiar de médico o de especialidad? El glosario define el reagendamiento
   como mover la cita a otro cupo conservando su identidad, pero el caso de uso acepta un cupo de
   otro médico o especialidad. Bloquea el arrastre entre médicos en UI-16; hasta decidirlo,
   `resolveDropTarget` solo acepta el mismo médico y especialidad.
5. ¿Se puede reintentar un pago abandonado? `createPreference` rechaza una cita que ya tiene una
   transacción `PENDING`; permitirlo cambia una regla de pagos (lo plantea el prototipo UI-10).
6. ~~Sede de una entrada en lista de espera~~: resuelto (2026-10-06). Toma la sede del médico si el
   paciente eligió uno; si no, la sede es obligatoria al anotarse. Lo implementa UI-29.
