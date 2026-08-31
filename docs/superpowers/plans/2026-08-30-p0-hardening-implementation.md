# MediClick P0 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar los P0 de aislamiento clínico, autorización de citas/pagos, carreras de conciliación/expiración y arranque de producción descritos en el SDD.

**Architecture:** Se conserva la arquitectura modular de NestJS. Una política pura concentra el alcance de las operaciones sobre citas; `PatientRecordQuery` recibe un scope explícito; la conciliación financiera se profundiza detrás de una única operación transaccional; la expiración se convierte en un `UPDATE ... RETURNING` condicional. PostgreSQL real certifica las fronteras que los mocks no pueden demostrar.

**Tech Stack:** TypeScript 5, NestJS 11, Prisma 7, PostgreSQL 17, Jest 30, Docker, GitHub Actions.

**Spec:** `docs/SDD-hardening-integridad-seguridad-operacion.md`

## Global Constraints

- Mantener separados `AppointmentStatus` y `PaymentStatus`.
- El paciente conserva acceso propio multi-sede; personal con sede queda limitado a ella.
- Derivar sede desde la cita, agenda y médico persistidos, nunca desde el DTO.
- En `$transaction`, aplicar todos los predicados sensibles explícitamente.
- No resolver las preguntas abiertas de `docs/domain/APPOINTMENT-CORE.md`.
- Cada slice comienza con una prueba roja y termina con el gate focalizado en verde.
- No crear commits durante esta ejecución salvo petición explícita del usuario.

---

### Task 1: Scope explícito del expediente clínico

**Files:**
- Create: `server/src/modules/patient-records-graphql/application/use-cases/get-patient-record.use-case.spec.ts`
- Create: `server/src/modules/patient-records-graphql/infrastructure/persistence/prisma-patient-record.query.integration.spec.ts`
- Modify: `server/src/modules/patient-records-graphql/domain/interfaces/patient-record-query.port.ts`
- Modify: `server/src/modules/patient-records-graphql/application/use-cases/get-patient-record.use-case.ts`
- Modify: `server/src/modules/patient-records-graphql/infrastructure/persistence/prisma-patient-record.query.ts`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `AuthenticatedUser` del JWT.
- Produces: `PatientRecordScope` y `IPatientRecordQueryPort.getPatientRecord(patientId, scope)`.

- [ ] **Step 1: Escribir el test rojo del caso de uso**

```ts
it('limits clinic staff to the current clinic', async () => {
  const result = await useCase.execute(99, clinicDoctor);
  expect(result.appointments.map((item) => item.id)).toEqual([101]);
  expect(result.medicalHistory.map((item) => item.condition)).toEqual([
    'Historia sede 1',
  ]);
});

it('keeps the patient own record cross-clinic', async () => {
  const result = await useCase.execute(99, patientActor);
  expect(result.appointments.map((item) => item.id)).toEqual([101, 202]);
});

it('hides a patient with no care relationship from a doctor', async () => {
  await expect(useCase.execute(99, unrelatedDoctor)).rejects.toThrow(
    NotFoundException,
  );
});
```

- [ ] **Step 2: Ejecutar el test y comprobar el fallo**

Run: `cd server && pnpm test -- get-patient-record.use-case.spec.ts --runInBand`

Expected: FAIL porque el port no recibe scope y cualquier actor no paciente obtiene el agregado global.

- [ ] **Step 3: Definir el scope y aplicar la política en el caso de uso**

```ts
export type PatientRecordScope =
  | { kind: 'GLOBAL' }
  | { kind: 'PATIENT' }
  | { kind: 'CLINIC'; clinicId: number; doctorUserId?: number };

export interface IPatientRecordQueryPort {
  getPatientRecord(
    patientId: number,
    scope: PatientRecordScope,
  ): Promise<PatientRecord | null>;
  getPatientIdByUserId(userId: number): Promise<number | null>;
}
```

El caso de uso produce `PATIENT` solo después de comprobar ownership, `GLOBAL` para
`SUPER_ADMIN` o `ADMIN` sin sede, y `CLINIC` para el resto del personal. Un actor de sede sin
`clinicId` se rechaza.

- [ ] **Step 4: Filtrar el agregado dentro de Prisma**

La consulta usa `findFirst` y aplica el scope tanto a la visibilidad del paciente como a cada
relación estricta:

```ts
const clinicWhere = scope.kind === 'CLINIC' ? { clinicId: scope.clinicId } : {};
const patientVisibility =
  scope.kind === 'CLINIC'
    ? {
        appointments: {
          some: {
            deleted: false,
            clinicId: scope.clinicId,
            ...(scope.doctorUserId && {
              schedule: {
                doctor: { profile: { userId: scope.doctorUserId } },
              },
            }),
          },
        },
      }
    : {};
```

