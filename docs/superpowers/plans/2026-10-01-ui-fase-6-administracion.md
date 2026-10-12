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
§5.3, §5.4, §6 y §9 (`GET /payments`); [ADR-0003](../../adr/0003-materio-sistema-de-diseno.md).

## Restricciones globales

- Rama por ítem desde `origin/staging` actualizado; PR contra `staging`.
- Rutas de Materio citadas desde la v5 local; **(v5 local, con la adaptación del Paso 0 de la Fase 0) antes de copiar**.
- Paginación, búsqueda (`searchValue`) y orden siguen en el servidor; no se trae
  `@tanstack/match-sorter-utils` ni filtrado en cliente sobre páginas parciales.
- Vocabulario de `CONTEXT.md`: transacción de pago, comprobante de pago, reseña oculta; nunca "factura".
- Todas estas rutas viven en el grupo `(staff)` de UI-03. Un PATIENT no entra aunque tenga el permiso.
- Lo reemplazado se borra en el mismo PR. Cada pantalla pasa axe AA.
- Depende de: UI-02 (Vitest + arnés) y UI-03 (layout por actor); UI-23/24/25/28/30 dependen de UI-22.

## Inventario y destino

| Pantalla | Ruta | Vista actual | Patrón Materio (v5 local) | Ítem |
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

## UI-22 — Tablas de gestión ✅

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

- [x] **Step 1 (rojo):** Pruebas Vitest + Testing Library: cambiar de página llama `onPaginationChange`
  con el índice correcto; `isLoading` muestra skeleton y no filas; `rows=[]` muestra `emptyMessage`;
  ordenar marca `aria-sort`. Run: `cd client && pnpm test -- DataTable` → Expected: FAIL.
- [x] **Step 2 (verde):** Implementar hasta PASS.

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

- [x] **Step 1:** Pacientes primero; `PatientDetailDialog` se reemplaza por la acción "Ver expediente"
  (UI-21) más el drawer de edición; borrar el diálogo si queda sin uso.
- [x] **Step 2:** Resto de entidades. Tarjetas de resumen (`card-statistics/HorizontalWithSubtitle`) solo
  si el endpoint ya devuelve el conteo; no agregar llamadas `pageSize: 1` nuevas.
- [x] **Step 3:** Confirmación de borrado con el `ConfirmDialog` compartido existente o
  `components/dialogs/confirmation-dialog` de Materio (uno solo; borrar el otro).

### Notas de implementación (DataTable y pacientes)

- **`DataTable`** (`components/shared/DataTable`):
  - `<table>` nativa con `@core/styles/table.module.css` de Materio y `TablePagination` en español (`Ir a la página siguiente`…);
  - `pagination` va desde 0: las vistas que usan `currentPage` desde 1 restan uno;
  - el orden es de servidor y solo en columnas con `enableSorting: true`, con `aria-sort` en el encabezado;
  - `isLoading` muestra un esqueleto y marca `aria-busy`, y sin filas aparece `emptyMessage`;
  - sin `pagination` es una lista completa, para UI-30;
  - `meta.align` y `meta.hiddenOnMobile` se declaran con la ampliación de `ColumnMeta`;
  - cinco pruebas con Testing Library sobre jsdom. Vitest ahora acepta `.test.tsx`, con `// @vitest-environment jsdom` por archivo.
- **Pacientes:**
  - tarjetas con `activeCount`/`inactiveCount`, que ya devuelve el endpoint, y filtros de búsqueda (`DebouncedInput`) y estado;
  - columnas con avatar, documento, teléfono, edad, sangre, registro, estado y acciones;
  - **solo se ordena por sangre, registro y estado.** Antes cualquier encabezado mandaba su id como `orderBy`, y el repositorio lo usa como campo de Prisma: ordenar por «Nombre» fallaba en el servidor;
  - la columna «Última visita» mostraba la fecha de registro: ahora se llama «Registro»;
  - `PatientDetailDialog` se borró; «Ver expediente» lleva a `/patients/{id}` (UI-21);
  - los drawers tienen rol de diálogo con nombre, campos obligatorios con `required` (el asterisco pasa a ser parte del nombre accesible) y «Cancelar» sin color de error;
  - el botón de RENIEC tenía un `aria-label` en un `span`: ahora está en el botón, con `describeChild`.
