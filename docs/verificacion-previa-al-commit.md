# Verificación previa al commit

MediClick valida cada commit antes de que exista. Los hooks viven en
`.githooks/` y la lógica en `scripts/`.

## El criterio

La compuerta juzga **el cambio, no el repositorio**. El proyecto arrastra deuda
previa —cientos de hallazgos de ESLint y algunos specs con mocks desalineados—
y una compuerta que la exija toda de entrada bloquea trabajo legítimo en
archivos que nadie tocó. Lo único que enseña es a escribir `--no-verify`.

Así que cada verificación se pregunta lo mismo: *¿esto lo introduce este
commit?* Si la respuesta es sí, detiene. Si es deuda que ya estaba, la reporta
aparte y sigue.

## Qué revisa

| Verificación | Alcance | ¿Detiene el commit? |
|---|---|---|
| Tipos (`tsc --noEmit`) | Errores en tus archivos **y regresiones en cualquier otro** | Sí |
| Estilo (`eslint`) | Solo los hallazgos en las **líneas que agregas** | Sí |
| Pruebas relacionadas (`jest --findRelatedTests`) | Solo `server/` | Sí |
| Secretos en el contenido | Claves privadas, tokens, credenciales reales en URLs | Sí |
| Marcadores de conflicto sin resolver | Todo archivo de texto | Sí |
| Pruebas enfocadas (`.only`, `fdescribe`, `fit`) | Specs | Sí |
| `debugger` | Fuentes JS/TS | Sí |
| Archivos de entorno y archivos > 2 MB | Todo el índice | Sí |
| `console.log` en `server/src` | Fuentes, no specs | No, informativo |
| `schema.prisma` sin migración | `server/prisma/` | No, informativo |
| Mensaje del commit | Convención del repositorio | Sí |

Un commit que solo toca documentación termina en menos de un segundo.

### Regresiones de tipos

El typecheck compila el paquete completo y compara el resultado con la última
foto conocida (`node_modules/.cache/mediclick-type-baseline.json`, que se
actualiza sola). Un error **en un archivo que no tocaste** también detiene el
commit si antes no existía: suele ser el consumidor que tu cambio de firma
acaba de romper. Los errores que ya estaban se reportan como previos y no
molestan.

### Estilo por líneas nuevas

ESLint corre sobre los archivos del índice, pero solo se consideran los
hallazgos que caen en las líneas que el diff agrega. Nadie carga con la deuda
del archivo que le tocó abrir, y por eso el estilo **sí** puede detener el
commit sin volverse insoportable: lo que se exige es que tus líneas estén
limpias.

Un fallo de parseo o de configuración de ESLint detiene siempre: eso no es
deuda heredada.

### Contenido, leído del índice

Las revisiones de contenido leen el blob del índice (`git show :archivo`), no
el archivo en disco, porque es el índice lo que se commitea. Si alguno de tus
archivos tiene cambios sin agregar, la compuerta lo avisa: el typecheck, el
estilo y las pruebas sí leen el disco, así que en esos archivos el resultado no
describe exactamente el commit.

## Mensaje del commit

`tipo(alcance): descripción`, en minúscula y sin punto final. Los tipos salen
del historial del propio proyecto: `feat`, `fix`, `docs`, `test`, `refactor`,
`perf`, `style`, `build`, `ci`, `chore`, `revert`. Un tipo mal escrito recibe
la sugerencia más cercana. Los mensajes generados por git (merges, reverts,
fixups) se dejan pasar.

## Fuera del hook

El mismo motor sirve para revisar una rama completa antes de abrir el PR, o
para una foto del estado del proyecto:

```bash
node scripts/pre-commit.mjs                      # el índice (lo que usa el hook)
node scripts/pre-commit.mjs --base origin/main   # el diff completo de la rama
node scripts/pre-commit.mjs --all                # todo el proyecto, sin filtrar
```

En `--all` el estilo pasa a ser informativo: ahí no hay "líneas nuevas" que
distinguir, así que es un inventario, no una compuerta.

## Activación

Se activa sola: el `prepare` de `server/package.json` y `client/package.json`
ejecuta `scripts/setup-hooks.mjs` en cada instalación, que apunta git a
`.githooks`. A mano:

```bash
node scripts/setup-hooks.mjs      # o: git config core.hooksPath .githooks
git config --get core.hooksPath   # debe imprimir .githooks
```

## Saltarla

```bash
MEDICLICK_SKIP_HOOKS=1 git commit -m "..."
git commit --no-verify -m "..."
```

Es legítimo para un `wip` o un commit de rescate. Si se vuelve costumbre, el
problema no es el hook.

## Costo

Las tres verificaciones pesadas corren en paralelo, y los dos paquetes también.
Una revisión de 20 archivos de servidor tarda unos 5 s de reloj contra 26 s de
CPU. La primera corrida del día paga el `tsc` completo (~40 s); a partir de ahí
el build incremental la deja en 2-5 s. Cada paso tiene tiempo límite propio,
así que una herramienta colgada nunca deja el commit bloqueado.

## Qué no cubre

Las pruebas de integración (`*.integration.spec.ts`) necesitan PostgreSQL y
quedan para CI. El cliente no ejecuta pruebas en el hook porque su suite es de
accesibilidad sobre Playwright y tarda minutos.
