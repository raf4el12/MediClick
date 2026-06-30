# Fix #15 — Flujo de cobro del `cancellationFee`

> Diseño aprobado. Hueco #15 de `docs/AUDITORIA-logica-horarios.md`.
> Fecha: 2026-06-15.

## Problema

`cancel-appointment.use-case.ts` calcula la penalización por cancelación
(50% del precio de la especialidad, `CANCELLATION_FEE_PERCENTAGE`) cuando un
**paciente** cancela con menos de 24h de anticipación
(`MIN_CANCELLATION_HOURS_PATIENT`) y la persiste en `appointment.cancellationFee`,
pero **ningún flujo la cobra**. Además la calcula incluso cuando la cita nunca
tuvo un pago — una multa incobrable contra un paciente sin transacción.

## Decisiones de diseño

1. **Cobro = flag para revisión manual.** Se replica el patrón existente de
   `flagRefundPendingIfPaid`: se marca la transacción PAID con metadata y un
   admin la procesa desde el panel de facturación. **Cero llamadas automáticas a
   MercadoPago** — consistente con cómo el codebase ya maneja los refunds.
2. **El fee solo aplica si existe una transacción PAID** que cobrar. Sin pago no
   hay método de cobro ni transacción donde anclar el flag → no se calcula ni se
   persiste `cancellationFee`. Esto corrige de paso el bug de cobrar a quien
   nunca pagó.

## Comportamiento

### Cálculo del fee (gating corregido)

El fee pasa a depender de que exista una transacción PAID, por lo que la
búsqueda de la transacción debe ocurrir **antes** del cálculo. Hoy el cálculo
vive en `execute()` (antes del lookup) y el flag de refund hace su propio lookup
aparte — dos consultas. Se unifica en **un solo lookup**:

```
1. tx = findLatestByAppointmentId(id);  isPaid = tx?.status === 'PAID'
2. el fee aplica si:  rol === PATIENT  &&  horasHastaCita < 24  &&  isPaid  &&  precioEspecialidad > 0
3. update(appointment, { status, cancelReason, cancellationFee? })   // fee solo si aplica
4. si isPaid:  escribir flags de metadata en tx (una sola escritura)
```

### Flag de cobro y convivencia con el refund

Cuando un paciente cancela **tarde** una cita **pagada**, ambas cosas son
ciertas a la vez: la clínica debe devolver el pago **y** retener el fee (política
de "parcialmente no reembolsable"). En lugar de acoplarlos en código (neteo), se
dejan ambos flags en la metadata de la **misma** transacción y el admin
reconcilia el neto manualmente:

```json
{
  "needsRefund": true,
  "refundRequestedAt": "...",
  "refundCancelReason": "...",
  "refundCancelledBy": "PATIENT",
  "needsFeeCollection": true,
  "feeAmount": 60,
  "feeReason": "Cancelación tardía (<24h)",
  "feeRequestedAt": "..."
}
```

Ambos flags se escriben en **una sola actualización** de la metadata de la
transacción (hoy el refund hace su propio `update`; el fee se suma a esa misma
escritura, no una segunda). Se conserva el `logger.warn` de auditoría existente.

Condiciones, resumidas:

| Caso | `cancellationFee` en cita | `needsRefund` | `needsFeeCollection` |
|------|---------------------------|---------------|----------------------|
| Paciente, <24h, tx PAID        | sí (50%) | sí | sí |
| Paciente, <24h, sin tx PAID    | no       | no | no |
| Paciente, ≥24h, tx PAID        | no       | sí | no |
| Staff, cualquier hora, tx PAID | no       | sí | no |
| Cualquiera, sin tx PAID        | no       | no | no |

(El `needsRefund` para staff/temprano + PAID es comportamiento existente, no se
toca.)

## Alcance

- **Sin read-side nuevo.** El flag `needsRefund` hoy es solo escritura + log, sin
  endpoint que liste transacciones pendientes. Por paridad y YAGNI, el fee igual:
  el admin lo verá por el mismo medio que los refunds. Un panel de
  "pendientes de cobro/refund" sería un fix aparte.
- **Sin cambios de schema.** Se reutiliza `Transactions.metadata` (Json), el
  punto de extensión ya establecido. No hay campo `TransactionType`; las
  transacciones se distinguen por `status` (`PaymentStatus`).

## Archivos afectados

- `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.ts`
  — unificar el lookup de transacción, gatear el fee por `isPaid`, escribir ambos
  flags en una sola actualización de metadata.
- `server/src/modules/appointments/application/use-cases/cancel-appointment.use-case.spec.ts`
  — extender (TDD).

## Tests (TDD)

Sobre el spec existente (`cancel-appointment.use-case.spec.ts`):

1. Paciente cancela tarde con tx PAID → `cancellationFee` persistido en la cita +
   tx marcada con `needsFeeCollection`/`feeAmount` (y `needsRefund`).
2. Paciente cancela tarde **sin** tx PAID → sin `cancellationFee`, sin flag de fee
   (corrección del bug).
3. Paciente cancela temprano (≥24h) con tx PAID → sin fee; el `needsRefund`
   existente intacto.
4. Staff cancela con tx PAID → sin fee; solo `needsRefund`.

## No incluye

- Cobro automático vía gateway (tokenización / pago recurrente).
- Neteo automático refund − fee en código.
- Concepto de "deuda del paciente" o bloqueo de reservas por deuda.
- Endpoint/panel de listado de pendientes.
