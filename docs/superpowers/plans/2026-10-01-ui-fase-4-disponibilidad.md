# UI Fase 4 — Disponibilidad visual (UI-17 a UI-19)

> **Para agentes:** cada ítem se implementa en su propia rama y PR. Los pasos usan checkboxes (`- [ ]`). UI-18 es condicional: su alcance lo fija el prototipo UI-17.

**Goal:** Que recepción y administración configuren la oferta de un médico sobre el mismo calendario que muestra su agenda: reglas de disponibilidad semanales, bloqueos de agenda y feriados, viendo antes de confirmar qué citas quedarían afectadas.

**Arquitectura:** La superficie reutiliza la capa de agenda de UI-15 (`useAgenda`, `toAgendaEvents`, `AgendaCalendar`) para pintar cupos, citas, bloqueos y feriados; las ediciones van por los casos de uso existentes, que ya publican `availability.restriction_changed` (SDD-010) y cancelan por la ruta única de cancelación (SDD-011). Las mutaciones nuevas, si el prototipo las pide, se agregan del lado del servidor sin abrir una segunda ruta de cancelación.

**Stack:** NestJS + Prisma/PostgreSQL + Jest; Next.js 16 + React 19 + MUI 7 + Tailwind 4 + FullCalendar 6.1.21 + `react-datepicker@^7.6` (vía `libs/styles/AppReactDatepicker`) + React Query + Vitest + Playwright.

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) §5.2, §6, §7 (UI-17 a UI-19) y §10.3; restricciones de [`SDD-hardening`](../../SDD-hardening-integridad-seguridad-operacion.md) §6.3.2–6.3.3 (SDD-009, SDD-010, SDD-011).

## Restricciones globales

- Rama por ítem desde `origin/staging` actualizado; PR contra `staging`.
- Vocabulario de [`CONTEXT.md`](../../../CONTEXT.md): regla de disponibilidad, cupo, bloqueo de agenda, feriado, agenda. Nada de "horario" para referirse a un cupo ni "slot".
- Quién edita: `RECEPTIONIST` tiene `MANAGE:AVAILABILITY`, `MANAGE:SCHEDULE_BLOCKS` y alta/edición/baja de `HOLIDAYS`; los admins por `MANAGE:ALL`. El `DOCTOR` solo lee (`READ:AVAILABILITY`, `READ:SCHEDULE_BLOCKS`) y ve esta superficie en modo lectura. La UI oculta acciones según permisos con `Can`, pero la autoridad es el servidor.
- Sede: el bloqueo toma la sede del médico; un feriado de sede solo lo gestiona personal de esa sede; un feriado global solo un admin global (`clinicId` nulo).
- Toda restricción nueva o modificada pasa por los casos de uso que publican `AvailabilityRestrictionChanged` con rango anterior y nuevo; el listener vuelve a comprobar el estado final antes de cancelar. Las cancelaciones resultantes usan `AppointmentCancellationService`: citas `PAID` quedan con `needsRefund` y cada cupo liberado registra `appointment.slot_released` en la outbox.
- El reemplazo de reglas usa `bulk-save` (transacción serializable por médico y especialidad con reintento, SDD-009/F-13) y regenera cupos con `ScheduleRegenerationService`.
- Fechas y horas en la zona horaria de la sede.
- Verificación por PR como en la Fase 3 (servidor: `pnpm test -- <patrón> --runInBand`, `pnpm build`, eslint por archivos; cliente: Vitest, `tsc`, eslint por archivos, `build`, `test:a11y`).
- Rutas de Materio citadas desde la v5 local: **confirmar en `~/materio-v6/` antes de copiar**.

## Comportamiento actual que la fase reemplaza

