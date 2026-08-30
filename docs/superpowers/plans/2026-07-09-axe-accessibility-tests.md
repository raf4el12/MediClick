# Accesibilidad automatizada con axe-core (Playwright) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suite de tests Playwright + `@axe-core/playwright` que valida WCAG 2.1 AA en 5 pantallas clave (login + 1-2 por rol: ADMIN, DOCTOR, PATIENT) y genera un reporte HTML navegable como evidencia para presentar el proyecto.

**Architecture:** `client/` no tiene ningún framework de test instalado — se agrega Playwright desde cero, scopeado solo a `client/` (cada paquete del repo maneja sus propias deps, no hay pnpm workspace real en la raíz). Cada test: (1) navega/loguea, (2) espera a que el contenido cargue (patrón `.MuiSkeleton-root` presente en todas las vistas objetivo), (3) corre `AxeBuilder` con tags WCAG 2.0/2.1 A+AA, (4) escribe el resultado crudo a JSON + reporte HTML individual vía `axe-html-reporter`, (5) falla el test si hay violaciones. Un `globalTeardown` arma un `index.html` que resume las 5 páginas.

**Tech Stack:** `@playwright/test`, `@axe-core/playwright`, `axe-html-reporter` (todas devDependencies de `client/`).

## Global Constraints

- Todo el trabajo va en `client/` — no tocar `server/`.
- Base URL del front: `http://localhost:3000` (Next.js default). API: `http://localhost:5100` (`client/.env.local`).
- Requiere Postgres (`mediclick-db`, puerto 5436) y Redis (`mediclick-redis`) sanos vía `docker compose` en `server/`, y el server (`cd server && pnpm dev`) corriendo — el login real pega contra la API.
- Credenciales seed (`server/prisma/seed.ts`, password `123456` para todas):
  - `admin@mediclick.com` → Super Admin → tras login cae en `/dashboard`.
  - `ramirez@mediclick.com` → Doctor Cardiólogo → `/doctor/appointments`.
  - `juan@gmail.com` → Paciente → `/patient` y `/patient/book`.
- Login: `/login`, campos con label accesible `Email` / `Contraseña` (MUI `TextField`/`PasswordField`), botón `Iniciar Sesión`. Cookie de sesión: `accessToken` (`client/src/middleware.ts:35`).
- Estándar objetivo: WCAG 2.1 AA (mismo que el sistema de accesibilidad ya existente en `client/src/app/globals.css` — no reconstruir ese sistema, solo validarlo).
- No agregar scripts ni dependencias fuera de lo listado. No crear reportes narrativos en Markdown/PDF aparte — el entregable es la suite + el HTML generado.

---

### Task 1: Instalar y configurar Playwright + axe-core

**Files:**
- Modify: `client/package.json` (nuevas devDependencies + scripts)
- Create: `client/playwright.config.ts`
- Modify: `client/.gitignore`

**Interfaces:**
- Produces: comando `pnpm test:a11y` (corre `playwright test`), config con `testDir: './tests/a11y'`, `baseURL: 'http://localhost:3000'`, `globalTeardown: './tests/a11y/report/buildIndex.ts'`, proyecto único `chromium`.

- [ ] **Step 1: Instalar dependencias**

```bash
cd client && pnpm add -D @playwright/test @axe-core/playwright axe-html-reporter
```

- [ ] **Step 2: Instalar el browser de Playwright**

```bash
cd client && pnpm exec playwright install chromium --with-deps
```

Expected: descarga Chromium sin errores (puede pedir sudo para deps del sistema en Linux; si falla por permisos, correr sin `--with-deps` y usar el Chromium ya presente en el sistema).

- [ ] **Step 3: Crear `client/playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/a11y',
  fullyParallel: false,
  retries: 0,
  reporter: [['html', { outputFolder: 'playwright-report', open: 'never' }]],
  globalTeardown: './tests/a11y/report/buildIndex.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

`fullyParallel: false` es intencional: los tests hacen login real contra la API con usuarios seed distintos, y el proyecto ya tiene throttle por usuario — correr todo secuencial evita ruido.

- [ ] **Step 4: Agregar script en `client/package.json`**

Dentro de `"scripts"` (junto a `"lint"`):

```json
"test:a11y": "playwright test"
```

- [ ] **Step 5: Ignorar artefactos generados**

Agregar al final de `client/.gitignore`:

```
# axe-core / playwright
/playwright-report/
/test-results/
/a11y-report/
```

- [ ] **Step 6: Verificar instalación**

```bash
cd client && pnpm exec playwright --version
```

Expected: imprime una versión (ej. `Version 1.5x.x`), sin error de comando no encontrado.

- [ ] **Step 7: Commit**

```bash
git add client/package.json client/pnpm-lock.yaml client/playwright.config.ts client/.gitignore
git commit -m "test(a11y): configurar Playwright + axe-core en client"
```

---

### Task 2: Helper de login por rol

**Files:**
- Create: `client/tests/a11y/helpers/auth.ts`

**Interfaces:**
- Consumes: nada (usa `@playwright/test` `Page`/`expect`).
- Produces: `CREDENTIALS: Record<'admin'|'doctor'|'patient', {email: string; password: string}>` y `loginAs(page: Page, role: 'admin'|'doctor'|'patient'): Promise<void>` — usados por todos los tests de páginas autenticadas (Tasks 5-8).

- [ ] **Step 1: Crear el helper**

```ts
import { Page, expect } from '@playwright/test';

