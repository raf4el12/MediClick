# Fase 6 — Administración — Plan de implementación

> **Para agentes:** implementar ítem por ítem con `mattpocock-skills:tdd`; el cambio de backend de UI-24
> sigue además `mediclick-tenant-safety` (`.agents/skills/mediclick-tenant-safety/SKILL.md`) y cierra con
> `mediclick-core-review`. Cada PR cierra con `mattpocock-skills:code-review`. Pasos con checkbox (`- [ ]`).

**Goal:** Llevar las pantallas de gestión del personal de sede al patrón de listas, roles, moderación y
dashboards de Materio, con un único módulo de tabla reutilizado y sin abrir datos financieros al paciente.

**Arquitectura:** Las seis tablas de gestión repiten hoy paginación de servidor, orden, skeleton, vacío y
acciones (≈350–430 líneas cada una). Se introduce `DataTable` (TanStack Table con `manualPagination`,
estilos `@core/styles/table.module.css`) como módulo profundo con seis adaptadores; cada pantalla queda
como columnas + filtros + drawer. Roles, moderación, pagos y dashboards adaptan sus vistas de Materio. Los
gráficos se escriben con recharts 3 y `libs/styles/AppRecharts` (ADR-0003: sin ApexCharts).

**Stack:** Next.js 16, React 19, MUI 7, Tailwind 4 (solo layout), `@tanstack/react-table` 8, recharts 3,
React Query, React Hook Form + Zod; backend NestJS + Prisma para UI-24.

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) — §7 (UI-22 a UI-25, UI-28, UI-30),
§5.3, §5.4, §6 y §9 (`GET /payments`); [ADR-0003](../../adr/0003-materio-v6-sistema-de-diseno.md).

## Restricciones globales

- Rama por ítem desde `origin/staging` actualizado; PR contra `staging`.
- Rutas de Materio citadas desde la v5 local; **confirmar en `~/materio-v6/` antes de copiar**.
- Paginación, búsqueda (`searchValue`) y orden siguen en el servidor; no se trae
  `@tanstack/match-sorter-utils` ni filtrado en cliente sobre páginas parciales.
- Vocabulario de `CONTEXT.md`: transacción de pago, comprobante de pago, reseña oculta; nunca "factura".
- Todas estas rutas viven en el grupo `(staff)` de UI-03. Un PATIENT no entra aunque tenga el permiso.
- Lo reemplazado se borra en el mismo PR. Cada pantalla pasa axe AA.
- Depende de: UI-02 (Vitest + arnés) y UI-03 (layout por actor); UI-23/24/25/28/30 dependen de UI-22.

## Inventario y destino

| Pantalla | Ruta | Vista actual | Patrón Materio (v5, confirmar en v6) | Ítem |
|---|---|---|---|---|
| Pacientes | `/patients` | `views/patients` (Table 427, Add 370, Edit 341, Detail 258, Filters 150) | `views/apps/user/list/*` | UI-22 |
| Médicos | `/doctors` | `views/doctors` (Table 373, Add 338, Edit 350, Detail 155) | `views/apps/user/list/*` | UI-22 |
| Usuarios | `/users` | `views/users` (Table 384, AddEdit 297, Detail 138) | `views/apps/user/list/*` | UI-22 |
| Sedes | `/clinics` | `views/clinics` (Table 345, Add 219) | `views/apps/user/list/*` | UI-22 |
| Especialidades | `/specialties` | `views/specialties` (Table 380, Add 275) | `views/apps/user/list/*` | UI-22 |
| Categorías | `/categories` | `views/categories` (Table 349, Add 213) | `views/apps/user/list/*` | UI-22 |
| Roles | `/roles` | `views/roles` (Table 258, Drawer 345, PermissionsDialog 299) | `views/apps/roles/*`, `components/dialogs/role-dialog` | UI-23 |
| Reseñas | — (nueva) | `views/reviews` (solo paciente) | `views/apps/ecommerce/manage-reviews/*` | UI-24 |
| Pagos | `/payments` | `views/payments/index.tsx` (238) | `views/apps/invoice/list/InvoiceListTable.tsx` | UI-25 |
| Dashboard | `/dashboard` | `views/dashboard` (AdminDashboard 418) | `components/card-statistics/*`, widgets de `views/dashboards/*` | UI-25 |
| Reportes | `/reports` | `views/reports` (6 gráficos recharts + KpiCards) | `components/card-statistics/*` | UI-25 |
| Notas clínicas | `/clinical-notes` | `views/clinical-notes` (Table 340, Panel 160, Form 104) | `user/list` + drawer | UI-28 |
| Recetas (listado) | `/prescriptions` | `views/prescriptions` (Table 344, Panel 174, Form 239) | `user/list` + drawer | UI-28 |
| Antecedentes | `/medical-history` | `views/medical-history` (List 319, Form 265, Detail 172, KPIs 117) | `card-statistics` + `user/list` | UI-28 |
| Lista de espera (personal) | `/waitlist` | `views/waitlist/staff` (index 222, PriorityDialog 72) | `user/list` | UI-30 |

