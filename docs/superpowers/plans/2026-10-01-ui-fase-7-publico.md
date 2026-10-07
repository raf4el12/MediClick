# Fase 7 — Público — Plan de implementación

> **Para agentes:** UI-26 se implementa con `mediclick-tenant-safety`
> (`.agents/skills/mediclick-tenant-safety/SKILL.md`) + `mattpocock-skills:tdd` y cierra con
> `mediclick-core-review`; UI-27 con `mattpocock-skills:tdd`. Cada PR cierra con
> `mattpocock-skills:code-review`. Pasos con checkbox (`- [ ]`).

**Goal:** Exponer sin usuario un perfil público del médico con datos estrictamente profesionales y
reseñas visibles, y reemplazar la landing por las páginas públicas de Materio enlazadas a ese perfil.

**Arquitectura:** Un módulo de lectura nuevo, `public-directory`, concentra en el servidor la lista
blanca de campos públicos, el filtro de médicos activos y de reseñas visibles, y su propio throttle por IP;
no reutiliza los DTO internos de `doctors` ni de `reviews`, que incluyen datos del paciente. En el cliente,
la landing y el perfil se renderizan en el servidor (indexables) bajo un grupo `(public)` con el layout
`front-pages` de Materio.

**Stack:** NestJS + Prisma + `@nestjs/throttler` (storage Redis); Next.js 16 App Router (server
components, `generateMetadata`, revalidación), MUI 7, Tailwind 4, Playwright + axe.

**Spec:** [`docs/SDD-migracion-ui-materio.md`](../../SDD-migracion-ui-materio.md) — §7 (UI-26, UI-27),
§3.2, §6, §8 (riesgo "Datos públicos del médico"); [`CONTEXT.md`](../../../CONTEXT.md) — "Perfil público
del médico", "Reseña oculta".

## Restricciones globales

- Rama por ítem desde `origin/staging` actualizado; PR contra `staging`.
- Rutas de Materio citadas desde la v5 local; **(v5 local, con la adaptación del Paso 0 de la Fase 0) antes de copiar**.
- Ningún dato personal ni clínico sale por un endpoint público: ni del médico (email, teléfono,
  dirección, documento, fecha de nacimiento) ni del paciente autor de una reseña.
- UI-26 está bloqueado hasta que el fix del tracker de throttle (registrado fuera de la migración) esté
  mergeado en `staging` (Task 1 de UI-26). UI-26 se mergea antes que UI-27. UI-27 depende además de UI-04 (páginas de acceso) y de UI-08
  (reserva) para el enlace "Reservar con este médico".

---

## UI-26 — Endpoints públicos del perfil del médico ✅

**Rama:** `git fetch origin && git switch -c feat/ui-26-perfil-publico-api origin/staging`
**Skills:** `mediclick-tenant-safety`, `mattpocock-skills:tdd`, `mediclick-core-review`

Estado verificado:
- No existe decorador `@Public`: una ruta es pública cuando no lleva `@Auth()`
  (`server/src/shared/decorators/auth.decorator.ts`). El throttler global es `GqlThrottlerGuard`
  (`APP_GUARD` en `app.module.ts`, límites `short` 20/s, `medium` 100/10s, `long` 300/min, storage Redis).
- `GqlThrottlerGuard.getTracker` (`server/src/shared/guards/gql-throttler.guard.ts`) usa el `sub` de un JWT
  **decodificado sin verificar**. En una ruta sin `@Auth()`, un cliente que envíe un token forjado con un
  `sub` distinto en cada request obtiene un bucket nuevo cada vez y evade el límite por IP. Hoy afecta a
  `/auth/login`, `/auth/register` y `check-*`; los endpoints de este ítem lo heredarían. La corrección se
  registra **fuera de esta migración**; aquí solo se exige como compuerta (Task 1).
- `GET /reviews/doctor/:id` devuelve `patient { id, name, lastName }` (`review-response.dto.ts`): no sirve
  para uso público.
- Datos disponibles: `Doctors` (`licenseNumber`, `resume`, `ratingAvg`, `ratingCount`, `isActive`,
  `deleted`, `clinicId`), `Profiles` (`name`, `lastName`, `photo` y campos personales), `Clinics`
  (`name`, `address`, `isActive`, `deleted`), `Reviews` (`rating`, `comment`, `isVisible`, `createdAt`).

