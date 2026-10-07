# Fase 5 — Registro, expediente y cuenta — Plan de implementación

> **Para agentes:** implementar ítem por ítem con `mattpocock-skills:tdd` (rojo → verde → refactor) y
> cerrar cada PR con `mattpocock-skills:code-review`. Los pasos usan checkbox (`- [ ]`).

**Goal:** Rediseñar el registro del paciente como flujo multi-paso de Materio, el expediente como la
vista de usuario de Materio y la cuenta del usuario como `account-settings` de Materio, sin perder
ninguna validación ni ampliar el acceso a datos clínicos.

**Arquitectura:** El registro conserva su contrato REST (`/auth/check-document`, `/auth/lookup-document`,
`/auth/check-email`, `/auth/register`) y su esquema Zod, que se extrae a un módulo puro probado con
Vitest; la pantalla pasa a ser un orquestador de cuatro pasos sobre el layout `register-multi-steps`.
El expediente sigue leyendo GraphQL (`patientRecord` / `myPatientRecord` por `POST /graphql`) y se
presenta con el patrón "resumen a la izquierda + pestañas a la derecha" de `views/apps/user/view`.

**Stack:** Next.js 16, React 19, MUI 7, Tailwind 4 (solo layout), React Hook Form + Zod,
`libphonenumber-js`, `@mui/lab` (Timeline), Vitest, Playwright + axe.

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) — §7 (UI-20, UI-21,
UI-31), §5.3 (arnés de pruebas), §5.4 (grupo `(shared)`), §6 (restricciones globales);
[ADR-0003](../../adr/0003-materio-v6-sistema-de-diseno.md).

## Restricciones globales

- Rama por ítem desde `origin/staging` actualizado; PR contra `staging`.
- Vocabulario de `CONTEXT.md`: paciente, cita, expediente; ningún texto visible dice "turno" ni "slot".
- Rutas de Materio citadas desde la v5 local (`~/materio-mui-nextjs-admin-template-ts/full-version/src`);
  **confirmar cada una en `~/materio-v6/` antes de copiar**.
- Tailwind solo para layout y espaciado; color, tipografía y estado por el tema MUI.
- Cada pantalla pasa axe WCAG 2.0/2.1 A y AA y conserva el customizer de accesibilidad.
- Lo reemplazado se borra en el mismo PR. Sin features nuevas fuera del ítem.
- Depende de: UI-02 (Vitest + arnés), UI-03 (layout por actor) y UI-04 (páginas de acceso v2).

---

## UI-20 — Registro del paciente en varios pasos

**Rama:** `git fetch origin && git switch -c feat/ui-20-registro-paciente origin/staging`
**Skills:** `mattpocock-skills:tdd`, `mattpocock-skills:code-review`

Estado actual verificado: `client/src/views/Register/RegisterForm.tsx` (685 líneas) ya es un `Stepper`
de 4 pasos (`Identificación`, `Datos Personales`, `Inf. Médica`, `Credenciales`) con un único
`registerSchema` Zod, `STEP_FIELDS` por paso, validaciones asíncronas por paso
(`authService.checkDocument`, `lookupDocument` para autocompletar nombre, `checkEmail`) y envío por
`registerThunk` → `POST /auth/register`. El servidor limita `register` a 3/min, `check-*` a 5/min y
`lookup-document` a 10/min (`server/src/modules/auth/interfaces/controllers/auth.controller.ts:152-252`).

### Task 1: Rama y rutas de la plantilla

**Files:** ninguno.

- [ ] **Step 1:** Crear la rama con el comando de arriba.
- [ ] **Step 2:** Confirmar en `~/materio-v6/` los equivalentes de
  `views/pages/auth/register-multi-steps/{index,StepAccountDetails,StepPersonalInfo,StepBillingDetails}.tsx`,
  `components/stepper-dot/index.tsx` y `@core/styles/stepper.ts`. Si UI-01 ya trajo `stepper-dot` y
  `stepper.ts`, reutilizarlos sin duplicar.

### Task 2: Esquema de registro como módulo puro (TDD)

**Files:**
- Create: `client/src/views/Register/functions/register.schema.ts`
- Create: `client/src/views/Register/functions/register.schema.test.ts`
- Modify: `client/src/views/Register/RegisterForm.tsx` (importa el esquema en lugar de declararlo)

**Interfaces:**
- Produces: `registerSchema`, `RegisterFormValues`, `REGISTER_STEPS` (etiqueta + campos de cada paso),
  `DOCUMENT_TYPES`, `GENDER_OPTIONS`, `BLOOD_TYPE_OPTIONS`.