Feriados (`/holidays`) no entra en UI-22: se rediseña sobre el calendario en UI-19.

---

## UI-22 — Tablas de gestión

**Rama:** `git fetch origin && git switch -c feat/ui-22-tablas-gestion origin/staging`
**Skills:** `mattpocock-skills:codebase-design`, `mattpocock-skills:tdd`

Si el diff supera ~1.500 líneas, se entrega en PRs sucesivos por entidad (`feat/ui-22-<entidad>`), el
primero con `DataTable` + pacientes.

### Task 1: Módulo `DataTable` (TDD)

**Files:**
- Create: `client/src/components/shared/DataTable/DataTable.tsx`
- Create: `client/src/components/shared/DataTable/index.ts`
- Create: `client/src/components/shared/DataTable/DataTable.test.tsx`
- Modify: `client/src/components/shared/SkeletonTable/*` (absorbido como estado de carga; borrar si queda sin uso)

**Interfaces:**
- Produces: `<DataTable columns rows totalRows pagination onPaginationChange sorting? onSortingChange?
  isLoading emptyMessage toolbar? />` — paginación de servidor, encabezados ordenables accesibles
  (`aria-sort`), estado vacío y de carga, selector de tamaño de página.
- Consumes: `@tanstack/react-table`, `@core/styles/table.module.css`, `TablePagination` de MUI.

- [ ] **Step 1 (rojo):** Pruebas Vitest + Testing Library: cambiar de página llama `onPaginationChange`
  con el índice correcto; `isLoading` muestra skeleton y no filas; `rows=[]` muestra `emptyMessage`;
  ordenar marca `aria-sort`. Run: `cd client && pnpm test -- DataTable` → Expected: FAIL.
- [ ] **Step 2 (verde):** Implementar hasta PASS.

### Task 2: Seis pantallas sobre el patrón de lista de Materio

**Files (por entidad `<e>` ∈ patients, doctors, users, clinics, specialties, categories):**
- Modify: `client/src/views/<e>/index.tsx` (tarjetas opcionales + filtros + tabla, como `views/apps/user/list/index.tsx`)
- Modify: `client/src/views/<e>/components/<E>Table.tsx` (solo columnas y acciones sobre `DataTable`)
- Modify: `client/src/views/<e>/components/<E>Filters.tsx` (adapta `TableFilters.tsx`; `DebouncedInput` para búsqueda)
- Modify: drawers `Add*Drawer.tsx` / `Edit*Drawer.tsx` (estructura de `AddUserDrawer.tsx`; mismos esquemas Zod de `functions/*.schema.ts`)
- Modify: acciones de fila con `@core/components/option-menu` (o el equivalente de v6)

