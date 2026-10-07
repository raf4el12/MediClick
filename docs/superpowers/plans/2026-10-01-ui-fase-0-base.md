# UI Fase 0 — Base Materio: plan de implementación

> **Para agentes:** cada ítem UI-NN es un PR independiente contra `staging`. Ejecutá las tareas en
> orden con las skills indicadas; los pasos usan checkbox (`- [ ]`) para seguimiento.

**Objetivo:** dejar el cliente sobre la base visual de Materio v5 adaptada (tema, Tailwind 3.4, menú, layouts
por actor, customizer con accesibilidad, páginas de acceso) y con un arnés de pruebas que permita
verificar cada pantalla de las fases siguientes sin backend real.

**Arquitectura:** Materio v5 (adaptada a MUI 7 / React 19 al copiar) aporta `@core`, `@layouts`, `@menu`, `libs/styles` y el tema MUI con
`colorSchemes` + `cssVariables`. Tailwind 3.4 se carga sin preflight y con `important: '#__next'`,
como hace Materio, para que MUI conserve su orden de inyección. Dos grupos de rutas eligen el
layout por actor sin cambiar URLs; el menú sale de una función pura `navigationFor(actor, can)`.
Vitest prueba la lógica pura; Playwright prueba pantallas contra REST simulado con `page.route`.

**Stack:** Next 16.1, React 19.2, MUI 7.3 (`@mui/lab@7.0.1-beta.21`), Tailwind 3.4 +
`tailwindcss-logical@3`, Emotion 11, Vitest, Playwright + `@axe-core/playwright`, pnpm 10.28.

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) §5.3, §5.4, §6 y
§7 (UI-01 a UI-04); [ADR-0003](../../adr/0003-materio-sistema-de-diseno.md);
[investigación](../../research/2026-10-01-materio-stack-compatibility.md) §1, §3 y §4.

## Restricciones globales

- Rama por ítem: `git fetch origin && git switch -c feat/ui-NN-<tema> origin/staging`; PR contra
  `staging`. Nunca desde el `main` local.
- Rutas de Materio: v5 local
  (`/home/rafael/materio-mui-nextjs-admin-template-ts/full-version/src/…`), con la adaptación del
  Paso 0 en cada archivo copiado.
- Nunca `@latest` para `@mui/*` (apunta a 9.x). Versiones según la investigación.
- Tailwind solo para layout y espaciado; color, tipografía y estados por el tema MUI.
- Texto visible con el vocabulario de `CONTEXT.md`; nada de "slot", "turno" ni "invoice".
- Se conservan Zod, la sesión JWT propia (`middleware.ts`, cookie `accessToken`,
  `persist:auth`) y todas las opciones de accesibilidad del customizer actual.
- Verificación de cada PR (desde `client/`):
  `pnpm exec tsc --noEmit && pnpm build && pnpm exec eslint <archivos tocados> && pnpm test && CI=1 pnpm test:a11y`.
  El `pnpm lint` completo arrastra deuda previa (SDD-023) y no es criterio de este plan.
- Lo que un ítem reemplaza se borra en el mismo PR.

## Paso 0 (una vez, antes de UI-01): plantilla de origen

Base: Materio **v5.0.0** en `~/materio-mui-nextjs-admin-template-ts/full-version` (ADR-0003, enmienda
del 2026-10-06). Las rutas `src/...` de este plan son relativas a esa carpeta.

**Adaptación obligatoria al copiar cada archivo** (la v5 es MUI 6 / React 18 / Next 15):
- `@mui/material/Grid2` → `@mui/material/Grid`; `Grid2Props` → `GridProps`.
- Quitar `[lang]`, `getDictionary`/i18n, `next-auth` (`useSession`) y `valibot` (el cliente valida con Zod).
- Gráficos ApexCharts no se copian: se rehacen con recharts 3.
- Sin `@latest` de `@mui/*` (apunta a 9.x).

---

## UI-01 — Fundación Materio (v5 adaptada)

**Rama:** `feat/ui-01-fundacion-materio` · **Skills:** `codebase-design` · **Depende de:** UI-02

### Task 1: Dependencias fijadas

**Files:**
- Modify: `client/package.json`, `client/pnpm-lock.yaml`
- Create: `client/postcss.config.mjs`