- Consumes: `zod`, `isValidPhoneNumber` de `libphonenumber-js`.

- [ ] **Step 1 (rojo):** Escribir pruebas Vitest: contraseña sin mayúscula / sin número / < 8 caracteres
  rechazada; `confirmPassword` distinto marca el error en `confirmPassword`; teléfono y contacto de
  emergencia inválidos rechazados; `allergies` de 501 caracteres rechazado; y que la unión de los campos
  de `REGISTER_STEPS` sea exactamente el conjunto de claves de `registerSchema` (ningún campo sin paso).
  Run: `cd client && pnpm test -- register.schema` → Expected: FAIL (módulo inexistente).
- [ ] **Step 2 (verde):** Mover el esquema y las constantes desde `RegisterForm.tsx` sin cambiar reglas
  ni mensajes. Run: `pnpm test -- register.schema` → Expected: PASS.

### Task 3: Flujo multi-paso con el layout de Materio

**Files:**
- Create: `client/src/views/Register/steps/StepIdentification.tsx`
- Create: `client/src/views/Register/steps/StepPersonalData.tsx`
- Create: `client/src/views/Register/steps/StepMedicalInfo.tsx`
- Create: `client/src/views/Register/steps/StepCredentials.tsx`
- Modify: `client/src/views/Register/RegisterForm.tsx` (orquestador: estado de paso, validación por paso, envío)
- Modify: `client/src/views/Register/index.tsx` (layout de dos columnas con ilustración de Materio)
- Modify: `client/src/app/(blank-layout-pages)/register/page.tsx` solo si cambia el import

**Interfaces:**
- Consumes: `useForm<RegisterFormValues>` compartido por todos los pasos (`control`, `trigger`),
  `authService.{checkDocument,lookupDocument,checkEmail}`, `registerThunk`, `InternationalPhoneInput`,
  `PasswordField`.
- Produces: misma navegación post-registro que hoy (redirección por rol tras `selectIsAuthenticated`).

- [ ] **Step 1:** Reemplazar el `Stepper` MUI por el stepper vertical con `StepperWrapper` + `stepper-dot`
  de `register-multi-steps`; 4 pasos MediClick en lugar de los 3 de Materio (Account/Personal/Billing).
- [ ] **Step 2:** Cada componente de paso recibe `control` y renderiza solo sus campos; la validación
  asíncrona (documento disponible + autocompletado, email disponible) queda en el orquestador, igual que
  `validateStep0`/`validateStep1` actuales.
- [ ] **Step 3:** Mensajes de error del servidor (incluido 429) en `Alert` del paso activo; el botón
  "Siguiente" muestra estado de carga mientras corre `checking || lookingUp || isLoading`.
- [ ] **Step 4:** Verificar a mano en modo claro y oscuro, en 375 px y 1440 px.

### Task 4: Prueba de navegador del registro

**Files:**
- Create: `client/tests/e2e/register.spec.ts`

**Interfaces:**
- Consumes: arnés de UI-02 (`api.on`, `expectAccessible`), sin `actor` (ruta pública).

- [ ] **Step 1:** Camino feliz: fixtures `POST /auth/check-document` → `{ available: true }`,
  `POST /auth/lookup-document` → nombre y apellido, `POST /auth/check-email` → `{ available: true }`,
  `POST /auth/register` → `AuthResponse` de PATIENT. Expected: termina en `/patient`.
- [ ] **Step 2:** Documento ya registrado (`available: false`) bloquea el paso 1 con su mensaje.
- [ ] **Step 3:** `POST /auth/register` → 429 muestra el error y no navega.
- [ ] **Step 4:** `expectAccessible(page)` en cada uno de los 4 pasos.
  Run: `cd client && pnpm exec playwright test register` → Expected: PASS.

### Task 5: Verificación y limpieza

- [ ] **Step 1:** Borrar del `RegisterForm.tsx` todo lo que pasó a `functions/` y `steps/`; ningún
  `Stepper`/`StepLabel` de MUI queda importado en `views/Register`.