**Interfaces:**
- Consumes: hooks existentes `use<E>s.ts` y `use<E>Form.ts` sin cambios de contrato; servicios
  `client/src/services/<e>.service.ts`.
- Produces: misma funcionalidad CRUD que hoy.

- [ ] **Step 1:** Pacientes primero; `PatientDetailDialog` se reemplaza por la acción "Ver expediente"
  (UI-21) más el drawer de edición; borrar el diálogo si queda sin uso.
- [ ] **Step 2:** Resto de entidades. Tarjetas de resumen (`card-statistics/HorizontalWithSubtitle`) solo
  si el endpoint ya devuelve el conteo; no agregar llamadas `pageSize: 1` nuevas.
- [ ] **Step 3:** Confirmación de borrado con el `ConfirmDialog` compartido existente o
  `components/dialogs/confirmation-dialog` de Materio (uno solo; borrar el otro).

### Task 3: Pruebas de navegador

**Files:** Create: `client/tests/e2e/admin-tables.spec.ts`

- [ ] **Step 1:** Tabla de prueba por entidad con `actor: 'ADMIN'`: lista con fixture paginado, búsqueda
  envía `searchValue`, página 2 envía `currentPage=2`, crear desde el drawer envía el payload esperado.
- [ ] **Step 2:** `expectAccessible(page)` en cada ruta y con el drawer abierto.
  Run: `cd client && pnpm exec playwright test admin-tables` → Expected: PASS.

### Task 4: Verificación y limpieza