### Task 1: Compuerta — throttle no evadible con tokens forjados

Este ítem **no implementa** la corrección del tracker; la exige mergeada en `staging` antes de empezar.
Si la compuerta falla, UI-26 queda **bloqueado**: no se crea la rama ni se expone ningún endpoint público.

**Files:** ninguno (solo verificación).

**Interfaces:**
- Consumes: el fix registrado fuera de la migración sobre `server/src/shared/guards/gql-throttler.guard.ts`.
- Produces: evidencia en la descripción del PR de UI-26 (commit del fix y salida de la prueba).

- [ ] **Step 1:** `git fetch origin && git log origin/staging --oneline -- server/src/shared/guards/gql-throttler.guard.ts`
  → Expected: aparece el commit del fix. Si no aparece: detener UI-26 y avisar.
- [ ] **Step 2:** Confirmar que en `origin/staging` existe una prueba del guard (p. ej.
  `server/src/shared/guards/gql-throttler.guard.spec.ts`) que demuestre, como mínimo:
  1. dos tokens con firma inválida y `sub` distintos desde la misma IP producen **el mismo** tracker
     (`ip:<ip>`);
  2. un token con firma inválida nunca produce `user:<sub>`;
  3. sin token, el tracker es `ip:<ip real>` (respetando `trust proxy`);
  4. un token válido y vigente sigue produciendo `user:<sub>` (no se pierde el límite por usuario).
- [ ] **Step 3:** Run en la rama recién creada desde `origin/staging`:
  `cd server && pnpm test -- gql-throttler --runInBand` → Expected: PASS con los cuatro casos.
- [ ] **Step 4:** Prueba de humo opcional contra un servidor local: 10 requests a `POST /auth/login` con
  `Authorization: Bearer <token forjado con sub aleatorio>` desde la misma IP → a partir de la 6.ª
  responde 429 (límite `long` 5/min de login). Si responde 401/400 en todas, la compuerta no está cumplida.

### Task 2: Módulo `public-directory` (TDD)

**Files:**
- Create: `server/src/modules/public-directory/application/public-directory.module.ts`
- Create: `server/src/modules/public-directory/application/dto/public-doctor.dto.ts`
  (`PublicDoctorDto`, `PublicDoctorSummaryDto`, `PublicReviewDto`, `PaginatedPublicDoctorsDto`)
- Create: `server/src/modules/public-directory/application/dto/list-public-doctors-query.dto.ts`
  (`clinicId?`, `specialtyId?`, `searchValue?`, `currentPage`, `pageSize` con `@Max(50)`)
- Create: `server/src/modules/public-directory/application/use-cases/{list-public-doctors,get-public-doctor,list-public-doctor-reviews}.use-case.ts` + `.spec.ts`
- Create: `server/src/modules/public-directory/domain/repositories/public-directory.repository.ts`
- Create: `server/src/modules/public-directory/infrastructure/persistence/prisma-public-directory.repository.ts`
- Create: `server/src/modules/public-directory/interfaces/controllers/public-doctors.controller.ts`
- Modify: `server/src/app.module.ts` (registrar el módulo)

**Interfaces (contrato público):**
- `GET /public/doctors` → `{ rows: PublicDoctorSummaryDto[], totalRows }`
- `GET /public/doctors/:id` → `PublicDoctorDto` o 404
- `GET /public/doctors/:id/reviews?currentPage&pageSize` → `{ rows: PublicReviewDto[], totalRows, ratingAvg, ratingCount }`
- `PublicDoctorDto`: `id`, `name`, `lastName`, `photo`, `resume`, `licenseNumber`, `specialties[{id,name}]`,
  `clinic{id,name,address}`, `ratingAvg`, `ratingCount`. Nada más.
- `PublicReviewDto`: `id`, `rating`, `comment`, `createdAt`. Sin `patientId`, nombre ni `appointmentId`.