**Interfaces:**
- Produces: Tailwind 3.4 por PostCSS y las dependencias que los componentes de Materio importan.

- [ ] **Step 1:** `cd client && pnpm add @mui/lab@7.0.1-beta.21 classnames react-use @floating-ui/react @mui/utils@^7.3 react-toastify@^10 react-perfect-scrollbar`
- [ ] **Step 2:** `pnpm add -D tailwindcss@~3.4 tailwindcss-logical@^3 postcss autoprefixer`
- [ ] **Step 3:** copiar de la v5 `tailwind.config.ts` (`preflight: false`, `important: '#__next'`,
  plugins `tailwindcss-logical` y `src/@core/tailwind/plugin.ts`) y `postcss.config.mjs`; agregar
  `id='__next'` al `<html>` de `app/layout.tsx`.
- [ ] **Step 4:** `pnpm ls @mui/material @mui/lab react react-dom` → material 7.3.x, lab
  7.0.1-beta.21, React 19.2.x; ninguna advertencia de peer de React 18.

### Task 2: Estilos globales y capas

**Files:**
- Modify: `client/src/app/globals.css`, `client/src/app/layout.tsx`
- Create: `client/src/@core/tailwind/plugin.ts` (copiado de la v5)

**Interfaces:**
- Consumes: `globals.css` de Materio v5 (`@tailwind components; @tailwind utilities;` sin
  `@tailwind base`) y el plugin propio que mapea colores a `var(--mui-…)`.
- Produces: utilidades Tailwind disponibles sin preflight y sin pisar a MUI.

- [ ] **Step 1:** reemplazar la cabecera de `globals.css` por la de la v5, sin `@tailwind base`
  (preflight ya está desactivado en la config).
- [ ] **Step 2:** borrar el reset sin capa actual (`*, *::before, *::after { margin: 0; padding: 0 }`,
  líneas 11-18): MUI `CssBaseline` ya normaliza y ese reset le ganaría a los componentes si
  algún día se activa `enableCssLayer` (investigación §3.5). Conservar las reglas propias de
  accesibilidad (`[data-high-contrast]`, `[data-large-targets]`, `[data-reduce-motion]`, foco
  visible) y moverlas a `@layer base`.
- [ ] **Step 3:** mantener `AppRouterCacheProvider` de `@mui/material-nextjs/v16-appRouter` en
  `app/layout.tsx` **sin** `enableCssLayer` (enfoque de Materio: MUI sin capa + utilidades con
  `important: '#__next'`). Documentar la elección en un comentario de una línea en `globals.css`.
- [ ] **Step 4:** verificación visual rápida: `pnpm dev`, abrir `/login` y `/dashboard` en claro y
  oscuro; botones, inputs y cards conservan padding y radio de MUI.

### Task 3: Tema Materio con variables CSS y primario AA

**Files:**
- Modify: `client/src/@core/theme/{index.ts,colorSchemes.ts,shadows.ts,customShadows.ts,spacing.ts,typography.ts,theme.d.ts}`,
  `client/src/@core/theme/overrides/index.ts`, `client/src/configs/{themeConfig,primaryColorConfig}.ts`,
  `client/src/components/Providers.tsx`
- Create: los overrides que faltan en `client/src/@core/theme/overrides/` (v5 tiene 37:
  `accordion`, `alerts`, `autocomplete`, `avatar`, `backdrop`, `badges`, `breadcrumbs`, …,
  `timeline`, `toggle-button`, `tooltip`, `typography`); se reemplazan los 8 actuales
  (`alert`, `button`, `card`, `chip`, `dialog`, `input`, `paper`).
- Create: `client/src/configs/primaryColorConfig.test.ts`

**Interfaces:**
- Consumes: `src/@core/theme/**` y `src/components/theme/index.tsx` de Materio v5.
- Produces: `createTheme({ cssVariables: { colorSchemeSelector: 'data' }, colorSchemes, … })` y
  `ThemeProvider forceThemeRerender` (investigación §1, punto 4); variables `--mui-*` disponibles.

- [ ] **Step 1 (RED):** escribir `primaryColorConfig.test.ts` (Vitest, ya disponible por UI-02: `pnpm test`): para cada preset, contraste WCAG del
  `main` con `#FFFFFF` ≥ 4,5 y como texto sobre `#F4F5FA` y sobre `background.paper` ≥ 4,5. Con
  los presets de Materio (`#8C57FF` 4,27; `#0D9394` 3,74; `#EB3D63` 3,90; `#FFAB1D` 1,89;
  `#2092EC` 3,29) falla.
