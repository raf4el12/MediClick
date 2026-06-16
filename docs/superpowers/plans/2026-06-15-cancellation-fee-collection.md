# Fix #15 — Flujo de cobro del `cancellationFee` — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que la penalización por cancelación tardía solo se calcule cuando hay un pago PAID que cobrar, y que ese pago quede marcado para cobro manual del admin (espejo del flag de refund), sin llamadas automáticas al gateway.

**Architecture:** Cambio acotado a `cancel-appointment.use-case.ts`. Se unifica el lookup de la transacción (hoy duplicado entre el cálculo del fee y el flag de refund), el fee se gatea por `isPaid`, y los flags de refund y de cobro de fee se escriben juntos en la metadata de la misma transacción. Sin cambios de schema (se reutiliza `Transactions.metadata`).

**Tech Stack:** NestJS, Prisma, Jest. TZ-aware vía `nowInTimezone`. Spec del cliente: ver `docs/superpowers/specs/2026-06-15-cancellation-fee-collection-design.md`.

---

## File Structure

- **Modify:** `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts`
  - Añadir import de `TransactionEntity`.
  - Unificar lookup de transacción + gating del fee por `isPaid` dentro de `execute()`.
  - Reemplazar `flagRefundPendingIfPaid(...)` por `flagTransactionOnCancel(...)` que escribe ambos flags en una sola actualización.
- **Modify (test):** `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.spec.ts`
  - Añadir `afterEach(() => jest.useRealTimers())` y 4 tests nuevos (fee aplica / no aplica sin pago / temprano / staff).
- **Modify (docs):** `docs/AUDITORIA-logica-horarios.md` — marcar #15 como ✅ Hecho.

**Comandos de verificación** (desde `server/`):
- Typecheck: `rtk proxy ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
- Suite: `rtk proxy npx jest --silent`
- Un solo spec: `rtk proxy npx jest cancel-appointment.use-case.spec --silent`

---

### Task 1: Tests nuevos (TDD red) para el gating del fee y el flag de cobro

**Files:**
- Test: `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.spec.ts`

Contexto del spec existente: `buildAppointment()` fija la cita en `2026-12-01` (futuro lejano respecto a "hoy"), por eso los tests actuales con rol `ADMIN` nunca disparan fee. Los tests nuevos de cancelación **tarde** congelan el reloj a ~1h antes de la cita con `jest.useFakeTimers`; `nowInTimezone` usa `new Date()` internamente, así que respeta los fake timers. Hay que restaurar el reloj real entre tests para no afectar a los existentes.

- [ ] **Step 1: Añadir `afterEach` que restaura el reloj real**

Insertar justo después del bloque `beforeEach (...)` (después de su `});` de cierre, antes del primer `it(`):

```ts
  afterEach(() => {
    jest.useRealTimers();
  });
```

- [ ] **Step 2: Añadir los 4 tests nuevos**

Insertar antes del `});` final del `describe`:

```ts
  it('paciente cancela tarde con pago PAID: persiste el fee y marca needsFeeCollection', async () => {
    // 2026-12-01T14:00Z = 09:00 Lima → ~1h antes de la cita (10:00)
    jest.useFakeTimers({ now: new Date('2026-12-01T14:00:00Z') });
    specialtyRepository.findById.mockResolvedValue({ id: 3, price: 120 } as any);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(50, { reason: 'No puedo asistir' }, 'PATIENT');

    // fee = 50% de 120 = 60, persistido en la cita
    expect(appointmentRepository.update).toHaveBeenCalledWith(
      50,
      expect.objectContaining({ cancellationFee: 60 }),
    );
    // flag de cobro (+ refund) en la transacción
    expect(transactionRepository.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        metadata: expect.objectContaining({
          needsRefund: true,
          needsFeeCollection: true,
          feeAmount: 60,
        }),
      }),
    );
  });

  it('paciente cancela tarde SIN pago PAID: no calcula fee ni toca la transacción', async () => {
    jest.useFakeTimers({ now: new Date('2026-12-01T14:00:00Z') });
    specialtyRepository.findById.mockResolvedValue({ id: 3, price: 120 } as any);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PENDING',
      metadata: null,
    } as any);

    await useCase.execute(50, { reason: 'No puedo asistir' }, 'PATIENT');

    const apptArg = appointmentRepository.update.mock.calls[0][1];
    expect(apptArg.cancellationFee).toBeUndefined();
    expect(transactionRepository.update).not.toHaveBeenCalled();
  });

  it('paciente cancela temprano (>24h) con pago PAID: sin fee, refund intacto', async () => {
    // 2026-11-20 → ~11 días antes de la cita
    jest.useFakeTimers({ now: new Date('2026-11-20T14:00:00Z') });
    specialtyRepository.findById.mockResolvedValue({ id: 3, price: 120 } as any);
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(50, { reason: 'Cambio de planes' }, 'PATIENT');

    const apptArg = appointmentRepository.update.mock.calls[0][1];
    expect(apptArg.cancellationFee).toBeUndefined();
    const txArg = transactionRepository.update.mock.calls[0][1];
    expect(txArg.metadata).toMatchObject({ needsRefund: true });
    expect((txArg.metadata as any).needsFeeCollection).toBeUndefined();
  });

  it('staff cancela con pago PAID: solo refund, sin fee', async () => {
    transactionRepository.findLatestByAppointmentId.mockResolvedValue({
      id: 77,
      status: 'PAID',
      metadata: null,
    } as any);

    await useCase.execute(50, { reason: 'Reprogramación interna' }, 'ADMIN');

    const txArg = transactionRepository.update.mock.calls[0][1];
    expect(txArg.metadata).toMatchObject({ needsRefund: true });
    expect((txArg.metadata as any).needsFeeCollection).toBeUndefined();
  });