- [ ] **Step 1 (rojo):** Specs de los casos de uso con repositorio en memoria:
  1. Una reseña con `isVisible = false` nunca aparece en `reviews` ni cuenta en `ratingCount`.
  2. Médico con `isActive = false`, `deleted = true` o sede inactiva/borrada → no listado y 404 en detalle.
  3. Las claves serializadas de `PublicDoctorDto` y `PublicReviewDto` son exactamente las del contrato
     (prueba de lista blanca: un campo nuevo en Prisma no se filtra solo).
  4. `clinicId` filtra por sede; sin `clinicId` lista médicos de todas las sedes (el paciente es
     multi-sede, `CONTEXT.md`).
  5. `pageSize = 51` → 400.
  Run: `cd server && pnpm test -- public-directory --runInBand` → Expected: FAIL.
- [ ] **Step 2 (verde):** El repositorio usa el cliente Prisma **sin** tenant y con predicados explícitos
  (`isActive`, `deleted`, `clinic.isActive`, `clinic.deleted`, `isVisible`) y `select` explícito; el
  mapeo a DTO no copia objetos completos.
- [ ] **Step 3:** Controlador sin `@Auth()`; `@Throttle` propio para anónimos (p. ej. `long` 60/min por IP);
  cabecera `Cache-Control: public, max-age=300`. Swagger documenta los tres endpoints como públicos.

### Task 3: Revisión de seguridad del ítem

- [ ] **Step 1:** Recorrer el workflow de `mediclick-tenant-safety`: actor anónimo, alcance global
  intencional, ninguna escritura.
- [ ] **Step 2:** `mediclick-core-review` sobre el diff completo.
- [ ] **Step 3:** Run: `cd server && pnpm test -- public-directory --runInBand && pnpm build`
  Expected: PASS. PR contra `staging` con la tabla de campos expuestos en la descripción.

---

## UI-27 — Landing de Materio y perfil público del médico

**Rama:** `git fetch origin && git switch -c feat/ui-27-landing-perfil-publico origin/staging`
**Skills:** `mattpocock-skills:tdd`, `mattpocock-skills:code-review`

Estado verificado: `client/src/app/(landing)/page.tsx` carga `views/landing/index.tsx` (770 líneas,
contenido estático, `framer-motion` solo aquí) con `dynamic(..., { ssr: false })` dentro de `BlankLayout`:
la landing no se renderiza en el servidor. `client/src/middleware.ts` declara `PUBLIC_PATHS`
(`/`, auth, `/payment/*`); cualquier otra ruta sin `accessToken` redirige a `/login`. La prueba
`client/tests/a11y/public-pages.a11y.spec.ts` cubre `/` y `/login`.

### Task 1: Rutas y layout públicos

**Files:**
- Confirmar en `~/materio-mui-nextjs-admin-template-ts/full-version/`: `app/front-pages/layout.tsx`, `components/layout/front-pages/{index,Header,FrontMenu,DropdownMenu,Footer}.tsx`,
  `views/front-pages/landing-page/*`, `views/pages/user-profile/{index,UserProfileHeader}.tsx`,
  `views/pages/user-profile/profile/AboutOverview.tsx`
- Move: `client/src/app/(landing)/` → `client/src/app/(public)/` con `layout.tsx` sobre `components/layout/front-pages`
- Create: `client/src/components/layout/front-pages/*` (adaptado: menú Inicio, Médicos, Ingresar, Registrarse)
- Modify: `client/src/middleware.ts` (`'/medicos'` en `PUBLIC_PATHS`)

- [ ] **Step 1:** El header muestra "Ingresar" sin sesión y "Ir a mi portal" con sesión (ruta por rol de
  `getDefaultRoute`), sin romper la redirección de `AUTH_ONLY_PATHS`.

### Task 2: Cliente del directorio público (TDD)

**Files:**
- Create: `client/src/services/public-directory.service.ts` (fetch del servidor con `next: { revalidate: 300 }`; sin cookies ni `Authorization`)
- Create: `client/src/views/public/functions/doctorProfile.ts` + `doctorProfile.test.ts`

**Interfaces:**
- Consumes: contrato de UI-26.
- Produces: `toDoctorProfileView(dto)` (nombre completo, iniciales si no hay foto, rating con un decimal o
  "Sin reseñas", especialidades) y `bookingHref(doctor, specialtyId?)`.

