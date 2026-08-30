# MediClick repository guidance

## Fuentes de verdad

- Usa [`CONTEXT.md`](./CONTEXT.md) para el vocabulario del negocio y [`docs/domain/APPOINTMENT-CORE.md`](./docs/domain/APPOINTMENT-CORE.md) para los flujos e invariantes implementados.
- Deriva el comportamiento final del código, sus tests y `server/prisma/schema.prisma`. `README.md` y `CLAUDE.md` son orientación y contienen afirmaciones desactualizadas; confirma versiones, roles y superficies REST/GraphQL en el repositorio.
- Mantén `CONTEXT.md` como glosario sin detalles técnicos. Registra reglas implementadas en el documento del núcleo y decisiones irreversibles con trade-offs reales en un ADR.

## Skills del repo

- Cambios en citas, cupos, disponibilidad, feriados, bloqueos, pagos o lista de espera: usa `$mediclick-appointment-core`.
- Cambios en `clinicId`, guards, permisos, repositorios o acceso entre sedes: usa `$mediclick-tenant-safety`.
- Revisiones de cambios que toquen el núcleo: usa `$mediclick-core-review`.

## Acuerdos de implementación

- Conserva la separación `application` / `domain` / `infrastructure` / `interfaces` existente. El dominio permanece libre de NestJS y Prisma.
- Trata estado asistencial y estado de pago como máquinas distintas. Enumera las transiciones afectadas antes de modificar una.
- Aplica fechas y horas con la zona horaria de la sede y reutiliza `shared/utils/date-time.utils.ts`; evita cálculos locales ad hoc.
- Mantén atómicas las comprobaciones de disponibilidad y sus escrituras. Una consulta previa seguida de una escritura independiente no protege de doble reserva.
- El paciente es multi-sede. El personal con sede queda limitado a ella. En callbacks de `$transaction`, aplica `clinicId` explícitamente porque el cliente tenant-aware no se hereda.
- Cuando una operación libera un cupo, rastrea también lista de espera, notificaciones, pago/reembolso y proyecciones posteriores.
- Para cambios de comportamiento, agrega o ajusta el `.spec.ts` del caso de uso o servicio más cercano. Incluye el caso permitido y la frontera rechazada.

## Verificación proporcional

- Backend focalizado: `cd server && pnpm test -- <patrón> --runInBand`.
- Backend transversal: `cd server && pnpm test -- --runInBand` y `pnpm build`.
- Lint backend sin reescritura masiva: `cd server && pnpm exec eslint <archivos-modificados>`; el script `pnpm lint` aplica `--fix`.
- Frontend: `cd client && pnpm lint` y `pnpm build`; usa `pnpm test:a11y` cuando cambia un flujo visible.
- Conserva los cambios no relacionados que ya existan en el worktree.