- [ ] **Step 2 (GREEN):** `primaryColorConfig.ts` con `#7E4EE6` como primer preset (`main`) y los
  demás oscurecidos hasta pasar o eliminados. `colorSchemes.ts` de Materio con `primary.main`
  `#7E4EE6`.
- [ ] **Step 3:** portar el modo alto contraste: hoy `coreTheme` sobrescribe la paleta cuando
  `settings.highContrast` (`@core/theme/index.ts:37`); con `colorSchemes` se aplica como
  transformación de ambos esquemas antes de `createTheme`. Conservar el efecto que inyecta
  `data-high-contrast`, `data-large-targets`, `data-reduce-motion`, `data-color-blind` y el
  `fontSize` raíz en `Providers.tsx`.
- [ ] **Step 4:** reemplazar en `Providers.tsx` el `useEffect` que copia `--primary-color`,
  `--border-color`, etc. a `:root` por las variables `--mui-*`; buscar consumidores con
  `grep -rn "var(--primary-color\|var(--border-color\|var(--background-" src` y migrarlos.
- [ ] **Step 5:** `pnpm exec tsc --noEmit` → sin errores de `theme.d.ts` (tipos de
  `customShadows`, `lighterOpacity`, etc. de Materio).

### Task 4: Núcleo de layout y menú de Materio

**Files:**
- Create: `client/src/@menu/**`, `client/src/@layouts/{HorizontalLayout.tsx,components/**,styles/**,utils/**}`,
  `client/src/@core/{hooks,styles,utils,components/{mui,option-menu,scroll-to-top}}/**`,
  `client/src/libs/styles/AppReactToastify.tsx`
- Modify: `client/src/@layouts/{VerticalLayout.tsx,LayoutWrapper.tsx,BlankLayout.tsx}`

**Interfaces:**
- Produces: piezas de layout listas para UI-03; todavía no se conectan a las rutas.

- [ ] **Step 1:** copiar desde la v5 aplicando la adaptación del Paso 0: en cada archivo copiado,
  quitar `getDictionary`/`i18n` y `useSession`.
- [ ] **Step 2:** `grep -rln "@mui/material/Grid2\|Grid2Props" src` → vacío.
- [ ] **Step 3:** `pnpm exec tsc --noEmit && pnpm build` → verde con las piezas aún sin usar.

### Task 5: `CLAUDE.md` refleja el stack real

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1:** corregir "Stack": API REST (GraphQL solo para `patientRecord`), MUI 7, Next 16,
  React 19, Tailwind 3.4 + Materio v5 adaptada (link a ADR-0003). Quitar "GraphQL: única API pública" y
  "Mutations GraphQL siempre retornan…"; mantener lo vigente.

### Task 6: Verificación y cierre de UI-01

- [ ] `cd client && pnpm exec tsc --noEmit && pnpm build && CI=1 pnpm test:a11y` → `/` y `/login`
  siguen sin violaciones axe (el primario nuevo no rompe contraste).
- [ ] Borrar los overrides reemplazados y cualquier variable `--primary-color` huérfana.
- [ ] PR `feat/ui-01-fundacion-materio → staging` con capturas claro/oscuro de `/login` y `/dashboard`.

---

## UI-02 — Vitest y arnés de pruebas de navegador

**Rama:** `feat/ui-02-arnes-pruebas` · **Skills:** `tdd` · **Depende de:** — (se adelantó a UI-01) · **Estado:** ✅

### Task 1: Vitest

**Files:**
- Modify: `client/package.json` (script `"test": "vitest run"`), `client/pnpm-lock.yaml`,
  `client/tsconfig.json` (si hace falta `types`)
- Create: `client/vitest.config.ts`

- [ ] **Step 1:** `pnpm add -D vitest vite-tsconfig-paths` (entorno `node`; `jsdom` solo si un test
  lo pide).
- [ ] **Step 2:** `vitest.config.ts` con alias `@/*`, `include: ['src/**/*.test.ts']` y exclusión de
  `tests/**` (Playwright).