| Superficie actual | Archivos | Comportamiento a conservar |
|---|---|---|
| Disponibilidad | `views/availability/**` (`WeeklyScheduleConfigurator`, `DoctorSelector`, `AvailabilitySummary`, `useAvailability`) | elegir médico y especialidad; franjas por día de la semana; tipos `REGULAR`/`EXCEPTION`/`EXTRA`; vigencia desde/hasta; guardado masivo con `POST /availability/bulk-save` |
| Cupos generados (`/schedules`) | `views/schedules/**` (`ScheduleCalendar` de 643 líneas, `GenerateDialog` de 379, `ScheduleFilters`, `ScheduleSummary`, `useSchedules`) | grilla semanal propia con navegación entre semanas; filtro por médico (incluye "Todos los doctores", es decir, toda la sede) y por especialidad del médico; total de cupos de la semana; generar cupos por mes o por rango con `POST /schedules/generate`, mostrando generados/omitidos y advertencias. Carga con `pageSize: 500` vía thunks de Redux y calcula la semana con la zona horaria **del navegador** (`useSchedules.ts:36`), no la de la sede |
| Bloqueos | `views/schedule-blocks/**` (lista, formulario, KPIs, borrado) | `FULL_DAY`/`TIME_RANGE`, rango de fechas, horas, motivo; alta, edición y baja |
| Feriados | `views/holidays/**` (lista anual, formulario, KPIs, borrado) | global o de sede, recurrente, filtro por año, carga de feriados de Perú (`POST /holidays/seed`) |

**Corrección al SDD:** la fila UI-19 de §7 solo menciona `WeeklyScheduleConfigurator` y las listas; omitía la pantalla `/schedules`, que ya es un calendario propio del mismo dominio. UI-19 también la reemplaza con la capa de agenda (§5.2 / UI-15) y la borra en el mismo PR.

---

## UI-17 — Prototipo de disponibilidad visual

**Rama:** `prototype/ui-17-disponibilidad` (descartable) + `docs/ui-17-decisiones-disponibilidad` (PR a `staging`) · **Skills:** `prototype` (rama UI, sub-forma A sobre `/availability`)

**Pregunta que responde:** ¿cómo edita recepción la oferta de un médico sobre el calendario sin perder de vista las citas que una restricción afectaría?

### Task 1: Variantes

**Files:**
- Modify (temporal): `client/src/app/(staff)/availability/page.tsx` (switcher `?variant=`)
- Create: `client/src/views/availability/prototype-disponibilidad/VariantA.tsx`, `VariantB.tsx`, `VariantC.tsx`, `PrototypeSwitcher.tsx`, `fixtures.ts`

**Interfaces:**
- Consumes: `fixtures.ts` con un `AgendaSnapshot` falso (dos especialidades, reglas semanales, cupos generados, citas `CONFIRMED` y una `PAID`, un bloqueo, un feriado global y uno de sede) más reglas de disponibilidad falsas.
- Produces: tres variantes estructuralmente distintas sobre el layout `(staff)`.

- [ ] **Step 1:** Cabecera: "Tres variantes de disponibilidad visual, conmutables con `?variant=`, sobre `/availability`. PROTOTIPO — se descarta."
- [ ] **Step 2:** Variante A — calendario `timeGridWeek` con cupos y citas; seleccionar un rango abre un drawer (patrón `AddEventSidebar`) para crear un bloqueo; reglas semanales en una pestaña aparte con el formulario actual reestilizado.
- [ ] **Step 3:** Variante B — grilla semanal de reglas editable por arrastre (franjas por especialidad) arriba y calendario de restricciones abajo; un solo botón "Guardar" aplica el reemplazo.
- [ ] **Step 4:** Variante C — vista mensual con feriados y bloqueos como protagonistas y panel lateral con la lista de restricciones (patrón `SidebarLeft`); las reglas viven en una pantalla de configuración separada.
- [ ] **Step 5:** En las tres, antes de confirmar una restricción, mostrar la lista de citas que caerían dentro con su estado de pago, para validar si la vista previa de impacto es necesaria.

### Task 2: Preguntas que el usuario debe cerrar

- [ ] ¿Las reglas semanales se editan sobre la grilla (arrastrando franjas) o con formulario?
- [ ] ¿Un bloqueo se crea seleccionando un rango en el calendario? ¿Se puede mover o estirar arrastrándolo?
- [ ] ¿Hace falta una vista previa de impacto (citas que se cancelarían, cuáles tienen pago) antes de confirmar?
- [ ] ¿Feriados en el mismo calendario o en una vista anual aparte (con la carga de feriados de Perú)?
- [ ] ¿La generación manual de cupos (`GenerateDialog`) sigue existiendo o alcanza con la regeneración automática que ya hace `bulk-save`?
- [ ] ¿Qué rutas sobreviven? Propuesta: una sola `/availability` con pestañas Calendario | Reglas | Feriados; se eliminan `/schedules` y `/schedule-blocks`.
- [ ] ¿Eliminar un bloqueo debe reofrecer la capacidad recuperada a la lista de espera? Hoy no lo hace (ver UI-18, M4).