- [ ] **Step 2:** Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint src/views/Register tests/e2e/register.spec.ts && pnpm test && pnpm build && pnpm test:a11y`
  Expected: todo PASS.
- [ ] **Step 3:** PR contra `staging` con capturas de los 4 pasos (claro/oscuro, móvil/escritorio).

---

## UI-21 — Expediente con la vista de usuario de Materio

**Rama:** `git fetch origin && git switch -c feat/ui-21-expediente origin/staging`
**Skills:** `mattpocock-skills:tdd`, `mattpocock-skills:code-review`

Estado actual verificado: `client/src/views/patient/expediente/index.tsx` acepta `patientId?` pero solo
se monta en `/patient/expediente` (paciente, `myPatientRecord`). El personal no tiene ruta de expediente:
ve datos administrativos en `views/patients/components/PatientDetailDialog.tsx`. Los datos llegan por
`client/src/services/patient-record.service.ts` (GraphQL sobre `POST /graphql`) con perfil, antecedentes
y citas con notas clínicas. `RecordVitalSigns.tsx` es un placeholder "disponible próximamente" sin datos.
El alcance por sede lo aplica el servidor (`PatientRecordQuery`, SDD-001); este ítem no lo modifica.

### Task 1: Rama y rutas de la plantilla

- [ ] **Step 1:** Crear la rama.
- [ ] **Step 2:** Confirmar en `~/materio-v6/` `views/apps/user/view/index.tsx`,
  `user-left-overview/{index,UserDetails}.tsx`, `user-right/index.tsx` y
  `user-right/overview/UserActivityTimeline.tsx`. `UserPlan.tsx` y las pestañas de billing,
  connections y notifications no se copian.

### Task 2: Línea de tiempo de citas como función pura (TDD)

**Files:**
- Create: `client/src/views/patient/expediente/functions/recordTimeline.ts`
- Create: `client/src/views/patient/expediente/functions/recordTimeline.test.ts`

**Interfaces:**
- Consumes: `PatientRecord['appointments']` de `views/patient/expediente/types`.
- Produces: `toRecordTimeline(appointments): RecordTimelineItem[]` — orden descendente por fecha,
  etiqueta de estado con el vocabulario de `CONTEXT.md`, médico, motivo y diagnóstico/plan si hay nota.

- [ ] **Step 1 (rojo):** Pruebas: orden descendente; cita sin nota clínica no inventa diagnóstico;
  `CANCELLED` se rotula "Cancelada" y `NO_SHOW` "Inasistencia"; lista vacía devuelve `[]`.
  Run: `cd client && pnpm test -- recordTimeline` → Expected: FAIL.
- [ ] **Step 2 (verde):** Implementar y pasar las pruebas.

### Task 3: Vista de expediente con el patrón de Materio

**Files:**
- Create: `client/src/views/patient/expediente/components/RecordOverview.tsx` (columna izquierda: avatar,
  nombre, documento, tipo de sangre, contacto de emergencia; adapta `UserDetails.tsx`)
- Create: `client/src/views/patient/expediente/components/RecordTabs.tsx` (pestañas `TabContext`/`TabList`
  de `@mui/lab`: Resumen, Antecedentes, Citas)
- Modify: `client/src/views/patient/expediente/index.tsx` (grilla 4/8 en escritorio, apilada en móvil)
- Modify: `RecordGeneralInfo.tsx`, `RecordMedicalHistory.tsx`, `RecordAppointments.tsx` (contenido de
  pestañas; `RecordAppointments` usa `Timeline` de `@mui/lab` sobre `toRecordTimeline`)
- Delete: `RecordProfileHeader.tsx` (absorbido por `RecordOverview`), `RecordVitalSigns.tsx` (placeholder sin datos)
- Create: `client/src/app/(staff)/patients/[id]/page.tsx` (expediente para el personal con `patientId`)
- Modify: `client/src/views/patients/components/PatientsTable.tsx` (acción "Ver expediente" → `/patients/{id}`)

**Interfaces:**
- Consumes: `usePatientRecord({ patientId? })` sin cambios; permisos `READ:PATIENTS` y
  `READ:MEDICAL_HISTORY` para la ruta del personal (mismo `RoleGuard`/guard de UI-03).
- Produces: `/patient/expediente` (paciente) y `/patients/[id]` (personal) con la misma vista.

- [ ] **Step 1:** Implementar `RecordOverview` y `RecordTabs`; las pestañas se pueden recorrer con teclado.
- [ ] **Step 2:** Ruta del personal dentro del grupo `(staff)` de UI-03; un PATIENT que la abra es
  redirigido por el guard y nunca dispara `patientRecord(id)`.
- [ ] **Step 3:** Estado de error ("Error al cargar el expediente clínico") y de carga con `Skeleton`.

### Task 4: Pruebas de navegador del expediente

**Files:**
- Create: `client/tests/e2e/patient-record.spec.ts`

**Interfaces:**
- Consumes: enrutamiento de `POST /graphql` por `operationName` del arnés de UI-02
  (`MyPatientRecord`, `PatientRecord`); este ítem no modifica `client/tests/support/`.

- [ ] **Step 1:** `actor: 'PATIENT'` en `/patient/expediente` con fixture de `MyPatientRecord`: se ven las
  tres pestañas y la línea de tiempo en orden.
- [ ] **Step 2:** `actor: 'DOCTOR'` en `/patients/7` con fixture de `PatientRecord`: misma vista.
- [ ] **Step 3:** `actor: 'PATIENT'` en `/patients/7`: redirige y no hay llamada a `PatientRecord`.
- [ ] **Step 4:** Respuesta GraphQL con `errors` muestra el mensaje de error.
- [ ] **Step 5:** `expectAccessible(page)` en cada pestaña.
  Run: `cd client && pnpm exec playwright test patient-record` → Expected: PASS.

### Task 5: Verificación y limpieza

- [ ] **Step 1:** `grep -rn "RecordProfileHeader\|RecordVitalSigns" client/src` → Expected: sin resultados.
- [ ] **Step 2:** Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint src/views/patient/expediente src/app/'(staff)'/patients tests/e2e/patient-record.spec.ts && pnpm test && pnpm build && pnpm test:a11y`
  Expected: todo PASS.