- [x] **Step 3:** `pnpm test` → corre `src/utils/timezone.test.ts` (fecha en la zona de la sede) en verde; la prueba de colores llega con UI-01.

### Task 2: Arnés Playwright (§5.3)

**Files:**
- Modify: `client/playwright.config.ts` (`testDir: './tests'`, `testMatch: '**/*.spec.ts'`)
- Create: `client/tests/support/fixtures.ts`, `client/tests/support/api.ts`,
  `client/tests/support/session.ts`, `client/tests/support/accessible.ts`,
  `client/tests/support/defaults/{patient,doctor,receptionist,admin}.ts`,
  `client/tests/support/harness.spec.ts`
- Modify: `client/tests/a11y/public-pages.a11y.spec.ts` (usar `expectAccessible`)

**Interfaces:**
- Consumes: `middleware.ts` (lee la cookie `accessToken` y decodifica `roleName` del payload sin
  verificar firma), `redux-store/index.ts` (persiste `auth` con whitelist `user`,
  `isAuthenticated` en `localStorage['persist:auth']`), `hooks/usePermissions.ts` (permisos
  `"ACTION:SUBJECT"` desde `user.permissions`), `libs/axios.ts` (`baseURL = NEXT_PUBLIC_API_URL`,
  `withCredentials`, refresh en 401 vía `POST /auth/refresh-token`).
- Consumes: `libs/graphql.ts` (`graphqlQuery` hace `POST /graphql` con `{ query, variables }`, **sin
  `operationName`**; las consultas vigentes son `patientRecord` y `myPatientRecord` en
  `services/patient-record.service.ts`).
- Produces: `test.use({ actor })`, fixture `api` con `api.on('METHOD /ruta', fixture | handler)` y
  `api.on('GQL <campoRaíz>', fixture | handler)` (p. ej. `api.on('GQL patientRecord', …)`),
  `expectAccessible(page)`.
- **Limitación:** `page.route` solo intercepta pedidos del navegador. Los `fetch` que hace el
  servidor de Next durante SSR no pasan por Playwright; las páginas públicas renderizadas en el
  servidor (UI-27) usarán un servidor stub propio apuntado por `NEXT_PUBLIC_API_URL`, no este
  arnés.

- [ ] **Step 1 (RED):** `harness.spec.ts` con tres casos: (a) con `actor: 'PATIENT'`, `goto('/patient')`
  no redirige a `/login`; (b) una pantalla que pide un endpoint sin fixture falla con un mensaje
  que contiene método y ruta; (c) `api.on('GET /notifications/unread-count', { count: 3 })` se
  refleja en la UI.
- [ ] **Step 2:** `session.ts`: arma un JWT sin firmar `base64url(header).base64url({ sub, roleName, clinicId, exp }).x`,
  lo agrega con `context.addCookies` como `accessToken` para `localhost`, y siembra
  `localStorage['persist:auth']` con `{ user, isAuthenticated: 'true', _persist }` vía
  `addInitScript`, usando los permisos del actor.
- [ ] **Step 3:** `api.ts`: `page.route(\`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5100'}/**\`)`;
  resuelve contra el mapa del test y luego contra `defaults/<actor>.ts`; sin coincidencia,
  `route.abort()` y registra `"REST sin fixture: GET /ruta"` en una lista que el fixture verifica
  vacía en `afterEach`.
- [ ] **Step 3b:** `POST /graphql` se enruta por operación: clave `GQL <nombre>`, donde `<nombre>` es
  `body.operationName` si viene, o el primer campo raíz parseado de `body.query` (hoy
  `patientRecord` / `myPatientRecord`). Sin fixture → mismo fallo explícito
  (`"GraphQL sin fixture: patientRecord"`). Agregar a `harness.spec.ts` un caso que lo cubra.
- [ ] **Step 4:** `defaults/<actor>.ts`: respuestas mínimas que pide el shell (`POST /auth/refresh-token`,
  `GET /notifications/unread-count`, perfil del usuario) con permisos tomados de
  `tests/fixtures/role-permissions.json` (Task 1 de UI-03 lo crea; aquí, un stub con el
  subconjunto que usan los tests).
- [ ] **Step 5:** `accessible.ts`: `expectAccessible(page)` con `AxeBuilder.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa'])`
  y el formateador de violaciones que hoy vive en `public-pages.a11y.spec.ts`.