### Task 3: Captura

- [ ] **Step 1:** Commit y push de `prototype/ui-17-disponibilidad` (sin PR).
- [ ] **Step 2:** PR `docs/ui-17-decisiones-disponibilidad` → `staging` con la sección "Decisiones UI-17" al final de este plan: variante elegida, respuestas, enlace al prototipo y la lista definitiva de mutaciones de UI-18 (o "UI-18 no necesario").

**Criterio de cierre:** las siete preguntas tienen respuesta y UI-18 tiene alcance cerrado.

---

## UI-18 — Mutaciones de disponibilidad pedidas por el prototipo

**Rama:** `feat/ui-18-<mutación>` (una por mutación si son independientes) · **Skills:** `mediclick-appointment-core` → `mediclick-tenant-safety` → `tdd` → `mediclick-core-review`

Condicional a "Decisiones UI-17". Si el prototipo se resuelve con los endpoints actuales, este ítem se cierra marcándolo "no necesario" en el SDD.

### Mutaciones candidatas

| ID | Mutación | ¿Existe hoy? | Invariantes que debe respetar |
|---|---|---|---|
| M1 | Vista previa de impacto: `GET /availability-restrictions/impact?doctorId\|clinicId&type&startDate&endDate&timeFrom?&timeTo?&excludeRestrictionId?` → citas activas afectadas con estado asistencial y de pago | No (lectura) | Misma resolución de feriado/bloqueo que el listener (fecha local de la sede, feriado solo global o de la sede del médico); es informativa: la decisión final sigue siendo del listener contra el estado comprometido; alcance de sede como en UI-13 |
| M2 | Crear bloqueo desde una selección del calendario | Sí: `POST /schedule-blocks` | Ninguna nueva; solo UI |
| M3 | Mover o estirar un bloqueo arrastrándolo | Sí: `PATCH /schedule-blocks/:id` | El listener evalúa la unión de rango anterior y nuevo (SDD-010) |
| M4 | Al eliminar un bloqueo o feriado, reofrecer la capacidad recuperada a la lista de espera | No | **Regla de negocio nueva (D7):** hoy la lista de espera solo reacciona a `appointment.slot_released` de citas liberadas. Requiere definir el evento (p. ej. `availability.restriction_removed` en la outbox), su consumidor idempotente y actualizar `APPOINTMENT-CORE.md` §"Liberación de cupos" |
| M5 | Editar una franja de regla arrastrándola | Parcial: `PATCH /availability/:id` y `POST /availability/bulk-save` | Reemplazo atómico por médico y especialidad con reintento (SDD-009/F-13); regeneración de cupos sin borrar los reservados |

### Task 1 (por cada mutación aprobada): especificar la invariante

- [ ] **Step 1:** Leer `CONTEXT.md` y `APPOINTMENT-CORE.md` completos (paso 1 de `mediclick-appointment-core`).
- [ ] **Step 2:** Trazar la entrada real: controller → caso de uso → repositorio → evento → `AvailabilityChangeListener` (`server/src/modules/appointments/application/listeners/availability-change.listener.ts`) → `AppointmentCancellationService` → outbox.
- [ ] **Step 3:** Escribir en el PR la invariante con ejemplo permitido y rechazado (actor, sede, hora local, estado de pago, concurrencia).

### Task 2: Tests primero

**Files (según la mutación):**
- M1: Create `server/src/modules/availability/application/use-cases/preview-restriction-impact.use-case.ts` + `.spec.ts`; Modify `availability.controller.ts`.
- M4: Modify `server/src/modules/schedule-blocks/application/use-cases/delete-schedule-block.use-case.ts`, `server/src/modules/holidays/application/use-cases/delete-holiday.use-case.ts`, `server/src/shared/events/availability-events.interface.ts`; Create el consumidor en `server/src/modules/waitlist/…` con su `.spec.ts`; integración en `*.integration.spec.ts`.