```

- [ ] **Step 3: Correr el spec y verificar que los nuevos fallan**

Run: `cd server && rtk proxy npx jest cancel-appointment.use-case.spec --silent`
Expected: el test "persiste el fee y marca needsFeeCollection" FALLA (hoy el fee se calcula sin gatear por `isPaid` y no existe `needsFeeCollection`). Los 4 existentes siguen en verde.

---

### Task 2: Refactor del use-case (TDD green)

**Files:**
- Modify: `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts`

- [ ] **Step 1: Añadir el import de `TransactionEntity`**

Justo después del import de `AppointmentCancelledEvent`-builder (la línea que importa desde `../services/appointment-event.builder.js`), añadir:

```ts
import type { TransactionEntity } from '../../../payments/domain/entities/transaction.entity.js';
```

- [ ] **Step 2: Reemplazar el cálculo del fee + update + llamada al flag**

Reemplazar este bloque exacto:

```ts
    let cancellationFee: number | undefined;

    // Los pacientes deben cancelar con al menos 24h de anticipación
    if (userRole === UserRole.PATIENT) {
      if (hoursUntilAppointment < MIN_CANCELLATION_HOURS_PATIENT) {
        // Calcular penalización basada en el precio de la especialidad
        const specialty = await this.specialtyRepository.findById(
          appointment.schedule.specialty.id,
        );
        const specialtyPrice = specialty?.price ?? 0;

        if (specialtyPrice > 0) {
          cancellationFee = Math.round(
            (specialtyPrice * CANCELLATION_FEE_PERCENTAGE) / 100,
          );
        }
      }
    }

    const updated = await this.appointmentRepository.update(id, {
      status: AppointmentStatus.CANCELLED,
      cancelReason: dto.reason,
      ...(cancellationFee !== undefined && { cancellationFee }),
      updatedAt: new Date(),
    });

    // Si la cita tenía un pago PAID, se marca la transacción como "requiere refund manual".
    // No se procesa refund automático — el admin debe revisarlo desde el dashboard.
    await this.flagRefundPendingIfPaid(id, dto.reason, userRole);