- [ ] **Step 6 (GREEN):** `CI=1 pnpm test:a11y` → los tres casos y las dos páginas públicas pasan.

### Task 3: CI

**Files:**
- Modify: `.github/workflows/ci.yml` (job `client`)

- [ ] Agregar `- name: Unit tests` / `run: pnpm test` después de `Type-check`. `NEXT_PUBLIC_API_URL`
  ya está en el `env` del job (`http://localhost:5100`), que es el host que intercepta el arnés.

### Task 4: Verificación y cierre de UI-02

- [ ] `pnpm exec tsc --noEmit && pnpm test && CI=1 pnpm test:a11y` → verde.
- [ ] Borrar el formateador duplicado de `public-pages.a11y.spec.ts`.

---

## UI-03 — Layout por actor, navbar, avisos y customizer

**Rama:** `feat/ui-03-layout-por-actor` · **Skills:** `codebase-design` + `tdd` · **Depende de:** UI-01, UI-02

### Task 1: `navigationFor(actor, can)` (núcleo puro, TDD)

**Files:**
- Create: `client/src/configs/navigation.ts`, `client/src/configs/navigation.test.ts`,
  `client/tests/fixtures/role-permissions.json`
- Modify: `server/src/shared/domain/enums/rbac-policy.spec.ts`

**Interfaces:**
- Consumes: el arreglo `navigationItems` y los filtros `patientOnly`/`staffOnly`/`doctorOnly` de
  `@layouts/components/Navigation.tsx:47-258`; el mapa de títulos de `@layouts/components/Navbar.tsx:36-55`.
- Produces: `navigationFor(actor: 'PATIENT' | 'STAFF' | 'DOCTOR', can: (action, subject) => boolean): { sections: NavSection[]; bottomNav?: NavLink[] }`.

- [ ] **Step 1:** `role-permissions.json` = copia de `ROLE_PERMISSIONS` (`server/prisma/rbac-policy.ts:94`).
  El cliente no puede importar ese archivo (depende de enums de Prisma); en su lugar, agregar a
  `rbac-policy.spec.ts` un caso que lee el JSON y exige igualdad con `ROLE_PERMISSIONS`, para
  detectar desvíos.
- [ ] **Step 2 (RED):** `navigation.test.ts`, tabla por rol con `can` construido desde el JSON:
  PATIENT ve exactamente Inicio, Mis citas, Reservar, Lista de espera, Expediente, Perfil y
  Notificaciones, y su `bottomNav` es Inicio, Reservar, Mis citas, Perfil; DOCTOR ve `/doctor` y
  `/doctor/appointments` y no ve `/payments`; RECEPTIONIST no ve `/roles`; ADMIN ve
  Configuración completa; ningún rol recibe una sección vacía.
- [ ] **Step 3 (GREEN):** mover los datos a `navigation.ts` con íconos `ri-*` y títulos; un solo
  lugar para el título de cada ruta (reemplaza el mapa de `Navbar.tsx`).

### Task 2: Grupos de rutas por actor

**Files:**
- Create: `client/src/app/(staff)/layout.tsx`, `client/src/app/(patient)/layout.tsx`,
  `client/src/app/(shared)/layout.tsx`, `client/src/@layouts/components/ActorShell.tsx`,
  `client/src/@layouts/components/BottomNav.tsx`
- Move (git mv, sin cambiar URL): `app/(menu)/patient/**` → `app/(patient)/patient/**`;
  `app/(menu)/{notifications,settings}/**` → `app/(shared)/…`; el resto de `app/(menu)/*`
  (`dashboard`, `doctor`, `appointments`, `patients`, `doctors`, `clinical-notes`, `prescriptions`,
  `medical-history`, `schedules`, `availability`, `schedule-blocks`, `holidays`, `clinics`,
  `specialties`, `categories`, `users`, `roles`, `payments`, `reports`, `waitlist`, `profile`) →
  `app/(staff)/…`, junto con `error.tsx` y `loading.tsx` (una copia por grupo).
- Delete: `client/src/app/(menu)/layout.tsx`

**Interfaces:**
- `(staff)`: layout vertical de Materio con menú desde `navigationFor`.
- `(patient)`: `HorizontalLayout` en escritorio + `BottomNav` (`md` hacia abajo), que oculta el
  menú horizontal.