export const CREDENTIALS = {
  admin: { email: 'admin@mediclick.com', password: '123456' },
  doctor: { email: 'ramirez@mediclick.com', password: '123456' },
  patient: { email: 'juan@gmail.com', password: '123456' },
} as const;

export type Role = keyof typeof CREDENTIALS;

export async function loginAs(page: Page, role: Role): Promise<void> {
  const { email, password } = CREDENTIALS[role];
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Iniciar Sesión' }).click();
  await expect(page).not.toHaveURL(/\/login/, { timeout: 10_000 });
}
```

- [ ] **Step 2: Commit**

```bash
git add client/tests/a11y/helpers/auth.ts
git commit -m "test(a11y): helper de login por rol"
```

(Se valida en conjunto con Task 5, primer test que lo consume — no requiere un test propio.)

---

### Task 3: Helper de escaneo axe + reporte

**Files:**
- Create: `client/tests/a11y/helpers/axeScan.ts`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `waitForContentReady(page: Page): Promise<void>` y `scanAndAssert(page: Page, slug: string, pageTitle: string): Promise<void>` — usados por los 5 specs (Tasks 4-8). Escribe `client/a11y-report/raw/<slug>.json` y `client/a11y-report/<slug>.html`.

- [ ] **Step 1: Crear el helper**

```ts
import fs from 'node:fs';
import path from 'node:path';
import { Page, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createHtmlReport } from 'axe-html-reporter';

const RAW_DIR = path.join(process.cwd(), 'a11y-report', 'raw');

export async function waitForContentReady(page: Page): Promise<void> {
  await expect(page.locator('.MuiSkeleton-root')).toHaveCount(0, { timeout: 15_000 });
}

export async function scanAndAssert(page: Page, slug: string, pageTitle: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(RAW_DIR, `${slug}.json`),
    JSON.stringify({ pageTitle, url: results.url, violations: results.violations }, null, 2),
  );

  createHtmlReport({
    results,
    options: { outputDir: 'a11y-report', reportFileName: `${slug}.html` },
  });

  const summary = results.violations
    .map((v) => `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} nodo(s)) — ${v.helpUrl}`)
    .join('\n');

  expect(results.violations, summary).toEqual([]);
}
```

- [ ] **Step 2: Commit**

```bash
git add client/tests/a11y/helpers/axeScan.ts
git commit -m "test(a11y): helper de escaneo axe-core + reporte HTML"
```

(Se valida en conjunto con Task 4, primer test que lo consume.)

---

### Task 4: Test de accesibilidad — Login (sin autenticar)

**Files:**
- Create: `client/tests/a11y/login.a11y.spec.ts`

**Interfaces:**
- Consumes: `scanAndAssert` de Task 3.

- [ ] **Step 1: Escribir el test**

```ts
import { test } from '@playwright/test';
import { scanAndAssert } from './helpers/axeScan';