- **Compartidos:**
  - `CustomAvatar` con `skin='light'` mezcla el texto hacia `--contrast-mix`: las iniciales en 15 px no llegaban a AA;
  - `InternationalPhoneInput` acepta `required`;
  - `shell.spec.ts` tenía una carrera: el contador de notificaciones del fixture no bajaba tras marcar como leída.

### Notas de implementación (resto de entidades y cierre)

Se entregó en seis PRs: #81 (`DataTable` y pacientes), #87 (médicos), #89 (usuarios), #80 (sedes), #88 (especialidades) y #90 (categorías).

- **Orden por columna:**
  - todas las tablas anteriores mandaban como `orderBy` el id de cualquier columna (nombre completo, rol, sede, categoría, teléfono…), y los repositorios lo usan como campo de Prisma, así que esas columnas fallaban en el servidor;
  - ahora solo se ordena por campos escalares del modelo: médicos por CMP y estado; usuarios por nombre y estado; sedes, especialidades y categorías por nombre, zona horaria, moneda, teléfono, duración, precio, orden o estado.
- **Búsqueda:** `DebouncedInput` emitía el valor inicial al montarse y la tabla volvía a la página 1 un segundo después de cargar. Ahora solo emite cuando el texto difiere del valor recibido (con prueba). Algunas vistas conservan además su propia guarda, que es inofensiva.
- **Acciones de fila:**
  - pacientes, sedes, especialidades y categorías usan botones con nombre por fila;
  - médicos y usuarios dejan «Editar» visible y el resto en `option-menu` («Más acciones para …»).
- **Tarjetas de resumen:** solo en pacientes, cuyo endpoint ya devuelve los conteos. Las demás entidades no los traen y no se agregaron llamadas nuevas.
- **Textos y accesibilidad comunes:**
  - drawers con rol de diálogo y título;
  - campos obligatorios con `required`;
  - «Cancelar» y las confirmaciones sin rojo;
  - chips tonales de estado («Activo/a», «Inactivo/a»);
  - «Sedes» en lugar de «Clínicas» y «Médico» en lugar de «Doctor» en las pantallas (el menú todavía dice «Doctores»);
  - en especialidades y categorías, el selector de sede muestra «Global (todas las sedes)».
- **`SkeletonTable` no se borró:** todavía lo usa la lista de citas del personal (`views/appointments/components/AppointmentsTable.tsx`), que no es parte de esta fase.
- **Sin probar contra un backend real.** La edición desde el drawer de sedes, especialidades y categorías no tiene escenario propio en las specs.

### Task 3: Pruebas de navegador

**Files:** Create: `client/tests/e2e/admin-tables.spec.ts`

- [x] **Step 1:** Tabla de prueba por entidad con `actor: 'ADMIN'`: lista con fixture paginado, búsqueda
  envía `searchValue`, página 2 envía `currentPage=2`, crear desde el drawer envía el payload esperado.
- [x] **Step 2:** `expectAccessible(page)` en cada ruta y con el drawer abierto.
  Run: `cd client && pnpm exec playwright test admin-tables` → Expected: PASS.

### Task 4: Verificación y limpieza