```

por:

```ts
    // Buscar la última transacción una sola vez: el fee solo aplica si hay un
    // pago PAID que cobrar, y los flags de refund/fee se anclan en esa transacción.
    const tx = await this.transactionRepository.findLatestByAppointmentId(id);
    const isPaid = tx?.status === 'PAID';

    let cancellationFee: number | undefined;

    // Penalización: paciente que cancela tarde (<24h) una cita pagada.
    if (
      userRole === UserRole.PATIENT &&
      hoursUntilAppointment < MIN_CANCELLATION_HOURS_PATIENT &&
      isPaid
    ) {
      const specialty = await this.specialtyRepository.findById(
        appointment.schedule.specialty.id,
      );
      const specialtyPrice = specialty?.price ?? 0;
      if (specialtyPrice > 0) {
        cancellationFee = Math.round(
          (specialtyPrice * CANCELLATION_FEE_PERCENTAGE) / 100,
        );
      }
    }

    const updated = await this.appointmentRepository.update(id, {
      status: AppointmentStatus.CANCELLED,
      cancelReason: dto.reason,
      ...(cancellationFee !== undefined && { cancellationFee }),
      updatedAt: new Date(),
    });

    // Una cita pagada que se cancela requiere refund manual; si además hubo
    // penalización por cancelación tardía, se marca el cobro del fee en la misma
    // transacción para que el admin reconcilie el neto. Sin gateway automático.
    if (isPaid && tx) {
      await this.flagTransactionOnCancel(
        id,
        tx,
        dto.reason,
        userRole,
        cancellationFee,
      );
    }
```

- [ ] **Step 3: Reemplazar el método `flagRefundPendingIfPaid` por `flagTransactionOnCancel`**

Reemplazar este método exacto:

```ts
  /**
   * Si la última transacción de la cita está PAID, la marca con `needsRefund` en metadata.
   * Un admin la procesa manualmente desde el panel de facturación
   * (refunds automáticos vía API quedan para fase posterior).
   */
  private async flagRefundPendingIfPaid(
    appointmentId: number,
    cancelReason: string | undefined,
    cancelledBy: string,
  ): Promise<void> {
    const tx =
      await this.transactionRepository.findLatestByAppointmentId(appointmentId);
    if (!tx || tx.status !== 'PAID') return;

    const previousMetadata =
      tx.metadata && typeof tx.metadata === 'object'
        ? (tx.metadata as Record<string, unknown>)
        : {};

    await this.transactionRepository.update(tx.id, {
      metadata: {
        ...previousMetadata,
        needsRefund: true,
        refundRequestedAt: new Date().toISOString(),
        refundCancelReason: cancelReason ?? null,
        refundCancelledBy: cancelledBy,
      },
    });

    this.logger.warn(
      `[REVIEW] Cita ${appointmentId} cancelada con pago PAID (txId=${tx.id}). Refund manual pendiente.`,
    );
  }
```

por:

```ts
  /**
   * Marca la transacción PAID de una cita cancelada para revisión manual del
   * admin: siempre `needsRefund`, y además `needsFeeCollection` cuando hubo
   * penalización por cancelación tardía. Una sola escritura de metadata; sin
   * refunds ni cobros automáticos vía gateway (quedan para fase posterior).
   */
  private async flagTransactionOnCancel(
    appointmentId: number,
    tx: TransactionEntity,
    cancelReason: string | undefined,
    cancelledBy: string,
    cancellationFee: number | undefined,
  ): Promise<void> {
    const previousMetadata =
      tx.metadata && typeof tx.metadata === 'object'
        ? (tx.metadata as Record<string, unknown>)
        : {};

    const now = new Date().toISOString();

    await this.transactionRepository.update(tx.id, {
      metadata: {
        ...previousMetadata,
        needsRefund: true,
        refundRequestedAt: now,
        refundCancelReason: cancelReason ?? null,
        refundCancelledBy: cancelledBy,
        ...(cancellationFee !== undefined && {
          needsFeeCollection: true,
          feeAmount: cancellationFee,
          feeReason: 'Cancelación tardía (<24h)',
          feeRequestedAt: now,
        }),
      },
    });

    this.logger.warn(
      `[REVIEW] Cita ${appointmentId} cancelada con pago PAID (txId=${tx.id})` +
        (cancellationFee !== undefined
          ? `; fee S/${cancellationFee} por cobrar`
          : '') +
        '. Refund manual pendiente.',
    );
  }
