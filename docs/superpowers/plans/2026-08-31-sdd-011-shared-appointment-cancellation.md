# SDD-011 Shared Appointment Cancellation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que cancelaciones por feriados y bloqueos sigan la misma revisión financiera y liberación de cupo que una cancelación manual.

**Architecture:** `AppointmentCancellationService` concentra la escritura de estado, la marca de reembolso manual, el evento de cupo liberado y la notificación. El caso de uso manual mantiene autorización y cálculo de penalidad antes de delegar; `AvailabilityChangeListener` delega con actor de sistema y sin penalidad, por lo que no introduce una decisión de reembolso automático.

**Tech Stack:** NestJS, TypeScript, EventEmitter2, Prisma/PostgreSQL, Jest.

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md` §6.3.3 y SDD-011.

## Global Constraints

- Estado asistencial y estado de pago permanecen separados.
- Una cita pagada cancelada por una restricción solo se marca `needsRefund`; no se inicia reembolso ni cobro automático.
- La cancelación conserva tanto `appointment.slot_released` como `appointment.cancelled` cuando existe usuario asociado.
- El actor de una restricción queda identificable como sistema y no genera penalidad de paciente.

---

### Task 1: Extraer la cancelación compartida

**Files:**
- Create: `server/src/modules/appointments/application/services/appointment-cancellation.service.ts`
- Create: `server/src/modules/appointments/application/services/appointment-cancellation.service.spec.ts`
- Modify: `server/src/modules/appointments/application/appointments.module.ts`

**Interfaces:**
- Produces: `cancel({ appointmentId, reason, cancelledBy, cancellationFee? }): Promise<AppointmentWithRelations>`.
- Consumes: `IAppointmentRepository`, `ITransactionRepository`, `TimezoneResolverService`, `EventEmitter2`.

- [x] **Step 1: Write a failing service test**

Llamar `cancel` para una cita con transacción `PAID`, razón `Bloqueo de agenda vigente` y actor `SYSTEM_AVAILABILITY_RESTRICTION`; esperar `CANCELLED`, metadata `needsRefund: true` sin `needsFeeCollection`, un `appointment.slot_released` y un `appointment.cancelled`.

- [x] **Step 2: Run it red**

Run: `cd server && pnpm test -- appointment-cancellation.service.spec.ts --runInBand`

Expected: FAIL porque aún no existe el módulo compartido.

- [x] **Step 3: Implement and register the deep module**

```ts
async cancel(input: AppointmentCancellationInput) {
  const updated = await this.appointmentRepository.update(input.appointmentId, {
    status: AppointmentStatus.CANCELLED, cancelReason: input.reason,
    ...(input.cancellationFee !== undefined && { cancellationFee: input.cancellationFee }),
  });
  const tx = await this.transactionRepository.findLatestByAppointmentId(updated.id);
  if (tx?.status === 'PAID') await this.flagTransactionForManualRefund(tx, input);
  this.publishCancellationEvents(updated);
  return updated;
}
```

- [x] **Step 4: Run it green**

Run: `cd server && pnpm test -- appointment-cancellation.service.spec.ts --runInBand`

Expected: PASS.

### Task 2: Enrutar cancelación manual y de restricciones

**Files:**
- Modify: `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts`
- Modify: `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.spec.ts`
- Modify: `server/src/modules/appointments/application/listeners/availability-change.listener.ts`
- Modify: `server/src/modules/appointments/application/listeners/availability-change.listener.spec.ts`

**Interfaces:**
- Consumes: `AppointmentCancellationService.cancel`.
- Produces: una única ruta de efectos posteriores a cancelar, con `cancelledBy` de usuario o `SYSTEM_AVAILABILITY_RESTRICTION`.

- [x] **Step 1: Write failing listener test**

Para una cita afectada con pago `PAID`, esperar que el listener solicite la cancelación compartida con la razón vigente, actor de sistema y sin penalidad. Mantener el caso no afectado sin llamada.

- [x] **Step 2: Run it red**

Run: `cd server && pnpm test -- availability-change.listener.spec.ts --runInBand`

Expected: FAIL porque el listener actualiza la cita y publica eventos por su cuenta.

- [x] **Step 3: Delegate to the shared module**

Eliminar del listener la escritura y publicación directas. El caso manual conserva su autorización y cálculo de fee, y después llama al mismo método con `cancelledBy: actor.roleName`.

- [x] **Step 4: Verify manual and restriction flows**

Run: `cd server && pnpm test -- 'appointment-cancellation.service.spec.ts|cancel-appointment.use-case.spec.ts|availability-change.listener.spec.ts' --runInBand && pnpm exec eslint <modified-files> && pnpm build`

Expected: PASS.

### Task 3: Document and commit

**Files:**
- Modify: `docs/domain/APPOINTMENT-CORE.md`
- Modify: `docs/SDD-hardening-integridad-seguridad-operacion.md`

- [x] **Step 1: Record the implemented invariant**

Documentar que cancelación manual y por restricción comparten revisión financiera manual, y actualizar el estado de SDD-011.

- [x] **Step 2: Run cross-module verification and commit**

Run: `cd server && pnpm test -- appointments --runInBand && pnpm test -- waitlist --runInBand && pnpm test -- payments --runInBand && pnpm build`

```bash
git add server/src/modules/appointments docs/domain/APPOINTMENT-CORE.md docs/SDD-hardening-integridad-seguridad-operacion.md docs/superpowers/plans/2026-08-31-sdd-011-shared-appointment-cancellation.md
git commit -m "fix(appointments): share restriction cancellation effects"
```