- [x] Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint <archivos tocados> && pnpm test && pnpm build && pnpm test:a11y` → PASS.
- [x] Ningún `*Table.tsx` de gestión reimplementa paginación ni skeleton fuera de `DataTable`.

---

## UI-23 — Roles y permisos ✅

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

- [x] **Step 1 (rojo/verde):** Pruebas: ida y vuelta conserva los ids; marcar `MANAGE` de un sujeto marca
  todas sus acciones si así lo hace hoy `PermissionsDialog` (verificar y replicar, no inventar regla);
  sujeto sin permisos devuelve fila vacía.

### Task 2: Vistas de Materio

**Files:**
- Modify: `client/src/views/roles/index.tsx` (`RoleCards` + `RolesTable` de `views/apps/roles`)
- Create: `client/src/views/roles/components/RoleCards.tsx`
- Modify: `client/src/views/roles/components/RolesTable.tsx` (sobre `DataTable`)
- Create: `client/src/views/roles/components/RoleDialog.tsx` (adapta `components/dialogs/role-dialog`: nombre + matriz)
- Delete: `RoleFormDrawer.tsx`, `PermissionsDialog.tsx` (absorbidos por `RoleDialog`)

- [x] **Step 1:** Roles `isSystem` se muestran sin botón de borrar y con la matriz de solo lectura.
- [x] **Step 2:** Prueba e2e `client/tests/e2e/roles.spec.ts`: editar un rol envía los ids esperados;
  un rol de sistema no ofrece borrar; `expectAccessible` con el diálogo abierto.

### Notas de implementación

- **Regla verificada:** `PermissionsDialog` era de solo lectura; la edición vivía en `RoleFormDrawer`.
  - Ahí, la casilla del módulo marcaba o quitaba todas sus acciones, y «Seleccionar todo» hacía lo mismo con todos los permisos.
  - Marcar `MANAGE` no arrastraba a las demás acciones, así que no se inventó esa cascada.
  - `permissionMatrix.ts` replica esas reglas con `toggleSubject`, `toggleAll` y `togglePermission`, y además expone `rowState` para la casilla indeterminada.
  - Las filas empiezan por «Todos» y siguen por nombre; las acciones, por «Gestionar». Son 6 pruebas en Vitest.
- **Pantalla:** sigue el patrón de `views/apps/roles` y `components/dialogs/role-dialog` de Materio.
  - Una tarjeta por rol muestra el resumen de permisos, el tipo y la acción «Editar rol» o «Ver permisos». Otra tarjeta, con la ilustración `characters/1.png`, sirve para agregar un rol.
  - El listado usa `DataTable` en modo de lista completa (`GET /roles` no pagina). Ahí está «Eliminar» para los roles personalizados; los de sistema muestran «No se puede eliminar».
  - Editar se hace solo desde las tarjetas, para no repetir el mismo botón en dos lugares.
- **Diálogo:** lleva nombre, descripción, búsqueda de módulo y una tabla de matriz con casilla por módulo y por acción, cada una con nombre accesible («Pacientes: Leer», «Pacientes: todas las acciones»).
  - Los roles de sistema se abren en solo lectura con el título «Permisos de X», casillas deshabilitadas y solo «Cerrar». El servidor rechaza editarlos y borrarlos (`update-role` y `delete-role`).
- **Borrado:** `RoleFormDrawer.tsx` y `PermissionsDialog.tsx`. `useRoles` pierde el estado del drawer y `handleDelete` informa si salió bien. La confirmación usa el `ConfirmDialog` compartido con `destructive={false}`.
- **Pruebas de navegador:** `roles.spec.ts` cubre editar (ids enviados), crear (payload), eliminar con confirmación y el rol de sistema, con `expectAccessible` en la página y con el diálogo abierto.

---

## UI-24 — Moderación de reseñas ✅

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

- [x] **Step 1 (rojo):** Specs: staff de sede A oculta reseña de su médico (permitido); staff de sede A
  sobre reseña de médico de sede B → 404 sin cambios ni recálculo de rating; admin global puede ambas;
  el listado de sede A no devuelve reseñas de sede B; el recálculo de `ratingAvg`/`ratingCount` sigue
  contando solo visibles. Run: `cd server && pnpm test -- reviews --runInBand` → Expected: FAIL.
- [x] **Step 2 (verde):** Aplicar el predicado de sede en la lectura previa y en la escritura dentro del
  `$transaction` (el callback no hereda el tenant). Run igual → PASS; `pnpm build` → PASS.

### Task 2: Pantalla de moderación

**Files:**
- Create: `client/src/app/(staff)/reviews/page.tsx` (guard `UPDATE:REVIEWS`)
- Create: `client/src/views/reviews/moderation/{index,ReviewsModerationTable,ReviewsStatistics,TotalReviews}.tsx`
  (adaptan `views/apps/ecommerce/manage-reviews/*`; `ReviewsStatistics` en recharts)
- Modify: `client/src/services/reviews.service.ts` (`listForModeration`, `setVisibility`)
- Modify: navegación (`navigationFor` de UI-03) con el ítem "Reseñas"

- [x] **Step 1:** Filtros visible/oculta, rating y médico; acción "Ocultar"/"Mostrar" con confirmación;
  la reseña oculta se rotula "Reseña oculta".
- [x] **Step 2:** e2e `client/tests/e2e/reviews-moderation.spec.ts`: ocultar envía
  `PATCH /reviews/:id/visibility {isVisible:false}` y refresca; `actor: 'PATIENT'` no entra; axe AA.
- [x] **Step 3:** Cerrar con `mediclick-core-review` sobre el diff de servidor.

### Notas de implementación (pantalla)

- `/reviews` en `(staff)` con `RoleGuard` (`UPDATE:REVIEWS`, actor `STAFF`): un paciente vuelve a su inicio sin pedir `GET /reviews`. El menú suma «Reseñas» en Gestión médica, solo para quien puede moderar (con prueba en `navigation.test.ts`).
- La tabla va sobre `DataTable` de UI-22, con paginación de servidor (`currentPage`, `pageSize`). Los filtros Estado, Calificación y Médico viajan como `isVisible`, `rating` y `doctorId`, y cambiar uno vuelve a la primera página.
- La calificación usa `Rating` de solo lectura con nombre «N de 5 estrellas», y el estado se rotula «Visible» o «Reseña oculta».
- «Ocultar» y «Mostrar» confirman con el `ConfirmDialog` compartido, que explica el efecto en la calificación del médico. Después envían `PATCH /reviews/:id/visibility` y vuelven a pedir la lista.
- **Sin `ReviewsStatistics` ni `TotalReviews`:** el servidor no tiene un endpoint de agregados, y calcularlos sobre la página visible daría números engañosos. Si se quieren, es un endpoint nuevo.
- `reviews-moderation.spec.ts` cubre filtros, ocultar, mostrar y el bloqueo del paciente, con `expectAccessible` en la tabla y en la confirmación.

---

## UI-25 — Pagos, dashboard de administración y reportes ✅

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

- [x] **Step 1 (rojo):** e2e `client/tests/e2e/payments.spec.ts` con `actor: 'PATIENT'` en `/payments`:
  redirige y **no** se registra ninguna llamada a `GET /payments` (el arnés falla si ocurre).
- [x] **Step 2 (verde):** guard de grupo `(staff)` además del permiso. Con `actor: 'ADMIN'`: filtros
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

- [x] **Step 1 (rojo/verde):** Pruebas de `toDashboardKpis`: ocupación con `totalSlots = 0` no divide por
  cero; ingresos con moneda de la sede; estados con etiquetas de `CONTEXT.md`.
- [x] **Step 2:** Ningún import de `apexcharts`/`react-apexcharts` en el cliente
  (`grep -rn apexcharts client/src` vacío).
- [x] **Step 3:** e2e `client/tests/e2e/admin-dashboard.spec.ts` con fixtures de `/reports/*`: tarjetas y
  gráficos renderizan; gráficos con título accesible; axe AA en ambos modos de color.

### Notas de implementación

- **Estado real distinto del plan:**
  - `/payments` ya vivía en `(staff)`;
  - no quedaba ApexCharts en el cliente;
  - el paciente ya no tiene `READ:PAYMENTS` en `rbac-policy.ts` (sin el permiso, antes iba al 401).

  Igual se agregó el guard de grupo, `RoleGuard` con `actors={['STAFF', 'DOCTOR']}`, para que un paciente con permisos viejos en una base sin `seed-rbac` vuelva a su inicio sin pedir `GET /payments`. El médico conserva el acceso porque tiene `READ:PAYMENTS` y la entrada del menú. `misc-pages.spec.ts` prueba ahora el 401 sobre `/reports`.
- **Pagos:**
  - lista sobre `DataTable` con filtros de estado, desde y hasta, y tamaños de página 10/25/50/100 (100 es el `@Max` del servidor);
  - la página se manda como `page` (desde 1) y `limit`;
  - cada monto va con la moneda de su transacción (`formatPrice`, que respeta la convención de cada moneda: el peso colombiano sin decimales);
  - estados de la transacción: Aprobada, Pendiente, Seña, Reembolsada, Rechazada y Cancelada;
  - React Query en lugar del `useEffect` con `fetch`.
- **Sin enlace al comprobante:** la vista imprimible de UI-12 vive en `(patient)` y carga la cita con `GET /appointments/my/:id`, que solo responde al paciente dueño. Un enlace desde la lista del personal no funcionaría sin un endpoint de cita para el personal; queda fuera de este ítem.
- **`toDashboardKpis`:**
  - ocupación redondeada con `Math.round` del porcentaje del servidor, como el dashboard anterior;
  - progreso por cupos, sin dividir por cero;
  - ingresos con la moneda del reporte;
  - los seis estados en orden fijo con las etiquetas de `STATUS_META` (las de la agenda).

  `useDashboard` suma `GET /reports/revenue`, un endpoint existente, y el arnés del administrador tiene su respuesta por defecto.
- **Dashboard:**
  - tarjetas `card-statistics/HorizontalWithSubtitle` copiadas de Materio, sin la variación (`trend`), que ningún reporte informa;
  - citas del mes por estado, ocupación con barra con nombre y los ingresos del mes;
  - los gráficos de estado y de citas por día, y accesos rápidos.

  Se quitó «Citas completadas hoy», que mezclaba las completadas del mes con las citas de hoy, y «Doctores activos x/x», que siempre daba 100 %. `shell.spec.ts` ya no excluye el contenido del dashboard de axe.
- **Gráficos:**
  - `ChartCard` reúne tarjeta, esqueleto, vacío y `AppRecharts` (copiado de Materio, con los ejes en `text-secondary` en vez de `text-disabled`);
  - cada gráfico es un `role="img"` con una descripción de sus datos;
  - los colores van por variables CSS del tema (`fill="var(--mui-palette-…)"`), así que el modo oscuro usa su paleta;
  - el arco de ocupación cambia de color y el número va en el color del texto.
- **Pendiente para `DataTable` (UI-22):** a 390 px el paginador de `TablePagination` queda un poco recortado a la derecha.

---

## UI-28 — Pantallas clínicas del personal ✅

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

- [x] **Step 1 (rojo/verde):** Prueba Vitest del parseo de `?appointmentId=` (`functions/selectedAppointment.ts`):
  número válido → id; vacío, negativo o no numérico → `null`.
- [x] **Step 2:** Mantener la carga diferida del panel de recetas y el estado de error del panel.
- [x] **Step 3:** Etiquetas con vocabulario de `CONTEXT.md` (cita, paciente, médico).

### Task 2: Antecedentes con tarjetas y lista de Materio

**Files:**
- Modify: `client/src/views/medical-history/index.tsx` (selector de paciente arriba, tarjetas
  `card-statistics/HorizontalWithSubtitle` en lugar de `MedicalHistoryKPIs`, lista sobre `DataTable`)
- Modify: `client/src/views/medical-history/components/{MedicalHistoryForm,MedicalHistoryDetail}.tsx` (drawer)
- Delete: `MedicalHistoryKPIs.tsx` (absorbido); `MedicalHistoryDeleteDialog.tsx` si se usa el `ConfirmDialog` único de UI-22
- Create: `client/src/views/medical-history/functions/historyCounts.ts` + `historyCounts.test.ts`

- [x] **Step 1 (rojo/verde):** `historyCounts(entries)` → `{ active, chronic, resolved }` igual que el
  cálculo actual de `MedicalHistoryKPIs.tsx:77-79`; lista vacía → ceros.
- [x] **Step 2:** Sin paciente elegido: alta deshabilitada y estado vacío explicativo (como hoy).

### Task 3: Pruebas de navegador

**Files:** Create: `client/tests/e2e/clinical-screens.spec.ts`

- [x] **Step 1:** `actor: 'DOCTOR'` en `/clinical-notes`: elegir cita abre el drawer con sus notas; guardar
  envía `POST /clinical-notes` con `appointmentId` y recarga.
- [x] **Step 2:** `/prescriptions`: crear receta envía `POST /prescriptions`; "Descargar PDF" pide el PDF de esa cita.
- [x] **Step 3:** `/medical-history`: elegir paciente carga lista y tarjetas; cambiar estado envía `PATCH .../status`.
- [x] **Step 4:** `actor: 'PATIENT'` no entra a ninguna de las tres rutas; `expectAccessible` con drawer abierto y cerrado.
  Run: `cd client && pnpm exec playwright test clinical-screens` → Expected: PASS.

### Notas de implementación

- **Pieza común de notas y recetas** (`views/clinical-shared`):
  - `ClinicalAppointmentsTable`: filtros desde, hasta, estado y búsqueda, más la tabla de citas sobre `DataTable`. Cada pantalla aporta su columna (notas o receta) y la acción que abre el drawer.
  - `ClinicalDrawer`: drawer derecho al estilo `AddUserDrawer`, de ancho completo en celular.
  - `useSelectedAppointmentId`: guarda la cita en `?appointmentId=`, con `parseAppointmentId` y sus pruebas.
  - Las dos tablas anteriores (`ClinicalNotesTable`, `PrescriptionsTable`) se borraron.
- **Selección por URL:** la cita abierta sale de la URL, así que recargar o compartir el enlace reabre el drawer.
  - Si la cita no está en la página visible de la tabla, el título del drawer sale de las notas o de la receta.
  - Las páginas envuelven la vista en `Suspense`, porque `useSearchParams` lo exige.
- **Datos del drawer:** las notas y la receta se piden con React Query con las mismas claves que el espacio de atención del médico (UI-16): `['clinical-notes', 'appointment', id]` y `['prescription', 'appointment', id]`. Así las dos vistas comparten caché.
  - En la receta, un 404 sigue siendo «todavía sin receta».
  - Crear invalida esa clave y vuelve a pedir la tabla, como antes.
  - Un error al crear se muestra en el drawer; antes quedaba sin manejar.
- **Formularios:** se conservan `ClinicalNoteForm` y `PrescriptionForm`, reestilizados y sin cambiar sus reglas ni sus payloads, en lugar de reutilizar las pestañas de UI-16. La receta del personal tiene «Válida hasta», notas por medicamento y la validación de los cuatro campos obligatorios, que la pestaña del médico no tiene.
- **Estados de la cita:** etiquetas y colores de `views/agenda/status.ts` (vocabulario de `CONTEXT.md`: «Inasistencia», «En curso») en lugar de los propios de cada tabla. La columna dice «Médico», no «Doctor».
- **Historial médico:**
  - las tarjetas usan el patrón `HorizontalWithSubtitle` sin tendencia, porque no hay datos de variación. Son un componente local para no chocar con UI-25, que trae `card-statistics`;
  - la lista pasa de tarjetas a `DataTable` con tamaños 12, 24 y 48. El hook gana `handleLimitChange`;
  - alta, edición y detalle pasan a drawers; la baja usa el `ConfirmDialog` compartido;
  - se borraron `MedicalHistoryKPIs`, `MedicalHistoryList` y `MedicalHistoryDeleteDialog`;
  - los errores de crear, editar, cambiar estado o eliminar, que antes quedaban sin manejar, ahora se avisan con `notify`.
- **Acceso:** las tres rutas piden además `actors={['DOCTOR', 'STAFF']}`. El paciente tiene `READ:CLINICAL_NOTES`, `READ:PRESCRIPTIONS` y `READ:MEDICAL_HISTORY` para lo suyo; con este filtro vuelve a su inicio sin pedir datos.
- **Encabezado «Acciones» alineado a la derecha:** va dentro de un elemento, porque la regla `[align='right'] > *` de `table.module.css` alinea hijos y no texto suelto.
- `SkeletonTable` queda sin uso en estas pantallas pero no se borra aquí: lo borra el último PR de UI-22.

---

## UI-30 — Lista de espera del personal ✅

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

- [x] **Step 1 (rojo/verde):** Pruebas de `toWaitlistRows`: conserva el orden recibido (el servidor ya
  ordena por prioridad y llegada); la posición `#` empieza en 1; médico preferido ausente → "Cualquiera".
- [x] **Step 2:** Si `DataTable` (UI-22) no admite lista completa, agregar ese modo allí con su prueba,
  sin duplicar paginación en esta vista.

### Task 2: Pruebas de navegador

**Files:** Create: `client/tests/e2e/waitlist-staff.spec.ts`

- [x] **Step 1:** `actor: 'RECEPTIONIST'`: filtrar por especialidad envía `specialtyId`; subir prioridad
  envía el `delta` elegido y refresca la lista.
- [x] **Step 2:** `expectAccessible(page)` con el diálogo abierto.
  Run: `cd client && pnpm exec playwright test waitlist-staff` → Expected: PASS.

### Notas de implementación

- **`toWaitlistRows`:** devuelve la posición desde 1, el médico preferido (o «Cualquiera»), la ventana de días con `formatDate` (UTC) y la franja con `TIME_PREFERENCE_LABELS`, en el orden que manda el servidor. Son 3 pruebas en Vitest.
- **Vista:**
  - sigue el patrón `user/list` de Materio, con una tarjeta «Filtros» (especialidad y médico; «Doctor» pasa a «Médico», como dice `CONTEXT.md`);
  - la tabla es `DataTable` en modo de lista completa, sin `pagination`, porque `GET /waitlist` no pagina. Ese modo ya venía en `DataTable` (UI-22), así que no hubo que tocarlo;
  - médico preferido, ventana y franja se ocultan en celular;
  - cada acción tiene nombre accesible («Subir la prioridad de …»).
- **`PriorityDialog`:** toma el estilo de Materio con el mismo payload (`{ delta }` de 1 a 100). El valor se reinicia al cambiar de entrada sin `useEffect`.
- **Pruebas de navegador:** `waitlist-staff.spec.ts` cubre la cola en orden con posición y «Cualquiera», el filtro por especialidad (`specialtyId=2`) y subir la prioridad (`PATCH /waitlist/7/priority {delta: 25}` y vuelve a pedir la cola), con `expectAccessible` en la página y con el diálogo abierto.

---

## Verificación de la fase

- [ ] Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint <archivos tocados> && pnpm test && pnpm build && pnpm test:a11y` → PASS.
- [ ] Run (UI-24): `cd server && pnpm test -- reviews --runInBand && pnpm build` → PASS.
- [ ] Al cerrar la fase, el usuario promueve `staging → main`.