```

- [ ] **Step 4: Typecheck**

Run: `cd server && rtk proxy ./node_modules/.bin/tsc --noEmit -p tsconfig.json`
Expected: sin errores. (Si reporta `MIN_CANCELLATION_HOURS_PATIENT`/`CANCELLATION_FEE_PERCENTAGE`/`UserRole` sin usar, no debería: siguen usados en el bloque nuevo.)

- [ ] **Step 5: Correr el spec del use-case**

Run: `cd server && rtk proxy npx jest cancel-appointment.use-case.spec --silent`
Expected: los 8 tests (4 viejos + 4 nuevos) PASAN.

---

### Task 3: Verificación completa, doc de auditoría y commit

**Files:**
- Modify: `docs/AUDITORIA-logica-horarios.md`

- [ ] **Step 1: Suite completa + typecheck**

Run: `cd server && rtk proxy ./node_modules/.bin/tsc --noEmit -p tsconfig.json && rtk proxy npx jest --silent`
Expected: tsc sin errores; **todas** las suites en verde (no debe romperse ningún spec existente — el refactor preserva el comportamiento de refund).

- [ ] **Step 2: Marcar #15 como Hecho en el tablero del doc**

En `docs/AUDITORIA-logica-horarios.md`, en la tabla de prioridades, reemplazar:

```
| 15 | `cancellationFee` se guarda pero nunca se cobra | Penalización inoperante | Medio | 🟢 Bajo |
```

por:

```
| 15 | `cancellationFee` se guarda pero nunca se cobra | Penalización inoperante | Medio | ✅ Hecho |
```

- [ ] **Step 3: Reescribir la sección #15 del doc**

Reemplazar el encabezado y cuerpo de la sección `### #15 ...` por:

```markdown
### #15 · `cancellationFee` se calcula y guarda, pero no tiene flujo de cobro — ✅ Hecho (junio 2026)

**Problema:** se calculaba la penalización y se persistía en `cancellationFee`, pero ninguna lógica la cobraba. Además se aplicaba incluso si la cita nunca fue pagada (paciente sin transacción).

**Fix aplicado (diseño en `docs/superpowers/specs/2026-06-15-cancellation-fee-collection-design.md`):** el fee solo se calcula cuando existe una transacción PAID que cobrar (corrige el cobro fantasma). El cobro se modela como flag de revisión manual, espejo del refund: la transacción PAID se marca con `needsFeeCollection`/`feeAmount`/`feeReason`/`feeRequestedAt` en su metadata, junto al `needsRefund` existente, en una sola escritura, para que el admin reconcilie el neto. Sin llamadas automáticas a MercadoPago. El lookup de la transacción se unificó (antes el cálculo del fee y el flag de refund hacían consultas separadas).

**Archivos:**
- `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts` (+spec: 4 tests nuevos)
```

- [ ] **Step 4: Commit**

```bash
cd /home/rafael/MediClick
git add server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts \
        server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.spec.ts \
        docs/AUDITORIA-logica-horarios.md
git commit -m "$(cat <<'EOF'
fix(appointments): cobro de cancellationFee vía flag manual; solo si hubo pago (#15)

El fee solo se calcula cuando existe una transacción PAID; se marca esa
transacción con needsFeeCollection/feeAmount para cobro manual del admin,
junto al flag de refund existente, en una sola escritura. Sin gateway
automático. Corrige el cálculo de fee a citas nunca pagadas.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- "Fee solo si hay tx PAID" → Task 2 Step 2 (condición `isPaid`). Test: Task 1 test #2. ✓
- "Flag para revisión manual con needsFeeCollection + feeAmount/feeReason/feeRequestedAt" → Task 2 Step 3. Test: Task 1 test #1. ✓
- "Convivencia con needsRefund, una sola escritura" → Task 2 Step 3 (un solo `update`). Tests #1/#3/#4. ✓
- "Sin read-side, sin schema, sin gateway" → no se crean endpoints/migraciones; solo metadata. ✓
- "Corrige cobro a quien nunca pagó" → Task 1 test #2, Task 2 condición `isPaid`. ✓
- Tabla de casos (paciente tarde/temprano, staff, sin pago) → tests #1–#4. ✓

**Placeholder scan:** sin TBD/TODO; todo el código está completo y literal. ✓

**Type consistency:** `flagTransactionOnCancel(appointmentId, tx: TransactionEntity, cancelReason, cancelledBy, cancellationFee?)` se llama con esos 5 args en Task 2 Step 2. `findLatestByAppointmentId`/`update` ya existen en `ITransactionRepository`. `TransactionEntity.metadata: unknown` → se castea en el spec con `as any`. ✓