- [ ] **Step 1 (M1):** casos: cita `CONFIRMED` dentro del rango aparece; cita `CANCELLED` no; feriado de sede B no afecta citas de sede A; bloqueo `TIME_RANGE` solo afecta citas solapadas; actor de otra sede → 404; `excludeRestrictionId` evita contar la propia restricción al editarla.
- [ ] **Step 2 (M4, solo si se aprueba):** casos: eliminar un bloqueo emite el evento en la misma transacción que la baja; redelivery del mismo `eventId` es no-op; un cupo que sigue cubierto por otro bloqueo no se ofrece.
- [ ] **Step 3:** `cd server && pnpm test -- availability schedule-blocks holidays waitlist --runInBand` — Expected: FAIL por la razón esperada.

### Task 3: Implementación y verificación

- [ ] **Step 1:** Implementar el cambio mínimo; ninguna mutación nueva cancela citas por su cuenta: siempre vía evento + listener.
- [ ] **Step 2:** `cd server && pnpm test -- appointments --runInBand && pnpm test -- waitlist --runInBand && pnpm test -- payments --runInBand && pnpm build` (matriz de impacto de `APPOINTMENT-CORE.md`).
- [ ] **Step 3 (M4):** `RUN_DB_INTEGRATION=1 DATABASE_URL=<db de prueba> pnpm run test:integration -- waitlist availability`.
- [ ] **Step 4:** Actualizar `APPOINTMENT-CORE.md` si cambió una regla (M4) y `mediclick-core-review` sobre el diff.

**Riesgo conocido:** `availability.restriction_changed` todavía se publica con `EventEmitter2` en memoria, no por la outbox (G-04 del SDD de hardening). Un crash entre la escritura de la restricción y el listener pierde las cancelaciones derivadas. Una mutación nueva de restricción usa el mismo camino para no divergir; moverlo a la outbox es un ítem del SDD de hardening, no de esta fase.

---

## UI-19 — Disponibilidad visual

**Rama:** `feat/ui-19-disponibilidad-visual` · **Skills:** `tdd` (pruebas de navegador primero)

Ajustar a "Decisiones UI-17". Lo siguiente es la forma por defecto (una ruta `/availability` con pestañas).

### Task 1: Pruebas de navegador rojas

**Files:**
- Create: `client/tests/e2e/availability-visual.spec.ts`

**Interfaces:**
- Consumes: arnés UI-02 — `test.use({ actor: 'RECEPTIONIST' })` y `'DOCTOR'`; `api.on('GET /agenda', …)`, `api.on('GET /availability', …)`, `api.on('POST /availability/bulk-save', …)`, `api.on('POST /schedule-blocks', …)`, `api.on('PATCH /schedule-blocks/:id', …)`, `api.on('DELETE /schedule-blocks/:id', …)`, `api.on('GET /holidays', …)`, `api.on('POST /holidays', …)`, `api.on('POST /holidays/seed', …)` y M1 si existe; `expectAccessible(page)`.

- [ ] **Step 1:** Escenarios:
  - recepción selecciona un rango en el calendario, completa el drawer y se envía `POST /schedule-blocks` con `FULL_DAY` o `TIME_RANGE`, fechas y horas locales;
  - si existe M1, el drawer lista las citas afectadas y marca las pagadas antes de confirmar;
  - mover un bloqueo envía `PATCH` con el rango nuevo;
  - guardar reglas semanales envía `bulk-save` con médico, especialidad, franjas, tipo y vigencia;
  - crear un feriado de sede y cargar feriados de un año;
  - vista "Todos los médicos" de la sede: `GET /agenda?clinicId=…` con rango de una semana, navegación a la semana siguiente y filtro por especialidad (reemplaza `/schedules`);
  - la semana mostrada se calcula en la zona horaria de la sede aunque el navegador corra en otra (`page.emulateTimezone` / `timezoneId: 'Asia/Tokyo'`);
  - si UI-17 conserva la generación manual, generar por mes muestra cupos generados y advertencias de `POST /schedules/generate`;
  - un 403 del servidor muestra el mensaje y no deja estado a medias;
  - el médico ve la superficie sin acciones de edición;
  - `expectAccessible` en cada pestaña.
- [ ] **Step 2:** `cd client && pnpm exec playwright test tests/e2e/availability-visual.spec.ts` — Expected: FAIL.

### Task 2: Pantallas