- `(shared)`: `/notifications` y `/settings/account` los usan ambos actores con la misma URL; su
  layout renderiza `ActorShell`, que elige el shell del rol del usuario.
- Los tres conservan `SkipToContent` y el `id` del contenido principal que usa el skip-link.

- [ ] **Step 1 (RED):** `tests/e2e/shell.spec.ts` con el arnés: PATIENT en `/patient` ve menú
  horizontal en 1280px y barra inferior en 390px; STAFF en `/dashboard` ve menú vertical;
  ambos en `/notifications` ven su propio shell; `expectAccessible` en las tres.
- [ ] **Step 2 (GREEN):** implementar layouts y mover rutas. `git diff --stat -M` debe mostrar
  renombres, no reescrituras de páginas.
- [ ] **Step 3:** `grep -rn "patientOnly\|staffOnly\|doctorOnly" src` → vacío.

### Task 3: Navbar, dropdowns y avisos

**Files:**
- Create: `client/src/components/layout/shared/{UserDropdown,NotificationsDropdown,ModeDropdown}.tsx`
  (desde Materio, sin `LanguageDropdown`, `ShortcutsDropdown` ni `search`, fuera de alcance)
- Modify: `client/src/components/Providers.tsx` (montar `AppReactToastify`), los 19 archivos que
  importan `SuccessSnackbar` o `useSnackbar` (`grep -rln "SuccessSnackbar\|useSnackbar" src`)
- Delete: `client/src/@layouts/components/{Navigation,Navbar,NotificationDropdown,Footer}.tsx`,
  `client/src/components/shared/SuccessSnackbar.tsx`, `client/src/hooks/useSnackbar.ts`

**Interfaces:**
- `NotificationsDropdown` conserva el comportamiento de `NotificationDropdown.tsx` (410 líneas):
  conteo de no leídas, marcar como leída, enlace a `/notifications`; solo cambia la presentación.
- Avisos: `toast.success/error` de `react-toastify` con `AppReactToastify`.
- `UserDropdown` enlaza "Mi perfil" según el actor: hoy `Navbar.tsx:256` envía a todos a
  `/profile`, incluido el paciente, que tiene `/patient/profile`.

- [ ] **Step 1:** migrar `useSnackbar` → `toast` archivo por archivo; `pnpm exec tsc --noEmit` tras
  cada lote.
- [ ] **Step 2:** prueba en `shell.spec.ts`: el contador de no leídas refleja el fixture y
  "Marcar como leída" llama `PATCH` al endpoint actual (verificar ruta en
  `services/notifications*.service.ts`).

### Task 4: Customizer Materio con sección de accesibilidad

**Files:**
- Modify: `client/src/@core/components/customizer/{index.tsx,styles.module.css}`,
  `client/src/@core/contexts/{settingsContext.tsx,settingsTypes.ts}`, `client/src/@core/hooks/useSettings.ts`
- Keep: `client/src/@core/components/accessibility/{ColorBlindFilters,SkipToContent}.tsx`

**Interfaces:**
- Consumes: customizer de Materio (modo, skin, semiDark, layout, ancho de contenido, presets de
  color) y el actual (`settingsTypes.ts`: `fontSize`, `highContrast`, `largeTargets`,
  `reduceMotion`, `colorBlindMode`).
- Produces: un solo customizer con secciones Apariencia, Layout y Accesibilidad; la cookie
  `mediclick-settings` sigue siendo la fuente; sin opción de dirección RTL.

- [ ] **Step 1:** `Settings` agrega lo que Materio necesite (`navbar`, `footer`) sin quitar campos
  de accesibilidad; `layout` admite `'horizontal'` solo para el grupo `(patient)` (el customizer
  oculta la opción de layout al paciente).
- [ ] **Step 2:** prueba e2e: activar alto contraste, tamaño de letra grande y movimiento
  reducido desde el customizer cambia `data-high-contrast`, `font-size` raíz y
  `data-reduce-motion` en `<html>`; `expectAccessible` con alto contraste activo.

### Task 5: Verificación y cierre de UI-03

- [ ] `pnpm exec tsc --noEmit && pnpm build && pnpm exec eslint <archivos tocados> && pnpm test && CI=1 pnpm test:a11y`.
- [ ] `cd ../server && pnpm test -- rbac-policy --runInBand` → el caso de igualdad con el JSON pasa.
- [ ] Borrar `app/(menu)/` completo y los componentes listados en Task 3.