`medicalHistory`, `appointments` y `clinicalNotes` repiten `clinicWhere`. No se filtra después
de leer.

- [ ] **Step 5: Ejecutar el test focalizado**

Run: `cd server && pnpm test -- get-patient-record.use-case.spec.ts --runInBand`

Expected: PASS.

- [ ] **Step 6: Añadir integración PostgreSQL same-clinic/other-clinic/patient/global**

El spec crea dos sedes, un paciente, médicos y registros en ambas sedes. Ejecuta
`PrismaPatientRecordQuery` y afirma los IDs visibles. Se habilita con
`RUN_DB_INTEGRATION=1`; CI ejecuta primero `pnpm exec prisma migrate deploy`.

- [ ] **Step 7: Ejecutar la integración**

Run: `cd server && RUN_DB_INTEGRATION=1 pnpm test -- prisma-patient-record.query.integration.spec.ts --runInBand`

Expected: PASS con PostgreSQL migrado.

---

### Task 2: Política única para operaciones de cita y pago

**Files:**
- Create: `server/src/shared/access/appointment-access.policy.ts`
- Create: `server/src/shared/access/appointment-access.policy.spec.ts`
- Modify: `server/src/modules/payments/interfaces/controllers/payment.controller.ts`
- Modify: `server/src/modules/payments/application/use-cases/get-payment-by-appointment.use-case.ts`
- Modify: `server/src/modules/payments/application/use-cases/get-payment-by-appointment.use-case.spec.ts`
- Modify: `server/src/modules/appointments/interfaces/controllers/appointment.controller.ts`
- Modify: `server/src/modules/appointments/application/appointments.module.ts`
- Modify: `server/src/modules/payments/application/payments.module.ts`
- Modify: `server/src/modules/appointments/application/use-cases/{cancel,reschedule,check-in,confirm,complete,mark-no-show}-appointment.use-case.ts`
- Modify: specs existentes de cancelación, reagendamiento e inasistencia.

**Interfaces:**
- Consumes: `AuthenticatedUser`, el recurso persistido y `AppointmentOperation`.
- Produces: `AppointmentAccessPolicy.authorize(actor, operation, resource): void`.

- [ ] **Step 1: Escribir la matriz roja de acceso**

```ts
expect(() => policy.authorize(patient, 'CANCEL', own)).not.toThrow();
expect(() => policy.authorize(patient, 'CANCEL', another)).toThrow(
  NotFoundException,
);
expect(() => policy.authorize(patient, 'CHECK_IN', own)).toThrow(
  ForbiddenException,
);
expect(() => policy.authorize(clinicDoctor, 'COMPLETE', ownDoctorVisit)).not.toThrow();
expect(() => policy.authorize(clinicDoctor, 'COMPLETE', anotherDoctorVisit)).toThrow(
  NotFoundException,
);
expect(() => policy.authorize(otherClinicStaff, 'READ_PAYMENT', visit)).toThrow(
  NotFoundException,
);
expect(() => policy.authorize(globalAdmin, 'READ_PAYMENT', visit)).not.toThrow();
```

- [ ] **Step 2: Ejecutar la prueba y comprobar el fallo**

Run: `cd server && pnpm test -- appointment-access.policy.spec.ts --runInBand`

Expected: FAIL porque la política aún no existe.

- [ ] **Step 3: Implementar la interfaz profunda de política**

```ts
export type AppointmentOperation =
  | 'READ_PAYMENT'
  | 'CANCEL'
  | 'RESCHEDULE'
  | 'CHECK_IN'
  | 'CONFIRM'
  | 'COMPLETE'
  | 'MARK_NO_SHOW';

export type AppointmentAccessResource = {
  id: number;
  clinicId: number | null;
  patientUserId: number | null;
  doctorUserId: number | null;
};
```

Paciente: solo recurso propio y operaciones `READ_PAYMENT`, `CANCEL`, `RESCHEDULE`. Médico:
solo citas del propio médico y sede. Otro personal: sede actual. `SUPER_ADMIN` y `ADMIN` sin sede:
global. Los permisos de acción continúan en `PermissionsGuard`.

- [ ] **Step 4: Pasar el actor completo desde controllers**

Reemplazar parámetros sueltos `id`, `role` y `clinicId` por `@CurrentUser() actor` donde la
operación requiera autorización. En particular, eliminar `@CurrentUser('role')`.

- [ ] **Step 5: Autorizar después de cargar y antes de mutar**

Cada caso de uso construye `AppointmentAccessResource` desde la cita persistida. Payment usa una
consulta mínima con `patient.profile.userId`, `schedule.doctor.profile.userId` y
`schedule.doctor.clinicId`.

