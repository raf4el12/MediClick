# Compatibilidad para portar componentes de Materio v5.0.0 a MediClick (MUI 7 / React 19 / Next 16)

**Fecha:** 2026-10-01
**Alcance:** compatibilidad técnica para llevar componentes de la plantilla Materio (`/home/rafael/materio-mui-nextjs-admin-template-ts/full-version`, v5.0.0) al cliente de MediClick (`/home/rafael/MediClick/client`).
**Método:** solo fuentes primarias: docs oficiales, release notes oficiales, el registry de npm (`registry.npmjs.org`), código fuente en GitHub/Codeberg del dueño del proyecto y los tarballs publicados en npm. Las mediciones sobre la plantilla salen de `grep` sobre `full-version/src`. Si algo no se pudo confirmar en una fuente primaria, lo marco como **"no confirmado"**. Lo que deduzco yo (y no dice la fuente) va marcado como **"inferencia"**.

---

## Resumen ejecutivo

1. **ThemeSelection ya publicó Materio para este stack.** Materio **v6.0.0** (2025-11-19) subió Next 15→16, React 18→19, MUI 6→7, Tailwind 3→4 y Tiptap 2→3. La última es **v6.0.2** (2025-12-29) y trae una guía oficial de migración v5→v6 ([changelog](https://demos.themeselection.com/materio-mui-nextjs-admin-template/changelog.html), [guía de migración](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)). **Acción:** si la licencia da acceso a las actualizaciones, conviene portar desde v6.0.2 y no desde la copia local v5.0.0.
2. **Pasar de MUI 6 a 7 es casi mecánico en la plantilla.** 182 archivos usan `Grid2` (181 `import Grid from '@mui/material/Grid2'` y 1 con `Grid2Props`). Las props ya usan la API v2 (`size={{…}}` aparece 812 veces), así que alcanza con cambiar el path a `@mui/material/Grid` y el tipo a `GridProps` ([guía v7](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#grid-and-grid2-renamed)). El codemod `v7.0.0/grid-props` **no** reescribe imports de `Grid2`: solo busca `@mui/material/Grid` ([código fuente](https://github.com/mui/material-ui/blob/v7.3.7/packages/mui-codemod/src/v7.0.0/grid-props/grid-props.js)). No hay usos de APIs que v7 eliminó (`createMuiTheme`, `onBackdropClick`, `Hidden`, deep imports de 2+ niveles: 0 en todos los casos).
3. **`@mui/lab` sigue siendo necesario y hay que fijarle la versión.** 23 archivos importan `TabContext`/`TabList`/`TabPanel`/`Timeline*`, y todos siguen existiendo en lab 7 ([árbol v7.3.7](https://github.com/mui/material-ui/tree/v7.3.7/packages/mui-lab/src)). Con `@mui/material` 7.3.7, la versión que corresponde es **`@mui/lab@7.0.1-beta.21`** (peer `@mui/material ^7.3.7`). El dist-tag `latest-v7` apunta a 7.0.1-beta.25, que exige material ^7.3.11. **Ojo:** `@mui/lab@latest` hoy es 9.0.0-beta.9 y pide `@mui/material ^9.4.0` ([registry](https://registry.npmjs.org/@mui/lab)).
4. **El tema de Materio necesita `cssVariables` de MUI, y MediClick hoy no lo activa.** 179 archivos de la plantilla usan `var(--mui-…)` y su tema usa `cssVariables: { colorSchemeSelector: 'data' }`. El `createTheme` de MediClick no pasa `cssVariables` (`client/src/@core/theme/index.ts`). Sin eso, MUI no genera las variables `--mui-*` ([docs de CSS theme variables](https://v7.mui.com/material-ui/customization/css-theme-variables/usage/)). Además, en v7 el tema ya no se re-renderiza al cambiar de modo cuando hay CSS vars; Materio v6 lo resolvió agregando `forceThemeRerender` ([guía MUI](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#theme-behavior-changes), [guía Materio](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)).
5. **Tailwind: recomiendo Tailwind ≥4.2 con `tailwindcss-logical@5`, como hace Materio v6.** Con eso los nombres de clase de la plantilla (`pli-*`, `is-*`, `bs-*`… en unos 317 archivos) quedan iguales, porque el plugin v5 solo quitó las 8 utilidades que Tailwind 4.2 ya trae con el mismo nombre ([release v5.0.0](https://codeberg.org/stevecochrane/tailwindcss-logical/releases/tag/v5.0.0)). El costo es reescribir `tailwind.config.ts` y el plugin propio a `@theme` en CSS ([guía Materio](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)). La otra opción es Tailwind **3.4.19** (dist-tag `v3-lts`), que funciona con Next 16 vía PostCSS/Turbopack sin tocar la config, pero obliga a migrar dos veces. La diferencia de navegadores soportados entre Tailwind 4 y Next 16 es mínima: solo Firefox 111–127 ([Tailwind](https://tailwindcss.com/docs/upgrade-guide), [Next 16](https://nextjs.org/docs/app/guides/upgrading/version-16#nodejs-runtime-and-browser-support)).
6. **Casi todas las dependencias de terceros aceptan React 19 sin subir de major.** Según su `peerDependencies`, aceptan React 19 en la versión que trae la plantilla: FullCalendar 6.1.15, react-toastify 10.0.6, cmdk 1.0.4, input-otp 1.4.1, react-dropzone 14.3.5, @tiptap/react 2.10.4, recharts 2.15.0 y react-apexcharts 1.4.1. **Excepciones:** `react-datepicker@7.3.0` (peer hasta `^18`; la primera versión con `^19` es la 7.6.0) y `@emoji-mart/react@1.1.1` (peer hasta `^18`, sin releases desde 2023). `react-perfect-scrollbar@1.5.8` declara peer `>=16.3.3`, no publica desde 2020-02-07 y su código no usa APIs que React 19 eliminó. Materio v6 lo sigue listando como dependencia.
7. **ApexCharts ya no es MIT.** Desde `apexcharts@5.2.0` (jul 2025) y `react-apexcharts@1.8.0` la licencia es dual. La Community License es gratis solo para organizaciones con menos de US$2M, y se exige una licencia **OEM** para "embedding ApexCharts into a product or platform used by other people" ([LICENSE](https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE)). La plantilla usa ApexCharts en 54 archivos y MediClick ya tiene recharts 3 (MIT). **Acción:** no portar ApexCharts y rehacer esos gráficos con recharts. Si no queda otra, fijar `apexcharts@≤4.7.0` + `react-apexcharts@≤1.7.0` (MIT) y consultarlo con legal.
8. **recharts 2→3 afecta poco a la plantilla.** Son 6 archivos de demo. Los cambios que pegan son: el tipo del tooltip custom pasa de `TooltipProps` a `TooltipContentProps` (4 archivos), `Cell` está deprecado en 3.x y se elimina en 4.0 (1 archivo), y `accessibilityLayer` queda en `true` por defecto ([guía 3.0](https://github.com/recharts/recharts/wiki/3.0-migration-guide)).

---

## Versiones confirmadas (lectura local)

| Paquete | Plantilla (`full-version/package.json`) | MediClick `client/package.json` | MediClick instalado (`node_modules/<pkg>/package.json`) |
|---|---|---|---|
| `@mui/material` | 6.2.1 | ^7.3.7 | **7.3.7** |
| `@mui/material-nextjs` | 6.2.1 | ^7.3.7 | **7.3.7** |
| `@mui/lab` | 6.0.0-beta.19 | — | no instalado |
| `react` / `react-dom` | 18.3.1 | 19.2.3 | **19.2.3** |
| `next` | 15.1.2 | 16.1.6 | **16.1.6** |
| `recharts` | 2.15.0 | ^3.7.0 | **3.7.0** |
| `@tanstack/react-table` | 8.20.6 | ^8.21.3 | **8.21.3** |
| `remixicon` | — | ^4.9.1 | **4.9.1** |
| `@emotion/react` / `styled` / `cache` | 11.14.0 / 11.14.0 / 11.14.0 | ^11.14.0 / ^11.14.1 / ^11.14.0 | **11.14.0 / 11.14.1 / 11.14.0** |
| `tailwindcss` | 3.4.17 (+ `tailwindcss-logical` 3.0.1) | — | no instalado |

Peers de `@mui/material@7.3.7` instalado: `react ^17 || ^18 || ^19`, `@emotion/react ^11.5.0`, `@emotion/styled ^11.3.0`. Peers de `@mui/material-nextjs@7.3.7`: `next ^13 || ^14 || ^15 || ^16`, y trae los entry points `v13…v16-appRouter` (lectura de `node_modules`; coincide con el [registry](https://registry.npmjs.org/@mui/material-nextjs/7.3.7)).

---

## 1. MUI 6 → 7: breaking changes que afectan a la plantilla

### 1.1 Cambios de v7 y su impacto

| Cambio v7 | Qué dice la fuente | Impacto en la plantilla (medido) |
|---|---|---|
| **Layout del paquete / `exports`** | Los deep imports de más de un nivel dejan de funcionar (ej. `@mui/material/styles/createTheme`) ([guía v7 › Package layout updated](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#package-layout-updated)) | **0** imports de 2+ niveles. Los de un nivel (`@mui/material/Grid2`, `@mui/material/themeCssVarsAugmentation`, etc.) siguen permitidos; `themeCssVarsAugmentation` existe en 7.3.7 |
| **`Grid2` → `Grid`; `Grid` viejo → `GridLegacy`** | `import Grid, { grid2Classes as gridClasses, Grid2Props as GridProps } from '@mui/material/Grid2'` pasa a `… from '@mui/material/Grid'`; `MuiGrid2`→`MuiGrid`, `.MuiGrid2-root`→`.MuiGrid-root` ([guía v7 › Grid and Grid2 renamed](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#grid-and-grid2-renamed)). En el código de v7.3.7 ya no existe `Grid2`; existen `Grid` y `GridLegacy` ([árbol v7.3.7](https://github.com/mui/material-ui/tree/v7.3.7/packages/mui-material/src) frente a [v6.2.1](https://github.com/mui/material-ui/tree/v6.2.1/packages/mui-material/src)) | **182 archivos**: 181 `import Grid from '@mui/material/Grid2'` + `@core/components/custom-inputs/types.ts` (`Grid2Props`, 4 usos). 0 usos de `MuiGrid2`/`grid2Classes`. 812 `<Grid … size=` frente a 0 `item`/`xs=`: **las props ya están en la API v2** |
| **APIs eliminadas** | `createMuiTheme`, `onBackdropClick` (Dialog/Modal), `experimentalStyled`, `Hidden`/`PigmentHidden`, `StyledEngineProvider` desde `@mui/material`, tipo `StepButtonIcon`, clase `MuiRating-readOnly` ([guía v7 › Deprecated APIs removed](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#deprecated-apis-removed)) | **0** usos de cada una |
| **Componentes de lab que pasaron a `@mui/material`** | Alert, AlertTitle, Autocomplete, AvatarGroup, Pagination, PaginationItem, Rating, Skeleton, SpeedDial*, ToggleButton*, usePagination ([guía v7](https://v7.mui.com/material-ui/migration/upgrade-to-v7/)) | **0**: la plantilla solo importa de lab `Tab*`, `Timeline*` y `themeAugmentation` |
| **`InputLabel size="normal"` → `"medium"`** | ([guía v7](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#inputlabel-size-prop-standardized)) | **0** |
| **Path de tipos de `TablePaginationActions`** | ([guía v7](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#tablepaginationactions-types-import-path-changed)) | **0** |
| **Comportamiento del tema con CSS vars** | Con CSS theme variables y light/dark, "the theme no longer changes between modes"; para volver al comportamiento anterior: `<ThemeProvider forceThemeRerender />` ([guía v7 › Theme behavior changes](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#theme-behavior-changes)). La prop existe en los tipos de 7.3.7 (`styles/ThemeProvider.d.ts`) | **Sí afecta.** `src/components/theme/index.tsx` arma el tema con `colorSchemes` + `cssVariables.colorSchemeSelector: 'data'`, y 6 archivos usan `useColorScheme`. Materio v6 agregó `forceThemeRerender` justo en ese archivo ([guía Materio v5→v6](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)) |
| **TypeScript mínimo 4.9** | ([guía v7](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#minimum-typescript-version)) | MediClick usa `typescript ^5`: OK |
| **`react-is` para React ≤18** | Solo aplica con React 18 o menor ([guía v7](https://v7.mui.com/material-ui/migration/upgrade-to-v7/#react-18-and-below)) | No aplica (React 19.2.3) |

### 1.2 `@mui/lab` en v7

- **Versión que corresponde:** lab sigue en beta. `@mui/lab@7.0.1-beta.21` (2026-01-08) declara peer `@mui/material ^7.3.7` y `react ^17 || ^18 || ^19` ([registry 7.0.1-beta.21](https://registry.npmjs.org/@mui/lab/7.0.1-beta.21)). El dist-tag `latest-v7` es `7.0.1-beta.25`, con peer `@mui/material ^7.3.11` ([registry](https://registry.npmjs.org/@mui/lab)).
- **`@mui/lab@latest` ya no sirve:** hoy es `9.0.0-beta.9`, con peer `@mui/material ^9.4.0`. Lo mismo pasa con `@mui/material@latest`, que es 9.4.0 (no hubo v8) ([registry](https://registry.npmjs.org/@mui/material)). Hay que instalar con versión explícita.
- **Siguen en lab 7:** `TabContext`, `TabList`, `TabPanel`, `Timeline`, `TimelineConnector`, `TimelineContent`, `TimelineDot`, `TimelineItem`, `TimelineOppositeContent`, `TimelineSeparator`, `Masonry` y `LoadingButton` ([árbol lab v7.3.7](https://github.com/mui/material-ui/tree/v7.3.7/packages/mui-lab/src); también verificado en el tarball de 7.0.1-beta.21).
- **`LoadingButton`:** en lab 7 es un wrapper deprecado que avisa por consola "The LoadingButton component functionality is now part of the Button component from Material UI" ([fuente](https://github.com/mui/material-ui/blob/v7.3.7/packages/mui-lab/src/LoadingButton/LoadingButton.js)). La plantilla no lo usa.
- **Uso en la plantilla:** 23 archivos. Imports: `Timeline` 18, `TabPanel` 13, `TabContext` 13, `TimelineSeparator/Item/Dot/Content/Connector` 9 cada uno, `TabList` 7 y `themeAugmentation` 1 (`src/components/theme/index.tsx`, necesario por los overrides `MuiTimeline*` de `@core/theme/overrides/timeline.ts`).

### 1.3 Props deprecadas: en v7 están deprecadas, no eliminadas

En los `.d.ts` de `@mui/material@7.3.7` instalado, todas estas props siguen existiendo con `@deprecated … This prop will be removed in a future major release` (verificado en `TextField`, `Dialog`, `Drawer`, `Menu`, `Popover`, `CardHeader`, `Autocomplete` y `Tooltip`). La [guía de migración v9](https://mui.com/material-ui/migration/upgrade-to-v9/) **las elimina** (secciones `#textfield-props`, `#dialog-props`, `#cardheader-props`, `#autocomplete-props`, `#gridlegacy`). Conviene migrarlas al portar para no arrastrar deuda.

| Prop | Componente | Estado en 7.3.7 | Reemplazo ([guía de deprecaciones](https://v7.mui.com/material-ui/migration/migrating-from-deprecated-apis/)) | Usos en la plantilla |
|---|---|---|---|---|
| `InputProps`, `inputProps`, `InputLabelProps`, `SelectProps`, `FormHelperTextProps` | TextField | deprecadas | `slotProps.input / htmlInput / inputLabel / select / formHelperText` | `InputProps=`: **0**. `inputProps=`: 4 usos en 2 archivos, pero **sobre `Select`/`OutlinedInput`**, donde `inputProps` **no** está deprecada en 7.3.7 (`Select.d.ts`, `InputBase.d.ts` sin `@deprecated`) |
| `PaperProps` | Drawer / Dialog / Menu / Popover | deprecada | `slotProps.paper` | 4: `@core/theme/overrides/drawer.ts` (defaultProps), `views/apps/calendar/SidebarLeft.tsx` (Drawer), `views/apps/email/ComposeMail.tsx` (Drawer), `views/pages/account-settings/account/AccountDetails.tsx` (anidada en `MenuProps`) |
| `TransitionComponent` | Dialog / Menu / Tooltip / Accordion | deprecada | `slots.transition` | **0** |
| `TransitionProps` | Dialog / Menu / Tooltip / Accordion | deprecada como prop | `slotProps.transition` | **0 como prop.** Los 10 archivos que la nombran la usan como **render-prop de `Popper`** (`{({ TransitionProps }) => <Fade {...TransitionProps}>}`), que no es la prop deprecada. Ej.: `components/layout/shared/UserDropdown.tsx` |
| `componentsProps` / `components=` | varios | deprecadas | `slotProps` / `slots` | **0 / 0** |
| `titleTypographyProps`, `subheaderTypographyProps` | CardHeader | deprecadas | `slotProps.title / subheader` | 3: `views/dashboards/crm/TotalSales.tsx`, `views/pages/widget-examples/charts/TotalSales.tsx`, `views/pages/user-profile/profile/ActivityTimeline.tsx` |
| `ChipProps` | Autocomplete | deprecada | `slotProps.chip` | 1: `@core/theme/overrides/autocomplete.tsx` |
| `PopperProps` | Tooltip | deprecada | `slotProps.popper` | 1: `components/layout/shared/ModeDropdown.tsx` |
| `renderTags` | Autocomplete | — (eliminada en v9 según la [guía v9](https://mui.com/material-ui/migration/upgrade-to-v9/#autocomplete-props)) | — | 1: `views/pages/wizard-examples/property-listing/StepPropertyFeatures.tsx` |
| `slotProps` (ya migrado) | — | — | — | **42 archivos** ya usan `slotProps`: la plantilla v5 ya hizo casi toda esta migración |

### 1.4 Codemod oficial (`@mui/codemod`)

- **Transformaciones v7.0.0** ([README en v7.3.7](https://github.com/mui/material-ui/blob/v7.3.7/packages/mui-codemod/README.md)):
  - `v7.0.0/grid-props`: pasa `xs/sm/…/xsOffset` a `size={{…}}`/`offset={{…}}`.
  - `v7.0.0/lab-removed-components`: mueve los imports de lab a `@mui/material`.
  - `v7.0.0/input-label-size-normal-medium`.
  - `v7.0.0/theme-color-functions`: reemplaza `alpha/lighten/darken` de `@mui/system/colorManipulator` por `theme.alpha/...`.
- **Deprecaciones:** `deprecations/all` más una por componente (`text-field-props`, `dialog-props`, `drawer-props`, `menu-props`, `popover-props`, `autocomplete-props`, `card-header-props`, `tooltip-props`, `accordion-props`, …) ([README › Deprecations](https://github.com/mui/material-ui/blob/v7.3.7/packages/mui-codemod/README.md#deprecations)).
- **Qué cubre y qué no para esta plantilla:**
  - `grid-props` **no** toca `@mui/material/Grid2`: su lista de imports objetivo es `['@mui/material/Grid', '@mui/system/Grid', '@mui/joy/Grid']` ([fuente](https://github.com/mui/material-ui/blob/v7.3.7/packages/mui-codemod/src/v7.0.0/grid-props/grid-props.js)). Para la plantilla alcanza con reemplazar texto (`'@mui/material/Grid2'` → `'@mui/material/Grid'`, `Grid2Props` → `GridProps`), que es lo mismo que indica la [guía de Materio](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0).
  - `lab-removed-components` no aplica, porque no hay imports de ese tipo.
  - Las deprecaciones sí aplican a los ~10 usos listados en 1.3.
- **Fijar la versión del codemod:** `@mui/codemod@latest` es 9.4.0 y su carpeta `deprecations/` trae 3 transformaciones que no están en 7.3.10 (`checkbox-props`, `radio-props`, `switch-props`). Lo verifiqué comparando los tarballs de [7.3.10](https://registry.npmjs.org/@mui/codemod/-/codemod-7.3.10.tgz) y [9.4.0](https://registry.npmjs.org/@mui/codemod/-/codemod-9.4.0.tgz). Para un target v7 usar `npx @mui/codemod@7.3.10 …` (dist-tag `latest-v7`, [registry](https://registry.npmjs.org/@mui/codemod)). Que esas 3 transformaciones rompan en 7.3.7 está **no confirmado**; es una precaución.

---

## 2. Medición en la plantilla (`full-version/src`, 826 archivos `.ts`/`.tsx`)

Comando base: `grep -rlE --include='*.ts' --include='*.tsx' '<patrón>' . | wc -l` (archivos) y `grep -rhoE … | wc -l` (ocurrencias).

| API / patrón | Archivos | Ocurrencias | Ejemplos de rutas |
|---|---:|---:|---|
| `@mui/material/Grid2` (import) | 182 | 182 | `@core/components/custom-inputs/Horizontal.tsx`, `…/Image.tsx`, `…/Vertical.tsx` |
| `Grid2Props` | 1 | 4 | `@core/components/custom-inputs/types.ts` |
| `<Grid … size=` (API v2) | — | 812 | — |
| `<Grid … item`/`xs=` (API legacy) | 0 | 0 | — |
| `@mui/lab` (cualquier import) | 23 | 98 | `views/dashboards/crm/ActivityTimeline.tsx`, `views/pages/account-settings/index.tsx`, `@core/components/mui/TabList.tsx` |
| `@mui/lab/TabContext` / `TabPanel` / `TabList` | 13 / 13 / 6 | 13 / 13 / 7 | `views/apps/ecommerce/settings/index.tsx`, `views/pages/user-profile/index.tsx` |
| `@mui/lab/Timeline*` | 10 | 64 | `views/apps/ecommerce/orders/details/ShippingActivityCard.tsx`, `views/apps/logistics/fleet/FleetSidebar.tsx` |
| `@mui/lab/LoadingButton` / `Masonry` | 0 / 0 | — | — |
| `InputProps=` | 0 | 0 | — |
| `inputProps=` | 2 | 4 | `views/apps/user/list/TableFilters.tsx` (Select), `views/front-pages/help-center/Questions.tsx` (OutlinedInput) |
| `InputLabelProps=` / `SelectProps=` / `FormHelperTextProps=` | 0 / 0 / 0 | — | — |
| `PaperProps` | 4 | 4 | ver 1.3 |
| `MenuProps` (de MUI) | 1 | 1 | `views/pages/account-settings/account/AccountDetails.tsx`. Los otros 7 archivos con `MenuProps` son tipos del menú propio `@menu/*`, no de MUI |
| `TransitionComponent` | 0 | 0 | — |
| `TransitionProps` | 10 | 20 | render-prop de `Popper` (no deprecada): `components/layout/shared/*Dropdown.tsx`, `@core/components/option-menu/index.tsx` |
| `componentsProps` / `components={` | 0 / 0 | — | — |
| `BackdropProps` / `BackdropComponent` | 0 / 0 (el único hit es un tipo propio `StyledBackdropProps`) | — | — |
| `titleTypographyProps` / `subheaderTypographyProps` | 3 | 3 | ver 1.3 |
| `ChipProps` / `PopperProps` / `renderTags` | 1 / 1 / 1 | — | ver 1.3 |
| `slotProps` (ya migrado) | 42 | 70 | `views/Login.tsx`, `views/Register.tsx` |
| `createMuiTheme` / `onBackdropClick` / `Hidden` / `StyledEngineProvider` / `experimentalStyled` | 0 | — | — |
| `@mui/material-nextjs` | 1 | 1 | `src/components/theme/index.tsx` (usa `v14-appRouter`; MediClick usa `v16-appRouter`) |
| `useColorScheme` | 6 | 12 | `components/theme/ModeChanger.tsx`, `@core/hooks/useLayoutInit.ts` |
| `var(--mui-…)` en estilos | 179 | — | depende de `cssVariables` (ver resumen, punto 4) |
| `@mui/utils` (import directo) | 2 | — | `src/components/theme/index.tsx` (`deepmerge`) |

**Terceros** (archivos que los importan): `classnames` 150, `apexcharts`/`libs/ApexCharts` 54, `@tanstack/react-table` 25, `@tanstack/match-sorter-utils` 19, `react-perfect-scrollbar` 17 (+2 layouts con su CSS), `react-datepicker` vía `libs/styles/AppReactDatepicker.tsx` 13, `react-toastify` 9, `react-use` 7, `@floating-ui/react` 6, `recharts` (vía `libs/Recharts.tsx`) 6, `@fullcalendar/*` 4, `@tiptap/*` 3, `input-otp` 2, `cmdk` 1, `keen-slider` 1, `react-dropzone` 1, `@emoji-mart/react` 1.

**Clases de `tailwindcss-logical`** (`pli-`, `plb-`, `mbe-`, `is-`, `bs-`, `pbs-`, `mis-`…): unos **317 archivos**. Es un conteo aproximado por regex. Las más frecuentes son `is-*` (325), `mbe-*` (221), `bs-*` (208), `plb-*` (127) y `pli-*` (122).

---

## 3. Tailwind con MUI 7 + Next 16 (App Router, Emotion)

### 3.1 Qué recomienda MUI

- **Tailwind v3** ([MUI v7 › Interoperability › Tailwind CSS v3](https://v7.mui.com/material-ui/integrations/interoperability/#tailwind-css-v3)):
  1. `corePlugins: { preflight: false }`, para usar el preflight de MUI.
  2. `important: '#__next'` (o `'#root'` en SPA).
  3. Arreglar el orden de inyección con `StyledEngineProvider injectFirst` o con un `CacheProvider` de Emotion con `prepend: true`.
  4. Configurar `container` en `MuiPopover`, `MuiPopper`, `MuiDialog` y `MuiModal` para los portales.
  5. Para el App Router hay que agregar `id="__next"` a mano en el elemento raíz.
- **Tailwind v4** ([MUI v7 › Tailwind CSS v4](https://v7.mui.com/material-ui/integrations/tailwindcss/tailwindcss-v4/)):
  - Requiere "Tailwind CSS >= v4".
  - En App Router: `<AppRouterCacheProvider options={{ enableCssLayer: true }}>` y en el CSS global `@layer theme, base, mui, components, utilities;` + `@import 'tailwindcss';`, para que `mui` quede antes de `utilities`.
- **`enableCssLayer`:** "ensures that the styles generated by Material UI will be wrapped in a CSS `@layer mui` rule, which is overridden by anonymous layer styles when using Material UI with CSS Modules, Tailwind CSS, or even plain CSS without using `@layer`" ([MUI v7 › Next.js integration](https://v7.mui.com/material-ui/integrations/nextjs/)). La opción existe en `@mui/material-nextjs@7.3.7`: `enableCssLayer?: boolean` en `v13-appRouter/appRouterV13.d.ts`, reexportado por `v16-appRouter`.

### 3.2 Cómo lo resolvió Materio

- **v5 (copia local):** sigue la receta de MUI para v3:
  - `tailwind.config.ts` con `corePlugins.preflight: false` e `important: '#__next'`.
  - `<html id='__next'>` en `src/app/[lang]/layout.tsx`.
  - `AppRouterCacheProvider options={{ prepend: true }}` en `src/components/theme/index.tsx`.
  - `globals.css` con `@tailwind base/components/utilities`.
  - PostCSS con `tailwindcss/nesting` + `tailwindcss` + `autoprefixer`.

  *Inferencia:* como el `id` está en `<html>`, los portales que MUI monta en `<body>` quedan dentro de `#__next`, así que no hace falta el paso 4 (`container`).
- **v6 (oficial, [guía v5→v6](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)):**
  - Borra `tailwind.config.ts` y mueve la configuración a `global.css` con `@layer theme, base, components, utilities;`, `@import "tailwindcss/theme.css" layer(theme) important;`, `@import "tailwindcss/utilities.css" layer(utilities) important;`, `@plugin 'tailwindcss-logical';` y un bloque `@theme { --radius-xs: var(--mui-shape-customBorderRadius-xs); … }`.
  - PostCSS queda en `plugins: ['@tailwindcss/postcss']`.
  - Notas:
    - No importa `preflight.css`, que es la forma documentada de desactivar Preflight en v4 ([Tailwind › Disabling Preflight](https://tailwindcss.com/docs/preflight#disabling-preflight)).
    - Usa el flag `important` en vez de `enableCssLayer`. Ese flag pone `!important` en todas las utilidades ([Tailwind › Using the important flag](https://tailwindcss.com/docs/styling-with-utility-classes#using-the-important-flag)).

### 3.3 ¿Next 16 soporta Tailwind 3.4 vía PostCSS sin fricción?

- Next mantiene una guía para Tailwind v3 en la doc de 16.x: `pnpm add -D tailwindcss@^3 postcss autoprefixer`, `tailwind.config.js` y `@tailwind base/components/utilities`. También dice: "As of Next.js 13.1, Tailwind CSS and PostCSS are supported with Turbopack" ([Next › Tailwind v3](https://nextjs.org/docs/app/guides/tailwind-v3-css#usage-with-turbopack)).
- Next 16 usa Turbopack por defecto en `dev` y `build` ([Next 16 › Turbopack by default](https://nextjs.org/docs/app/guides/upgrading/version-16#turbopack-by-default)). La plantilla v5 ya corría `next dev --turbopack` con esta config.
- Tailwind v3 sigue mantenido: el dist-tag `v3-lts` apunta a `3.4.19` (2025-12-10) ([registry](https://registry.npmjs.org/tailwindcss)).
- **Conclusión:** no encontré ninguna fricción documentada. Que funcione en MediClick está **no confirmado** (no lo ejecuté).

### 3.4 ¿`tailwindcss-logical` y el plugin de Materio funcionan en Tailwind 4?

| Pieza | Tailwind 3.4 | Tailwind 4 | Fuente |
|---|---|---|---|
| `tailwindcss-logical@3.0.1` | Sí (es la versión para v3) | **No**: para v4 hay que usar 4.x (Tailwind 4.0–4.1) o 5.x (Tailwind ≥4.2) | [README](https://codeberg.org/stevecochrane/tailwindcss-logical): "compatible with Tailwind v4.2.0+. For compatibility with earlier versions of v4, use v4.2.0 of this plugin, and for Tailwind v3, use v3.0.1". Peers: 4.0.0 → `tailwindcss >=4.0.0`, 5.0.0 → `tailwindcss >=4.2.0` ([registry](https://registry.npmjs.org/tailwindcss-logical)) |
| Clases lógicas (`pli-*`, `is-*`, `bs-*`…) | vía plugin | Con `tailwindcss-logical@5` siguen funcionando con el mismo nombre (v5 solo quita 8 utilidades duplicadas, como `border-bs-*`/`border-be-*`). También se pueden migrar a nativas (`pli-`→`px-`, `is-`→`inline-`, `bs-`→`block-`…) | [release v5.0.0](https://codeberg.org/stevecochrane/tailwindcss-logical/releases/tag/v5.0.0), [guía de migración del plugin](https://codeberg.org/stevecochrane/tailwindcss-logical/src/branch/main/docs/migration-guide.md). Tailwind 4.2.0 agregó `pbs/pbe/mbs/mbe`, `inline-*`/`block-*` e `inset-s/e/bs/be` ([CHANGELOG](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/CHANGELOG.md)). El autor dice "You don't need this plugin anymore" con Tailwind ≥4.2, aunque lo sigue manteniendo "for the time being" |
| `corePlugins.preflight: false` | Sí | **No soportado** en config JS (`corePlugins` no se soporta con `@config`). Se reemplaza importando `theme.css` + `utilities.css` sin `preflight.css` | [Tailwind › @config](https://tailwindcss.com/docs/functions-and-directives), [Disabling Preflight](https://tailwindcss.com/docs/preflight#disabling-preflight) |
| `important: '#__next'` (selector) | Sí | No figura en la doc de v4, pero el código de compatibilidad de v4.3.3 envuelve `@tailwind utilities` en el selector si `important` es string (cargando la config con `@config`). La vía documentada en CSS es el flag `important` (todo `!important`) | [código `apply-compat-hooks.ts`](https://github.com/tailwindlabs/tailwindcss/blob/v4.3.3/packages/tailwindcss/src/compat/apply-compat-hooks.ts), [doc important flag](https://tailwindcss.com/docs/styling-with-utility-classes#using-the-important-flag) |
| Plugin propio `src/@core/tailwind/plugin.ts` (`plugin(fn, { theme })`: `borderColor` como función de `theme`, override de `borderRadius` y `screens`, `extend` de `boxShadow`/`colors`/`zIndex` con `var(--mui-…)`) | Sí | v4 permite cargar plugins JS legacy con `@plugin` ([doc](https://tailwindcss.com/docs/functions-and-directives)). Que este plugin en particular (con `theme` como función) funcione tal cual en v4 está **no confirmado**. Materio v6 no lo intentó: lo reescribió como variables en `@theme` ([guía Materio](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)) | — |
| Utilidades renombradas en v4 (`rounded`→`rounded-sm`, `shadow-sm`→`shadow-xs`, `outline-none`→`outline-hidden`, `ring` 3px→1px…) y border por defecto `currentColor` | n/a | Hay que revisarlas: la plantilla usa `rounded` sin sufijo en 53 archivos, `rounded-sm` en 3 y `shadow-sm` en 1. Como Materio redefine esas escalas (`borderRadius`, `boxShadow`), el resultado depende de cómo quede `@theme`. El `DEFAULT` de borde del plugin ya es `var(--border-color, currentColor)` | [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide) |
| PostCSS | `tailwindcss` + `autoprefixer` (+ `tailwindcss/nesting`) | `@tailwindcss/postcss`; `autoprefixer`/`postcss-import` ya no hacen falta | [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide) |
| Navegadores | amplio | Safari 16.4+, Chrome 111+, Firefox 128+ ("If you need to support older browsers, stick with v3.4") | [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide). Next 16 ya exige Chrome/Edge 111+, Firefox 111+, Safari 16.4+ ([Next 16](https://nextjs.org/docs/app/guides/upgrading/version-16#nodejs-runtime-and-browser-support)): la diferencia es solo Firefox 111–127 |

### 3.5 Interacción con el CSS actual de MediClick (riesgo)

- `client/src/app/globals.css` tiene un reset **sin capa**: `*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`. MediClick usa `AppRouterCacheProvider options={{ key: 'mui' }}`, sin `enableCssLayer`.
- Según la especificación de cascade layers, los estilos sin capa van a una "implicit final layer" que gana sobre las capas explícitas en declaraciones normales ([W3C css-cascade-5 › Cascade Layers](https://www.w3.org/TR/css-cascade-5/#cascade-layering)). MUI lo advierte en la cita de 3.1: `@layer mui` "is overridden by anonymous layer styles".
- **Inferencia (no probada):** si se activa `enableCssLayer: true` sin mover ese reset a `@layer base`, el `margin: 0; padding: 0` global le ganaría a los paddings y márgenes de los componentes MUI. Con el enfoque de Materio v6 (MUI sin capa + utilidades Tailwind `!important`) este problema no aparece.
- Además, el enfoque v3 (`important: '#__next'`) requiere poner `id="__next"` en el `<html>` de `client/src/app/layout.tsx`, que hoy no lo tiene.

### 3.6 Recomendación

| Opción | Pros | Contras |
|---|---|---|
| **A. Tailwind 3.4.19 (`v3-lts`) tal cual v5** | Copiar `tailwind.config.ts`, `plugin.ts`, `tailwindcss-logical@3.0.1` y `postcss.config.mjs` sin cambios. Receta documentada por MUI para v3. Next 16 + Turbopack soporta PostCSS | Línea en mantenimiento LTS. Diverge de Materio v6, que está en v4, así que cada componente nuevo de v6 habría que bajarlo a v3. Migración doble más adelante |
| **B. Tailwind ≥4.2 + `tailwindcss-logical@5` (como Materio v6)** | Mismo stack que la versión oficial vigente de la plantilla (v6.0.2). Las clases lógicas no cambian. Se elimina `tailwind.config.ts` | Hay que reescribir `plugin.ts` a `@theme` (o copiar el `global.css` de v6), revisar las utilidades renombradas y decidir entre el flag `important` y `enableCssLayer` (ver 3.5). Sin soporte para Firefox <128 |

**Recomendación: B.** MediClick no tiene Tailwind hoy, así que no hay migración propia que hacer. Next 16 ya fija una base de navegadores casi igual a la de Tailwind 4, y la fuente oficial de la plantilla (v6) ya resolvió esta configuración. Para la precedencia, seguir el patrón de Materio v6: importar `theme.css` + `utilities.css` con el flag `important`, sin `preflight.css`, y sin `enableCssLayer`, salvo que antes se mueva el reset global de MediClick a `@layer base`. Si no se consigue acceso a v6 y hay que portar desde v5 sin reescribir la config, **A** es viable y está documentada.

---

## 4. React 19 / Next 16: dependencias de terceros

Fuente de cada fila: `https://registry.npmjs.org/<pkg>/<versión>` (`peerDependencies`), consultado el 2026-10-01. Las fechas son las de `time` en el registry.

| Paquete | Versión plantilla | Peer `react` de esa versión | Última estable (fecha) | Peer `react` de la última | ¿Soporta React 19? | Fuente | Acción recomendada |
|---|---|---|---|---|---|---|---|
| `@fullcalendar/react` | 6.1.15 | `^16.7.0 \|\| ^17 \|\| ^18 \|\| ^19` | 7.1.0 (2026-09-05); última 6.x: 6.1.21 (2026-06-18) | `^17 \|\| ^18 \|\| ^19` + peer `temporal-polyfill ^1.0.1` | **Sí** (ya en 6.1.15) | [6.1.15](https://registry.npmjs.org/@fullcalendar/react/6.1.15), [7.1.0](https://registry.npmjs.org/@fullcalendar/react/7.1.0) | Usar **6.1.21** (misma major). v7 es breaking: "Need `temporal-polyfill@^1.0.1` as peerDependency", cambian URLs de CDN y hay un nuevo sistema de temas ([release v7.0.0](https://github.com/fullcalendar/fullcalendar/releases/tag/v7.0.0)). El `latest` de `@fullcalendar/daygrid` sigue en 6.1.21 ([registry](https://registry.npmjs.org/@fullcalendar/daygrid)). Migrar a v7 queda fuera de alcance, **no evaluado** |
| `@fullcalendar/core` / `daygrid` / `timegrid` / `list` / `interaction` | 6.1.15 | sin peer de react (core depende de `preact ~10.12.1`) | 6.1.21 (6.x) | — | Sí (vía `@fullcalendar/react`) | [core 6.1.15](https://registry.npmjs.org/@fullcalendar/core/6.1.15) | 6.1.21 alineado con `@fullcalendar/react` |
| `@fullcalendar/common` | 5.11.5 | — | 5.11.5 (paquete de v5) | — | n/a | [registry](https://registry.npmjs.org/@fullcalendar/common) | **No portar**: 0 imports en `src` |
| `react-datepicker` | 7.3.0 | `^16.9.0 \|\| ^17 \|\| ^18` | 9.1.0 (2025-12-19) | `… \|\| ^19 \|\| ^19.0.0-rc` (+ `date-fns-tz` peer opcional) | **No en 7.3.0.** Sí desde **7.6.0** (2025-01-05) | [7.3.0](https://registry.npmjs.org/react-datepicker/7.3.0), [7.6.0](https://registry.npmjs.org/react-datepicker/7.6.0), [9.1.0](https://registry.npmjs.org/react-datepicker/9.1.0) | Mínimo **7.6.0** (misma major que 7.3.0; además quita la dependencia `react-onclickoutside`). 8.0.0 incluye "Upgrade to React 19" y un breaking en `parseDate` ([release v8.0.0](https://github.com/Hacker0x01/react-datepicker/releases/tag/v8.0.0)). 9.0.0 agrega `timeZone` ([release v9.0.0](https://github.com/Hacker0x01/react-datepicker/releases/tag/v9.0.0)). Se usa vía `libs/styles/AppReactDatepicker.tsx` (13 archivos) |
| `react-perfect-scrollbar` | 1.5.8 | `>=16.3.3` | 1.5.8 (**2020-02-07**, sin releases después) | `>=16.3.3` | **Sí por rango.** Abandonado de facto | [registry](https://registry.npmjs.org/react-perfect-scrollbar); repo no archivado, último push 2024-07-31 ([GitHub](https://github.com/goldenyz/react-perfect-scrollbar)) | Análisis propio de `lib/scrollbar.js` del [tarball 1.5.8](https://registry.npmjs.org/react-perfect-scrollbar/-/react-perfect-scrollbar-1.5.8.tgz): componente de **clase** con callback ref, `componentDidMount/DidUpdate/WillUnmount`, `defaultProps` en clase (siguen soportados) y `propTypes` (React 19 los ignora). No usa `findDOMNode`, string refs ni legacy context, que es lo que React 19 eliminó ([React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-reactdom-finddomnode)). Materio v6 (React 19) lo sigue listando ([dependencias Materio](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/overview/dependencies)). **Usable, con riesgo de mantenimiento.** No existe alternativa "oficial" del autor (**no confirmado**). Reemplazarlo por scroll nativo es opción propia, no del ecosistema |
| `react-toastify` | 10.0.6 | `>=18` | 11.1.0 (2026-04-19) | `^18 \|\| ^19` | **Sí** (ya en 10.0.6) | [10.0.6](https://registry.npmjs.org/react-toastify/10.0.6), [11.1.0](https://registry.npmjs.org/react-toastify/11.1.0) | Portar 1:1 con **10.0.6**. Pasar a v11 rompe `libs/styles/AppReactToastify.tsx`: v11 elimina la clase `Toastify__toast-body`, `ReactToastify.minimal.css`, `bodyClassName`/`bodyStyle`/`progressBarStyle`/`injectStyle` y los hooks `useToast`/`useToastContainer`, y cambia la firma de `onClose(reason)`. El CSS pasa a inyectarse solo ([release v11.0.0](https://github.com/fkhadra/react-toastify/releases/tag/v11.0.0)) |
| `apexcharts` | 3.49.0 | sin peer | 7.7.0 (2026-10-01) | sin peer | n/a (no es React) | [registry](https://registry.npmjs.org/apexcharts) | **Licencia:** MIT hasta 4.7.0. Desde 5.2.0 es "ApexCharts License" / "SEE LICENSE IN LICENSE": Community gratis para menos de US$2M; OEM pago "if you are embedding ApexCharts into a product or platform used by other people" ([LICENSE](https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE)). Desde 6.5.0 hay features premium con watermark sin clave ([release v6.5.0](https://github.com/apexcharts/apexcharts.js/releases/tag/v6.5.0)). Ver riesgos |
| `react-apexcharts` | 1.4.1 | `react >=0.13`, `apexcharts ^3.41.0` | 2.1.1 (2026-06-19) | `react >=16.8.0`, `apexcharts >=5.10.1` | **Sí por rango** en 1.4.1. Componente de clase con `createRef`, sin APIs eliminadas (análisis del tarball) | [1.4.1](https://registry.npmjs.org/react-apexcharts/1.4.1), [2.1.1](https://registry.npmjs.org/react-apexcharts/2.1.1) | 1.4.1 y 1.7.0 son MIT; desde 1.8.0 "SEE LICENSE IN LICENSE" ([registry](https://registry.npmjs.org/react-apexcharts)). 2.0.0 agrega SSR (`react-apexcharts/server`) ([release v2.0.0](https://github.com/apexcharts/react-apexcharts/releases/tag/v2.0.0)). **Preferible rehacer con recharts** |
| `cmdk` | 1.0.4 | `^18 \|\| ^19 \|\| ^19.0.0-rc` | 1.1.1 (2025-03-14) | igual | **Sí** | [1.0.4](https://registry.npmjs.org/cmdk/1.0.4), [1.1.1](https://registry.npmjs.org/cmdk/1.1.1) | 1.1.1. Sus deps Radix (`@radix-ui/react-dialog@1.1.2`, `react-primitive@2.0.0`) declaran `^19.0` ([registry](https://registry.npmjs.org/@radix-ui/react-dialog/1.1.2)) |
| `@tanstack/match-sorter-utils` | 8.19.4 | sin peer | 9.1.2 (2026-08-09); última 8.x: 8.19.4 | sin peer | n/a (sin React) | [registry](https://registry.npmjs.org/@tanstack/match-sorter-utils) | Mantener **8.19.4**, alineado con `@tanstack/react-table` 8.21.3 de MediClick. Si la 9.x está atada a Table v9: **no confirmado** |
| `input-otp` | 1.4.1 | `^16.8 \|\| … \|\| ^19.0.0 \|\| ^19.0.0-rc` | 1.5.0 (2026-08-18) | igual | **Sí** | [1.4.1](https://registry.npmjs.org/input-otp/1.4.1), [1.5.0](https://registry.npmjs.org/input-otp/1.5.0) | 1.5.0 |
| `keen-slider` | 6.8.6 | **sin peer** | 6.8.6 (2023-07-05) | sin peer | **Sin declaración.** El wrapper `keen-slider/react` solo usa `useRef`/`useEffect` (análisis del [tarball](https://registry.npmjs.org/keen-slider/-/keen-slider-6.8.6.tgz)) | [registry](https://registry.npmjs.org/keen-slider); repo activo, último push 2026-01-22 ([GitHub](https://github.com/rcbyr/keen-slider)) | Usable (1 archivo). Materio v6 lo sigue listando |
| `react-dropzone` | 14.3.5 | `>= 16.8 \|\| 18.0.0` | 20.1.2 (2026-09-14); última 14.x: 14.4.1 | `>= 18` | **Sí por rango** | [14.3.5](https://registry.npmjs.org/react-dropzone/14.3.5), [20.1.2](https://registry.npmjs.org/react-dropzone/20.1.2) | Portar con **14.4.1**. Las majors 15–20 **no evaluadas** |
| `@tiptap/react` (+ `pm`, `starter-kit`, extensiones) | ^2.10.4 | `^17.0.0 \|\| ^18.0.0 \|\| ^19.0.0` | 3.31.4 (2026-09-30); `v2-latest`: 2.27.3 (2026-09-04) | `^17 \|\| ^18 \|\| ^19` | **Sí** (ya en 2.10.4) | [2.10.4](https://registry.npmjs.org/@tiptap/react/2.10.4), [3.31.4](https://registry.npmjs.org/@tiptap/react/3.31.4) | Para portar 1:1: **2.27.3**. Materio v6 pasó a v3 (breaking) y documenta 3 archivos tocados ([guía Materio](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)). Cambios v3: consolidación de paquetes, menús con Floating UI en `@tiptap/react/menus`, `shouldRerenderOnTransaction`, StarterKit incluye Link/Underline y `History`→`undoRedo` ([guía oficial Tiptap](https://tiptap.dev/docs/guides/upgrade-tiptap-v2)) |
| `recharts` | 2.15.0 | `^16 \|\| ^17 \|\| ^18 \|\| ^19` | 3.10.1 (2026-07-25) | `^16.8 \|\| … \|\| ^19` (+ peer `react-is`) | **Sí** | [2.15.0](https://registry.npmjs.org/recharts/2.15.0), [3.10.1](https://registry.npmjs.org/recharts/3.10.1) | Portar a **recharts 3** (MediClick ya tiene 3.7.0). Ver 4.1 |
| *(extra)* `@emoji-mart/react` | 1.1.1 | `^16.8 \|\| ^17 \|\| ^18` | 1.1.1 (2023-01-02) | igual | **No declara 19** | [registry](https://registry.npmjs.org/@emoji-mart/react/1.1.1) | Usa solo hooks (análisis del tarball). Con pnpm, `strictPeerDependencies` vale `false` por defecto ([pnpm](https://pnpm.io/settings/peer-dependencies#strictpeerdependencies)), así que solo sale un warning. Materio v6 lo sigue listando. Comportamiento en runtime: **no confirmado**. Solo afecta al chat (1 archivo) |

### 4.1 recharts 2 → 3 (lo que afecta a la plantilla)

La plantilla usa recharts solo en 6 demos (`views/charts/recharts/*`) mediante `libs/Recharts.tsx` (`export * from 'recharts'`). Breaking changes relevantes según la [guía oficial 3.0](https://github.com/recharts/recharts/wiki/3.0-migration-guide):

- **Tooltip custom:** "Update `TooltipProps` to `TooltipContentProps` when using `Tooltip`'s `content` prop". Afecta a 4 archivos con `CustomTooltip(props: TooltipProps<any, any>)`: Area, Bar, Line y Radar. Además, `label` en `TooltipContentProps` pasa a ser `undefined | string | number`.
- **Se eliminan `CategoricalChartState` y las props extra de `<Customized />`:** la plantilla no las usa.
- **Se eliminan props internas** (`activeIndex`, `points` de Scatter/Area, `payload` de Legend, `blendStroke` de Pie, `alwaysShow`, `isFront`) y `ref.current.current` de `ResponsiveContainer`. La plantilla no usa ninguna (verificado por `grep`).
- **`accessibilityLayer` es `true` por defecto** y el teclado ya no dispara `onMouseMove`.
- **El z-index sale del orden de render** (Tooltip debajo de Legend en el JSX).
- **Ejes:** los ejes se dibujan aunque no tengan ticks, y `CartesianGrid` necesita `xAxisId`/`yAxisId` cuando los ejes usan ids que no son los por defecto.
- **Requisitos:** React ≥16.8, TS 5.x y Node 18; se eliminan las dependencias `react-smooth` y `recharts-scale`.
- **`Cell` está deprecado dentro de 3.x:** en `recharts@3.7.0` instalado, `types/component/Cell.d.ts` dice "This component is now deprecated and will be removed in Recharts 4.0. Please use the `shape` prop or `content` prop…" ([guía Cell→shape](https://recharts.github.io/en-US/guide/cell/)). Afecta a 1 archivo (`RechartsPieChart.tsx`).

---

## 5. ¿Hay Materio para MUI 7 / React 19 / Next 16?

**Sí, confirmado en fuente primaria de ThemeSelection:**

- **Changelog oficial** ([changelog.html](https://demos.themeselection.com/materio-mui-nextjs-admin-template/changelog.html)):
  - **v6.0.0 (2025-11-19):** "Next.js version from 15.x to 16.x (Breaking change)", "React version from 18.x to 19.x (Breaking change)", "Material-UI version from 6.x to 7.x (Breaking change)", "TailwindCSS version from 3.x to 4.x (Breaking change)", "Tiptap editor from v2 to v3 (Breaking change)", "All remaining dependencies to latest versions".
  - **v6.0.1 (2025-12-11):** actualizaciones de seguridad y fix del border radius de ReactDatePicker.
  - **v6.0.2 (2025-12-29):** actualizaciones de seguridad de Next/React/Tiptap. Es la última; el changelog no lista nada posterior.
- **Página del producto** ([themeselection.com](https://themeselection.com/item/materio-mui-nextjs-admin-template/)): "Built with Next.js v16 (App Router)", "React 19", "MUI Core v7", "Tailwind CSS 4"; "Updated: 29 Dec 2025".
- **Guía oficial de migración v5.0.0 → v6.0.0** ([link](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/migration/v5.0.0-to-v6.0.0)):
  - Tipo de `params.lang` pasa a `string` y cambia el matcher en `next.config.ts`.
  - `Grid2`→`Grid` y `forceThemeRerender` en `ThemeProvider`.
  - Tailwind v4 CSS-first (`@theme`, `@plugin 'tailwindcss-logical'`, `@tailwindcss/postcss`).
  - ESLint.
  - Tiptap v3 (3 archivos).
  - Recomienda comparar el `package.json` nuevo.
- **Página de dependencias** ([link](https://demos.themeselection.com/materio-mui-nextjs-admin-template/documentation/docs/guide/overview/dependencies)): sigue listando `react-perfect-scrollbar`, `tailwindcss-logical`, `apexcharts`/`react-apexcharts`, `keen-slider` y `@emoji-mart/react`, pero **sin versiones**. Las versiones exactas de terceros en v6 quedan **no confirmadas** (hay que verlas en el `package.json` del paquete v6).
- El repo gratuito ([GitHub](https://github.com/themeselection/materio-mui-nextjs-admin-template-free)) sigue en v2.0.0 (2024-06-18, MUI 5 / Next 14) y no sirve de referencia para esto.

---

## Riesgos y decisiones abiertas

1. **Acceso a Materio v6.0.2.** Decisión: portar desde v6.0.2 (recomendado; ya resuelve MUI 7, React 19, Next 16 y Tailwind 4) o desde la v5.0.0 local. Depende de la licencia y la cuenta de ThemeSelection (**no confirmado** desde acá).
2. **Licencia de ApexCharts.** MediClick es una plataforma multi-tenant que usan terceros (clínicas). El LICENSE vigente exige OEM para "embedding … into a product or platform used by other people", salvo charts estáticos no configurables ni interactivos ([LICENSE](https://github.com/apexcharts/apexcharts.js/blob/main/LICENSE)). Decisión: rehacer con recharts 3 (MIT, [registry](https://registry.npmjs.org/recharts/latest)) o fijar versiones MIT (`apexcharts ≤4.7.0`, `react-apexcharts ≤1.7.0`) y quedar sin actualizaciones. No es asesoría legal: validarlo con quien corresponda.
3. **CSS theme variables.** Portar cualquier componente de Materio sin activar `cssVariables` en el `createTheme` de MediClick deja sin resolver los `var(--mui-…)`, incluidos los custom (`--mui-palette-primary-lightOpacity`, `--mui-customShadows-*`, `--mui-shape-customBorderRadius-*`) que define el tema de Materio. Activarlo cambia también cómo funciona hoy el modo oscuro y el alto contraste de MediClick (hoy recalcula la paleta en JS). **Decisión abierta:** adoptar el tema de Materio (colorSchemes + cssVariables + `forceThemeRerender`) o adaptar los componentes a `theme.palette`.
4. **Capas CSS y el reset global de MediClick** (ver 3.5). Si se usa `enableCssLayer`, primero hay que mover el reset sin capa de `globals.css` a `@layer base`. Es una inferencia a partir de la [doc de MUI](https://v7.mui.com/material-ui/integrations/nextjs/) y la [spec W3C](https://www.w3.org/TR/css-cascade-5/#cascade-layering), no probada.
5. **Versiones "latest" engañosas.** `@mui/material`, `@mui/lab`, `@mui/codemod` y `@mui/material-nextjs` ya tienen `latest` en 9.x ([registry](https://registry.npmjs.org/@mui/material)). Cualquier `pnpm add @mui/lab` sin versión o `npx @mui/codemod@latest` apunta a v9. Hay que fijar `@mui/lab@7.0.1-beta.21` y `@mui/codemod@7.3.10`.
6. **Deuda hacia MUI v9.** v9 elimina las props deprecadas (TextField `*Props`, Dialog `PaperProps`/`Transition*`, CardHeader `*TypographyProps`, Autocomplete `ChipProps`/`renderTags`, `GridLegacy`) ([guía v9](https://mui.com/material-ui/migration/upgrade-to-v9/)). Portar ya con `slots`/`slotProps` evita retrabajo.
7. **Dependencias implícitas con pnpm.** La plantilla usaba `node-linker=hoisted` y `shamefully-hoist=true` (`.npmrc` local). MediClick usa el `node_modules` aislado de pnpm (symlinks a `.pnpm/`), así que los imports directos de paquetes no declarados (`classnames` en 150 archivos, `react-use` 7, `@floating-ui/react` 6, `@mui/utils` 2) fallan si no se agregan como dependencias directas.
8. **Paquetes sin mantenimiento.** `react-perfect-scrollbar` (sin releases desde 2020), `@emoji-mart/react` (2023, peer sin React 19) y `keen-slider` (2023, sin peer). Funcionan por análisis de código, pero ante un problema no hay upstream que lo arregle. Decisión: aceptarlo o reemplazarlos al portar.
9. **No verificado en ejecución.** Nada de esto se probó compilando o corriendo en MediClick (`tsc`, `next build`). Las conclusiones de compatibilidad salen de peers, código fuente y documentación.