- [ ] **Step 3:** PR contra `staging` con capturas de paciente y personal.

---

## UI-31 — Cuenta y notificaciones

**Rama:** `git fetch origin && git switch -c feat/ui-31-cuenta-notificaciones origin/staging`
**Skills:** `mattpocock-skills:tdd`, `mattpocock-skills:code-review`

Estado actual verificado:
- `/profile` (`views/profile/MyProfileView.tsx`, 356 líneas) y la pestaña "Cuenta" de `/settings/account`
  (`views/settings/account/AccountTab.tsx`, 315 líneas) editan **los mismos nueve campos** con
  `authService.getProfile` / `authService.updateProfile`; `MyProfileView` agrega una tarjeta con avatar
  fijo (`/images/avatarSidebar.jpg`) y la etiqueta del rol.
- `/patient/profile` (`views/patient/profile/index.tsx`) solo reexporta `MyProfileView`.
- `/settings/account` (`views/settings/AccountSettings.tsx`) tiene pestañas Cuenta, Seguridad
  (`SecurityTab.tsx`: cambio de contraseña, sesiones por dispositivo, cerrar una o todas) y Notificaciones,
  que **incrusta** la bandeja `views/notifications/index.tsx`; acepta `?tab=`.
- `/notifications` (`views/notifications/index.tsx`, 453 líneas): pestañas todas / sin leer / leídas,
  contador de no leídas, marcar una, marcar todas, eliminar, paginado (`notificationsService`).
- Enlaces: el menú de usuario de `@layouts/components/Navbar.tsx:256` lleva a **todos** los roles a
  `/profile` (y `:268` a `/settings/account`); el menú del paciente (`Navigation.tsx:84`) y su inicio
  (`views/patient/dashboard/index.tsx:120,668`) usan `/patient/profile`. Tras UI-03, `/profile` deja de
  estar en un grupo común y el paciente que lo abre desde el menú de usuario cae fuera de su layout.

Decisión del ítem: una sola pantalla de cuenta, `/settings/account` en el grupo `(shared)`, con pestañas
**Cuenta** y **Seguridad**; la bandeja vive solo en `/notifications` (también `(shared)`). `/profile` y
`/patient/profile` siguen respondiendo como redirecciones a `/settings/account?tab=cuenta`. La pestaña
"Notificaciones" de Materio (preferencias) no se copia: no hay backend de preferencias.

### Task 1: Rama y rutas de la plantilla

- [ ] **Step 1:** Crear la rama.
- [ ] **Step 2:** Confirmar en `~/materio-v6/` `views/pages/account-settings/index.tsx`,
  `account/{index,AccountDetails}.tsx` y `security/{index,ChangePasswordCard,RecentDevicesTable}.tsx`.
  No se copian `AccountDelete`, `TwoFactorAuthenticationCard` (2FA tiene SDD propio), `ApiKeyList`,
  `CreateApiKey`, `billing-plans` ni `connections`.

### Task 2: Pantalla de cuenta con `account-settings`

**Files:**
- Move: `client/src/app/(menu)/settings/account/page.tsx` → `client/src/app/(shared)/settings/account/page.tsx`
- Modify: `client/src/views/settings/AccountSettings.tsx` (pestañas de Materio `CustomTabList`; solo Cuenta y Seguridad)
- Modify: `client/src/views/settings/account/AccountTab.tsx` (estructura de `AccountDetails.tsx`: tarjeta con
  avatar y etiqueta de rol arriba, formulario abajo; absorbe lo único propio de `MyProfileView`)
- Modify: `client/src/views/settings/security/SecurityTab.tsx` (`ChangePasswordCard` + `RecentDevicesTable`
  sobre `authService.getSessions/logoutDevice/logoutAllDevices`)