- [ ] **Step 6: Ejecutar la matriz y los casos de uso**

Run: `cd server && pnpm test -- appointment-access.policy get-payment-by-appointment cancel-appointment reschedule-appointment mark-no-show-appointment --runInBand`

Expected: PASS.

---

### Task 3: Conciliación financiera atómica

**Files:**
- Create: `server/src/modules/payments/domain/repositories/payment-reconciliation.repository.ts`
- Create: `server/src/modules/payments/infrastructure/persistence/prisma-payment-reconciliation.repository.ts`
- Create: `server/src/modules/payments/infrastructure/persistence/prisma-payment-reconciliation.repository.integration.spec.ts`
- Modify: `server/src/modules/payments/application/use-cases/handle-payment-webhook.use-case.ts`
- Modify: `server/src/modules/payments/application/use-cases/handle-payment-webhook.use-case.spec.ts`
- Modify: `server/src/modules/payments/application/payments.module.ts`

**Interfaces:**
- Consumes: `VerifiedPaymentSnapshot`, ya reconsultado al gateway.
- Produces: `IPaymentReconciliationRepository.reconcile(snapshot)` y
  `PaymentReconciliationResult`.

- [ ] **Step 1: Escribir el repro rojo de cancelación intercalada**

```ts
it('never reactivates an appointment cancelled before reconciliation', async () => {
  gateway.getPayment.mockResolvedValue(approvedPayment);
  reconciliation.reconcile.mockResolvedValue({
    appointmentId: 123,
    appointmentStatus: 'CANCELLED',
    paymentStatus: 'PAID',
    financialReviewRequired: true,
    notificationUserId: null,
    clinicId: 7,
  });

  await useCase.execute(webhook);

  expect(reconciliation.reconcile).toHaveBeenCalledWith(
    expect.objectContaining({ gatewayId: 'mp_987', status: 'PAID' }),
  );
  expect(createNotification.execute).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Ejecutar el test y comprobar el fallo**

Run: `cd server && pnpm test -- handle-payment-webhook.use-case.spec.ts --runInBand`

Expected: FAIL porque el caso de uso todavía lee una cita y la actualiza en pasos separados.

- [ ] **Step 3: Definir la operación transaccional única**

```ts
export interface IPaymentReconciliationRepository {
  reconcile(
    snapshot: VerifiedPaymentSnapshot,
  ): Promise<PaymentReconciliationResult | null>;
}
```

La implementación abre una transacción `Serializable`, reclama o actualiza la transacción de
pago, vuelve a leer la cita y aplica un CAS sobre su estado. Un conflicto reintenta la transacción
completa hasta tres veces.

- [ ] **Step 4: Implementar la matriz de transición**

```ts
const nextAppointmentStatus =
  snapshot.status === 'PAID' && appointment.status === 'PENDING'
    ? 'CONFIRMED'
    : appointment.status;

const financialReviewRequired =
  snapshot.status === 'PAID' && appointment.status === 'CANCELLED';
```

La metadata conserva flags previos y añade `needsFinancialReview` cuando corresponda. Una cita
cancelada queda `CANCELLED/PAID`; estados activos no pendientes conservan su estado asistencial.

- [ ] **Step 5: Reducir el caso de uso a gateway → reconciliación → notificación**

La consulta externa ocurre antes de la transacción. Los errores del gateway se propagan para que
el controller responda 5xx.

- [ ] **Step 6: Ejecutar tests focalizados**

Run: `cd server && pnpm test -- handle-payment-webhook prisma-payment-reconciliation --runInBand`

Expected: PASS.

- [ ] **Step 7: Ejecutar carrera PostgreSQL**

Run: `cd server && RUN_DB_INTEGRATION=1 pnpm test -- prisma-payment-reconciliation.repository.integration.spec.ts --runInBand`

Expected: diez intercalaciones terminan `CANCELLED/PAID` sin resurrección o
`CONFIRMED/PAID` cuando el pago gana a expiración; todo `CANCELLED/PAID` queda marcado para revisión.

---

### Task 4: Expiración condicional y webhook autenticado

**Files:**
- Create: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.spec.ts`
- Create: `server/src/modules/payments/interfaces/controllers/payment-webhook.controller.spec.ts`
- Create: `server/src/modules/payments/infrastructure/gateways/mercadopago-gateway.service.spec.ts`
- Modify: `server/src/modules/appointments/infrastructure/persistence/prisma-appointment.repository.ts`
- Modify: `server/src/modules/payments/interfaces/controllers/payment-webhook.controller.ts`
- Modify: `server/src/modules/payments/infrastructure/gateways/mercadopago-gateway.service.ts`
- Modify: `server/src/modules/payments/application/use-cases/handle-payment-webhook.use-case.spec.ts`
- Modify: `docker-compose.prod.yml`