- [ ] Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint <archivos tocados> && pnpm test && pnpm build && pnpm test:a11y` → PASS.
- [ ] Ningún `*Table.tsx` de gestión reimplementa paginación ni skeleton fuera de `DataTable`.

---

## UI-23 — Roles y permisos

**Rama:** `git fetch origin && git switch -c feat/ui-23-roles-permisos origin/staging`
**Skills:** `mattpocock-skills:tdd`

Estado verificado: `rolesService` usa `GET/POST/PATCH/DELETE /roles` y `GET /permissions`; el servidor
rechaza borrar roles con `isSystem` (`roles/application/use-cases/delete-role.use-case.ts:24`).
`views/roles/permissionsMeta.ts` agrupa acciones × sujetos.

### Task 1: Matriz de permisos como función pura (TDD)

**Files:**
- Create: `client/src/views/roles/functions/permissionMatrix.ts` + `permissionMatrix.test.ts`

**Interfaces:**
- Produces: `toPermissionMatrix(permissions, selectedIds)` (filas por sujeto, columnas por acción, usando
  `permissionsMeta`) y `fromPermissionMatrix(matrix): number[]` (ids para el payload).

- [ ] **Step 1 (rojo/verde):** Pruebas: ida y vuelta conserva los ids; marcar `MANAGE` de un sujeto marca
  todas sus acciones si así lo hace hoy `PermissionsDialog` (verificar y replicar, no inventar regla);
  sujeto sin permisos devuelve fila vacía.

### Task 2: Vistas de Materio

**Files:**
- Modify: `client/src/views/roles/index.tsx` (`RoleCards` + `RolesTable` de `views/apps/roles`)
- Create: `client/src/views/roles/components/RoleCards.tsx`
- Modify: `client/src/views/roles/components/RolesTable.tsx` (sobre `DataTable`)
- Create: `client/src/views/roles/components/RoleDialog.tsx` (adapta `components/dialogs/role-dialog`: nombre + matriz)
- Delete: `RoleFormDrawer.tsx`, `PermissionsDialog.tsx` (absorbidos por `RoleDialog`)

- [ ] **Step 1:** Roles `isSystem` se muestran sin botón de borrar y con la matriz de solo lectura.
- [ ] **Step 2:** Prueba e2e `client/tests/e2e/roles.spec.ts`: editar un rol envía los ids esperados;
  un rol de sistema no ofrece borrar; `expectAccessible` con el diálogo abierto.

---

## UI-24 — Moderación de reseñas

**Rama:** `git fetch origin && git switch -c feat/ui-24-moderacion-resenas origin/staging`
**Skills:** `mediclick-tenant-safety`, `mattpocock-skills:tdd`, `mediclick-core-review`

Estado verificado: existen `GET /reviews/doctor/:doctorId/all` y `PATCH /reviews/:id/visibility`
(`UPDATE:REVIEWS`), pero **ninguno acota por sede**: `SetReviewVisibilityUseCase` y
`PrismaReviewRepository.setVisibility` buscan por `id` con el cliente Prisma sin tenant, y `Reviews` no
está en `STRICT_TENANT_MODELS`. Un ADMIN con `clinicId` (tiene `MANAGE:ALL`) puede ocultar reseñas de
médicos de otra sede. Tampoco hay un listado de reseñas de toda la sede para la tabla de moderación.

### Task 1: Backend — alcance de sede y listado de moderación (TDD) ✅

Hecho en la rama `feat/ui-24-moderacion-resenas-backend`, antes que la pantalla (que depende de UI-03).

**Files:**
- Modify: `server/src/modules/reviews/application/use-cases/set-review-visibility.use-case.ts`
- Modify: `server/src/modules/reviews/application/use-cases/get-doctor-reviews.use-case.ts` (rama `includeHidden`)
- Create: `server/src/modules/reviews/application/use-cases/list-reviews-for-moderation.use-case.ts`
- Create: `server/src/modules/reviews/application/dto/list-reviews-query.dto.ts` (`isVisible?`, `rating?`, `doctorId?`, `currentPage`, `pageSize` con `@Max(100)`)
- Modify: `server/src/modules/reviews/domain/repositories/review.repository.ts`, `infrastructure/persistence/prisma-review.repository.ts`
- Modify: `server/src/modules/reviews/interfaces/controllers/review.controller.ts` (`GET /reviews` con `@Auth()` + `@RequirePermissions('UPDATE','REVIEWS')` + `@CurrentClinic()`)
- Create: specs `set-review-visibility.use-case.spec.ts`, `list-reviews-for-moderation.use-case.spec.ts`

**Interfaces:**
- Consumes: `clinicId` del actor (`@CurrentClinic()`), relación reseña → médico → `clinicId`.
- Produces: moderación limitada a la sede del actor; global para SUPER_ADMIN / ADMIN sin `clinicId`.

- [ ] **Step 1 (rojo):** Specs: staff de sede A oculta reseña de su médico (permitido); staff de sede A
  sobre reseña de médico de sede B → 404 sin cambios ni recálculo de rating; admin global puede ambas;
  el listado de sede A no devuelve reseñas de sede B; el recálculo de `ratingAvg`/`ratingCount` sigue
  contando solo visibles. Run: `cd server && pnpm test -- reviews --runInBand` → Expected: FAIL.
- [ ] **Step 2 (verde):** Aplicar el predicado de sede en la lectura previa y en la escritura dentro del
  `$transaction` (el callback no hereda el tenant). Run igual → PASS; `pnpm build` → PASS.

### Task 2: Pantalla de moderación

**Files:**
- Create: `client/src/app/(staff)/reviews/page.tsx` (guard `UPDATE:REVIEWS`)
- Create: `client/src/views/reviews/moderation/{index,ReviewsModerationTable,ReviewsStatistics,TotalReviews}.tsx`
  (adaptan `views/apps/ecommerce/manage-reviews/*`; `ReviewsStatistics` en recharts)
- Modify: `client/src/services/reviews.service.ts` (`listForModeration`, `setVisibility`)
- Modify: navegación (`navigationFor` de UI-03) con el ítem "Reseñas"

- [ ] **Step 1:** Filtros visible/oculta, rating y médico; acción "Ocultar"/"Mostrar" con confirmación;
  la reseña oculta se rotula "Reseña oculta".
- [ ] **Step 2:** e2e `client/tests/e2e/reviews-moderation.spec.ts`: ocultar envía
  `PATCH /reviews/:id/visibility {isVisible:false}` y refresca; `actor: 'PATIENT'` no entra; axe AA.
- [ ] **Step 3:** Cerrar con `mediclick-core-review` sobre el diff de servidor.

---

## UI-25 — Pagos, dashboard de administración y reportes

**Rama:** `git fetch origin && git switch -c feat/ui-25-pagos-dashboard-reportes origin/staging`
**Skills:** `mattpocock-skills:tdd`

Estado verificado: PATIENT tiene `READ:PAYMENTS` (`server/prisma/rbac-policy.ts`) y la ruta `/payments`
solo exige ese permiso (`app/(menu)/payments/page.tsx`); el menú la oculta con `staffOnly`, pero por URL
un paciente llega a la pantalla que llama `GET /payments`, el endpoint que no acota al paciente (SDD §9).
`GET /payments` acepta `limit` con `@Max(100)`. Los reportes (`GET /reports/*`, `READ:REPORTS`) ya
usan recharts.

### Task 1: Pagos solo para el personal

**Files:**
- Move: `client/src/app/(menu)/payments/page.tsx` → `client/src/app/(staff)/payments/page.tsx` (si UI-03 no lo movió)
- Modify: `client/src/views/payments/index.tsx` (lista sobre `DataTable` con el estilo de `InvoiceListTable.tsx`:
  chips de estado de pago, monto con moneda de la sede, fecha, cita, enlace al comprobante de UI-12)

- [ ] **Step 1 (rojo):** e2e `client/tests/e2e/payments.spec.ts` con `actor: 'PATIENT'` en `/payments`:
  redirige y **no** se registra ninguna llamada a `GET /payments` (el arnés falla si ocurre).
- [ ] **Step 2 (verde):** guard de grupo `(staff)` además del permiso. Con `actor: 'ADMIN'`: filtros
  `status`, `dateFrom`, `dateTo` y `limit ≤ 100`; axe AA.

### Task 2: Dashboard y reportes con tarjetas y gráficos de Materio

**Files:**
- Modify: `client/src/views/dashboard/components/AdminDashboard.tsx` (tarjetas `card-statistics/*`;
  widgets inspirados en `views/dashboards/crm` y `analytics` reescritos en recharts)
- Modify: `client/src/views/reports/components/*.tsx` (mismo dato, estilo `libs/styles/AppRecharts`)
- Modify: `client/src/views/reports/components/KpiCards.tsx` (sobre `card-statistics`)
- Create: `client/src/views/dashboard/functions/dashboardKpis.ts` + `dashboardKpis.test.ts`

**Interfaces:**
- Consumes: `useDashboard` y `useReports` sin cambios de endpoints.
- Produces: `toDashboardKpis(summary, occupancy, revenue)` → tarjetas (puro, con porcentajes y
  variaciones redondeadas igual que hoy).

- [ ] **Step 1 (rojo/verde):** Pruebas de `toDashboardKpis`: ocupación con `totalSlots = 0` no divide por
  cero; ingresos con moneda de la sede; estados con etiquetas de `CONTEXT.md`.
- [ ] **Step 2:** Ningún import de `apexcharts`/`react-apexcharts` en el cliente
  (`grep -rn apexcharts client/src` vacío).
- [ ] **Step 3:** e2e `client/tests/e2e/admin-dashboard.spec.ts` con fixtures de `/reports/*`: tarjetas y
  gráficos renderizan; gráficos con título accesible; axe AA en ambos modos de color.

---

## UI-28 — Pantallas clínicas del personal

**Rama:** `git fetch origin && git switch -c feat/ui-28-pantallas-clinicas origin/staging`
**Skills:** `mattpocock-skills:tdd`, `mattpocock-skills:code-review`

Estado verificado (comportamiento a conservar):
- `/clinical-notes` (`READ:CLINICAL_NOTES`): `useClinicalNotes` lista **citas** con
  `appointmentsService.findAllPaginated` (`searchValue`, `currentPage`, `pageSize` 8); al elegir una, el
  `ClinicalNotePanel` carga `GET` de notas por cita y `ClinicalNoteForm` crea con `POST /clinical-notes`,
  luego recarga panel y tabla.
- `/prescriptions` (`READ:PRESCRIPTIONS`): `usePrescriptions` lista citas con filtros
  (`AppointmentFilters`); `PrescriptionPanel` (carga diferida con `dynamic`) muestra la receta de la cita,
  `PrescriptionForm` la crea (`POST /prescriptions`) y `downloadPdf(appointmentId)` descarga el PDF.
- `/medical-history` (`READ:MEDICAL_HISTORY`): se elige un paciente con `Autocomplete`; luego KPIs
  (activas / crónicas / resueltas), filtro por estado, lista paginada (`getByPatient`), alta, edición,
  cambio de estado (`PATCH /medical-history/:id/status`) y borrado con diálogo.
- El espacio de atención del médico (UI-16) también crea notas y recetas: este ítem no toca ese flujo y
  reutiliza los mismos formularios si UI-16 ya los extrajo; si no, los deja donde están.

### Task 1: Notas clínicas y recetas sobre `DataTable` + drawer

**Files:**
- Modify: `client/src/views/clinical-notes/index.tsx`, `components/ClinicalNotesTable.tsx` (columnas sobre `DataTable`)
- Modify: `client/src/views/clinical-notes/components/ClinicalNotePanel.tsx` (drawer lateral derecho al estilo
  `AddUserDrawer`; en móvil ocupa la pantalla)
- Modify: `client/src/views/prescriptions/index.tsx`, `components/PrescriptionsTable.tsx`, `components/PrescriptionPanel.tsx` (mismo patrón)
- Delete: `SkeletonTable` y paginación propia de ambas tablas (absorbidos por `DataTable`)

**Interfaces:**
- Consumes: `useClinicalNotes`, `usePrescriptions`, `clinicalNotesService`, `prescriptionsService` sin cambios de contrato.
- Produces: mismas acciones; la cita seleccionada se refleja en la URL (`?appointmentId=`) para poder
  compartir y recargar el drawer abierto.

- [ ] **Step 1 (rojo/verde):** Prueba Vitest del parseo de `?appointmentId=` (`functions/selectedAppointment.ts`):
  número válido → id; vacío, negativo o no numérico → `null`.
- [ ] **Step 2:** Mantener la carga diferida del panel de recetas y el estado de error del panel.
- [ ] **Step 3:** Etiquetas con vocabulario de `CONTEXT.md` (cita, paciente, médico).

### Task 2: Antecedentes con tarjetas y lista de Materio

**Files:**
- Modify: `client/src/views/medical-history/index.tsx` (selector de paciente arriba, tarjetas
  `card-statistics/HorizontalWithSubtitle` en lugar de `MedicalHistoryKPIs`, lista sobre `DataTable`)
- Modify: `client/src/views/medical-history/components/{MedicalHistoryForm,MedicalHistoryDetail}.tsx` (drawer)
- Delete: `MedicalHistoryKPIs.tsx` (absorbido); `MedicalHistoryDeleteDialog.tsx` si se usa el `ConfirmDialog` único de UI-22
- Create: `client/src/views/medical-history/functions/historyCounts.ts` + `historyCounts.test.ts`

- [ ] **Step 1 (rojo/verde):** `historyCounts(entries)` → `{ active, chronic, resolved }` igual que el
  cálculo actual de `MedicalHistoryKPIs.tsx:77-79`; lista vacía → ceros.
- [ ] **Step 2:** Sin paciente elegido: alta deshabilitada y estado vacío explicativo (como hoy).

### Task 3: Pruebas de navegador

**Files:** Create: `client/tests/e2e/clinical-screens.spec.ts`

- [ ] **Step 1:** `actor: 'DOCTOR'` en `/clinical-notes`: elegir cita abre el drawer con sus notas; guardar
  envía `POST /clinical-notes` con `appointmentId` y recarga.
- [ ] **Step 2:** `/prescriptions`: crear receta envía `POST /prescriptions`; "Descargar PDF" pide el PDF de esa cita.
- [ ] **Step 3:** `/medical-history`: elegir paciente carga lista y tarjetas; cambiar estado envía `PATCH .../status`.
- [ ] **Step 4:** `actor: 'PATIENT'` no entra a ninguna de las tres rutas; `expectAccessible` con drawer abierto y cerrado.
  Run: `cd client && pnpm exec playwright test clinical-screens` → Expected: PASS.

---

## UI-30 — Lista de espera del personal

**Rama:** `git fetch origin && git switch -c feat/ui-30-lista-espera-personal origin/staging`
**Skills:** `mattpocock-skills:tdd`, `mattpocock-skills:code-review`

Estado verificado: `/waitlist` (`READ:APPOINTMENTS`) renderiza `views/waitlist/staff/index.tsx`: filtros
especialidad y médico, `waitlistService.getClinicWaitlist` (`GET /waitlist`, **sin paginar**, orden del
servidor), tabla `#`, Paciente, Especialidad, Médico preferido, Ventana, Franja, Prioridad, Acciones, y
`PriorityDialog` que envía `addPriority(entryId, delta)`. La lista de espera del paciente
(`/patient/waitlist`) no es parte de este ítem.

### Task 1: Vista sobre el patrón de lista de Materio

**Files:**
- Modify: `client/src/views/waitlist/staff/index.tsx` (filtros como `TableFilters.tsx`; tabla con `DataTable`
  en modo lista completa: `totalRows = rows.length`, sin pedir páginas al servidor)
- Modify: `client/src/views/waitlist/staff/PriorityDialog.tsx` (diálogo con estilo Materio; mismo payload)
- Create: `client/src/views/waitlist/staff/functions/waitlistRows.ts` + `waitlistRows.test.ts`

**Interfaces:**
- Consumes: `waitlistService.{getClinicWaitlist,addPriority}`, `specialtiesService`, `doctorsService`.
- Produces: `toWaitlistRows(entries)` → posición, ventana de fechas y franja con textos de `CONTEXT.md`
  ("Entrada en lista de espera", "Prioridad de espera").

- [ ] **Step 1 (rojo/verde):** Pruebas de `toWaitlistRows`: conserva el orden recibido (el servidor ya
  ordena por prioridad y llegada); la posición `#` empieza en 1; médico preferido ausente → "Cualquiera".
- [ ] **Step 2:** Si `DataTable` (UI-22) no admite lista completa, agregar ese modo allí con su prueba,
  sin duplicar paginación en esta vista.

### Task 2: Pruebas de navegador

**Files:** Create: `client/tests/e2e/waitlist-staff.spec.ts`

- [ ] **Step 1:** `actor: 'RECEPTIONIST'`: filtrar por especialidad envía `specialtyId`; subir prioridad
  envía el `delta` elegido y refresca la lista.
- [ ] **Step 2:** `expectAccessible(page)` con el diálogo abierto.
  Run: `cd client && pnpm exec playwright test waitlist-staff` → Expected: PASS.

---

## Verificación de la fase

- [ ] Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint <archivos tocados> && pnpm test && pnpm build && pnpm test:a11y` → PASS.
- [ ] Run (UI-24): `cd server && pnpm test -- reviews --runInBand && pnpm build` → PASS.
- [ ] Al cerrar la fase, el usuario promueve `staging → main`.
