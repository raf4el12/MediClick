# Verificación previa al commit

MediClick valida cada commit antes de que exista. El hook vive en
`.githooks/pre-commit` y la lógica en `scripts/pre-commit.mjs`.

## Qué hace

Solo mira **lo que está en el índice**. Detecta qué paquetes toca el commit
(`server/`, `client/`) y corre únicamente lo que corresponde:

| Verificación | Alcance | ¿Detiene el commit? |
|---|---|---|
| Tipos (`tsc --noEmit`) | El paquete completo, pero solo reporta errores **en tus archivos** | Sí |
| Pruebas relacionadas (`jest --findRelatedTests`) | Solo `server/` | Sí |
| Estilo (`eslint`) | Solo los archivos del índice | No, es informativo |
| Archivos `.env` en el índice | Todo el repositorio | Sí |
| `schema.prisma` sin migración | `server/prisma/` | No, es informativo |

Un commit que solo toca documentación no dispara nada y termina de inmediato.

## Por qué el estilo no detiene el commit

El repositorio arrastra cientos de hallazgos de ESLint previos, casi todos
`@typescript-eslint/no-unsafe-*` por `any` heredado. Un gate que los exija
todos de entrada no protege nada: bloquea trabajo legítimo en archivos que
nadie tocó y lo único que enseña es a escribir `--no-verify`. Se reporta el
conteo de tus archivos para que la deuda baje donde estás trabajando, sin
convertir cada commit en una negociación.

El mismo criterio aplica a los tipos: el proyecto tiene errores previos en
algunos specs, y se informan aparte como *preexistentes, ignorados*. Lo que
detiene el commit es lo que **tú** estás introduciendo.

## Activación

Se activa sola: el `prepare` de `server/package.json` y `client/package.json`
ejecuta `scripts/setup-hooks.mjs` en cada instalación, que apunta git a
`.githooks`. Para hacerlo a mano:

```bash
node scripts/setup-hooks.mjs     # o: git config core.hooksPath .githooks
```

Para comprobar que está activo:

```bash
git config --get core.hooksPath   # debe imprimir .githooks
```

## Saltarlo

```bash
MEDICLICK_SKIP_HOOKS=1 git commit -m "..."
git commit --no-verify -m "..."
```

Es legítimo para un `wip` o un commit de rescate. Si se vuelve costumbre,
el problema no es el hook.

## Costo

La primera corrida del día paga el `tsc` completo (~40 s); a partir de ahí el
build incremental lo deja en 2-5 s. Un commit típico de servidor termina en
menos de diez segundos, con las pruebas relacionadas incluidas.

## Qué no cubre

Las pruebas de integración (`*.integration.spec.ts`) necesitan PostgreSQL y
quedan fuera: corren en CI. El cliente no ejecuta pruebas en el hook porque su
suite es de accesibilidad sobre Playwright y tarda minutos.