---

## UI-04 — Páginas de acceso y de error

**Rama:** `feat/ui-04-paginas-acceso` · **Skills:** `tdd` · **Depende de:** UI-03

### Task 1: Login, recuperar y restablecer contraseña (v2)

**Files:**
- Modify: `client/src/views/Login/{index.tsx,LoginForm.tsx}`, `client/src/views/ForgotPassword/index.tsx`,
  `client/src/views/ResetPassword/index.tsx`, `client/src/@layouts/BlankLayout.tsx`
- Create: `client/public/images/illustrations/auth/` (ilustraciones v2 claro/oscuro de Materio)

**Interfaces:**
- Consumes: `views/pages/auth/{LoginV2,ForgotPasswordV2,ResetPasswordV2}.tsx` de Materio (solo la
  presentación); de MediClick se conservan `loginThunk`, el esquema Zod, `PasswordField`,
  `deviceId` y la redirección por rol de `middleware.ts`.
- `views/Register` **no se toca**: va en UI-20.

- [ ] **Step 1 (RED):** `tests/e2e/auth.spec.ts`: login exitoso de PATIENT (fixture
  `POST /auth/login`) redirige a `/patient` y de DOCTOR a `/doctor`; credenciales inválidas
  muestran el error del backend; `expectAccessible` en `/login`, `/forgot-password` y
  `/reset-password?token=x`.
- [ ] **Step 2 (GREEN):** portar la presentación v2 manteniendo las etiquetas `Email` y
  `Contraseña`, que usa `tests/a11y/public-pages.a11y.spec.ts`.

### Task 2: 401, 404 y 500

**Files:**
- Modify: `client/src/app/not-found.tsx`, `client/src/app/(blank-layout-pages)/error.tsx`,
  `client/src/app/(staff)/error.tsx`, `client/src/app/(patient)/error.tsx`,
  `client/src/components/shared/RoleGuard.tsx`
- Create: `client/src/app/(blank-layout-pages)/401/page.tsx`, `client/src/views/misc/{NotFound,NotAuthorized,ServerError}.tsx`

**Interfaces:**
- Consumes: `views/{NotFound,NotAuthorized}.tsx` de Materio; Materio no trae página 500, se adapta
  `NotFound` con texto y acción de reintento (`reset()` de `error.tsx`).
- `RoleGuard` hoy redirige a `/patient` o `/dashboard` sin explicar (`RoleGuard.tsx:22-27`): pasa a
  redirigir a `/401`, que ofrece volver al inicio del actor.

- [ ] **Step 1 (RED):** e2e: ruta inexistente → 404 accesible; PATIENT en `/payments` → `/401`;
  un fixture que responde 500 en la carga de una página → pantalla de error con "Reintentar".
- [ ] **Step 2 (GREEN):** implementar; agregar `/401` a `PUBLIC_PATHS` de `middleware.ts` solo si
  la prueba lo exige (con sesión no debería hacer falta).

### Task 3: Respuesta al recordatorio (`/appointment/respond`)

**Files:**
- Modify: `client/src/app/appointment/respond/page.tsx` (página pública a la que llega el enlace del
  recordatorio con su token; hoy usa `Card` MUI suelta)

**Interfaces:**
- Consumes: `BlankLayout` y la presentación de las páginas de acceso v2; se conservan
  `decodeReminderToken` y la llamada de `appointmentsService` tal como están.

- [ ] **Step 1 (RED):** e2e sin sesión: token válido muestra la cita y las acciones de respuesta
  (fixture del endpoint que hoy llama la página); token ilegible muestra el error; `expectAccessible`.
- [ ] **Step 2 (GREEN):** portar la presentación sin cambiar el comportamiento.

### Task 4: Verificación y cierre de UI-04

- [ ] `pnpm exec tsc --noEmit && pnpm build && pnpm exec eslint <archivos tocados> && pnpm test && CI=1 pnpm test:a11y`.
- [ ] Borrar la presentación vieja de login/recuperación y cualquier ilustración sin uso.
- [ ] Al mergear UI-04, la Fase 0 está completa: avisar para promover `staging → main`.