- [ ] **Step 1 (rojo/verde):** Pruebas: `ratingAvg = null` → "Sin reseñas"; `photo = null` → iniciales;
  `bookingHref` apunta a `/patient/book?doctorId=…` (preselección que debe aceptar el flujo de UI-08) y,
  sin sesión, pasa por `/login?from=…`.

### Task 3: Landing con secciones de Materio

**Files:**
- Modify: `client/src/app/(public)/page.tsx` (server component; sin `dynamic(..., { ssr: false })`)
- Create: `client/src/views/landing/{HeroSection,Features,FeaturedDoctors,Reviews,Faqs,GetStarted}.tsx`
  (adaptan `HeroSection`, `UsefulFeature`, `OurTeam`, `CustomerReviews`, `Faqs`, `GetStarted`)
- Delete: `client/src/views/landing/index.tsx` monolítico; quitar `framer-motion` de `package.json` si queda sin uso
- No se copian: `Pricing` (no hay planes publicados), `ContactUs` (no hay endpoint de contacto), `ProductStat` (sin datos)

- [ ] **Step 1:** `FeaturedDoctors` lee `GET /public/doctors?pageSize=4` en el servidor; si falla, la
  sección no se muestra y la landing sigue respondiendo 200.
- [ ] **Step 2:** `Reviews` muestra reseñas visibles sin nombre de paciente; si se usa carrusel, debe
  poder pausarse y respetar "reducir movimiento" del customizer de accesibilidad.
- [ ] **Step 3:** Textos con el vocabulario de `CONTEXT.md` (cita, cupo, reserva en línea, sede).

### Task 4: Directorio y perfil público

**Files:**
- Create: `client/src/app/(public)/medicos/page.tsx` (lista con filtros de sede y especialidad por query string)
- Create: `client/src/app/(public)/medicos/[id]/page.tsx` (+ `generateMetadata`; `notFound()` ante 404)
- Create: `client/src/views/public/DoctorProfile/{index,DoctorProfileHeader,DoctorAbout,DoctorReviews}.tsx`
  (adaptan `user-profile` + `UserProfileHeader` + `AboutOverview`)

- [ ] **Step 1:** Encabezado con foto, nombre, especialidades y sede; "Acerca de" con resumen y n.º de
  colegiatura; reseñas paginadas; botón "Reservar con este médico" (`bookingHref`).
- [ ] **Step 2:** Médico inexistente o inactivo → página 404 de UI-04.

### Task 5: Pruebas de navegador

**Files:**
- Create: `client/tests/support/stub-api-server.ts` (servidor HTTP mínimo con fixtures de `/public/doctors*`)
- Modify: `client/playwright.config.ts` (segundo `webServer` para el stub y `NEXT_PUBLIC_API_URL` apuntando a él
  en el arranque de Next de las pruebas públicas)
- Create: `client/tests/e2e/public-pages.spec.ts`
- Modify: `client/tests/a11y/public-pages.a11y.spec.ts` (agregar `/medicos` y `/medicos/1`)

`page.route` del arnés de UI-02 no intercepta los `fetch` que hace el servidor de Next; por eso las
páginas renderizadas en servidor necesitan el stub.

- [ ] **Step 1:** `/` responde con hero y médicos destacados; con el stub caído la landing sigue en 200.
- [ ] **Step 2:** `/medicos/1` muestra el perfil y ninguna respuesta contiene `email`, `phone` ni
  `patient`; `/medicos/999` muestra 404.
- [ ] **Step 3:** Sin sesión, "Reservar con este médico" lleva a `/login?from=%2Fpatient%2Fbook%3FdoctorId%3D1`.
- [ ] **Step 4:** axe AA en `/`, `/medicos` y `/medicos/1`, modo claro y oscuro.
  Run: `cd client && pnpm exec playwright test public-pages && pnpm test:a11y` → Expected: PASS.

### Task 6: Verificación y limpieza

- [ ] Run: `cd client && pnpm exec tsc --noEmit && pnpm exec eslint <archivos tocados> && pnpm test && pnpm build`
  → PASS; `grep -rn "framer-motion" client/src` vacío si se quitó la dependencia.
- [ ] Lighthouse manual de `/` y `/medicos/1`: contenido presente en el HTML inicial (SSR).
- [ ] PR contra `staging`. Al cerrar la fase, el usuario promueve `staging → main`.