test.describe('Accesibilidad — Login', () => {
  test('la página de login no tiene violaciones WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').waitFor();
    await scanAndAssert(page, 'login', 'Login');
  });
});
```

- [ ] **Step 2: Levantar dependencias y correr el test**

Requiere Postgres/Redis sanos y el server corriendo en otra terminal:

```bash
cd server && docker compose up -d && pnpm dev &
```

Luego, en `client/`:

```bash
cd client && pnpm test:a11y login.a11y.spec.ts
```

Expected: 1 test pasa, o falla mostrando violaciones concretas (impact/id/help/helpUrl) si el login tiene issues de a11y — en ese caso, anotar y resolver en Task 10.

- [ ] **Step 3: Commit**

```bash
git add client/tests/a11y/login.a11y.spec.ts
git commit -m "test(a11y): escaneo axe de /login"
```

---

### Task 5: Test de accesibilidad — Dashboard Admin

**Files:**
- Create: `client/tests/a11y/admin-dashboard.a11y.spec.ts`

**Interfaces:**
- Consumes: `loginAs` (Task 2), `waitForContentReady` + `scanAndAssert` (Task 3).

- [ ] **Step 1: Escribir el test**

```ts
import { test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { waitForContentReady, scanAndAssert } from './helpers/axeScan';

test.describe('Accesibilidad — Dashboard Admin', () => {
  test('el dashboard de admin no tiene violaciones WCAG 2.1 AA', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/dashboard');
    await waitForContentReady(page);
    await scanAndAssert(page, 'admin-dashboard', 'Dashboard Admin');
  });
});
```

- [ ] **Step 2: Correr el test**

```bash
cd client && pnpm test:a11y admin-dashboard.a11y.spec.ts
```

Expected: 1 test pasa (login real contra la API + escaneo), o falla listando violaciones puntuales.

- [ ] **Step 3: Commit**

```bash
git add client/tests/a11y/admin-dashboard.a11y.spec.ts
git commit -m "test(a11y): escaneo axe del dashboard admin"
```

---

### Task 6: Test de accesibilidad — Citas del Doctor

**Files:**
- Create: `client/tests/a11y/doctor-appointments.a11y.spec.ts`

**Interfaces:**
- Consumes: `loginAs` (Task 2), `waitForContentReady` + `scanAndAssert` (Task 3).

- [ ] **Step 1: Escribir el test**

```ts
import { test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { waitForContentReady, scanAndAssert } from './helpers/axeScan';

test.describe('Accesibilidad — Citas del Doctor', () => {
  test('la vista de citas del doctor no tiene violaciones WCAG 2.1 AA', async ({ page }) => {
    await loginAs(page, 'doctor');
    await page.goto('/doctor/appointments');
    await waitForContentReady(page);
    await scanAndAssert(page, 'doctor-appointments', 'Citas del Doctor');
  });
});
```

- [ ] **Step 2: Correr el test**

```bash
cd client && pnpm test:a11y doctor-appointments.a11y.spec.ts
```

Expected: 1 test pasa o falla con violaciones puntuales.

- [ ] **Step 3: Commit**

```bash
git add client/tests/a11y/doctor-appointments.a11y.spec.ts
git commit -m "test(a11y): escaneo axe de citas del doctor"
```

---

### Task 7: Test de accesibilidad — Dashboard Paciente

**Files:**
- Create: `client/tests/a11y/patient-dashboard.a11y.spec.ts`

**Interfaces:**
- Consumes: `loginAs` (Task 2), `waitForContentReady` + `scanAndAssert` (Task 3).

- [ ] **Step 1: Escribir el test**

```ts
import { test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { waitForContentReady, scanAndAssert } from './helpers/axeScan';

test.describe('Accesibilidad — Dashboard Paciente', () => {
  test('el dashboard del paciente no tiene violaciones WCAG 2.1 AA', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/patient');
    await waitForContentReady(page);
    await scanAndAssert(page, 'patient-dashboard', 'Dashboard Paciente');
  });
});
```

- [ ] **Step 2: Correr el test**

```bash
cd client && pnpm test:a11y patient-dashboard.a11y.spec.ts
```

Expected: 1 test pasa o falla con violaciones puntuales.

- [ ] **Step 3: Commit**

```bash
git add client/tests/a11y/patient-dashboard.a11y.spec.ts
git commit -m "test(a11y): escaneo axe del dashboard paciente"
```

---

### Task 8: Test de accesibilidad — Reservar cita (Paciente)

**Files:**
- Create: `client/tests/a11y/patient-book.a11y.spec.ts`

**Interfaces:**
- Consumes: `loginAs` (Task 2), `waitForContentReady` + `scanAndAssert` (Task 3).

- [ ] **Step 1: Escribir el test**

```ts
import { test } from '@playwright/test';
import { loginAs } from './helpers/auth';
import { waitForContentReady, scanAndAssert } from './helpers/axeScan';

test.describe('Accesibilidad — Reservar cita', () => {
  test('la pantalla de reserva de citas no tiene violaciones WCAG 2.1 AA', async ({ page }) => {
    await loginAs(page, 'patient');
    await page.goto('/patient/book');
    await waitForContentReady(page);
    await scanAndAssert(page, 'patient-book', 'Reservar Cita');
  });
});
```

- [ ] **Step 2: Correr el test**

```bash
cd client && pnpm test:a11y patient-book.a11y.spec.ts
```

Expected: 1 test pasa o falla con violaciones puntuales.

- [ ] **Step 3: Commit**

```bash
git add client/tests/a11y/patient-book.a11y.spec.ts
git commit -m "test(a11y): escaneo axe de reserva de citas"
```

---

### Task 9: Reporte resumen (`index.html`)

**Files:**
- Create: `client/tests/a11y/report/buildIndex.ts`

**Interfaces:**
- Consumes: `client/a11y-report/raw/*.json` escritos por Task 3's `scanAndAssert` durante Tasks 4-8.
- Produces: `client/a11y-report/index.html`, referenciado desde `globalTeardown` en `playwright.config.ts` (Task 1).

- [ ] **Step 1: Crear el generador de reporte**

```ts
import fs from 'node:fs';
import path from 'node:path';

interface RawReport {
  pageTitle: string;
  url: string;
  violations: { id: string; impact: string; help: string; nodes: unknown[] }[];
}

export default function globalTeardown(): void {
  const rawDir = path.join(process.cwd(), 'a11y-report', 'raw');
  if (!fs.existsSync(rawDir)) return;

  const files = fs.readdirSync(rawDir).filter((f) => f.endsWith('.json'));
  const reports = files.map((file) => ({
    slug: file.replace('.json', ''),
    ...(JSON.parse(fs.readFileSync(path.join(rawDir, file), 'utf-8')) as RawReport),
  }));

  const totalViolations = reports.reduce((sum, r) => sum + r.violations.length, 0);
  const pagesWithIssues = reports.filter((r) => r.violations.length > 0).length;

  const rows = reports
    .map((r) => {
      const status = r.violations.length === 0 ? '✅ Sin violaciones' : `❌ ${r.violations.length} violación(es)`;
      return `<tr><td>${r.pageTitle}</td><td><code>${r.url}</code></td><td>${status}</td><td><a href="./${r.slug}.html">Detalle</a></td></tr>`;
    })
    .join('\n');

  const summaryText =
    totalViolations === 0
      ? `Todas las páginas evaluadas (${reports.length}) pasan sin violaciones.`
      : `${totalViolations} violación(es) encontradas en ${pagesWithIssues} de ${reports.length} páginas.`;

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Reporte de accesibilidad — axe-core (WCAG 2.1 AA)</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid #ddd; }
  th { background: #f5f5f5; }
  h1 { margin-bottom: 4px; }
  .summary { color: ${totalViolations === 0 ? '#1a7f37' : '#c0392b'}; font-weight: 600; }
</style>
</head>
<body>
  <h1>Reporte de accesibilidad — MediClick</h1>
  <p>Estándar: WCAG 2.1 AA · Motor: axe-core · Generado: ${new Date().toLocaleString('es-PE')}</p>
  <p class="summary">${summaryText}</p>
  <table>
    <thead><tr><th>Página</th><th>URL</th><th>Resultado</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;

  fs.writeFileSync(path.join(process.cwd(), 'a11y-report', 'index.html'), html);
}
```

- [ ] **Step 2: Correr la suite completa y verificar el reporte**

```bash
cd client && pnpm test:a11y
open a11y-report/index.html   # o: xdg-open a11y-report/index.html
```

Expected: `a11y-report/index.html` existe y lista las 5 páginas con su resultado; cada fila enlaza a su reporte individual (`login.html`, `admin-dashboard.html`, etc.) generado por `axe-html-reporter`.

- [ ] **Step 3: Commit**

```bash
git add client/tests/a11y/report/buildIndex.ts
git commit -m "test(a11y): generar reporte resumen index.html tras la suite"
```

---

### Task 10: Corregir violaciones reales y dejar la suite en verde

Esta es la tarea de cierre: a diferencia de las anteriores, su contenido exacto depende de lo que reporten los axe scans de las Tasks 4-8 contra el código real — no se puede escribir de antemano.

**Files:**
- Modify: los componentes que `a11y-report/raw/*.json` señale (ubicables por el `target` CSS del nodo en cada violación — buscar ese selector/texto en `client/src/views/**` o `client/src/@core/components/**`).

- [ ] **Step 1: Correr la suite completa**

```bash
cd client && pnpm test:a11y
```

- [ ] **Step 2: Por cada test que falle, abrir `client/a11y-report/raw/<slug>.json`**

Cada violación trae `id`, `impact`, `help`, `helpUrl` y `nodes[].target` (selector CSS del elemento infractor) y `nodes[].failureSummary` (qué corregir puntualmente). Localizar el componente fuente por el `target` (ej. un `IconButton` sin `aria-label`, un color de texto que no cumple contraste 4.5:1, un input sin label asociado) y aplicar el fix mínimo indicado por `helpUrl` — sin tocar el sistema de accesibilidad ya existente en `globals.css`/customizer, que es ortogonal a esto.

- [ ] **Step 3: Re-correr el test puntual que falló hasta que pase**

```bash
cd client && pnpm test:a11y <archivo-del-test-corregido>
```

- [ ] **Step 4: Repetir Steps 2-3 hasta que `pnpm test:a11y` completo termine en verde**

Expected final: 5/5 tests pasan, `a11y-report/index.html` muestra "Todas las páginas evaluadas (5) pasan sin violaciones."

- [ ] **Step 5: Commit final por cada fix aplicado**

```bash
git add <archivos-corregidos>
git commit -m "fix(a11y): <descripción puntual de la violación corregida>"
```

(Un commit por violación/componente corregido, no uno solo agrupando todo — facilita revisar qué cambió y por qué en la presentación.)