**Files:**
- Create: `client/src/views/availability/index.tsx` (reemplaza el actual; pestañas Calendario | Reglas | Feriados con `@core/components/mui/TabList`)
- Create: `client/src/views/availability/components/AvailabilityCalendar.tsx` (sobre `AgendaCalendar` de UI-15; alcance médico con `selectable` para crear bloqueos y bloqueos editables según UI-17; alcance sede `{ clinicId }` en vista semanal, que reemplaza "Todos los doctores" de `/schedules`; filtros de médico y especialidad con `AgendaFilters`)
- Create: `client/src/views/availability/components/RestrictionDrawer.tsx` (patrón `views/apps/calendar/AddEventSidebar.tsx` de Materio; fechas con `libs/styles/AppReactDatepicker`; validación con Zod reutilizando `schedule-blocks/functions/schedule-block.schema.ts` y `holidays/functions/holiday.schema.ts`)
- Create: `client/src/views/availability/components/WeeklyRulesEditor.tsx` (forma elegida en UI-17; conserva la validación de `availability/functions/availability.schema.ts`)
- Create: `client/src/views/availability/components/HolidaysPanel.tsx` (lista anual, filtro por año, carga de feriados de Perú)
- Create: `client/src/views/availability/hooks/useRestrictions.ts` (alta, edición y baja de bloqueos y feriados; invalida `['agenda']`)
- Modify: `client/src/views/availability/hooks/useAvailability.ts` (solo reglas; sin estado de UI de pantalla)
- Modify: `navigationFor` (UI-03): una entrada "Disponibilidad"; se quitan "Horarios", "Bloqueos" y "Feriados" si UI-17 lo confirma.

**Interfaces:**
- Consumes: `useAgenda({ doctorId }, range)` (UI-15), `availabilityService`, `scheduleBlocksService`, `holidaysService`, M1 si existe.
- Produces: ruta `/availability` (lectura para médico, edición para recepción y admin).

- [ ] **Step 1:** Selector de médico con `DoctorSelector` reestilizado (custom input horizontal de Materio si UI-17 lo eligió).
- [ ] **Step 2:** Calendario, drawer, reglas y feriados; textos con el vocabulario de `CONTEXT.md`.
- [ ] **Step 3:** Si UI-17 conserva la generación manual de cupos, migrar `GenerateDialog` (modos mes/rango, resultado y advertencias) a un drawer con React Query en lugar de los thunks de Redux; si no, borrarla. El total de cupos de la semana sale de `indicators.totalCupos` de la agenda.
- [ ] **Step 4:** `cd client && pnpm exec playwright test tests/e2e/availability-visual.spec.ts` — Expected: PASS.

### Task 3: Borrar lo reemplazado y verificar

**Files (según decisiones UI-17):**
- Delete: `client/src/views/schedules/` (incluye `ScheduleCalendar`, `ScheduleFilters`, `ScheduleSummary`, `useSchedules`) y `client/src/app/(staff)/schedules/` (hoy `app/(menu)/schedules/`); quitar `client/src/redux-store/slices/schedules.ts`, `client/src/redux-store/thunks/schedules.thunks.ts` y su registro en `client/src/redux-store/index.ts` si quedan sin consumidores
- Delete: `client/src/views/schedule-blocks/components/`, `hooks/`, `index.tsx` y `client/src/app/(staff)/schedule-blocks/` (conservar `functions/` y `types/` si los reusa el drawer, o moverlos a `views/availability`)
- Delete: `client/src/views/holidays/components/`, `index.tsx` y `client/src/app/(staff)/holidays/` (ídem con `functions/` y `types/`)
- Delete: `client/src/views/availability/components/WeeklyScheduleConfigurator.tsx`, `AvailabilitySummary.tsx`

- [ ] **Step 1:** `grep -rn "views/schedules\|ScheduleCalendar\|WeeklyScheduleConfigurator\|ScheduleBlockList\|HolidayList" client/src` — Expected: sin referencias.
- [ ] **Step 2:** `cd client && pnpm test && pnpm exec tsc --noEmit && pnpm exec eslint src/views/availability && pnpm build && pnpm test:a11y` — Expected: en verde.
- [ ] **Step 3:** Revisión visual en claro/oscuro y con las opciones de accesibilidad del customizer; confirmar que el arrastre tiene alternativa por teclado (editar desde el drawer).