- Move: `client/src/views/profile/functions/profile.schema.ts` → `client/src/views/settings/account/functions/profile.schema.ts`
- Create: `client/src/views/settings/account/functions/profile.schema.test.ts`
- Delete: `client/src/views/profile/MyProfileView.tsx`, `ProfileDrawer.tsx`, `useProfileForm.ts` (si quedan sin uso),
  `client/src/views/patient/profile/`
- Replace: `client/src/app/(menu)/profile/page.tsx` y `client/src/app/(menu)/patient/profile/page.tsx` por
  `redirect('/settings/account?tab=cuenta')` en `(shared)/profile` y `(patient)/patient/profile`

**Interfaces:**
- Consumes: `authService.{getProfile,updateProfile,changePassword,getSessions,logoutDevice,logoutAllDevices}`,
  `updateUserProfile` del slice de auth, `ActorShell` de UI-03 (layout según rol).
- Produces: `/settings/account?tab=cuenta|seguridad` para todos los actores.

- [ ] **Step 1 (rojo/verde):** Pruebas Vitest de `profile.schema.ts` sin cambiar reglas: teléfono
  internacional inválido rechazado; email con formato inválido rechazado; campos opcionales vacíos válidos.
- [ ] **Step 2:** Un `tab` desconocido abre "Cuenta"; los avisos de éxito usan el toast de UI-03, no
  `SuccessSnackbar`.
- [ ] **Step 3:** Cerrar todas las sesiones mantiene la confirmación actual antes de llamar a `logout-all`.

### Task 3: Bandeja de notificaciones

**Files:**
- Move: `client/src/app/(menu)/notifications/page.tsx` → `client/src/app/(shared)/notifications/page.tsx`
- Modify: `client/src/views/notifications/index.tsx` (lista con el estilo de `NotificationsDropdown` de
  Materio a página completa: avatar por tipo, chip "sin leer", acciones con `option-menu`)

- [ ] **Step 1:** Conservar: pestañas todas / sin leer / leídas, contador, marcar una, marcar todas,
  eliminar con actualización optimista, paginado.
- [ ] **Step 2:** El dropdown de la navbar (UI-03) y esta página comparten `notificationsService`; marcar
  como leída en una refresca el contador de la otra (misma query key de React Query).

### Task 4: Enlaces a la cuenta

**Files:**
- Modify: menú de usuario de UI-03 (`UserDropdown` o el equivalente que reemplazó a `Navbar.tsx:250-270`)
- Modify: `navigationFor` de UI-03 (acceso "Perfil" de la barra inferior y del menú del paciente)
- Modify: `client/src/views/patient/dashboard/index.tsx` (o su reemplazo de UI-11) en las líneas que llevan a `/patient/profile`

- [ ] **Step 1:** Si tras UI-03 sigue existiendo un enlace a `/profile` o `/patient/profile`, apuntarlo a
  `/settings/account?tab=cuenta`; "Configuración" pasa a `?tab=seguridad`.
- [ ] **Step 2:** `grep -rn "'/profile'\|/patient/profile" client/src` → solo las dos páginas de redirección.

### Task 5: Pruebas de navegador

**Files:** Create: `client/tests/e2e/account.spec.ts`

- [ ] **Step 1:** `actor: 'PATIENT'` y `actor: 'DOCTOR'` abren `/settings/account` con su layout (horizontal
  y vertical); guardar "Cuenta" envía `PATCH` de perfil con el payload esperado.
- [ ] **Step 2:** `/profile` y `/patient/profile` redirigen a `/settings/account?tab=cuenta`.
- [ ] **Step 3:** Seguridad: cambio de contraseña con confirmación distinta no envía la request; cerrar una
  sesión llama `POST /auth/logout` con su `deviceId`.
- [ ] **Step 4:** `/notifications`: marcar todas llama `PATCH` de marcar todas y el contador queda en 0.
- [ ] **Step 5:** `expectAccessible(page)` en Cuenta, Seguridad y Notificaciones, en ambos layouts.
  Run: `cd client && pnpm exec playwright test account` → Expected: PASS.

### Task 6: Verificación y limpieza

- [ ] **Step 1:** `grep -rn "MyProfileView\|views/patient/profile" client/src` → sin resultados.
- [ ] **Step 2:** Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint src/views/settings src/views/notifications src/app/'(shared)' tests/e2e/account.spec.ts && pnpm test && pnpm build && pnpm test:a11y`
  Expected: todo PASS.
- [ ] **Step 3:** PR contra `staging` con capturas en ambos layouts.