**Interfaces:**
- Consumes: deadline, estado actual y firma HTTP.
- Produces: expiración single-statement y HTTP 200 solo después de procesar un evento auténtico.

- [ ] **Step 1: Escribir el test rojo de expiración CAS**

```ts
it('returns only appointments still eligible at write time', async () => {
  prisma.appointments.updateManyAndReturn.mockResolvedValue([expiredSlot]);
  const result = await repository.expirePendingPastDeadline(now);
  expect(result).toEqual([expiredSlot]);
  expect(prisma.appointments.updateManyAndReturn).toHaveBeenCalledWith(
    expect.objectContaining({
      where: expect.objectContaining({
        status: 'PENDING',
        paymentStatus: { in: ['PENDING', 'FAILED'] },
        pendingUntil: { lt: now },
      }),
    }),
  );
});
```

- [ ] **Step 2: Ejecutar y confirmar el fallo**

Run: `cd server && pnpm test -- prisma-appointment.repository.spec.ts --runInBand`

Expected: FAIL porque la implementación hace `findMany` y luego `updateMany` por ID.

- [ ] **Step 3: Implementar `updateManyAndReturn`**

Usar el predicado completo en una sola sentencia y seleccionar solo los campos de
`ExpiredAppointmentSlot`.

- [ ] **Step 4: Escribir pruebas rojas de firma y controller**

```ts
expect(() => gateway.validateWebhookSignature(headersWithShortV1, body)).not.toThrow();
expect(gateway.validateWebhookSignature(headersWithShortV1, body)).toBe(false);

await expect(controller.receive(requestWithInvalidSignature, body)).rejects.toThrow(
  UnauthorizedException,
);
expect(handle.execute).not.toHaveBeenCalled();

handle.execute.mockRejectedValue(new Error('database unavailable'));
await expect(controller.receive(validRequest, body)).rejects.toThrow(
  'database unavailable',
);
```

- [ ] **Step 5: Endurecer firma y propagación**

Comparar longitudes antes de `timingSafeEqual`, rechazar firma inválida y quitar el catch que
convierte fallos transitorios en 200. En producción, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` son
obligatorios; `docker-compose.prod.yml` los inyecta.

- [ ] **Step 6: Ejecutar tests focalizados**

Run: `cd server && pnpm test -- prisma-appointment.repository payment-webhook.controller mercadopago-gateway handle-payment-webhook --runInBand`

Expected: PASS.

---

### Task 5: Artefacto de producción y gate de smoke

**Files:**
- Create: `server/scripts/smoke-production-entrypoint.mjs`
- Modify: `server/Dockerfile`
- Modify: `server/package.json`
- Modify: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: salida real de `nest build`.
- Produces: `pnpm smoke:prod` y una imagen cuyo `CMD` apunta a `dist/src/main.js`.

- [ ] **Step 1: Escribir el smoke rojo**

```js
import { access } from 'node:fs/promises';

const entrypoint = new URL('../dist/src/main.js', import.meta.url);
await access(entrypoint);
await import(entrypoint.href);
```

El script arranca el proceso con configuración de test, espera `/health` y lo termina; falla si el
entrypoint no existe o el proceso sale antes de estar listo.

- [ ] **Step 2: Ejecutar el gate sobre el artefacto actual**

Run: `cd server && pnpm build && pnpm smoke:prod`

Expected: FAIL antes de corregir scripts/CMD porque `start:prod` apunta a `dist/main`.

- [ ] **Step 3: Alinear scripts, Docker y assets**

```json
{
  "packageManager": "pnpm@10.28.0",
  "scripts": {
    "start:prod": "node dist/src/main.js",
    "smoke:prod": "node scripts/smoke-production-entrypoint.mjs"
  }
}
```

Docker usa pnpm 10.28.0 en todos los stages, copia templates bajo `dist/src/shared/mail/templates`
y ejecuta `node dist/src/main.js`.

- [ ] **Step 4: Añadir gates CI**

CI fija pnpm 10.28.0, despliega migraciones antes de integración, habilita
`RUN_DB_INTEGRATION=1`, construye backend y ejecuta `smoke:prod`.

- [ ] **Step 5: Ejecutar verificación transversal**

Run: `cd server && pnpm test -- appointments payments patient-records-graphql --runInBand && pnpm build && pnpm smoke:prod`

Expected: PASS.

- [ ] **Step 6: Ejecutar revisión de tipos y diff**

Run: `cd server && pnpm exec tsc --noEmit`

Run: `git diff --check`

Expected: ambos PASS.

