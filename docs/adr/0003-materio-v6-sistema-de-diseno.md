# ADR-0003 — Materio v6 como sistema de diseño del cliente

- **Estado:** Aceptado
- **Fecha:** 2026-10-01
- **Decisores:** Equipo MediClick

## Contexto

El cliente Next.js nació como un derivado recortado de la plantilla comercial Materio: conserva
`@core` y `@layouts`, pero no su menú (`@menu`), solo 8 de sus 37 overrides de tema y nada de
Tailwind. Se decidió migrar toda la interfaz y rediseñar los flujos sobre la plantilla completa,
con licencia del equipo.

La versión clonada localmente (Materio v5.0.0) usa MUI 6, React 18, Next 15 y Tailwind 3, mientras
que el cliente ya usa MUI 7, React 19 y Next 16. Además, la plantilla resuelve el layout con
~1.749 clases Tailwind en 480 componentes, dibuja sus gráficos con ApexCharts y usa un violeta
primario que no cumple el contraste que exige el gate de accesibilidad del CI. La evidencia está
en [`docs/research/2026-10-01-materio-stack-compatibility.md`](../research/2026-10-01-materio-stack-compatibility.md).

## Decisión

- **Base Materio v6.0.2** (Next 16, React 19, MUI 7, Tailwind 4), no la v5. Elimina la migración
  de framework sobre código ajeno.
- **Tailwind 4 convive con MUI** bajo una regla: Tailwind solo para layout y espaciado (flex,
  grid, gap, padding, margin, tamaños); color, tipografía, estados y todo lo que dependa del modo
  claro/oscuro va por el tema MUI (`sx`, `styled`, overrides). El reset de Tailwind no debe ganar
  a los estilos de MUI.
- **Primario `#7E4EE6`**, no el `#8C57FF` de Materio: este da 4,27:1 con texto blanco y 3,92:1
  como texto sobre `#F4F5FA`, por debajo del 4,5:1 de WCAG AA; `#7E4EE6` da 5,10:1 y 4,68:1. Los
  presets de color del customizer (1,89:1 a 4,27:1) se reemplazan por presets que cumplan AA.
- **Gráficos con recharts 3**, no ApexCharts: desde `apexcharts` 5.2.0 y `react-apexcharts` 1.8.0
  la licencia exige una licencia OEM paga para productos usados por terceros. Los widgets de
  Materio basados en ApexCharts se reescriben.
- **Se excluyen de la plantilla** next-auth, el ruteo por idioma (`[lang]`), valibot (el cliente
  sigue validando con Zod), `fake-db` y su Prisma. La interfaz queda solo en español.
- **Dos layouts por actor**: el personal de sede usa el layout vertical; el portal del paciente usa
  el layout horizontal en escritorio y una barra de navegación inferior en móvil.

## Opciones consideradas

- **Portar desde la v5 local**: descartada; obligaba a migrar MUI 6→7, Tailwind 3→4 y React 18→19
  sobre cientos de archivos que ThemeSelection ya migró en v6.
- **Sin Tailwind, reescribiendo a `sx`**: un solo sistema de estilos, pero reescritura manual de
  cada componente copiado y divergencia visual respecto de la plantilla.
- **Materio Free (MIT)**: no trae calendario, custom inputs, wizards ni la mayoría de las vistas.
- **ApexCharts ≤ 4.7.0 (última MIT)**: copia literal de widgets a cambio de quedar fijado a una
  versión sin evolución.

## Consecuencias

- El cliente mantiene dos sistemas de estilos; la regla de uso se revisa en cada PR.
- El tema MUI debe generar variables CSS (`cssVariables`), porque la plantilla consume
  `var(--mui-…)` en sus componentes.
- Los archivos copiados de la plantilla se adaptan in situ; actualizar a una versión futura de
  Materio exige un diff manual, no un reemplazo.
- `react-perfect-scrollbar`, sin publicaciones desde 2020, queda como dependencia heredada de la
  plantilla.
- Volver al `#8C57FF` o incorporar ApexCharts requiere revisar este ADR.
